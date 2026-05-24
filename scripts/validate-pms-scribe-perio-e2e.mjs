import { randomBytes, createHash, createHmac } from "node:crypto";
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

async function createDirectSessionCookie() {
  if (!process.env.DATABASE_URL) return null;
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const user = (await client.query(
      `select "id", "tenantId", "roleKey"
       from "AuthUser"
       where "tenantId" = $1
         and "status" = 'ACTIVE'
         and "roleKey" in ('owner_doctor','associate_provider','rdh','clinical_assistant','super_admin','dso_admin')
       order by case "roleKey" when 'owner_doctor' then 0 when 'associate_provider' then 1 when 'rdh' then 2 else 3 end
       limit 1`,
      [tenantId],
    )).rows[0];
    if (!user) throw new Error("No active clinical AuthUser is available for PMS e2e validation.");
    const rawToken = randomBytes(32).toString("base64url");
    await client.query(
      `insert into "AuthSession" ("id", "tenantId", "userId", "tokenHash", "expiresAt", "ipHash", "userAgentHash")
       values ($1, $2, $3, $4, current_timestamp + interval '30 minutes', $5, $6)`,
      [`authsess_e2e_${Date.now()}`, user.tenantId, user.id, sha256(rawToken), sha256("pms-e2e"), sha256("pms-e2e")],
    );
    return `${cookieName}=${signToken(rawToken)}`;
  } finally {
    await client.end();
  }
}

async function loginCookie() {
  if (process.env.PMS_E2E_COOKIE) return process.env.PMS_E2E_COOKIE;
  if (process.env.PMS_E2E_EMAIL && process.env.PMS_E2E_PASSWORD) {
    const form = new FormData();
    form.set("email", process.env.PMS_E2E_EMAIL);
    form.set("password", process.env.PMS_E2E_PASSWORD);
    form.set("next", "/app/pms/scribe");
    const response = await fetch(`${baseUrl}/login`, { method: "POST", body: form, redirect: "manual" });
    const setCookie = response.headers.get("set-cookie");
    if (!setCookie) throw new Error(`Login did not return a session cookie. HTTP ${response.status}`);
    return setCookie.split(";")[0];
  }
  const direct = await createDirectSessionCookie();
  if (direct) return direct;
  throw new Error("Set PMS_E2E_COOKIE, PMS_E2E_EMAIL/PMS_E2E_PASSWORD, or DATABASE_URL for authenticated e2e validation.");
}

async function api(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Cookie: cookie,
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${path} failed: HTTP ${response.status} ${payload.error || JSON.stringify(payload)}`);
  }
  return payload;
}

async function html(path) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { Cookie: cookie } });
  const text = await response.text();
  if (!response.ok) throw new Error(`GET ${path} failed: HTTP ${response.status}`);
  return text;
}

const cookie = await loginCookie();

const patientsPayload = await api("/api/pms/patients");
let patient = patientsPayload.data?.[0];
if (!patient) {
  patient = (await api("/api/pms/patients", {
    method: "POST",
    body: JSON.stringify({ firstName: "E2E", lastName: `Scribe Perio ${Date.now()}`, dateOfBirth: "1980-01-01" }),
  })).data;
}

const consent = {
  patientAcknowledged: true,
  providerAttestation: true,
  signedByName: "E2E Guardian",
  recordingMode: "manual_dictation",
};
const transcript = "Medical history reviewed with no changes. Patient reports sensitivity on tooth #19. Bitewing reviewed. Discussed MOD composite and possible crown if symptoms persist. Provider reviewed risks, benefits, alternatives, and next visit.";

const draft = (await api("/api/pms/scribe/generate", {
  method: "POST",
  body: JSON.stringify({
    patientName: `${patient.firstName} ${patient.lastName}`,
    templateKey: "specific_exam",
    transcript,
    consent,
    useAi: false,
  }),
})).data;
if (!draft?.noteBody || !draft.generation?.source) throw new Error("Scribe draft generation did not return a provider-review note.");

const saved = (await api("/api/pms/scribe/save", {
  method: "POST",
  body: JSON.stringify({
    patientId: patient.id,
    noteType: draft.noteType,
    noteBody: draft.noteBody,
    treatmentPlanName: draft.treatmentPlanName,
    treatmentPlanNote: draft.treatmentPlanNote,
    treatmentSuggestions: draft.treatmentSuggestions,
    taskDrafts: draft.taskDrafts,
    consent,
    generation: draft.generation,
  }),
})).data;
if (!saved?.noteId) throw new Error("Scribe save did not return a clinical note id.");

const chart = (await api(`/api/pms/chart/${patient.id}`)).data;
if (!JSON.stringify(chart.notes || chart.clinicalNotes || []).includes(saved.noteId)) {
  throw new Error("Saved scribe note was not readable from the patient chart.");
}

const sites = ["MB", "B", "DB", "ML", "L", "DL"];
for (const [index, site] of sites.entries()) {
  await api(`/api/pms/perio/${patient.id}/measurements`, {
    method: "POST",
    body: JSON.stringify({
      tooth: "19",
      site,
      probingDepth: index % 2 === 0 ? 5 : 3,
      bleeding: index % 2 === 0,
      recession: index % 3,
      mobility: index > 3 ? "I" : "0",
      furcation: index === 2 ? "I" : "None",
    }),
  });
}

const completedExam = (await api(`/api/pms/perio/${patient.id}/complete`, {
  method: "POST",
  body: JSON.stringify({ diagnosis: "Localized periodontal inflammation with bleeding sites. Maintenance interval and home care reviewed." }),
})).data;
if (completedExam?.status !== "COMPLETED") throw new Error("Perio closeout did not complete the exam.");

const perio = (await api(`/api/pms/perio/${patient.id}`)).data;
if ((perio.measures || []).length < 6) throw new Error("Perio measurements were not readable after writeback.");
if (perio.exam?.status !== "COMPLETED") throw new Error("Completed perio exam was not readable after closeout.");

const scribePage = await html("/app/pms/scribe");
if (!scribePage.includes("Scribing and notes") || !scribePage.includes("Save approved output")) {
  throw new Error("Scribe page did not render the production scribe workspace.");
}
const perioPage = await html(`/app/pms/perio/${patient.id}`);
if (!perioPage.includes("Perio chart") || !perioPage.includes("Diagnosis / RDH assessment")) {
  throw new Error("Perio page did not render the production perio workspace.");
}

console.log(JSON.stringify({
  ok: true,
  baseUrl,
  patientId: patient.id,
  scribeNoteId: saved.noteId,
  treatmentItemCount: saved.treatmentItemIds?.length ?? 0,
  taskCount: saved.taskIds?.length ?? 0,
  perioExamId: completedExam.id,
  perioMeasureCount: perio.measures.length,
}, null, 2));
