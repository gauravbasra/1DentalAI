"use server";

import { revalidatePath } from "next/cache";
import { query, newId } from "@/lib/db";
import { defaultTenantId } from "@/lib/pms-repository";
import { hashLookupValue, hashNewPassword, requirePlatformAdmin } from "@/lib/auth";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function auditAdmin(eventType: string, summary: string, metadata?: unknown) {
  const session = await requirePlatformAdmin();
  await query(
    `insert into "AuthAuditEvent" ("id", "tenantId", "userId", "sessionId", "eventType", "outcome", "summary", "metadata")
     values ($1, $2, $3, $4, $5, 'ALLOWED', $6, $7::jsonb)`,
    [newId("authaudit"), session.tenantId, session.userId, session.id, eventType, summary, metadata ? JSON.stringify(metadata) : null],
  );
}

export async function createOrganizationAction(formData: FormData) {
  await requirePlatformAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const orgType = String(formData.get("orgType") ?? "PRACTICE");
  const parentOrgId = String(formData.get("parentOrgId") ?? "").trim() || null;
  const baaStatus = String(formData.get("baaStatus") ?? "NOT_STARTED");
  const phiEnabled = formData.get("phiEnabled") === "on";

  if (!name) return;
  await query(
    `insert into "PlatformOrganization"
       ("id", "tenantId", "name", "slug", "orgType", "parentOrgId", "status", "baaStatus", "phiEnabled", "notes")
     values ($1, $2, $3, $4, $5, $6, 'ONBOARDING', $7, $8, $9)
     on conflict ("tenantId", "slug") do update set
       "name" = excluded."name",
       "orgType" = excluded."orgType",
       "parentOrgId" = excluded."parentOrgId",
       "baaStatus" = excluded."baaStatus",
       "phiEnabled" = excluded."phiEnabled",
       "updatedAt" = current_timestamp`,
    [newId("org"), defaultTenantId, name, slugify(name), orgType, parentOrgId, baaStatus, phiEnabled, String(formData.get("notes") ?? "").trim() || null],
  );
  await auditAdmin("ORG_UPSERTED", "Organization onboarding record was created or updated.", { orgType, phiEnabled });
  revalidatePath("/admin/settings");
}

export async function createUserAction(formData: FormData) {
  await requirePlatformAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const roleKey = String(formData.get("roleKey") ?? "practice_admin");
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !displayName || !roleKey || !organizationId || password.length < 10) return;

  const passwordHash = await hashNewPassword(password);
  const userId = newId("authuser");
  await query(
    `insert into "AuthUser"
       ("id", "tenantId", "email", "emailHash", "displayName", "roleKey", "status", "passwordHash", "passwordSalt", "passwordIterations", "mfaRequired", "mustChangePassword")
     values ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7, $8, $9, true, true)
     on conflict ("tenantId", "emailHash") do update set
       "displayName" = excluded."displayName",
       "roleKey" = excluded."roleKey",
       "status" = 'ACTIVE',
       "passwordHash" = excluded."passwordHash",
       "passwordSalt" = excluded."passwordSalt",
       "passwordIterations" = excluded."passwordIterations",
       "updatedAt" = current_timestamp
     returning "id"`,
    [userId, defaultTenantId, email, hashLookupValue(email), displayName, roleKey, passwordHash.hash, passwordHash.salt, passwordHash.iterations],
  );
  const existing = await query<{ id: string }>(`select "id" from "AuthUser" where "tenantId" = $1 and "emailHash" = $2`, [defaultTenantId, hashLookupValue(email)]);
  const resolvedUserId = existing.rows[0]?.id ?? userId;
  await query(
    `insert into "PlatformMembership" ("id", "tenantId", "organizationId", "userId", "roleKey", "status")
     values ($1, $2, $3, $4, $5, 'ACTIVE')
     on conflict ("organizationId", "userId", "roleKey") do update set "status" = 'ACTIVE', "updatedAt" = current_timestamp`,
    [newId("member"), defaultTenantId, organizationId, resolvedUserId, roleKey],
  );
  await auditAdmin("USER_UPSERTED", "User was created or updated and assigned to an organization.", { emailHash: hashLookupValue(email), roleKey });
  revalidatePath("/admin/settings");
}

export async function setSignupStatusAction(formData: FormData) {
  await requirePlatformAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "PENDING_VERIFICATION");
  if (!id) return;
  await query(
    `update "AuthSignupRequest"
     set "status" = $2, "verificationNote" = $3, "updatedAt" = current_timestamp
     where "tenantId" = $1 and "id" = $4`,
    [defaultTenantId, status, String(formData.get("verificationNote") ?? "").trim() || null, id],
  );
  await auditAdmin("SIGNUP_STATUS_UPDATED", "Signup request status was updated.", { signupRequestId: id, status });
  revalidatePath("/admin/settings");
}
