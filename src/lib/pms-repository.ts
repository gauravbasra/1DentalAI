import { newId, query } from "@/lib/db";

export const defaultTenantId = "tenant_1dentalai_production";

export type PmsPatientSummary = {
  id: string;
  chartNumber: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  dateOfBirth: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  privacyLevel: string;
  familyAccountId: string | null;
  responsibleParty: string | null;
  patientNote: string | null;
  openTasks: number;
  balanceCents: number;
};

export type PmsFamilyAccountRow = {
  id: string;
  accountNumber: string;
  displayName: string;
  guarantorPatientId: string | null;
  billingType: string;
  billingStatus: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  financialNote: string | null;
};

export type PmsAppointmentRow = {
  id: string;
  patientId: string | null;
  patientName: string | null;
  providerName: string | null;
  operatoryName: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  appointmentType: string;
  productionCents: number;
  readinessStatus: string;
  notes: string | null;
};

export type PmsAppointmentCategoryRow = {
  id: string;
  name: string;
  color: string;
  defaultMinutes: number;
  productionType: string;
  defaultProcedureCodes: string[];
  providerType: string | null;
};

export type PmsScheduleBoard = {
  date: string;
  operatories: Array<{ id: string; code: string; name: string; status: string }>;
  providers: Array<{ id: string; displayName: string; providerType: string }>;
  categories: PmsAppointmentCategoryRow[];
  appointments: PmsAppointmentRow[];
  blockouts: Array<{ id: string; operatoryId: string | null; providerId: string | null; startsAt: string; endsAt: string; reason: string; blockType: string }>;
  requests: Array<{ id: string; requestType: string; source: string; urgency: string; preferredWindow: string | null; status: string; note: string | null; patientName: string | null }>;
  recalls: Array<{ id: string; recallType: string; dueDate: string; status: string; procedureCodes: string[]; patientName: string }>;
  labCases: Array<{ id: string; labName: string; caseType: string; status: string; dueDate: string | null; patientName: string | null }>;
  production: { scheduledCents: number; completedCents: number; unscheduledRequests: number; dueRecalls: number; labCaseRisks: number };
};

