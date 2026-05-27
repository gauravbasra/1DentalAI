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
  const sessionId = `authsess_dir_${Date.now()}`;

  await client.query(
    `insert into "AuthSession" ("id", "tenantId", "userId", "tokenHash", "expiresAt", "ipHash", "userAgentHash")
     values ($1, $2, $3, $4, current_timestamp + interval '30 minutes', $5, $6)`,
    [sessionId, user.tenantId, user.id, tokenHash, sha256("pms-directory"), sha256("pms-directory")],
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

async function getCounts(client) {
  const [patientCount, familyCount] = await Promise.all([
    client.query(`select count(*)::int as count from "PmsPatient" where "tenantId" = $1 and "status" = 'ACTIVE'`, [tenantId]),
    client.query(`select count(*)::int as count from "PmsFamilyAccount" where "tenantId" = $1`, [tenantId]),
  ]);
  return {
    patients: patientCount.rows[0]?.count ?? 0,
    families: familyCount.rows[0]?.count ?? 0,
  };
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

let createdPatient;
let cookie;

try {
  cookie = await createDirectSessionCookie(client);
  const baselineCounts = await getCounts(client);

  const create = await fetchJson("/api/pms/patients", cookie, {
    method: "POST",
    body: JSON.stringify({
      firstName: "DirSmoke",
      lastName: `Patient${Date.now()}`,
      phone: `303-555-${String(Date.now()).slice(-4)}`,
      email: `dirsmoke-${Date.now()}@example.com`,
      dateOfBirth: "1990-05-01",
    }),
  });

  if (create.response.status !== 201) {
    throw new Error(`Patient create failed: HTTP ${create.response.status} ${JSON.stringify(create.payload)}`);
  }

  createdPatient = create.payload.data;
  if (!createdPatient?.id || !createdPatient?.familyAccountId) {
    throw new Error("Created patient did not return patient and family account linkage.");
  }

  const afterCreateCounts = await getCounts(client);
  if (afterCreateCounts.patients !== baselineCounts.patients + 1 || afterCreateCounts.families !== baselineCounts.families + 1) {
    throw new Error(`Expected unique create to add exactly one patient and one family account. Before ${JSON.stringify(baselineCounts)} after ${JSON.stringify(afterCreateCounts)}`);
  }

  const family = (
    await client.query(
      `select "id", "accountNumber" from "PmsFamilyAccount" where "id" = $1 and "tenantId" = $2 limit 1`,
      [createdPatient.familyAccountId, tenantId],
    )
  ).rows[0];
  if (!family) {
    throw new Error("Family account row was not created with the patient.");
  }

  const list = await fetchJson("/api/pms/patients", cookie);
  if (list.response.status !== 200 || !Array.isArray(list.payload.data) || !list.payload.data.some((patient) => patient.id === createdPatient.id)) {
    throw new Error("Patient directory list did not include the created patient.");
  }

  for (const query of [createdPatient.firstName, createdPatient.lastName, createdPatient.chartNumber, createdPatient.phone]) {
    const search = await fetchJson(`/api/pms/patients?q=${encodeURIComponent(String(query))}`, cookie);
    if (search.response.status !== 200 || !Array.isArray(search.payload.data) || !search.payload.data.some((patient) => patient.id === createdPatient.id)) {
      throw new Error(`Directory search did not find the patient for query: ${query}`);
    }
  }

  const duplicatePhone = await fetchJson("/api/pms/patients", cookie, {
    method: "POST",
    body: JSON.stringify({
      firstName: "Different",
      lastName: `Phone${Date.now()}`,
      phone: `(${String(createdPatient.phone || "").replace(/\D/g, "").slice(0, 3)}) ${String(createdPatient.phone || "").replace(/\D/g, "").slice(3, 6)}-${String(createdPatient.phone || "").replace(/\D/g, "").slice(6, 10)}`,
      email: `phone-dup-${Date.now()}@example.com`,
      dateOfBirth: "1991-01-01",
    }),
  });
  if (duplicatePhone.response.status !== 409 || duplicatePhone.payload?.duplicate?.id !== createdPatient.id) {
    throw new Error(`Duplicate phone should be blocked with existing patient details. Got ${duplicatePhone.response.status} ${JSON.stringify(duplicatePhone.payload)}`);
  }

  const duplicateEmail = await fetchJson("/api/pms/patients", cookie, {
    method: "POST",
    body: JSON.stringify({
      firstName: "Different",
      lastName: `Email${Date.now()}`,
      phone: `303-444-${String(Date.now()).slice(-4)}`,
      email: String(createdPatient.email || "").toUpperCase(),
      dateOfBirth: "1992-01-01",
    }),
  });
  if (duplicateEmail.response.status !== 409 || duplicateEmail.payload?.duplicate?.id !== createdPatient.id) {
    throw new Error(`Duplicate email should be blocked with existing patient details. Got ${duplicateEmail.response.status} ${JSON.stringify(duplicateEmail.payload)}`);
  }

  const duplicateNameDob = await fetchJson("/api/pms/patients", cookie, {
    method: "POST",
    body: JSON.stringify({
      firstName: String(createdPatient.firstName).toUpperCase(),
      lastName: String(createdPatient.lastName).toUpperCase(),
      phone: `303-666-${String(Date.now()).slice(-4)}`,
      email: `namedob-dup-${Date.now()}@example.com`,
      dateOfBirth: "1990-05-01",
    }),
  });
  if (duplicateNameDob.response.status !== 409 || duplicateNameDob.payload?.duplicate?.id !== createdPatient.id) {
    throw new Error(`Duplicate name+DOB should be blocked with existing patient details. Got ${duplicateNameDob.response.status} ${JSON.stringify(duplicateNameDob.payload)}`);
  }

  const afterDuplicateCounts = await getCounts(client);
  if (afterDuplicateCounts.patients !== afterCreateCounts.patients || afterDuplicateCounts.families !== afterCreateCounts.families) {
    throw new Error(`Duplicate attempts must not create extra rows. After unique ${JSON.stringify(afterCreateCounts)} after duplicates ${JSON.stringify(afterDuplicateCounts)}`);
  }

  const page = await fetch(`${baseUrl}/app/pms/patients?q=${encodeURIComponent(createdPatient.chartNumber)}`, {
    headers: { Cookie: cookie },
  });
  const html = await page.text();
  if (!page.ok || !html.includes(createdPatient.lastName) || !html.includes("Search patients")) {
    throw new Error("Patient directory page did not render the searchable directory and created patient.");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        patientId: createdPatient.id,
        chartNumber: createdPatient.chartNumber,
        familyAccountId: createdPatient.familyAccountId,
        familyAccountNumber: family.accountNumber,
        counts: {
          baseline: baselineCounts,
          afterCreate: afterCreateCounts,
          afterDuplicates: afterDuplicateCounts,
        },
      },
      null,
      2,
    ),
  );
} finally {
  if (createdPatient?.familyAccountId) {
    await client.query(`delete from "PmsPatient" where "id" = $1`, [createdPatient.id]);
    await client.query(`delete from "PmsFamilyAccount" where "id" = $1`, [createdPatient.familyAccountId]);
  }
  await client.query(`delete from "AuthSession" where "id" like 'authsess_dir_%'`);
  await client.end();
}
