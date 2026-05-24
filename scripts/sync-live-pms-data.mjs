#!/usr/bin/env node
import crypto from "node:crypto";
import pg from "pg";

const { Client } = pg;

const tenantId = process.env.PMS_SYNC_TENANT_ID || "tenant_1dentalai_production";
const databaseUrl = process.env.DATABASE_URL;
const source = (process.env.PMS_SYNC_SOURCE || "NEXHEALTH").toUpperCase();

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const client = new Client({ connectionString: databaseUrl });

const hashId = (prefix, value) =>
  `${prefix}_${crypto.createHash("sha1").update(String(value)).digest("hex").slice(0, 24)}`;

const text = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
};

const dateOrNull = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

function addMinutes(iso, minutes) {
  const start = dateOrNull(iso);
  if (!start) return null;
  return new Date(new Date(start).getTime() + minutes * 60_000).toISOString();
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.PMS_SYNC_FETCH_TIMEOUT_MS || 20_000));
  let response;
  try {
    response = await fetch(url, { ...options, cache: "no-store", signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`PMS source request failed ${response.status} ${response.statusText} for ${url}: ${body.slice(0, 240)}`);
  }
  return body ? JSON.parse(body) : null;
}

async function authenticateNexHealth() {
  const apiKey = process.env.NEXHEALTH_API_KEY;
  if (!apiKey) throw new Error("NEXHEALTH_API_KEY is required for NexHealth sync.");
  const baseUrl = (process.env.NEXHEALTH_BASE_URL || "https://nexhealth.info").replace(/\/+$/, "");
  const payload = await fetchJson(`${baseUrl}/authenticates`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.Nexhealth+json;version=2",
      "Nex-Api-Version": "v20240412",
      Authorization: apiKey,
    },
  });
  const token = payload?.data?.token;
  if (!token) throw new Error("NexHealth authentication succeeded but did not return a token.");
  return { baseUrl, token };
}

async function fetchNexHealth(path, auth) {
  return fetchJson(`${auth.baseUrl}${path}`, {
    headers: {
      Accept: "application/vnd.Nexhealth+json;version=2",
      "Nex-Api-Version": "v20240412",
      Authorization: `Bearer ${auth.token}`,
    },
  });
}

async function loadNexHealth() {
  const auth = await authenticateNexHealth();
  const institutionsPayload = await fetchNexHealth("/institutions", auth);
  const institutions = institutionsPayload?.data || [];
  if (!institutions.length) throw new Error("NexHealth returned no institutions.");

  const requestedSubdomain = process.env.NEXHEALTH_SUBDOMAIN || process.env.NEXHEALTH_SUBDOMAIN_OR_ORG_ID || "";
  const institution = institutions.find((item) => item.subdomain === requestedSubdomain) || institutions[0];
  const locations = (institution.locations || []).filter((item) => !item.inactive);
  const location = locations[0] || institution.locations?.[0];
  if (!location) throw new Error(`NexHealth institution ${institution.name || institution.id} has no location.`);

  const perPage = Number(process.env.PMS_SYNC_PAGE_SIZE || 100);
  const patientsPayload = await fetchNexHealth(
    `/patients?subdomain=${encodeURIComponent(institution.subdomain)}&location_id=${location.id}&page=1&per_page=${perPage}&new_patient=false&location_strict=false`,
    auth,
  );
  const patients = patientsPayload?.data?.patients || patientsPayload?.data || [];

  const start = process.env.PMS_SYNC_START_DATE || new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const end = process.env.PMS_SYNC_END_DATE || new Date(Date.now() + 60 * 86400_000).toISOString().slice(0, 10);
  const appointmentsPayload = await fetchNexHealth(
    `/appointments?subdomain=${encodeURIComponent(institution.subdomain)}&location_id=${location.id}&start=${encodeURIComponent(`${start}T00:00:00+0000`)}&end=${encodeURIComponent(`${end}T23:59:59+0000`)}&page=1&per_page=${perPage}`,
    auth,
  );
  const appointments = appointmentsPayload?.data || [];

  const coverages = [];
  for (const patient of patients.slice(0, Number(process.env.PMS_SYNC_COVERAGE_LIMIT || 100))) {
    try {
      const payload = await fetchNexHealth(
        `/patients/${patient.id}/insurance_coverages?subdomain=${encodeURIComponent(institution.subdomain)}&page=1&per_page=10`,
        auth,
      );
      for (const coverage of payload?.data || []) coverages.push({ patientId: patient.id, coverage });
    } catch (error) {
      console.warn(`Coverage sync skipped for NexHealth patient ${patient.id}: ${error.message}`);
    }
  }

  return {
    sourceName: "NEXHEALTH",
    institutionName: institution.name || institution.subdomain,
    locationName: location.name || `Location ${location.id}`,
    patients,
    appointments,
    coverages,
  };
}

