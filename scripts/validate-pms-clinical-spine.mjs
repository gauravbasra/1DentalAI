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
  const userId = `authuser_spine_${Date.now()}`;
  createdAuthUserId = userId;
  const email = `clinical-spine-${Date.now()}@example.com`;
  const emailHash = sha256(email);
  await client.query(
    `insert into "AuthUser"
       ("id", "tenantId", "email", "emailHash", "displayName", "roleKey", "status", "passwordHash", "passwordSalt", "mfaRequired", "mustChangePassword", "failedLoginCount", "passwordIterations")
     values ($1, $2, $3, $4, 'Clinical Spine Smoke', 'owner_doctor', 'ACTIVE', $5, $6, false, false, 0, 310000)`,
    [userId, tenantId, email, emailHash, sha256("clinical-spine"), sha256("clinical-spine-salt")],
  );
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = sha256(rawToken);
  const sessionId = `authsess_spine_${Date.now()}`;

  await client.query(
    `insert into "AuthSession" ("id", "tenantId", "userId", "tokenHash", "expiresAt", "ipHash", "userAgentHash")
     values ($1, $2, $3, $4, current_timestamp + interval '30 minutes', $5, $6)`,
    [sessionId, tenantId, userId, tokenHash, sha256("pms-spine"), sha256("pms-spine")],
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
let createdTreatmentPlan;
let createdTreatmentPlanItem;
let createdProcedure;
let createdImaging;
let procedureCodeId;
let createdAuthUserId;

try {
  const cookie = await createDirectSessionCookie(client);
  procedureCodeId = (
    await client.query(`select "id" from "PmsProcedureCode" where "tenantId" = $1 order by "category", "code" limit 1`, [tenantId])
  ).rows[0]?.id;
  if (!procedureCodeId) {
    throw new Error("No active PMS procedure code was available for clinical spine smoke validation.");
  }

  const patientCreate = await fetchJson("/api/pms/patients", cookie, {
    method: "POST",
    body: JSON.stringify({
      firstName: `Spine${Date.now()}`,
      lastName: "Patient",
      phone: `303-888-${String(Date.now()).slice(-4)}`,
      email: `spine-${Date.now()}@example.com`,
      dateOfBirth: "1987-11-09",
    }),
  });
  if (patientCreate.response.status !== 201) {
    throw new Error(`Patient create failed: HTTP ${patientCreate.response.status} ${JSON.stringify(patientCreate.payload)}`);
  }
  createdPatient = patientCreate.payload.data;

  const appointmentCreate = await fetchJson("/api/pms/schedule/holds", cookie, {
    method: "POST",
    body: JSON.stringify({
      patientId: createdPatient.id,
      startsAt: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
      endsAt: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
      appointmentType: "Comprehensive exam",
      notes: "Clinical spine smoke test",
    }),
  });
  if (appointmentCreate.response.status !== 201) {
    throw new Error(`Appointment create failed: HTTP ${appointmentCreate.response.status} ${JSON.stringify(appointmentCreate.payload)}`);
  }
  createdAppointment = appointmentCreate.payload.data;

  const planCreate = await fetchJson("/api/pms/treatment-plans", cookie, {
    method: "POST",
    body: JSON.stringify({
      action: "createPlan",
      patientId: createdPatient.id,
      providerId: "",
      name: `Spine plan ${Date.now()}`,
      presentationNote: "Clinical spine smoke test",
    }),
  });
  if (planCreate.response.status !== 201) {
    throw new Error(`Treatment plan create failed: HTTP ${planCreate.response.status} ${JSON.stringify(planCreate.payload)}`);
  }
  createdTreatmentPlan = planCreate.payload.data;

  const planItemCreate = await fetchJson("/api/pms/treatment-plans", cookie, {
    method: "POST",
    body: JSON.stringify({
      action: "addItem",
      treatmentPlanId: createdTreatmentPlan.id,
      procedureCodeId,
    }),
  });
  if (planItemCreate.response.status !== 201) {
    throw new Error(`Treatment plan item create failed: HTTP ${planItemCreate.response.status} ${JSON.stringify(planItemCreate.payload)}`);
  }
  createdTreatmentPlanItem = planItemCreate.payload.data;

  const statusPath = `/api/pms/appointments/${createdAppointment.id}/status`;
  for (const status of ["SCHEDULED", "CONFIRMED", "ARRIVED", "SEATED", "IN_PROGRESS", "READY_FOR_CHECKOUT"]) {
    const step = await fetchJson(statusPath, cookie, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
    if (step.response.status !== 200) {
      throw new Error(`Appointment status transition to ${status} failed: HTTP ${step.response.status} ${JSON.stringify(step.payload)}`);
    }
  }

  const procedureCreate = await fetchJson(`/api/pms/appointments/${createdAppointment.id}/procedures`, cookie, {
    method: "POST",
    body: JSON.stringify({
      procedureCodeId,
      tooth: "19",
      surface: "MO",
      feeCents: 12500,
      status: "PLANNED",
    }),
  });
  if (procedureCreate.response.status !== 201) {
    throw new Error(`Appointment procedure create failed: HTTP ${procedureCreate.response.status} ${JSON.stringify(procedureCreate.payload)}`);
  }
  createdProcedure = procedureCreate.payload.data;

  const noteCreate = await fetchJson(`/api/pms/chart/${createdPatient.id}/notes`, cookie, {
    method: "POST",
    body: JSON.stringify({
      body: "Clinical spine smoke test note.",
      noteType: "PROGRESS",
      appointmentId: createdAppointment.id,
      noteTemplateKey: "appointment_encounter",
    }),
  });
  if (noteCreate.response.status !== 201) {
    throw new Error(`Clinical note create failed: HTTP ${noteCreate.response.status} ${JSON.stringify(noteCreate.payload)}`);
  }
  const noteId = noteCreate.payload.data.id;

  const signNote = await fetchJson(`/api/pms/chart/${createdPatient.id}/notes`, cookie, {
    method: "PATCH",
    body: JSON.stringify({ action: "sign", noteId }),
  });
  if (signNote.response.status !== 200) {
    throw new Error(`Clinical note sign failed: HTTP ${signNote.response.status} ${JSON.stringify(signNote.payload)}`);
  }

  for (const [index, site] of ["MB", "B", "DB", "ML", "L", "DL"].entries()) {
    const measure = await fetchJson(`/api/pms/perio/${createdPatient.id}/measurements`, cookie, {
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
    if (measure.response.status !== 201) {
      throw new Error(`Perio measurement failed: HTTP ${measure.response.status} ${JSON.stringify(measure.payload)}`);
    }
  }

  const perioComplete = await fetchJson(`/api/pms/perio/${createdPatient.id}/complete`, cookie, {
    method: "POST",
    body: JSON.stringify({ diagnosis: "Localized periodontal inflammation with bleeding sites." }),
  });
  if (perioComplete.response.status !== 200) {
    throw new Error(`Perio completion failed: HTTP ${perioComplete.response.status} ${JSON.stringify(perioComplete.payload)}`);
  }

  const imagingCreate = await fetchJson("/api/pms/imaging", cookie, {
    method: "POST",
    body: JSON.stringify({
      patientId: createdPatient.id,
      providerId: "",
      appointmentId: createdAppointment.id,
      studyType: "BITEWING",
      acquisitionStatus: "ORDERED",
      tooth: "19",
      region: "Posterior left",
      dicomStudyUid: `1.2.840.${Date.now()}`,
      storageUri: `s3://pms/spine/${Date.now()}.dcm`,
      findings: "Clinical spine smoke test imaging record.",
      aiReviewStatus: "NOT_REQUESTED",
      takenAt: new Date().toISOString(),
    }),
  });
  if (imagingCreate.response.status !== 201) {
    throw new Error(`Imaging create failed: HTTP ${imagingCreate.response.status} ${JSON.stringify(imagingCreate.payload)}`);
  }
  createdImaging = imagingCreate.payload.data;

  const checkout = await fetchJson(`/api/pms/appointments/${createdAppointment.id}/checkout`, cookie, {
    method: "POST",
    body: JSON.stringify({
      procedureIds: [createdProcedure.id],
      paymentCents: 0,
      paymentType: "CARD",
      paymentReference: "clinical-spine-smoke",
      createClaimDraft: false,
      overrideBlockers: true,
      checkoutNote: "Clinical spine smoke test checkout",
    }),
  });
  if (checkout.response.status !== 201) {
    throw new Error(`Checkout failed: HTTP ${checkout.response.status} ${JSON.stringify(checkout.payload)}`);
  }

  const chart = await fetchJson(`/api/pms/chart/${createdPatient.id}`, cookie);
  if (chart.response.status !== 200) {
    throw new Error(`Chart API failed: HTTP ${chart.response.status} ${JSON.stringify(chart.payload)}`);
  }

  const appointmentPage = await fetch(`${baseUrl}/app/pms/appointments/${createdAppointment.id}`, { headers: { Cookie: cookie } });
  const appointmentHtml = await appointmentPage.text();
  if (!appointmentPage.ok || !appointmentHtml.includes("Status history") || !appointmentHtml.includes("Linked work")) {
    throw new Error("Appointment detail page did not render the clinical spine sections.");
  }

  const chartPage = await fetch(`${baseUrl}/app/pms/chart/${createdPatient.id}`, { headers: { Cookie: cookie } });
  const chartHtml = await chartPage.text();
  if (!chartPage.ok || !chartHtml.includes("Clinical alerts and history") || !chartHtml.includes("Procedure history")) {
    throw new Error("Chart page did not render the core clinical spine sections.");
  }

  console.log(JSON.stringify({
    ok: true,
    patientId: createdPatient.id,
    appointmentId: createdAppointment.id,
    treatmentPlanId: createdTreatmentPlan.id,
    treatmentPlanItemId: createdTreatmentPlanItem?.id ?? null,
    procedureId: createdProcedure.id,
    imagingId: createdImaging.id,
  }, null, 2));
} finally {
  if (createdImaging?.id) {
    await client.query(`delete from "PmsImagingStudy" where "id" = $1`, [createdImaging.id]);
  }
  if (createdProcedure?.id) {
    await client.query(`delete from "PmsProcedureLog" where "appointmentProcedureId" = $1`, [createdProcedure.id]);
    await client.query(`delete from "PmsAppointmentProcedure" where "id" = $1`, [createdProcedure.id]);
  }
  if (createdTreatmentPlanItem?.id) {
    await client.query(`delete from "PmsTreatmentPlanItem" where "id" = $1`, [createdTreatmentPlanItem.id]);
  }
  if (createdTreatmentPlan?.id) {
    await client.query(`delete from "PmsTreatmentPlan" where "id" = $1`, [createdTreatmentPlan.id]);
  }
  if (createdAppointment?.id) {
    await client.query(`delete from "PmsAppointmentStatusHistory" where "appointmentId" = $1`, [createdAppointment.id]);
    await client.query(`delete from "PmsAuditEvent" where "targetType" = 'PmsAppointment' and "targetId" = $1`, [createdAppointment.id]);
    await client.query(`delete from "PmsAppointment" where "id" = $1`, [createdAppointment.id]);
  }
  if (createdPatient?.id) {
    await client.query(`delete from "PmsClinicalNote" where "patientId" = $1`, [createdPatient.id]);
    await client.query(`delete from "PmsPerioMeasure" where "perioExamId" in (select "id" from "PmsPerioExam" where "patientId" = $1)`, [createdPatient.id]);
    await client.query(`delete from "PmsPerioExam" where "patientId" = $1`, [createdPatient.id]);
    await client.query(`delete from "PmsPatient" where "id" = $1`, [createdPatient.id]);
    await client.query(`delete from "PmsFamilyAccount" where "id" = $1`, [createdPatient.familyAccountId]);
  }
  await client.query(`delete from "AuthSession" where "id" like 'authsess_spine_%'`);
  if (createdAuthUserId) {
    await client.query(`delete from "AuthUser" where "id" = $1`, [createdAuthUserId]);
  }
  await client.end();
}