export function cents(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

export async function getPmsDashboard(tenantId = defaultTenantId) {
  const [patients, schedule, tasks, claims, ledgers, procedures] = await Promise.all([
    query<{ count: string }>(`select count(*)::text as count from "PmsPatient" where "tenantId" = $1 and "status" = 'ACTIVE'`, [tenantId]),
    query<{ count: string; production: string }>(
      `select count(*)::text as count, coalesce(sum("productionCents"), 0)::text as production
       from "PmsAppointment"
       where "tenantId" = $1 and "startsAt"::date = current_date`,
      [tenantId],
    ),
    query<{ count: string }>(`select count(*)::text as count from "PmsTask" where "tenantId" = $1 and "status" = 'OPEN'`, [tenantId]),
    query<{ count: string; billed: string }>(
      `select count(*)::text as count, coalesce(sum("billedCents" - "paidCents"), 0)::text as billed
       from "PmsClaim"
       where "tenantId" = $1 and "status" in ('READY', 'SUBMITTED', 'REJECTED', 'DENIED')`,
      [tenantId],
    ),
    query<{ balance: string }>(
      `select coalesce(sum("balanceCents"), 0)::text as balance from "PmsLedgerEntry" where "tenantId" = $1`,
      [tenantId],
    ),
    query<{ count: string }>(`select count(*)::text as count from "PmsProcedureCode" where "tenantId" = $1`, [tenantId]),
  ]);

  return {
    activePatients: Number(patients.rows[0]?.count ?? 0),
    todayAppointments: Number(schedule.rows[0]?.count ?? 0),
    todayProductionCents: Number(schedule.rows[0]?.production ?? 0),
    openTasks: Number(tasks.rows[0]?.count ?? 0),
    claimExposureCents: Number(claims.rows[0]?.billed ?? 0),
    openClaimCount: Number(claims.rows[0]?.count ?? 0),
    patientBalanceCents: Number(ledgers.rows[0]?.balance ?? 0),
    procedureCodeCount: Number(procedures.rows[0]?.count ?? 0),
  };
}

export async function listPatients(tenantId = defaultTenantId, search = "") {
  const like = `%${search.trim()}%`;
  const result = await query<PmsPatientSummary>(
    `select
      p."id",
      p."chartNumber",
      p."firstName",
      p."lastName",
      p."preferredName",
      p."dateOfBirth"::text as "dateOfBirth",
      p."phone",
      p."email",
      p."status",
      p."privacyLevel",
      p."familyAccountId",
      p."responsibleParty",
      p."patientNote",
      coalesce(t.open_tasks, 0)::int as "openTasks",
      coalesce(l.balance_cents, 0)::int as "balanceCents"
     from "PmsPatient" p
     left join (
       select "patientId", count(*) as open_tasks
       from "PmsTask"
       where "tenantId" = $1 and "status" = 'OPEN'
       group by "patientId"
     ) t on t."patientId" = p."id"
     left join (
       select "patientId", sum("balanceCents") as balance_cents
       from "PmsLedgerEntry"
       where "tenantId" = $1
       group by "patientId"
     ) l on l."patientId" = p."id"
     where p."tenantId" = $1
       and ($2 = '%%' or p."firstName" ilike $2 or p."lastName" ilike $2 or p."chartNumber" ilike $2 or p."phone" ilike $2)
     order by p."lastName", p."firstName"
     limit 100`,
    [tenantId, like],
  );
  return result.rows;
}

export async function createPatient(input: {
  tenantId?: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  sex?: string;
  responsibleParty?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  referralSource?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const chart = await query<{ next: string }>(
    `select ('P' || lpad((coalesce(max(substring("chartNumber" from 2)::int), 0) + 1)::text, 6, '0')) as next
     from "PmsPatient"
     where "tenantId" = $1 and "chartNumber" ~ '^P[0-9]+$'`,
    [tenantId],
  );
  const id = newId("pat");
  const familyId = newId("fam");
  const chartNumber = chart.rows[0]?.next ?? "P000001";
  const accountNumber = `F${chartNumber.slice(1)}`;

  await query(
    `insert into "PmsFamilyAccount"
       ("id", "tenantId", "accountNumber", "displayName", "guarantorPatientId", "billingType", "billingStatus",
        "addressLine1", "addressLine2", "city", "state", "postalCode", "phone", "email", "updatedAt")
     values ($1, $2, $3, $4, $5, 'STANDARD', 'CURRENT', $6, $7, $8, $9, $10, $11, $12, current_timestamp)`,
    [
      familyId,
      tenantId,
      accountNumber,
      `${input.lastName.trim()} family`,
      id,
      input.addressLine1?.trim() || null,
      input.addressLine2?.trim() || null,
      input.city?.trim() || null,
      input.state?.trim() || null,
      input.postalCode?.trim() || null,
      input.phone?.trim() || null,
      input.email?.trim() || null,
    ],
  );

  const result = await query<PmsPatientSummary>(
    `insert into "PmsPatient"
       ("id", "tenantId", "familyAccountId", "chartNumber", "firstName", "lastName", "preferredName", "dateOfBirth", "phone", "email",
        "sex", "responsibleParty", "referralSource", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8::timestamp, $9, $10, $11, $12, $13, current_timestamp)
     returning "id", "chartNumber", "firstName", "lastName", "preferredName", "dateOfBirth"::text as "dateOfBirth",
       "phone", "email", "status", "privacyLevel", "familyAccountId", "responsibleParty", "patientNote", 0::int as "openTasks", 0::int as "balanceCents"`,
    [
      id,
      tenantId,
      familyId,
      chartNumber,
      input.firstName.trim(),
      input.lastName.trim(),
      input.preferredName?.trim() || null,
      input.dateOfBirth || null,
      input.phone?.trim() || null,
      input.email?.trim() || null,
      input.sex?.trim() || null,
      input.responsibleParty?.trim() || "SELF",
      input.referralSource?.trim() || null,
    ],
  );

  await addAudit(tenantId, "front_desk", "PATIENT_CREATED", "PmsPatient", id, "ALLOWED");
  return result.rows[0];
}

export async function getPatient(patientId: string) {
  const result = await query<PmsPatientSummary>(
    `select
      p."id", p."chartNumber", p."firstName", p."lastName", p."preferredName", p."dateOfBirth"::text as "dateOfBirth",
      p."phone", p."email", p."status", p."privacyLevel", p."familyAccountId", p."responsibleParty", p."patientNote",
      coalesce(t.open_tasks, 0)::int as "openTasks",
      coalesce(l.balance_cents, 0)::int as "balanceCents"
     from "PmsPatient" p
     left join (
       select "patientId", count(*) as open_tasks from "PmsTask" where "status" = 'OPEN' group by "patientId"
     ) t on t."patientId" = p."id"
     left join (
       select "patientId", sum("balanceCents") as balance_cents from "PmsLedgerEntry" group by "patientId"
     ) l on l."patientId" = p."id"
     where p."id" = $1`,
    [patientId],
  );
  return result.rows[0] ?? null;
}

export async function getFamilyAccount(patientId: string) {
  const result = await query<PmsFamilyAccountRow>(
    `select fa.*
     from "PmsPatient" p
     join "PmsFamilyAccount" fa on fa."id" = p."familyAccountId"
     where p."id" = $1`,
    [patientId],
  );
  return result.rows[0] ?? null;
}

export async function getFamilyMembers(patientId: string) {
  return (await query<PmsPatientSummary>(
    `select
      p."id", p."chartNumber", p."firstName", p."lastName", p."preferredName", p."dateOfBirth"::text as "dateOfBirth",
      p."phone", p."email", p."status", p."privacyLevel", p."familyAccountId", p."responsibleParty", p."patientNote",
      coalesce(t.open_tasks, 0)::int as "openTasks",
      coalesce(l.balance_cents, 0)::int as "balanceCents"
     from "PmsPatient" selected
     join "PmsPatient" p on p."familyAccountId" = selected."familyAccountId"
     left join (
       select "patientId", count(*) as open_tasks from "PmsTask" where "status" = 'OPEN' group by "patientId"
     ) t on t."patientId" = p."id"
     left join (
       select "patientId", sum("balanceCents") as balance_cents from "PmsLedgerEntry" group by "patientId"
     ) l on l."patientId" = p."id"
     where selected."id" = $1
     order by p."lastName", p."firstName"`,
    [patientId],
  )).rows;
}

export async function getPatientAccount(patientId: string) {
  const [ledger, insurance, claims, treatmentPlans, recalls, documents] = await Promise.all([
    query(`select * from "PmsLedgerEntry" where "patientId" = $1 order by "postedAt" desc limit 50`, [patientId]),
    query(
      `select pi.*, ip."payerName", ip."planName", ip."groupNumber", bs."annualMaxCents", bs."annualUsedCents", bs."frequencies", bs."limitations"
       from "PmsPatientInsurance" pi
       join "PmsInsurancePlan" ip on ip."id" = pi."planId"
       left join "PmsBenefitSummary" bs on bs."patientInsuranceId" = pi."id"
       where pi."patientId" = $1
       order by pi."priority"`,
      [patientId],
    ),
    query(`select * from "PmsClaim" where "patientId" = $1 order by "createdAt" desc`, [patientId]),
    query(`select * from "PmsTreatmentPlan" where "patientId" = $1 order by "updatedAt" desc`, [patientId]),
    query(`select * from "PmsRecall" where "patientId" = $1 order by "dueDate" asc`, [patientId]),
    query(`select * from "PmsDocument" where "patientId" = $1 order by "updatedAt" desc`, [patientId]),
  ]);

  return {
    ledger: ledger.rows,
    insurance: insurance.rows,
    claims: claims.rows,
    treatmentPlans: treatmentPlans.rows,
    recalls: recalls.rows,
    documents: documents.rows,
  };
}

export async function listSchedule(tenantId = defaultTenantId, date?: string) {
  const result = await query<PmsAppointmentRow>(
    `select
      a."id",
      a."patientId",
      case when p."id" is null then null else p."lastName" || ', ' || p."firstName" end as "patientName",
      pr."displayName" as "providerName",
      op."name" as "operatoryName",
      a."startsAt"::text as "startsAt",
      a."endsAt"::text as "endsAt",
      a."status",
      a."appointmentType",
      a."productionCents",
      a."readinessStatus",
      a."notes"
     from "PmsAppointment" a
     left join "PmsPatient" p on p."id" = a."patientId"
     left join "PmsProvider" pr on pr."id" = a."providerId"
     left join "PmsOperatory" op on op."id" = a."operatoryId"
     where a."tenantId" = $1 and a."startsAt"::date = coalesce($2::date, current_date)
     order by a."startsAt", op."code"`,
    [tenantId, date ?? null],
  );
  return result.rows;
}

export async function getScheduleBoard(tenantId = defaultTenantId, date?: string): Promise<PmsScheduleBoard> {
  const boardDate = date ?? new Date().toISOString().slice(0, 10);
  const [appointments, operatories, providers, categories, blockouts, requests, recalls, labCases, production] = await Promise.all([
    listSchedule(tenantId, boardDate),
    listOperatories(tenantId),
    listProviders(tenantId),
    listAppointmentCategories(tenantId),
    query<PmsScheduleBoard["blockouts"][number]>(
      `select "id", "operatoryId", "providerId", "startsAt"::text as "startsAt", "endsAt"::text as "endsAt", "reason", "blockType"
       from "PmsBlockout"
       where "tenantId" = $1 and "startsAt"::date = $2::date
       order by "startsAt"`,
      [tenantId, boardDate],
    ),
    query<PmsScheduleBoard["requests"][number]>(
      `select ar."id", ar."requestType", ar."source", ar."urgency", ar."preferredWindow", ar."status", ar."note",
        case when p."id" is null then null else p."lastName" || ', ' || p."firstName" end as "patientName"
       from "PmsAppointmentRequest" ar
       left join "PmsPatient" p on p."id" = ar."patientId"
       where ar."tenantId" = $1 and ar."status" = 'OPEN'
       order by ar."urgency" desc, ar."createdAt"`,
      [tenantId],
    ),
    query<PmsScheduleBoard["recalls"][number]>(
      `select r."id", r."recallType", r."dueDate"::text as "dueDate", r."status", r."procedureCodes",
        p."lastName" || ', ' || p."firstName" as "patientName"
       from "PmsRecall" r
       join "PmsPatient" p on p."id" = r."patientId"
       where r."tenantId" = $1 and r."status" in ('DUE', 'OVERDUE')
       order by r."dueDate" asc limit 25`,
      [tenantId],
    ),
    query<PmsScheduleBoard["labCases"][number]>(
      `select lc."id", lc."labName", lc."caseType", lc."status", lc."dueDate"::text as "dueDate",
        case when p."id" is null then null else p."lastName" || ', ' || p."firstName" end as "patientName"
       from "PmsLabCase" lc
       left join "PmsPatient" p on p."id" = lc."patientId"
       where lc."tenantId" = $1 and lc."status" not in ('DELIVERED', 'CANCELED')
       order by lc."dueDate" asc nulls last limit 25`,
      [tenantId],
    ),
    query<{ scheduled: string; completed: string }>(
      `select
        coalesce(sum("productionCents"), 0)::text as scheduled,
        coalesce(sum(case when "status" = 'COMPLETED' then "productionCents" else 0 end), 0)::text as completed
       from "PmsAppointment"
       where "tenantId" = $1 and "startsAt"::date = $2::date`,
      [tenantId, boardDate],
    ),
  ]);

  return {
    date: boardDate,
    operatories,
    providers,
    categories,
    appointments,
    blockouts: blockouts.rows,
    requests: requests.rows,
    recalls: recalls.rows,
    labCases: labCases.rows,
    production: {
      scheduledCents: Number(production.rows[0]?.scheduled ?? 0),
      completedCents: Number(production.rows[0]?.completed ?? 0),
      unscheduledRequests: requests.rows.length,
      dueRecalls: recalls.rows.length,
      labCaseRisks: labCases.rows.filter((item) => item.status !== "DELIVERED").length,
    },
  };
}

export async function listAppointmentCategories(tenantId = defaultTenantId) {
  return (await query<PmsAppointmentCategoryRow>(
    `select "id", "name", "color", "defaultMinutes", "productionType", "defaultProcedureCodes", "providerType"
     from "PmsAppointmentCategory"
     where "tenantId" = $1 and "active" = true
     order by "productionType", "defaultMinutes", "name"`,
    [tenantId],
  )).rows;
}

export async function listProviders(tenantId = defaultTenantId) {
  return (await query<{ id: string; displayName: string; providerType: string }>(
    `select "id", "displayName", "providerType" from "PmsProvider" where "tenantId" = $1 and "status" = 'ACTIVE' order by "providerType", "displayName"`,
    [tenantId],
  )).rows;
}

export async function listOperatories(tenantId = defaultTenantId) {
  return (await query<{ id: string; code: string; name: string; status: string }>(
    `select "id", "code", "name", "status" from "PmsOperatory" where "tenantId" = $1 order by "code"`,
    [tenantId],
  )).rows;
}

export async function createAppointmentHold(input: {
  tenantId?: string;
  patientId?: string;
  providerId?: string;
  operatoryId?: string;
  startsAt: string;
  endsAt: string;
  appointmentType: string;
  categoryId?: string;
  notes?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("appt");
  const category = input.categoryId
    ? (await query<{ name: string; defaultProcedureCodes: string[]; defaultMinutes: number }>(
        `select "name", "defaultProcedureCodes", "defaultMinutes" from "PmsAppointmentCategory" where "id" = $1 and "tenantId" = $2`,
        [input.categoryId, tenantId],
      )).rows[0]
    : null;
  const appointmentType = category?.name ?? input.appointmentType;
  const result = await query<PmsAppointmentRow>(
    `insert into "PmsAppointment"
       ("id", "tenantId", "patientId", "providerId", "operatoryId", "startsAt", "endsAt", "status", "appointmentType", "notes", "updatedAt")
     values ($1, $2, $3, $4, $5, $6::timestamp, $7::timestamp, 'HELD', $8, $9, current_timestamp)
     returning "id", "patientId", null::text as "patientName", null::text as "providerName", null::text as "operatoryName",
       "startsAt"::text as "startsAt", "endsAt"::text as "endsAt", "status", "appointmentType", "productionCents", "readinessStatus", "notes"`,
    [id, tenantId, input.patientId ?? null, input.providerId ?? null, input.operatoryId ?? null, input.startsAt, input.endsAt, appointmentType, input.notes ?? null],
  );
  await query(
    `insert into "PmsAppointmentStatusHistory" ("id", "appointmentId", "status", "actorRole", "note")
     values ($1, $2, 'HELD', 'front_desk', $3)`,
    [newId("apst"), id, category ? `Created from category ${category.name}` : null],
  );
  await addAudit(tenantId, "front_desk", "APPOINTMENT_HELD", "PmsAppointment", id, "ALLOWED");
  return result.rows[0];
}

export async function updateAppointmentStatus(appointmentId: string, status: string) {
  const result = await query<{ id: string; tenantId: string; status: string }>(
    `update "PmsAppointment" set "status" = $2, "updatedAt" = current_timestamp where "id" = $1 returning "id", "tenantId", "status"`,
    [appointmentId, status],
  );
  const row = result.rows[0] ?? null;
  if (row) {
    await query(
      `insert into "PmsAppointmentStatusHistory" ("id", "appointmentId", "status", "actorRole")
       values ($1, $2, $3, 'front_desk')`,
      [newId("apst"), appointmentId, status],
    );
    await addAudit(row.tenantId, "front_desk", "APPOINTMENT_STATUS_UPDATED", "PmsAppointment", appointmentId, "ALLOWED");
  }
  return row;
}

export async function getChart(patientId: string) {
  const [patient, alerts, allergies, meds, conditions, notes, procedures] = await Promise.all([
    getPatient(patientId),
    query(`select * from "PmsMedicalAlert" where "patientId" = $1 and "active" = true order by "severity" desc`, [patientId]),
    query(`select * from "PmsAllergy" where "patientId" = $1 and "active" = true order by "severity" desc`, [patientId]),
    query(`select * from "PmsMedication" where "patientId" = $1 and "status" = 'ACTIVE' order by "name"`, [patientId]),
    query(`select * from "PmsToothCondition" where "patientId" = $1 order by "tooth", "surface"`, [patientId]),
    query(`select * from "PmsClinicalNote" where "patientId" = $1 order by "createdAt" desc limit 50`, [patientId]),
    query(
      `select pl.*, pc."code", pc."description"
       from "PmsProcedureLog" pl join "PmsProcedureCode" pc on pc."id" = pl."procedureCodeId"
       where pl."patientId" = $1 order by pl."serviceDate" desc nulls last, pl."createdAt" desc`,
      [patientId],
    ),
  ]);
  return { patient, alerts: alerts.rows, allergies: allergies.rows, medications: meds.rows, conditions: conditions.rows, notes: notes.rows, procedures: procedures.rows };
}

export async function listProcedureCodes(tenantId = defaultTenantId) {
  return (await query<{ id: string; code: string; description: string; category: string; defaultFeeCents: number }>(
    `select "id", "code", "description", "category", "defaultFeeCents"
     from "PmsProcedureCode"
     where "tenantId" = $1
     order by "category", "code"`,
    [tenantId],
  )).rows;
}

export async function addToothCondition(patientId: string, input: { tooth: string; surface?: string; condition: string; status?: string; source?: string }) {
  const id = newId("tc");
  const result = await query(
    `insert into "PmsToothCondition" ("id", "patientId", "tooth", "surface", "condition", "status", "source", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, current_timestamp)
     returning *`,
    [id, patientId, input.tooth, input.surface || null, input.condition, input.status ?? "ACTIVE", input.source ?? "PROVIDER"],
  );
  await addAudit(defaultTenantId, "associate_provider", "TOOTH_CONDITION_CREATED", "PmsToothCondition", id, "ALLOWED");
  return result.rows[0];
}

export async function addProcedureLog(patientId: string, input: { procedureCodeId: string; tooth?: string; surface?: string; status?: string; feeCents?: number; providerId?: string }) {
  const id = newId("plog");
  const result = await query(
    `insert into "PmsProcedureLog"
       ("id", "patientId", "providerId", "procedureCodeId", "tooth", "surface", "status", "feeCents", "serviceDate", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, coalesce($8::int, (select "defaultFeeCents" from "PmsProcedureCode" where "id" = $4)), current_date, current_timestamp)
     returning *`,
    [id, patientId, input.providerId ?? null, input.procedureCodeId, input.tooth ?? null, input.surface ?? null, input.status ?? "TREATMENT_PLANNED", input.feeCents ?? null],
  );
  await addAudit(defaultTenantId, "associate_provider", "PROCEDURE_LOG_CREATED", "PmsProcedureLog", id, "ALLOWED");
  return result.rows[0];
}

export async function addClinicalNote(patientId: string, body: string, noteType = "PROGRESS") {
  const id = newId("note");
  const result = await query(
    `insert into "PmsClinicalNote" ("id", "patientId", "noteType", "body", "status", "updatedAt")
     values ($1, $2, $3, $4, 'DRAFT', current_timestamp)
     returning *`,
    [id, patientId, noteType, body.trim()],
  );
  await addAudit(defaultTenantId, "associate_provider", "CLINICAL_NOTE_CREATED", "PmsClinicalNote", id, "ALLOWED");
  return result.rows[0];
}

export async function getPerio(patientId: string) {
  const exam = await query(
    `select * from "PmsPerioExam" where "patientId" = $1 order by "examDate" desc limit 1`,
    [patientId],
  );
  const examRow = exam.rows[0] ?? null;
  const measures = examRow
    ? await query(`select * from "PmsPerioMeasure" where "perioExamId" = $1 order by "tooth", "site"`, [examRow.id])
    : { rows: [] };
  return { patient: await getPatient(patientId), exam: examRow, measures: measures.rows };
}

export async function addPerioMeasure(patientId: string, input: { tooth: string; site: string; probingDepth: number; bleeding?: boolean; recession?: number }) {
  let exam = (await query<{ id: string }>(`select "id" from "PmsPerioExam" where "patientId" = $1 and "status" = 'IN_PROGRESS' order by "examDate" desc limit 1`, [patientId])).rows[0];
  if (!exam) {
    const created = await query<{ id: string }>(
      `insert into "PmsPerioExam" ("id", "patientId", "status", "updatedAt") values ($1, $2, 'IN_PROGRESS', current_timestamp) returning "id"`,
      [newId("perio"), patientId],
    );
    exam = created.rows[0];
  }

  const id = newId("pm");
  const result = await query(
    `insert into "PmsPerioMeasure" ("id", "perioExamId", "tooth", "site", "probingDepth", "bleeding", "recession")
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict ("perioExamId", "tooth", "site") do update set
       "probingDepth" = excluded."probingDepth", "bleeding" = excluded."bleeding", "recession" = excluded."recession"
     returning *`,
    [id, exam.id, input.tooth, input.site, input.probingDepth, Boolean(input.bleeding), input.recession ?? null],
  );
  await addAudit(defaultTenantId, "rdh", "PERIO_MEASURE_RECORDED", "PmsPerioMeasure", result.rows[0].id, "ALLOWED");
  return result.rows[0];
}

export async function listTreatmentPlans(tenantId = defaultTenantId) {
  return (await query(
    `select tp.*, p."firstName", p."lastName", p."chartNumber", pr."displayName" as "providerName",
       coalesce(items.item_count, 0)::int as "itemCount",
       coalesce(items.accepted_count, 0)::int as "acceptedItemCount"
     from "PmsTreatmentPlan" tp
     join "PmsPatient" p on p."id" = tp."patientId"
     left join "PmsProvider" pr on pr."id" = tp."providerId"
     left join (
       select "treatmentPlanId", count(*) as item_count, count(*) filter (where "status" = 'ACCEPTED') as accepted_count
       from "PmsTreatmentPlanItem"
       group by "treatmentPlanId"
     ) items on items."treatmentPlanId" = tp."id"
     where tp."tenantId" = $1
     order by tp."updatedAt" desc`,
    [tenantId],
  )).rows;
}

export async function createTreatmentPlan(input: {
  tenantId?: string;
  patientId: string;
  providerId?: string;
  name: string;
  presentationNote?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("txp");
  const result = await query(
    `insert into "PmsTreatmentPlan"
       ("id", "tenantId", "patientId", "providerId", "name", "presentationNote", "status", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, 'DRAFT', current_timestamp)
     returning *`,
    [id, tenantId, input.patientId, input.providerId ?? null, input.name.trim(), input.presentationNote?.trim() || null],
  );
  await addAudit(tenantId, "treatment_coordinator", "TREATMENT_PLAN_CREATED", "PmsTreatmentPlan", id, "ALLOWED");
  return result.rows[0];
}

export async function addTreatmentPlanItem(input: {
  treatmentPlanId: string;
  procedureCodeId: string;
  phase?: number;
  sequence?: number;
  tooth?: string;
  surface?: string;
}) {
  const code = (await query<{ defaultFeeCents: number }>(`select "defaultFeeCents" from "PmsProcedureCode" where "id" = $1`, [input.procedureCodeId])).rows[0];
  const feeCents = code?.defaultFeeCents ?? 0;
  const insuranceEstimateCents = Math.round(feeCents * 0.5);
  const patientEstimateCents = feeCents - insuranceEstimateCents;
  const id = newId("txi");
  const result = await query(
    `insert into "PmsTreatmentPlanItem"
       ("id", "treatmentPlanId", "procedureCodeId", "phase", "sequence", "tooth", "surface", "feeCents", "insuranceEstimateCents", "patientEstimateCents", "status", "updatedAt")
     values ($1, $2, $3, $4, coalesce($5::int, (select coalesce(max("sequence"), 0) + 1 from "PmsTreatmentPlanItem" where "treatmentPlanId" = $2)), $6, $7, $8, $9, $10, 'PROPOSED', current_timestamp)
     returning *`,
    [id, input.treatmentPlanId, input.procedureCodeId, input.phase ?? 1, input.sequence ?? null, input.tooth ?? null, input.surface ?? null, feeCents, insuranceEstimateCents, patientEstimateCents],
  );
  await recalculateTreatmentPlan(input.treatmentPlanId);
  return result.rows[0];
}

export async function updateTreatmentPlanStatus(treatmentPlanId: string, status: string) {
  const accepted = status === "ACCEPTED";
  const result = await query<{ id: string; tenantId: string; patientId: string }>(
    `update "PmsTreatmentPlan"
     set "status" = $2,
         "acceptedAt" = case when $3::boolean then current_timestamp else "acceptedAt" end,
         "updatedAt" = current_timestamp
     where "id" = $1
     returning "id", "tenantId", "patientId"`,
    [treatmentPlanId, status, accepted],
  );
  const plan = result.rows[0] ?? null;
  if (plan) {
    if (accepted) {
      await query(`update "PmsTreatmentPlanItem" set "status" = 'ACCEPTED', "updatedAt" = current_timestamp where "treatmentPlanId" = $1`, [treatmentPlanId]);
      await createTask({
        tenantId: plan.tenantId,
        patientId: plan.patientId,
        ownerRoleKey: "treatment_coordinator",
        title: "Schedule accepted treatment plan",
        taskType: "TREATMENT_SCHEDULING",
        priority: "HIGH",
      });
    }
    await addAudit(plan.tenantId, "treatment_coordinator", "TREATMENT_PLAN_STATUS_UPDATED", "PmsTreatmentPlan", treatmentPlanId, "ALLOWED");
  }
  return plan;
}

async function recalculateTreatmentPlan(treatmentPlanId: string) {
  await query(
    `update "PmsTreatmentPlan" tp
     set "totalFeeCents" = coalesce(items.total_fee, 0),
         "insuranceEstimateCents" = coalesce(items.insurance_estimate, 0),
         "patientEstimateCents" = coalesce(items.patient_estimate, 0),
         "updatedAt" = current_timestamp
     from (
       select "treatmentPlanId", sum("feeCents") as total_fee, sum("insuranceEstimateCents") as insurance_estimate, sum("patientEstimateCents") as patient_estimate
       from "PmsTreatmentPlanItem"
       where "treatmentPlanId" = $1
       group by "treatmentPlanId"
     ) items
     where tp."id" = items."treatmentPlanId"`,
    [treatmentPlanId],
  );
}

export async function listLedger(tenantId = defaultTenantId) {
  return (await query(
    `select le.*, p."firstName", p."lastName", p."chartNumber", c."claimNumber", c."status" as "claimStatus"
     from "PmsLedgerEntry" le
     join "PmsPatient" p on p."id" = le."patientId"
     left join "PmsClaim" c on c."id" = le."claimId"
     where le."tenantId" = $1
     order by le."postedAt" desc limit 100`,
    [tenantId],
  )).rows;
}

export async function getLedgerBoard(tenantId = defaultTenantId) {
  const [entries, payments, claims, balances] = await Promise.all([
    listLedger(tenantId),
    query(
      `select pay.*, p."firstName", p."lastName", p."chartNumber"
       from "PmsPayment" pay
       join "PmsPatient" p on p."id" = pay."patientId"
       where pay."tenantId" = $1
       order by pay."postedAt" desc limit 50`,
      [tenantId],
    ),
    query(
      `select c.*, p."firstName", p."lastName", p."chartNumber", pi."subscriberId"
       from "PmsClaim" c
       join "PmsPatient" p on p."id" = c."patientId"
       left join "PmsPatientInsurance" pi on pi."id" = c."patientInsuranceId"
       where c."tenantId" = $1
       order by c."createdAt" desc limit 75`,
      [tenantId],
    ),
    query<{ totalBalanceCents: string; patientCount: string }>(
      `select coalesce(sum(patient_balance), 0)::text as "totalBalanceCents", count(*)::text as "patientCount"
       from (
         select "patientId", coalesce(sum("balanceCents"), 0) as patient_balance
         from "PmsLedgerEntry"
         where "tenantId" = $1
         group by "patientId"
         having coalesce(sum("balanceCents"), 0) <> 0
       ) balances`,
      [tenantId],
    ),
  ]);

  return {
    entries,
    payments: payments.rows,
    claims: claims.rows,
    totalBalanceCents: Number(balances.rows[0]?.totalBalanceCents ?? 0),
    patientCountWithBalance: Number(balances.rows[0]?.patientCount ?? 0),
  };
}

export async function listInsurance(tenantId = defaultTenantId) {
  return (await query(
    `select pi.*, p."firstName", p."lastName", p."chartNumber",
       ip."payerName", ip."payerId", ip."planName", ip."planType", ip."groupNumber", ip."employerName", ip."networkStatus",
       bs."benefitYear", bs."deductibleCents", bs."deductibleMetCents", bs."annualMaxCents", bs."annualUsedCents"
     from "PmsPatientInsurance" pi
     join "PmsPatient" p on p."id" = pi."patientId"
     join "PmsInsurancePlan" ip on ip."id" = pi."planId"
     left join "PmsBenefitSummary" bs on bs."patientInsuranceId" = pi."id"
     where ip."tenantId" = $1
     order by pi."eligibilityStatus" asc, pi."lastVerifiedAt" asc nulls first, p."lastName", p."firstName"`,
    [tenantId],
  )).rows;
}

export async function listInsurancePlans(tenantId = defaultTenantId) {
  return (await query(
    `select ip.*, coalesce(covered.covered_patients, 0)::int as "coveredPatients"
     from "PmsInsurancePlan" ip
     left join (
       select "planId", count(*) as covered_patients
       from "PmsPatientInsurance"
       group by "planId"
     ) covered on covered."planId" = ip."id"
     where ip."tenantId" = $1
     order by ip."payerName", ip."planName"`,
    [tenantId],
  )).rows;
}

export async function getInsuranceBoard(tenantId = defaultTenantId) {
  const [coverage, plans, claims, readyProcedures] = await Promise.all([
    listInsurance(tenantId),
    listInsurancePlans(tenantId),
    query(
      `select c.*, p."firstName", p."lastName", p."chartNumber", coalesce(lines.line_count, 0)::int as "lineCount"
       from "PmsClaim" c
       join "PmsPatient" p on p."id" = c."patientId"
       left join (
         select "claimId", count(*) as line_count
         from "PmsClaimLine"
         group by "claimId"
       ) lines on lines."claimId" = c."id"
       where c."tenantId" = $1
       order by c."updatedAt" desc limit 50`,
      [tenantId],
    ),
    listClaimReadyProcedures(tenantId),
  ]);

  return { coverage, plans, claims: claims.rows, readyProcedures };
}

export async function createInsurancePlan(input: {
  tenantId?: string;
  payerName: string;
  payerId?: string;
  planName: string;
  planType?: string;
  groupNumber?: string;
  employerName?: string;
  networkStatus?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("iplan");
  const result = await query(
    `insert into "PmsInsurancePlan"
       ("id", "tenantId", "payerName", "payerId", "planName", "planType", "groupNumber", "employerName", "networkStatus", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, current_timestamp)
     returning *`,
    [
      id,
      tenantId,
      input.payerName.trim(),
      input.payerId?.trim() || null,
      input.planName.trim(),
      input.planType?.trim() || "PPO",
      input.groupNumber?.trim() || null,
      input.employerName?.trim() || null,
      input.networkStatus?.trim() || "UNKNOWN",
    ],
  );
  await addAudit(tenantId, "insurance_coordinator", "INSURANCE_PLAN_CREATED", "PmsInsurancePlan", id, "ALLOWED");
  return result.rows[0];
}

export async function attachInsuranceToPatient(input: {
  patientId: string;
  planId: string;
  subscriberId: string;
  memberNumber?: string;
  employer?: string;
  relationship: string;
  priority?: number;
  eligibilityStatus?: string;
  verificationNote?: string;
  benefitYear?: number;
  deductibleCents?: number;
  deductibleMetCents?: number;
  annualMaxCents?: number;
  annualUsedCents?: number;
}) {
  const id = newId("pins");
  const result = await query<{ id: string; planId: string }>(
    `insert into "PmsPatientInsurance"
       ("id", "patientId", "planId", "subscriberId", "memberNumber", "employer", "relationship", "priority", "eligibilityStatus", "lastVerifiedAt", "verificationNote", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, coalesce($8::int, 1), $9, case when $9 <> 'NOT_CHECKED' then current_timestamp else null end, $10, current_timestamp)
     returning "id", "planId"`,
    [
      id,
      input.patientId,
      input.planId,
      input.subscriberId.trim(),
      input.memberNumber?.trim() || null,
      input.employer?.trim() || null,
      input.relationship.trim() || "SELF",
      input.priority ?? 1,
      input.eligibilityStatus?.trim() || "NOT_CHECKED",
      input.verificationNote?.trim() || null,
    ],
  );
  const benefitId = newId("ben");
  await query(
    `insert into "PmsBenefitSummary"
       ("id", "patientInsuranceId", "benefitYear", "deductibleCents", "deductibleMetCents", "annualMaxCents", "annualUsedCents", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, current_timestamp)`,
    [
      benefitId,
      id,
      input.benefitYear ?? new Date().getFullYear(),
      input.deductibleCents ?? 0,
      input.deductibleMetCents ?? 0,
      input.annualMaxCents ?? 0,
      input.annualUsedCents ?? 0,
    ],
  );
  const plan = (await query<{ tenantId: string }>(`select "tenantId" from "PmsInsurancePlan" where "id" = $1`, [result.rows[0]?.planId])).rows[0];
  await addAudit(plan?.tenantId ?? defaultTenantId, "insurance_coordinator", "PATIENT_INSURANCE_ATTACHED", "PmsPatientInsurance", id, "ALLOWED");
  return result.rows[0];
}

export async function listClaimReadyProcedures(tenantId = defaultTenantId) {
  return (await query(
    `select pl."id", pl."patientId", pl."procedureCodeId", pl."tooth", pl."surface", pl."status", pl."feeCents", pl."serviceDate"::text as "serviceDate",
       pc."code", pc."description", p."firstName", p."lastName", p."chartNumber",
       pi."id" as "patientInsuranceId", ip."payerName", ip."planName"
     from "PmsProcedureLog" pl
     join "PmsProcedureCode" pc on pc."id" = pl."procedureCodeId"
     join "PmsPatient" p on p."id" = pl."patientId"
     left join "PmsClaimLine" cl on cl."procedureLogId" = pl."id"
     left join "PmsPatientInsurance" pi on pi."patientId" = pl."patientId" and pi."priority" = 1
     left join "PmsInsurancePlan" ip on ip."id" = pi."planId"
     where p."tenantId" = $1 and cl."id" is null and pl."status" in ('COMPLETED', 'TREATMENT_PLANNED')
     order by pl."serviceDate" desc nulls last, p."lastName", pc."code"
     limit 100`,
    [tenantId],
  )).rows;
}

export async function createClaimFromProcedures(input: { tenantId?: string; patientId: string; patientInsuranceId: string; procedureLogIds: string[] }) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const procedureIds = input.procedureLogIds.filter(Boolean);
  if (!input.patientId || !input.patientInsuranceId || procedureIds.length === 0) {
    throw new Error("A patient, insurance coverage, and at least one procedure are required to create a claim.");
  }
  const coverage = (await query<{ payerName: string }>(
    `select ip."payerName"
     from "PmsPatientInsurance" pi
     join "PmsInsurancePlan" ip on ip."id" = pi."planId"
     where pi."id" = $1 and pi."patientId" = $2`,
    [input.patientInsuranceId, input.patientId],
  )).rows[0];
  if (!coverage) {
    throw new Error("Selected coverage does not belong to the selected patient.");
  }

  const procedures = (await query<{
    id: string;
    procedureCodeId: string;
    tooth: string | null;
    surface: string | null;
    feeCents: number;
    serviceDate: string | null;
  }>(
    `select pl."id", pl."procedureCodeId", pl."tooth", pl."surface", pl."feeCents", pl."serviceDate"::text as "serviceDate"
     from "PmsProcedureLog" pl
     left join "PmsClaimLine" cl on cl."procedureLogId" = pl."id"
     where pl."patientId" = $1 and pl."id" = any($2::text[]) and cl."id" is null`,
    [input.patientId, procedureIds],
  )).rows;
  if (!procedures.length) {
    throw new Error("No unclaimed procedures were available for the selected patient.");
  }

  const billedCents = procedures.reduce((sum, procedure) => sum + Number(procedure.feeCents ?? 0), 0);
  const claimId = newId("claim");
  const claimNumber = `CLM-${new Date().getFullYear()}-${claimId.slice(-6).toUpperCase()}`;
  await query(
    `insert into "PmsClaim"
       ("id", "tenantId", "patientId", "patientInsuranceId", "payerName", "claimNumber", "status", "billedCents", "lastStatusAt", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, 'READY', $7, current_timestamp, current_timestamp)`,
    [claimId, tenantId, input.patientId, input.patientInsuranceId, coverage.payerName, claimNumber, billedCents],
  );

  for (const procedure of procedures) {
    await query(
      `insert into "PmsClaimLine"
         ("id", "claimId", "procedureLogId", "procedureCodeId", "tooth", "surface", "serviceDate", "feeCents", "patientDueCents", "updatedAt")
       values ($1, $2, $3, $4, $5, $6, $7::timestamp, $8, 0, current_timestamp)`,
      [newId("cline"), claimId, procedure.id, procedure.procedureCodeId, procedure.tooth, procedure.surface, procedure.serviceDate, procedure.feeCents],
    );
  }
  await addAudit(tenantId, "insurance_coordinator", "CLAIM_CREATED_FROM_PROCEDURES", "PmsClaim", claimId, "ALLOWED");
  return { id: claimId, claimNumber, billedCents };
}

export async function postLedgerCharge(input: { tenantId?: string; patientId: string; description: string; amountCents: number; procedureLogId?: string; claimId?: string; serviceDate?: string }) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("led");
  const result = await query(
    `insert into "PmsLedgerEntry"
       ("id", "tenantId", "patientId", "claimId", "procedureLogId", "entryType", "description", "amountCents", "balanceCents", "serviceDate")
     values ($1, $2, $3, $4, $5, 'CHARGE', $6, $7, $7, coalesce($8::timestamp, current_timestamp))
     returning *`,
    [id, tenantId, input.patientId, input.claimId ?? null, input.procedureLogId ?? null, input.description.trim(), input.amountCents, input.serviceDate ?? null],
  );
  await addAudit(tenantId, "billing_coordinator", "LEDGER_CHARGE_POSTED", "PmsLedgerEntry", id, "ALLOWED");
  return result.rows[0];
}

export async function postPatientPayment(input: { tenantId?: string; patientId: string; amountCents: number; paymentType: string; reference?: string }) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const ledgerEntryId = newId("led");
  const paymentId = newId("pay");
  await query(
    `insert into "PmsLedgerEntry"
       ("id", "tenantId", "patientId", "entryType", "description", "amountCents", "balanceCents")
     values ($1, $2, $3, 'PATIENT_PAYMENT', $4, $5, $5)`,
    [ledgerEntryId, tenantId, input.patientId, `${input.paymentType} patient payment`, -Math.abs(input.amountCents)],
  );
  const result = await query(
    `insert into "PmsPayment"
       ("id", "tenantId", "patientId", "ledgerEntryId", "paymentType", "amountCents", "reference", "unappliedCents", "status")
     values ($1, $2, $3, $4, $5, $6, $7, 0, 'POSTED')
     returning *`,
    [paymentId, tenantId, input.patientId, ledgerEntryId, input.paymentType.trim(), Math.abs(input.amountCents), input.reference?.trim() || null],
  );
  await addAudit(tenantId, "billing_coordinator", "PATIENT_PAYMENT_POSTED", "PmsPayment", paymentId, "ALLOWED");
  return result.rows[0];
}

export async function listDocuments(tenantId = defaultTenantId) {
  return (await query(
    `select d.*, p."firstName", p."lastName"
     from "PmsDocument" d left join "PmsPatient" p on p."id" = d."patientId"
     where d."tenantId" = $1 order by d."updatedAt" desc`,
    [tenantId],
  )).rows;
}

export async function listTasks(tenantId = defaultTenantId, role?: string) {
  return (await query(
    `select t.*, p."firstName", p."lastName"
     from "PmsTask" t left join "PmsPatient" p on p."id" = t."patientId"
     where t."tenantId" = $1 and ($2::text is null or t."ownerRoleKey" = $2)
     order by t."priority" desc, t."dueAt" asc nulls last, t."createdAt" desc`,
    [tenantId, role ?? null],
  )).rows;
}

export async function createTask(input: { tenantId?: string; patientId?: string; ownerRoleKey: string; title: string; taskType: string; priority?: string; dueAt?: string }) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("task");
  const result = await query(
    `insert into "PmsTask" ("id", "tenantId", "patientId", "ownerRoleKey", "title", "taskType", "priority", "dueAt", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8::timestamp, current_timestamp) returning *`,
    [id, tenantId, input.patientId ?? null, input.ownerRoleKey, input.title.trim(), input.taskType, input.priority ?? "NORMAL", input.dueAt ?? null],
  );
  await addAudit(tenantId, input.ownerRoleKey, "TASK_CREATED", "PmsTask", id, "ALLOWED");
  return result.rows[0];
}

async function addAudit(tenantId: string, actorRole: string, eventType: string, targetType: string, targetId: string, outcome: string) {
  await query(
    `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome")
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [newId("audit"), tenantId, actorRole, eventType, targetType, targetId, outcome],
  );
}
