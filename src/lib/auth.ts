import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { pbkdf2 as pbkdf2Callback, randomBytes, timingSafeEqual, createHash, createHmac } from "crypto";
import { promisify } from "util";
import { query, newId } from "@/lib/db";
import { defaultTenantId } from "@/lib/pms-repository";

const pbkdf2 = promisify(pbkdf2Callback);
const sessionCookieName = "__Secure-1dentalai_app_session";
const deprecatedSecureSessionCookieName = "__Secure-1dentalai_session";
const legacySessionCookieName = "__Host-1dentalai_session";
const ipFallbackSessionCookieName = "1dentalai_session";
const readableSessionCookieNames = [
  sessionCookieName,
  ipFallbackSessionCookieName,
  deprecatedSecureSessionCookieName,
  legacySessionCookieName,
];
const sessionMaxAgeSeconds = 60 * 60 * 8;
const passwordIterations = 310_000;

type AuthUserRow = {
  id: string;
  tenantId: string;
  email: string;
  displayName: string;
  roleKey: string;
  status: string;
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
  lockedUntil: Date | null;
};

type AuthSessionRow = {
  id: string;
  tenantId: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  displayName: string;
  email: string;
  roleKey: string;
  status: string;
};

export type AuthActionState = {
  ok?: boolean;
  message?: string;
};

export type CurrentSession = AuthSessionRow;

type LoginResult = AuthActionState & {
  redirectTo?: string;
};

function isWorkspacePath(path: string) {
  return (
    path.startsWith("/app") ||
    path.startsWith("/admin") ||
    path.startsWith("/wrapper") ||
    path.startsWith("/pms") ||
    path.startsWith("/patient-engagement") ||
    path.startsWith("/reputation-management") ||
    path.startsWith("/digital-marketing")
  );
}

function authSecret() {
  return process.env.ONE_DENTAL_AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.DATABASE_URL || "local-1dentalai-development-secret";
}

function onboardingSignupSecret() {
  return process.env.ONE_DENTAL_ONBOARDING_SIGNUP_SECRET || process.env.ONE_DENTAL_AUTH_SECRET || process.env.JWT_SECRET || process.env.DATABASE_URL || "local-onboarding-signup-secret";
}

function normalizeEmail(email: FormDataEntryValue | string | null) {
  return String(email ?? "").trim().toLowerCase();
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(value: string) {
  return createHmac("sha256", authSecret()).update(value).digest("base64url");
}

function onboardingHmac(value: string) {
  return createHmac("sha256", onboardingSignupSecret()).update(value).digest("base64url");
}

function signToken(token: string) {
  return `${token}.${hmac(token)}`;
}

function encodeOnboardingPayload(payload: Record<string, unknown>) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${onboardingHmac(body)}`;
}

function readSignedToken(cookieValue?: string) {
  if (!cookieValue) return null;
  const [token, signature] = cookieValue.split(".");
  if (!token || !signature) return null;
  const expected = hmac(token);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) return null;
  return timingSafeEqual(providedBuffer, expectedBuffer) ? token : null;
}

async function requestHashes() {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userAgent = headerList.get("user-agent") || "unknown";
  return {
    ipHash: sha256(forwardedFor),
    userAgentHash: sha256(userAgent),
  };
}

function requestHostDomain(headerList: Awaited<ReturnType<typeof headers>>) {
  const host = (headerList.get("x-forwarded-host") || headerList.get("host") || "").split(":")[0]?.toLowerCase();
  return host === "1dentalai.com" || host.endsWith(".1dentalai.com") ? ".1dentalai.com" : undefined;
}

function requestIsIpFallback(headerList: Awaited<ReturnType<typeof headers>>) {
  const host = (headerList.get("x-forwarded-host") || headerList.get("host") || "").split(":")[0]?.toLowerCase();
  return host === "162.243.186.191";
}

function readSessionToken(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  for (const cookieName of readableSessionCookieNames) {
    const token = readSignedToken(cookieStore.get(cookieName)?.value);
    if (token) return token;
  }
  return null;
}

function expireCookie(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  name: string,
  options?: { domain?: string; secure?: boolean },
) {
  cookieStore.set(name, "", {
    httpOnly: true,
    secure: options?.secure ?? name !== ipFallbackSessionCookieName,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    ...(options?.domain && !name.startsWith("__Host-") ? { domain: options.domain } : {}),
  });
}

function clearBrowserSessionCookies(cookieStore: Awaited<ReturnType<typeof cookies>>, cookieDomain?: string) {
  for (const cookieName of readableSessionCookieNames) {
    cookieStore.delete(cookieName);
    expireCookie(cookieStore, cookieName);
    if (cookieDomain) {
      expireCookie(cookieStore, cookieName, { domain: cookieDomain, secure: cookieName !== ipFallbackSessionCookieName });
    }
  }
}

async function hashPassword(password: string, salt: string, iterations = passwordIterations) {
  const derived = await pbkdf2(password, salt, iterations, 32, "sha256");
  return derived.toString("base64url");
}

async function verifyPassword(password: string, user: AuthUserRow) {
  const derived = await hashPassword(password, user.passwordSalt, user.passwordIterations);
  const providedBuffer = Buffer.from(derived);
  const expectedBuffer = Buffer.from(user.passwordHash);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

async function auditAuth(input: {
  tenantId?: string;
  userId?: string | null;
  sessionId?: string | null;
  eventType: string;
  outcome: string;
  summary: string;
  metadata?: unknown;
}) {
  const { ipHash, userAgentHash } = await requestHashes();
  await query(
    `insert into "AuthAuditEvent"
       ("id", "tenantId", "userId", "sessionId", "eventType", "outcome", "summary", "ipHash", "userAgentHash", "metadata")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
    [
      newId("authaudit"),
      input.tenantId ?? defaultTenantId,
      input.userId ?? null,
      input.sessionId ?? null,
      input.eventType,
      input.outcome,
      input.summary,
      ipHash,
      userAgentHash,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ],
  );
}