async function loadOpenDental() {
  const baseUrl = process.env.OPENDENTAL_BASE_URL?.replace(/\/+$/, "");
  const apiKey = process.env.OPENDENTAL_API_KEY;
  if (!baseUrl || !apiKey) throw new Error("OPENDENTAL_BASE_URL and OPENDENTAL_API_KEY are required for Open Dental sync.");
  const headers = { Accept: "application/json", Authorization: apiKey };
  const start = process.env.PMS_SYNC_START_DATE || new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const end = process.env.PMS_SYNC_END_DATE || new Date(Date.now() + 60 * 86400_000).toISOString().slice(0, 10);
  const patients = await fetchJson(`${baseUrl}/patients?Offset=0`, { headers });
  const appointments = await fetchJson(`${baseUrl}/appointments?dateStart=${start}&dateEnd=${end}&Offset=0`, { headers });
  return {
    sourceName: "OPEN_DENTAL",
    institutionName: process.env.OPENDENTAL_PRACTICE_NAME || "Open Dental",
    locationName: "Open Dental",
    patients: Array.isArray(patients) ? patients : [],
    appointments: Array.isArray(appointments) ? appointments : [],
    coverages: [],
  };
}

function normalizeNexHealthPatient(item) {
  const firstName = text(item.first_name) || text(item.name).split(" ")[0] || "Unknown";
  const lastName = text(item.last_name) || text(item.name).split(" ").slice(1).join(" ") || "Patient";
  return {
    sourceId: String(item.id),
    chartNumber: text(item.foreign_id, `NH${item.id}`),
    firstName,
    lastName,
    dob: item.bio?.date_of_birth || null,
    phone: item.bio?.phone_number || item.bio?.verified_mobile || null,
    email: item.email || null,
    sex: item.bio?.gender || null,
    note: `Imported from NexHealth${item.foreign_id_type ? ` (${item.foreign_id_type})` : ""}.`,
  };
}

function normalizeOpenDentalPatient(item) {
  return {
    sourceId: String(item.PatNum),
    chartNumber: text(item.ChartNumber, `OD${item.PatNum}`),
    firstName: text(item.FName, "Unknown"),
    lastName: text(item.LName, "Patient"),
    dob: item.Birthdate || null,
    phone: item.WirelessPhone || item.HmPhone || item.WkPhone || null,
    email: item.Email || null,
    sex: item.Gender || null,
    note: `Imported from Open Dental PatNum ${item.PatNum}.`,
  };
}

function normalizeNexHealthAppointment(item) {
  const startsAt = dateOrNull(item.start_time);
  return {
    sourceId: String(item.id),
    patientSourceId: String(item.patient_id || item.patient?.id || ""),
    providerName: text(item.provider_name, "Unassigned provider"),
    startsAt,
    endsAt: dateOrNull(item.end_time) || addMinutes(startsAt, 60),
    status: item.cancelled ? "CANCELLED" : item.confirmed ? "CONFIRMED" : "UNCONFIRMED",
    appointmentType: text(item.misc?.appointment_type || item.misc?.type, "NexHealth appointment"),
    notes: `Imported from NexHealth appointment ${item.id}${item.foreign_id ? ` / PMS ${item.foreign_id}` : ""}.`,
  };
}

