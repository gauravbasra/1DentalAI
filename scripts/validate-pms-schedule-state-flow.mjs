import { randomBytes, createHash, createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

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

async function createDirectSessionCookie(client) {
  const user = (
    await client.query(
      `select "id", "tenantId"
       from "AuthUser"
       where "tenantId" = $1
         and "status" = 'ACTIVE'
         and "roleKey" in ('super_admin','owner_dentist','practice_admin','practice_manager')
       order by case "roleKey" when 'super_admin' then 0 when 'owner_dentist' then 1 when 'practice_admin' then 2 else 3 end
       limit 1`,
      [tenantId],
    )
  ).rows[0];

  if (!user) {
    throw new Error("No active PMS user was available for smoke validation.");
  }

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = sha256(rawToken);
  const sessionId = `authsess_sched_${Date.now()}`;

  await client.query(
    `insert into "AuthSession" ("id", "tenantId", "userId", "tokenHash", "expiresAt", "ipHash", "userAgentHash")
     values ($1, $2, $3, $4, current_timestamp + interval '30 minutes', $5, $6)`,
    [sessionId, user.tenantId, user.id, tokenHash, sha256("pms-schedule"), sha256("pms-schedule")],
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

async function getCounts(client, appointmentId) {
  const [historyCount, auditCount] = await Promise.all([
    client.query(`select count(*)::int as count from "PmsAppointmentStatusHistory" where "appointmentId" = $1`, [appointmentId]),
    client.query(`select count(*)::int as count from "PmsAuditEvent" where "targetType" = 'PmsAppointment' and "targetId" = $1`, [appointmentId]),
  ]);
  return {
    history: historyCount.rows[0]?.count ?? 0,
    audit: auditCount.rows[0]?.count ?? 0,
  };
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

let createdPatient;
let createdAppointment;

try {
  const cookie = await createDirectSessionCookie(client);

  const patientCreate = await fetchJson("/api/pms/patients", cookie, {
    method: "POST",
    body: JSON.stringify({
      firstName: `Sched${Date.now()}`,
      lastName: "Flow",
      phone: `303-777-${String(Date.now()).slice(-4)}`,
      email: `sched-flow-${Date.now()}@example.com`,
      dateOfBirth: "1988-02-14",
    }),
  });
  if (patientCreate.response.status !== 201) {
    throw new Error(`Patient create failed: HTTP ${patientCreate.response.status} ${JSON.stringify(patientCreate.payload)}`);
  }
  createdPatient = patientCreate.payload.data;

  const holdCreate = await fetchJson("/api/pms/schedule/holds", cookie, {
    method: "POST",
    body: JSON.stringify({
      patientId: createdPatient.id,
      startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      endsAt: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
      appointmentType: "Exam",
      notes: "Schedule flow smoke test",
    }),
  });
  if (holdCreate.response.status !== 201) {
    throw new Error(`Appointment hold create failed: HTTP ${holdCreate.response.status} ${JSON.stringify(holdCreate.payload)}`);
  }
  createdAppointment = holdCreate.payload.data;

  const transitionPath = `/api/pms/appointments/${createdAppointment.id}/status`;
  const states = ["SCHEDULED", "CONFIRMED", "ARRIVED", "SEATED", "IN_PROGRESS", "READY_FOR_CHECKOUT", "CHECKED_OUT", "COMPLETED"];
  const beforeInvalidCounts = await getCounts(client, createdAppointment.id);
  const invalid = await fetchJson(transitionPath, cookie, {
    method: "POST",
    body: JSON.stringify({ status: "SEATED" }),
  });
  if (invalid.response.status !== 409) {
    throw new Error(`Skipping directly from SCHEDULED to SEATED should be blocked with HTTP 409. Got ${invalid.response.status} ${JSON.stringify(invalid.payload)}`);
  }
  const afterInvalidCounts = await getCounts(client, createdAppointment.id);
  if (afterInvalidCounts.history !== beforeInvalidCounts.history || afterInvalidCounts.audit !== beforeInvalidCounts.audit + 1) {
    throw new Error(`Invalid transition must not change history and must add one audit event. Before ${JSON.stringify(beforeInvalidCounts)} after ${JSON.stringify(afterInvalidCounts)}`);
  }

  for (const status of states) {
    const step = await fetchJson(transitionPath, cookie, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
    if (step.response.status !== 200) {
      throw new Error(`Expected ${status} transition to succeed, got HTTP ${step.response.status} ${JSON.stringify(step.payload)}`);
    }
  }

  const appointmentRow = (
    await client.query(`select "status" from "PmsAppointment" where "id" = $1 and "tenantId" = $2`, [createdAppointment.id, tenantId])
  ).rows[0];
  if (!appointmentRow || appointmentRow.status !== "COMPLETED") {
    throw new Error(`Final appointment status was not COMPLETED: ${JSON.stringify(appointmentRow)}`);
  }

  const counts = await getCounts(client, createdAppointment.id);
  if (counts.history < states.length + 1) {
    throw new Error(`Expected status history for initial hold plus ${states.length} transitions. Got ${JSON.stringify(counts)}`);
  }
  if (counts.audit < states.length + 1) {
    throw new Error(`Expected audit events for the appointment transitions. Got ${JSON.stringify(counts)}`);
  }

  const detail = await fetch(`${baseUrl}/app/pms/appointments/${createdAppointment.id}`, { headers: { Cookie: cookie } });
  const html = await detail.text();
  if (!detail.ok || !html.includes("Status history") || !html.includes("Completed")) {
    throw new Error("Appointment detail page did not render status history and next actions.");
  }

  console.log(JSON.stringify({ ok: true, appointmentId: createdAppointment.id, patientId: createdPatient.id, counts }, null, 2));
} finally {
  if (createdAppointment?.id) {
    await client.query(`delete from "PmsAppointmentStatusHistory" where "appointmentId" = $1`, [createdAppointment.id]);
    await client.query(`delete from "PmsAuditEvent" where "targetType" = 'PmsAppointment' and "targetId" = $1`, [createdAppointment.id]);
    await client.query(`delete from "PmsAppointment" where "id" = $1`, [createdAppointment.id]);
  }
  if (createdPatient?.id) {
    await client.query(`delete from "PmsPatient" where "id" = $1`, [createdPatient.id]);
    await client.query(`delete from "PmsFamilyAccount" where "id" = $1`, [createdPatient.familyAccountId]);
  }
  await client.query(`delete from "AuthSession" where "id" like 'authsess_sched_%'`);
  await client.end();
}
