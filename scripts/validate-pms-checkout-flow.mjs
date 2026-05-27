import { randomBytes, createHash, createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

const baseUrl = (process.env.PMS_E2E_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const tenantId = process.env.PMS_E2E_TENANT_ID || "tenant_1dentalai_production";
const cookieName = process.env.PMS_E2E_COOKIE_NAME || "__Secure-1dentalai_app_session";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function authSecret() {
  return process.env.ONE_DENTAL_AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.DATABASE_URL || "local-1dentalai-development-secret";
}

function signToken(token) {
  const signature = createHmac("sha256", authSecret()).update(token).digest("base64url");
  return `${token}.${signature}`;
}

function loadLocalEnv() {
  let localDatabaseUrl = null;
  for (const candidate of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), candidate);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match) continue;
      const value = match[2].replace(/^"|"$/g, "");
      if (match[1] === "DATABASE_URL") {
        localDatabaseUrl = value;
      } else if (!process.env[match[1]]) {
        process.env[match[1]] = value;
      }
    }
  }
  if (localDatabaseUrl && (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes("/onedentalai"))) {
    process.env.DATABASE_URL = localDatabaseUrl;
  }
}

loadLocalEnv();

async function createDirectSessionCookie(client) {
  const userId = `authuser_checkout_${Date.now()}`;
  await client.query(
    `insert into "AuthUser"
       ("id", "tenantId", "email", "emailHash", "displayName", "roleKey", "status", "passwordHash", "passwordSalt", "mfaRequired", "mustChangePassword", "failedLoginCount", "passwordIterations")
     values ($1, $2, $3, $4, 'Checkout Smoke', 'owner_doctor', 'ACTIVE', $5, $6, false, false, 0, 310000)`,
    [userId, tenantId, `checkout-${Date.now()}@example.com`, sha256(`checkout-${Date.now()}@example.com`), sha256("checkout-smoke"), sha256("checkout-smoke-salt")],
  );
  const rawToken = randomBytes(32).toString("base64url");
  await client.query(
    `insert into "AuthSession" ("id", "tenantId", "userId", "tokenHash", "expiresAt", "ipHash", "userAgentHash")
     values ($1, $2, $3, $4, current_timestamp + interval '30 minutes', $5, $6)`,
    [`authsess_checkout_${Date.now()}`, tenantId, userId, sha256(rawToken), sha256("checkout-smoke"), sha256("checkout-smoke")],
  );
  return `${cookieName}=${signToken(rawToken)}`;
}