function normalizeOpenDentalAppointment(item) {
  const startsAt = dateOrNull(String(item.AptDateTime || "").replace(" ", "T"));
  return {
    sourceId: String(item.AptNum),
    patientSourceId: String(item.PatNum || ""),
    providerName: text(item.provAbbr, item.ProvNum ? `Provider ${item.ProvNum}` : "Unassigned provider"),
    startsAt,
    endsAt: addMinutes(startsAt, Math.max(30, String(item.Pattern || "").replaceAll("/", "").length * 10)),
    status: item.AptStatus === "Complete" ? "COMPLETED" : item.AptStatus === "Broken" ? "BROKEN" : item.AptStatus === "Scheduled" ? "CONFIRMED" : text(item.AptStatus, "UNCONFIRMED").toUpperCase(),
    appointmentType: text(item.ProcDescript, "Open Dental appointment"),
    notes: `Imported from Open Dental AptNum ${item.AptNum}; confirmation ${text(item.confirmed, "unknown")}.`,
  };
}

function normalizeCoverageSubscriber(coverage, patientId, sourceName) {
  const memberNumber = text(coverage.member_id || coverage.subscriber_id || coverage.policy_number, "");
  const subscriberId = text(coverage.subscriber_name || memberNumber, "");
  if (subscriberId) {
    return { subscriberId, memberNumber: memberNumber || null, requiresReview: false };
  }
  const fallback = `MISSING-${hashId(`sub_${sourceName.toLowerCase()}`, `${patientId}:${coverage.id || coverage.payer_name || "coverage"}`).slice(-12).toUpperCase()}`;
  return { subscriberId: fallback, memberNumber: null, requiresReview: true };
}

async function upsertPatient(row, sourceName) {
  const patientId = hashId(`pat_${sourceName.toLowerCase()}`, row.sourceId);
  const familyId = hashId(`fam_${sourceName.toLowerCase()}`, row.sourceId);
  await client.query(
    `insert into "PmsFamilyAccount" ("id", "tenantId", "accountNumber", "displayName", "guarantorPatientId", "billingType", "billingStatus", "phone", "email", "createdAt", "updatedAt")
     values ($1, $2, $3, $4, $5, 'STANDARD', 'CURRENT', $6, $7, current_timestamp, current_timestamp)
     on conflict ("tenantId", "accountNumber") do update set
       "displayName" = excluded."displayName",
       "phone" = excluded."phone",
       "email" = excluded."email",
       "updatedAt" = current_timestamp`,
    [familyId, tenantId, `${sourceName}-${row.sourceId}`, `${row.lastName} family`, patientId, row.phone, row.email],
  );
  await client.query(
    `insert into "PmsPatient"
       ("id", "tenantId", "familyAccountId", "chartNumber", "firstName", "lastName", "preferredName", "dateOfBirth", "phone", "email", "sex", "primaryLocationId", "responsibleParty", "referralSource", "status", "privacyLevel", "patientNote", "createdAt", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $5, $7::date, $8, $9, $10, 'loc_primary', 'SELF', $11, 'ACTIVE', 'STANDARD', $12, current_timestamp, current_timestamp)
     on conflict ("tenantId", "chartNumber") do update set
       "familyAccountId" = excluded."familyAccountId",
       "firstName" = excluded."firstName",
       "lastName" = excluded."lastName",
       "dateOfBirth" = excluded."dateOfBirth",
       "phone" = excluded."phone",
       "email" = excluded."email",
       "sex" = excluded."sex",
       "patientNote" = excluded."patientNote",
       "status" = 'ACTIVE',
       "updatedAt" = current_timestamp
     returning "id"`,
    [patientId, tenantId, familyId, row.chartNumber, row.firstName, row.lastName, row.dob, row.phone, row.email, row.sex, sourceName, row.note],
  );
  return patientId;
}