export async function loginWithPassword(formData: FormData): Promise<LoginResult> {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/wrapper");

  if (!email || !password) {
    return { ok: false, message: "Enter your email and password." };
  }

  const userResult = await query<AuthUserRow>(
    `select "id", "tenantId", "email", "displayName", "roleKey", "status", "passwordHash", "passwordSalt", "passwordIterations", "lockedUntil"
     from "AuthUser"
     where "tenantId" = $1 and "emailHash" = $2
     limit 1`,
    [defaultTenantId, sha256(email)],
  );
  const user = userResult.rows[0];

  if (!user || user.status !== "ACTIVE" || (user.lockedUntil && user.lockedUntil > new Date())) {
    await auditAuth({
      eventType: "LOGIN_BLOCKED",
      outcome: "BLOCKED",
      summary: "Login blocked because the account was missing, inactive, or locked.",
      metadata: { emailHash: sha256(email), phiStored: false },
    });
    return { ok: false, message: "We could not verify that account. Contact your practice administrator if this continues." };
  }

  const passwordOk = await verifyPassword(password, user);
  if (!passwordOk) {
    const failedCount = await query<{ failedLoginCount: number }>(
      `update "AuthUser"
       set "failedLoginCount" = "failedLoginCount" + 1,
           "lockedUntil" = case when "failedLoginCount" + 1 >= 5 then current_timestamp + interval '15 minutes' else "lockedUntil" end,
           "updatedAt" = current_timestamp
       where "id" = $1
       returning "failedLoginCount"`,
      [user.id],
    );
    await auditAuth({
      tenantId: user.tenantId,
      userId: user.id,
      eventType: "LOGIN_FAILED",
      outcome: "BLOCKED",
      summary: "Password verification failed.",
      metadata: { failedLoginCount: failedCount.rows[0]?.failedLoginCount ?? 1, phiStored: false },
    });
    return { ok: false, message: "We could not verify that account. Contact your practice administrator if this continues." };
  }

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = sha256(rawToken);
  const sessionId = newId("authsess");
  const { ipHash, userAgentHash } = await requestHashes();
  await query(
    `insert into "AuthSession" ("id", "tenantId", "userId", "tokenHash", "expiresAt", "ipHash", "userAgentHash")
     values ($1, $2, $3, $4, current_timestamp + interval '8 hours', $5, $6)`,
    [sessionId, user.tenantId, user.id, tokenHash, ipHash, userAgentHash],
  );
  await query(
    `update "AuthUser"
     set "failedLoginCount" = 0, "lockedUntil" = null, "lastLoginAt" = current_timestamp, "updatedAt" = current_timestamp
     where "id" = $1`,
    [user.id],
  );
  const cookieStore = await cookies();
  const headerList = await headers();
  const cookieDomain = requestHostDomain(headerList);
  const isIpFallback = requestIsIpFallback(headerList);
  clearBrowserSessionCookies(cookieStore, cookieDomain);
  cookieStore.set(isIpFallback ? ipFallbackSessionCookieName : sessionCookieName, signToken(rawToken), {
    httpOnly: true,
    secure: !isIpFallback,
    sameSite: "lax",
    path: "/",
    maxAge: sessionMaxAgeSeconds,
    ...(!isIpFallback && cookieDomain ? { domain: cookieDomain } : {}),
  });
  await auditAuth({
    tenantId: user.tenantId,
    userId: user.id,
    sessionId,
    eventType: "LOGIN_SUCCEEDED",
    outcome: "ALLOWED",
    summary: "User signed in and session was created.",
    metadata: { roleKey: user.roleKey, phiStored: false },
  });

  if (user.roleKey === "super_admin" && (!next || next === "/app/overview" || next === "/wrapper")) {
    return { ok: true, redirectTo: "/admin/settings" };
  }

  return {
    ok: true,
    redirectTo: isWorkspacePath(next) && next !== "/app" ? next : "/app/pms",
  };
}