async function fetchJson(path, cookie, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Cookie: cookie,
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

let createdPatient;
let createdAppointment;
let createdProcedure;
let createdAuthUserId;

try {
  const cookie = await createDirectSessionCookie(client);
  createdAuthUserId = (await client.query(`select "id" from "AuthUser" where "email" like 'checkout-%@example.com' order by "createdAt" desc limit 1`)).rows[0]?.id;
  const procedureCodeId = (
    await client.query(
      `select "id", "category" from "PmsProcedureCode"
       where "tenantId" = $1 and "category" in ('HYGIENE', 'PERIODONTAL', 'PREVENTIVE', 'DIAGNOSTIC')
       order by case when "category" in ('HYGIENE', 'PERIODONTAL', 'PREVENTIVE') then 0 else 1 end, "code"
       limit 1`,
      [tenantId],
    )
  ).rows[0]?.id || (await client.query(`select "id" from "PmsProcedureCode" where "tenantId" = $1 order by "category", "code" limit 1`, [tenantId])).rows[0]?.id;
  if (!procedureCodeId) throw new Error("No active procedure code available for checkout smoke validation.");

  const patientCreate = await fetchJson("/api/pms/patients", cookie, {
    method: "POST",
    body: JSON.stringify({ firstName: `Checkout${Date.now()}`, lastName: "Patient", phone: `303-999-${String(Date.now()).slice(-4)}`, email: `checkout-${Date.now()}@example.com`, dateOfBirth: "1984-04-02" }),
  });
  if (patientCreate.response.status !== 201) throw new Error(`Patient create failed: HTTP ${patientCreate.response.status} ${JSON.stringify(patientCreate.payload)}`);
  createdPatient = patientCreate.payload.data;

  const appointmentCreate = await fetchJson("/api/pms/schedule/holds", cookie, {
    method: "POST",
    body: JSON.stringify({ patientId: createdPatient.id, startsAt: new Date(Date.now() + 90 * 60 * 1000).toISOString(), endsAt: new Date(Date.now() + 120 * 60 * 1000).toISOString(), appointmentType: "Exam", notes: "Checkout smoke" }),
  });
  if (appointmentCreate.response.status !== 201) throw new Error(`Appointment create failed: HTTP ${appointmentCreate.response.status} ${JSON.stringify(appointmentCreate.payload)}`);
  createdAppointment = appointmentCreate.payload.data;

  const blockedCheckout = await fetchJson(`/api/pms/appointments/${createdAppointment.id}/checkout`, cookie, {
    method: "POST",
    body: JSON.stringify({ procedureIds: [], paymentCents: 0, createClaimDraft: false, overrideBlockers: false, checkoutNote: "should block" }),
  });
  if (blockedCheckout.response.status !== 409) {
    throw new Error(`Checkout should block when appointment is not ready. Got HTTP ${blockedCheckout.response.status} ${JSON.stringify(blockedCheckout.payload)}`);
  }

  const statuses = ["SCHEDULED", "CONFIRMED", "ARRIVED", "SEATED", "IN_PROGRESS", "READY_FOR_CHECKOUT"];
  for (const status of statuses) {
    const step = await fetchJson(`/api/pms/appointments/${createdAppointment.id}/status`, cookie, { method: "POST", body: JSON.stringify({ status }) });
    if (step.response.status !== 200) throw new Error(`Transition to ${status} failed: HTTP ${step.response.status} ${JSON.stringify(step.payload)}`);
  }

  const procedureCreate = await fetchJson(`/api/pms/appointments/${createdAppointment.id}/procedures`, cookie, {
    method: "POST",
    body: JSON.stringify({ procedureCodeId, tooth: "19", surface: "MO", feeCents: 12500, status: "PLANNED" }),
  });
  if (procedureCreate.response.status !== 201) throw new Error(`Procedure create failed: HTTP ${procedureCreate.response.status} ${JSON.stringify(procedureCreate.payload)}`);
  createdProcedure = procedureCreate.payload.data;

  const checkout = await fetchJson(`/api/pms/appointments/${createdAppointment.id}/checkout`, cookie, {
    method: "POST",
    body: JSON.stringify({
      procedureIds: [createdProcedure.id],
      paymentCents: 5000,
      paymentType: "CARD",
      paymentReference: "checkout-smoke",
      createClaimDraft: true,
      overrideBlockers: true,
      checkoutNote: "Checkout smoke note",
    }),
  });
  if (checkout.response.status !== 201) throw new Error(`Checkout failed: HTTP ${checkout.response.status} ${JSON.stringify(checkout.payload)}`);

  const appointmentRow = (await client.query(`select "status" from "PmsAppointment" where "id" = $1 and "tenantId" = $2`, [createdAppointment.id, tenantId])).rows[0];
  if (!appointmentRow || appointmentRow.status !== "CHECKED_OUT") throw new Error(`Final appointment status expected CHECKED_OUT. Got ${JSON.stringify(appointmentRow)}`);

  const logCount = Number((await client.query(`select count(*)::int as count from "PmsProcedureLog" where "appointmentId" = $1`, [createdAppointment.id])).rows[0]?.count ?? 0);
  if (logCount < 1) throw new Error("Procedure log was not created.");

  const claimLineCount = Number((await client.query(`select count(*)::int as count from "PmsClaimLine" where "claimId" in (select "id" from "PmsClaim" where "appointmentId" = $1)`, [createdAppointment.id])).rows[0]?.count ?? 0);
  if (claimLineCount < 1) throw new Error("Claim line was not created.");

  const ledgerCount = Number((await client.query(`select count(*)::int as count from "PmsLedgerEntry" where "patientId" = $1`, [createdPatient.id])).rows[0]?.count ?? 0);
  if (ledgerCount < 1) throw new Error("Ledger entry was not created.");

  const paymentCount = Number((await client.query(`select count(*)::int as count from "PmsPayment" where "patientId" = $1`, [createdPatient.id])).rows[0]?.count ?? 0);
  if (paymentCount < 1) throw new Error("Patient payment was not created.");

  const claimCount = Number((await client.query(`select count(*)::int as count from "PmsClaim" where "appointmentId" = $1`, [createdAppointment.id])).rows[0]?.count ?? 0);
  if (claimCount < 1) throw new Error("Claim draft was not created.");

  const recallCount = Number((await client.query(`select count(*)::int as count from "PmsRecall" where "patientId" = $1`, [createdPatient.id])).rows[0]?.count ?? 0);
  if (recallCount < 1) throw new Error("Recall record was not created.");

  const taskCount = Number((await client.query(`select count(*)::int as count from "PmsTask" where "appointmentId" = $1`, [createdAppointment.id])).rows[0]?.count ?? 0);
  if (taskCount < 1) throw new Error("Recall or checkout task was not created.");

  const historyCount = Number((await client.query(`select count(*)::int as count from "PmsAppointmentStatusHistory" where "appointmentId" = $1`, [createdAppointment.id])).rows[0]?.count ?? 0);
  if (historyCount < 7) throw new Error("Appointment history was not recorded.");

  const auditCount = Number((await client.query(`select count(*)::int as count from "PmsAuditEvent" where "targetType" = 'PmsAppointment' and "targetId" = $1`, [createdAppointment.id])).rows[0]?.count ?? 0);
  if (auditCount < 1) throw new Error("Appointment audit event was not recorded.");

  console.log(JSON.stringify({ ok: true, patientId: createdPatient.id, appointmentId: createdAppointment.id, procedureId: createdProcedure.id }, null, 2));
} finally {
  if (createdProcedure?.id) {
    await client.query(`delete from "PmsProcedureLog" where "appointmentProcedureId" = $1`, [createdProcedure.id]);
    await client.query(`delete from "PmsAppointmentProcedure" where "id" = $1`, [createdProcedure.id]);
  }
  if (createdAppointment?.id) {
    await client.query(`delete from "PmsClaimLine" where "claimId" in (select "id" from "PmsClaim" where "appointmentId" = $1)`, [createdAppointment.id]);
    await client.query(`delete from "PmsClaim" where "appointmentId" = $1`, [createdAppointment.id]);
    await client.query(`delete from "PmsPayment" where "patientId" = $1`, [createdPatient?.id ?? null]);
    await client.query(`delete from "PmsLedgerEntry" where "patientId" = $1`, [createdPatient?.id ?? null]);
    await client.query(`delete from "PmsAppointmentStatusHistory" where "appointmentId" = $1`, [createdAppointment.id]);
    await client.query(`delete from "PmsAuditEvent" where "targetType" = 'PmsAppointment' and "targetId" = $1`, [createdAppointment.id]);
    await client.query(`delete from "PmsCheckoutSession" where "appointmentId" = $1`, [createdAppointment.id]);
    await client.query(`delete from "PmsAppointment" where "id" = $1`, [createdAppointment.id]);
  }
  if (createdPatient?.id) {
    await client.query(`delete from "PmsPatient" where "id" = $1`, [createdPatient.id]);
    await client.query(`delete from "PmsFamilyAccount" where "id" = $1`, [createdPatient.familyAccountId]);
  }
  await client.query(`delete from "AuthSession" where "id" like 'authsess_checkout_%'`);
  if (createdAuthUserId) await client.query(`delete from "AuthUser" where "id" = $1`, [createdAuthUserId]);
  await client.end();
}