async function upsertProvider(providerName, sourceName) {
  const id = hashId(`provider_${sourceName.toLowerCase()}`, providerName);
  await client.query(
    `insert into "PmsProvider" ("id", "tenantId", "displayName", "providerType", "status", "createdAt", "updatedAt")
     values ($1, $2, $3, $4, 'ACTIVE', current_timestamp, current_timestamp)
     on conflict ("id") do update set "displayName" = excluded."displayName", "updatedAt" = current_timestamp`,
    [id, tenantId, providerName, /rdh|hyg/i.test(providerName) ? "RDH" : "DENTIST"],
  );
  return id;
}

async function upsertAppointment(row, sourceName, patientMap) {
  if (!row.startsAt || !row.endsAt || !row.patientSourceId) return false;
  const patientId = patientMap.get(row.patientSourceId);
  if (!patientId) return false;
  const providerId = await upsertProvider(row.providerName, sourceName);
  const id = hashId(`appt_${sourceName.toLowerCase()}`, row.sourceId);
  await client.query(
    `insert into "PmsAppointment" ("id", "tenantId", "patientId", "providerId", "operatoryId", "startsAt", "endsAt", "status", "appointmentType", "productionCents", "readinessStatus", "notes", "createdAt", "updatedAt")
     values ($1, $2, $3, $4, null, $5::timestamp, $6::timestamp, $7, $8, 0, 'NEEDS_REVIEW', $9, current_timestamp, current_timestamp)
     on conflict ("id") do update set
       "patientId" = excluded."patientId",
       "providerId" = excluded."providerId",
       "startsAt" = excluded."startsAt",
       "endsAt" = excluded."endsAt",
       "status" = excluded."status",
       "appointmentType" = excluded."appointmentType",
       "notes" = excluded."notes",
       "updatedAt" = current_timestamp`,
    [id, tenantId, patientId, providerId, row.startsAt, row.endsAt, row.status, row.appointmentType, row.notes],
  );
  return true;
}

async function upsertCoverage(item, sourceName, patientMap) {
  const patientId = patientMap.get(String(item.patientId));
  const coverage = item.coverage;
  if (!patientId || !coverage) return false;
  const payerName = text(coverage.payer_name, "Unknown payer");
  const subscriber = normalizeCoverageSubscriber(coverage, patientId, sourceName);
  const eligibilityStatus = coverage.active === false ? "INACTIVE" : subscriber.requiresReview ? "NEEDS_REVIEW" : "ACTIVE";
  const verificationNote = [
    `Imported from ${sourceName} coverage ${coverage.id || payerName}.`,
    subscriber.requiresReview ? "Source coverage did not include subscriber/member ID; staff review required before claims or benefit reliance." : "",
  ].filter(Boolean).join(" ");
  const planId = hashId(`plan_${sourceName.toLowerCase()}`, `${payerName}:${coverage.plan_name || ""}:${coverage.group_number || ""}`);
  const insuranceId = hashId(`pins_${sourceName.toLowerCase()}`, `${patientId}:${coverage.id || payerName}`);
  await client.query(
    `insert into "PmsInsurancePlan" ("id", "tenantId", "payerName", "payerId", "planName", "planType", "groupNumber", "networkStatus", "status", "createdAt", "updatedAt")
     values ($1, $2, $3, $4, $5, 'PPO', $6, 'UNKNOWN', 'ACTIVE', current_timestamp, current_timestamp)
     on conflict ("id") do update set "payerName" = excluded."payerName", "planName" = excluded."planName", "groupNumber" = excluded."groupNumber", "updatedAt" = current_timestamp`,
    [planId, tenantId, payerName, text(coverage.payer_id, payerName), text(coverage.plan_name, "NexHealth plan"), coverage.group_number || null],
  );
  await client.query(
    `insert into "PmsPatientInsurance" ("id", "tenantId", "patientId", "planId", "subscriberId", "memberNumber", "relationship", "priority", "eligibilityStatus", "lastVerifiedAt", "verificationNote", "createdAt", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, 'SELF', 1, $7, current_timestamp, $8, current_timestamp, current_timestamp)
     on conflict ("id") do update set
       "tenantId" = excluded."tenantId",
       "planId" = excluded."planId",
       "subscriberId" = excluded."subscriberId",
       "memberNumber" = excluded."memberNumber",
       "eligibilityStatus" = excluded."eligibilityStatus",
       "lastVerifiedAt" = current_timestamp,
       "verificationNote" = excluded."verificationNote",
       "updatedAt" = current_timestamp`,
    [insuranceId, tenantId, patientId, planId, subscriber.subscriberId, subscriber.memberNumber, eligibilityStatus, verificationNote],
  );
  return true;
}