export async function loginAction(_previousState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const result = await loginWithPassword(formData);
  if (result.redirectTo) redirect(result.redirectTo);
  return result;
}

export async function signupAction(_previousState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const practiceName = String(formData.get("practiceName") ?? "").trim();
  const contactName = String(formData.get("contactName") ?? "").trim();
  const email = normalizeEmail(formData.get("email"));
  const phone = String(formData.get("phone") ?? "").trim();
  const roleRequested = String(formData.get("roleRequested") ?? "practice_manager").trim();

  if (!practiceName || !contactName || !email || !roleRequested) {
    return { ok: false, message: "Practice, contact, email, and role are required." };
  }

  const signupRequestId = newId("signup");
  await query(
    `insert into "AuthSignupRequest"
       ("id", "tenantId", "practiceName", "contactName", "email", "emailHash", "phone", "roleRequested", "verificationNote")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      signupRequestId,
      defaultTenantId,
      practiceName,
      contactName,
      email,
      sha256(email),
      phone || null,
      roleRequested,
      "Pending admin identity verification, BAA/compliance review, and least-privilege role assignment.",
    ],
  );
  await auditAuth({
    eventType: "SIGNUP_REQUEST_CREATED",
    outcome: "READ_ONLY",
    summary: "Signup request created for verification; no workspace access was granted.",
    metadata: { emailHash: sha256(email), roleRequested, phiStored: false },
  });

  const onboardingToken = encodeOnboardingPayload({
    signupRequestId,
    practiceName,
    contactName,
    email,
    phone,
    roleRequested,
    issuedAt: Date.now(),
    expiresAt: Date.now() + 15 * 60 * 1000,
  });
  const onboardingUrl = new URL("/api/onboarding/signup", process.env.NEXT_PUBLIC_APP_URL ?? "https://app.1dentalai.com");
  onboardingUrl.searchParams.set("token", onboardingToken);
  redirect(onboardingUrl.toString());
}

export async function logout() {
  const cookieStore = await cookies();
  const token = readSessionToken(cookieStore);
  if (token) {
    const result = await query<{ id: string; tenantId: string; userId: string }>(
      `update "AuthSession"
       set "revokedAt" = current_timestamp
       where "tokenHash" = $1 and "revokedAt" is null
       returning "id", "tenantId", "userId"`,
      [sha256(token)],
    );
    const session = result.rows[0];
    if (session) {
      await auditAuth({
        tenantId: session.tenantId,
        userId: session.userId,
        sessionId: session.id,
        eventType: "LOGOUT",
        outcome: "ALLOWED",
        summary: "User signed out and session was revoked.",
      });
    }
  }
  const headerList = await headers();
  const cookieDomain = requestHostDomain(headerList);
  clearBrowserSessionCookies(cookieStore, cookieDomain);
}

export async function currentSession() {
  const cookieStore = await cookies();
  const token = readSessionToken(cookieStore);
  if (!token) return null;

  const result = await query<AuthSessionRow>(
    `select s."id", s."tenantId", s."userId", s."expiresAt", s."revokedAt",
            u."displayName", u."email", u."roleKey", u."status"
     from "AuthSession" s
     join "AuthUser" u on u."id" = s."userId"
     where s."tokenHash" = $1
       and s."revokedAt" is null
       and s."expiresAt" > current_timestamp
       and u."status" = 'ACTIVE'
     limit 1`,
    [sha256(token)],
  );

  const session = result.rows[0];
  if (!session) return null;
  await query(`update "AuthSession" set "lastSeenAt" = current_timestamp where "id" = $1`, [session.id]);
  return session;
}

export async function requireAuth() {
  const session = await currentSession();
  if (!session) redirect("/app");
  return session;
}

export async function requirePlatformAdmin() {
  const session = await requireAuth();
  if (!["super_admin", "dso_admin"].includes(session.roleKey)) {
    await auditAuth({
      tenantId: session.tenantId,
      userId: session.userId,
      sessionId: session.id,
      eventType: "ADMIN_ACCESS_DENIED",
      outcome: "BLOCKED",
      summary: "User attempted to access platform administration without a platform role.",
      metadata: { roleKey: session.roleKey, phiStored: false },
    });
    redirect("/wrapper");
  }
  return session;
}

export async function hashNewPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  return {
    salt,
    hash: await hashPassword(password, salt, passwordIterations),
    iterations: passwordIterations,
  };
}

export function hashLookupValue(value: string) {
  return sha256(value.trim().toLowerCase());
}

export { sessionCookieName };