async function cleanupSamplePmsData() {
  const statements = [
    `delete from "PmsTreatmentCoverageAnalysis" where "treatmentPlanId" like 'txp_sample_%' or "treatmentPlanItemId" like 'txi_sample_%' or "patientInsuranceId" like 'pins_sample_%'`,
    `delete from "PmsPayerCasePacket" where "treatmentPlanId" like 'txp_sample_%' or "patientInsuranceId" like 'pins_sample_%'`,
    `delete from "PmsBenefitRule" where "patientInsuranceId" like 'pins_sample_%'`,
    `delete from "PmsBenefitFact" where "patientInsuranceId" like 'pins_sample_%'`,
    `delete from "PmsBenefitSummary" where "patientInsuranceId" like 'pins_sample_%'`,
    `delete from "PmsPayment" where "id" like 'pay_sample_%'`,
    `delete from "PmsLedgerAdjustment" where "id" like '%sample%' or "patientId" like 'pat_sample_%'`,
    `delete from "PmsLedgerEntry" where "id" like 'led_sample_%' or "patientId" like 'pat_sample_%'`,
    `delete from "PmsClaimLine" where "id" like 'cline_sample_%' or "claimId" like 'claim_sample_%'`,
    `delete from "PmsClaim" where "id" like 'claim_sample_%' or "patientId" like 'pat_sample_%'`,
    `delete from "PmsTreatmentPlanItem" where "id" like 'txi_sample_%' or "treatmentPlanId" like 'txp_sample_%'`,
    `delete from "PmsTreatmentPlan" where "id" like 'txp_sample_%' or "patientId" like 'pat_sample_%'`,
    `delete from "PmsPerioMeasure" where "id" like 'pm_sample_%' or "perioExamId" like 'perio_sample_%'`,
    `delete from "PmsPerioExam" where "id" like 'perio_sample_%' or "patientId" like 'pat_sample_%'`,
    `delete from "PmsProcedureLog" where "id" like 'plog_sample_%' or "patientId" like 'pat_sample_%'`,
    `delete from "PmsToothCondition" where "id" like 'tc_sample_%' or "patientId" like 'pat_sample_%'`,
    `delete from "PmsClinicalNote" where "id" like 'note_sample_%' or "patientId" like 'pat_sample_%'`,
    `delete from "PmsReferral" where "id" like 'ref_sample_%' or "patientId" like 'pat_sample_%'`,
    `delete from "PmsPrescription" where "id" like 'rx_sample_%' or "patientId" like 'pat_sample_%'`,
    `delete from "PmsLabCase" where "id" like 'lab_sample_%' or "patientId" like 'pat_sample_%'`,
    `delete from "PmsImagingStudy" where "id" like 'img_sample_%' or "patientId" like 'pat_sample_%'`,
    `delete from "PmsDocument" where "id" like 'doc_sample_%' or "patientId" like 'pat_sample_%'`,
    `delete from "PmsRecall" where "id" like 'recall_sample_%' or "patientId" like 'pat_sample_%'`,
    `delete from "PmsAppointmentRequest" where "id" like 'areq_sample_%' or "patientId" like 'pat_sample_%'`,
    `delete from "PmsTask" where "id" like 'task_sample_%' or "patientId" like 'pat_sample_%'`,
    `delete from "PmsAppointmentProcedure" where "id" like '%sample%'`,
    `delete from "PmsAppointmentStatusHistory" where "appointmentId" like 'appt_sample_%'`,
    `delete from "PmsCheckoutSession" where "appointmentId" like 'appt_sample_%'`,
    `delete from "PmsAppointment" where "id" like 'appt_sample_%' or "patientId" like 'pat_sample_%'`,
    `delete from "PmsPatientInsurance" where "id" like 'pins_sample_%' or "patientId" like 'pat_sample_%'`,
    `delete from "PmsPatientCommunicationPreference" where "patientId" like 'pat_sample_%'`,
    `delete from "PmsPatientConsent" where "patientId" like 'pat_sample_%'`,
    `delete from "PmsMedicalHistoryEntry" where "patientId" like 'pat_sample_%'`,
    `delete from "PmsMedication" where "patientId" like 'pat_sample_%'`,
    `delete from "PmsAllergy" where "patientId" like 'pat_sample_%'`,
    `delete from "PmsMedicalAlert" where "patientId" like 'pat_sample_%'`,
    `delete from "PmsPatientPharmacy" where "patientId" like 'pat_sample_%'`,
    `delete from "PmsPatient" where "id" like 'pat_sample_%' or "email" like '%@example.test'`,
    `delete from "PmsFamilyAccount" where "id" like 'fam_sample_%' or "email" like '%@example.test'`,
    `delete from "PmsProvider" where "id" like 'provider_sample_%'`,
    `delete from "PmsStaffMember" where "id" like 'staff_sample_%'`,
  ];
  for (const statement of statements) await client.query(statement);
}

async function main() {
  await client.connect();
  const raw = source === "OPEN_DENTAL" ? await loadOpenDental() : await loadNexHealth();
  const normalizePatient = raw.sourceName === "OPEN_DENTAL" ? normalizeOpenDentalPatient : normalizeNexHealthPatient;
  const normalizeAppointment = raw.sourceName === "OPEN_DENTAL" ? normalizeOpenDentalAppointment : normalizeNexHealthAppointment;
  const patients = raw.patients.map(normalizePatient).filter((row) => row.sourceId);
  const appointments = raw.appointments.map(normalizeAppointment).filter((row) => row.sourceId);

  if (!patients.length && !appointments.length) {
    throw new Error(`${raw.sourceName} sync returned no patients or appointments; refusing to clean sample data.`);
  }

  await client.query("begin");
  try {
    const patientMap = new Map();
    for (const patient of patients) patientMap.set(patient.sourceId, await upsertPatient(patient, raw.sourceName));
    let appointmentCount = 0;
    for (const appointment of appointments) if (await upsertAppointment(appointment, raw.sourceName, patientMap)) appointmentCount += 1;
    let coverageCount = 0;
    for (const coverage of raw.coverages || []) if (await upsertCoverage(coverage, raw.sourceName, patientMap)) coverageCount += 1;
    await cleanupSamplePmsData();
    await client.query(
      `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata", "createdAt")
       values ($1, $2, 'support_admin', 'LIVE_PMS_SYNC_COMPLETED', 'PMS_SYNC', $3, 'ALLOWED', $4::jsonb, current_timestamp)`,
      [hashId("audit_pms_sync", `${raw.sourceName}:${Date.now()}`), tenantId, raw.sourceName, JSON.stringify({ source: raw.sourceName, institutionName: raw.institutionName, locationName: raw.locationName, importedPatients: patientMap.size, importedAppointments: appointmentCount, importedCoverages: coverageCount, sampleDataCleaned: true })],
    );
    await client.query("commit");
    console.log(JSON.stringify({ ok: true, source: raw.sourceName, importedPatients: patientMap.size, importedAppointments: appointmentCount, importedCoverages: coverageCount, sampleDataCleaned: true }, null, 2));
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
