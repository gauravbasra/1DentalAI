import { newId, query } from "@/lib/db";
import { defaultTenantId } from "@/lib/pms-repository";

async function addAudit(tenantId: string, actorRole: string, eventType: string, targetType: string, targetId: string | null, metadata?: unknown) {
  await query(
    `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
     values ($1, $2, $3, $4, $5, $6, 'ALLOWED', $7::jsonb)`,
    [newId("audit"), tenantId, actorRole, eventType, targetType, targetId, metadata ? JSON.stringify(metadata) : null],
  );
}

export async function getMorningHuddle(tenantId = defaultTenantId) {
  const [snapshots, yesterday, today, tomorrow, followUps, openings] = await Promise.all([
    query(
      `select * from "MorningHuddleSnapshot"
       where "tenantId" = $1 and "huddleDate"::date = current_date
       order by "tab", "sortOrder", "label"`,
      [tenantId],
    ),
    query<{ completedAppointments: string; productionCents: string; collectionsCents: string; brokenAppointments: string }>(
      `select
        count(*) filter (where a."status" = 'COMPLETED')::text as "completedAppointments",
        coalesce(sum(a."productionCents") filter (where a."status" = 'COMPLETED'), 0)::text as "productionCents",
        coalesce((select sum(abs(le."amountCents")) from "PmsLedgerEntry" le where le."tenantId" = $1 and le."entryType" = 'PAYMENT' and le."postedAt"::date = current_date - interval '1 day'), 0)::text as "collectionsCents",
        count(*) filter (where a."status" in ('BROKEN','CANCELED','NO_SHOW'))::text as "brokenAppointments"
       from "PmsAppointment" a
       where a."tenantId" = $1 and a."startsAt"::date = current_date - interval '1 day'`,
      [tenantId],
    ),
    query<{ scheduledAppointments: string; scheduledProductionCents: string; readinessBlocks: string; formsDue: string }>(
      `select
        count(*)::text as "scheduledAppointments",
        coalesce(sum("productionCents"), 0)::text as "scheduledProductionCents",
        count(*) filter (where "readinessStatus" <> 'READY')::text as "readinessBlocks",
        (select count(*) from "PmsFormAssignment" where "tenantId" = $1 and "status" in ('ASSIGNED','IN_PROGRESS') and ("dueAt" is null or "dueAt"::date <= current_date))::text as "formsDue"
       from "PmsAppointment"
       where "tenantId" = $1 and "startsAt"::date = current_date and "status" not in ('CANCELED','NO_SHOW','BROKEN')`,
      [tenantId],
    ),
    query<{ scheduledAppointments: string; scheduledProductionCents: string; openings: string; readinessBlocks: string }>(
      `select
        count(*)::text as "scheduledAppointments",
        coalesce(sum("productionCents"), 0)::text as "scheduledProductionCents",
        greatest((select count(*) from "PmsOperatory" where "tenantId" = $1 and "status" = 'READY') * 8 - count(*), 0)::text as openings,
        count(*) filter (where "readinessStatus" <> 'READY')::text as "readinessBlocks"
       from "PmsAppointment"
       where "tenantId" = $1 and "startsAt"::date = current_date + interval '1 day' and "status" not in ('CANCELED','NO_SHOW','BROKEN')`,
      [tenantId],
    ),
    query<{ openFollowUps: string; highPriority: string; opportunityCents: string }>(
      `select
        count(*) filter (where "status" = 'OPEN')::text as "openFollowUps",
        count(*) filter (where "status" = 'OPEN' and "priority" = 'HIGH')::text as "highPriority",
        coalesce(sum("opportunityCents") filter (where "status" = 'OPEN'), 0)::text as "opportunityCents"
       from "PatientFinderFollowUp"
       where "tenantId" = $1`,
      [tenantId],
    ),
    getPerfectTimeSlotOpenings(tenantId),
  ]);

  return {
    snapshots: snapshots.rows,
    yesterday: yesterday.rows[0],
    today: today.rows[0],
    tomorrow: tomorrow.rows[0],
    followUps: followUps.rows[0],
    openings,
  };
}

export async function getPatientFinderCenter(tenantId = defaultTenantId) {
  const [filters, followUps, recipes] = await Promise.all([
    query(`select * from "PatientFinderSavedFilter" where "tenantId" = $1 order by "goal", "name"`, [tenantId]),
    query(
      `select f.*, p."firstName", p."lastName", p."chartNumber", p."phone", p."email",
        sf."name" as "filterName", tp."name" as "treatmentPlanName", c."claimNumber", c."payerName"
       from "PatientFinderFollowUp" f
       join "PmsPatient" p on p."id" = f."patientId"
       left join "PatientFinderSavedFilter" sf on sf."id" = f."filterId"
       left join "PmsTreatmentPlan" tp on tp."id" = f."treatmentPlanId"
       left join "PmsClaim" c on c."id" = f."claimId"
       where f."tenantId" = $1
       order by case f."priority" when 'HIGH' then 0 when 'NORMAL' then 1 else 2 end, f."dueAt" asc nulls last, f."createdAt" desc`,
      [tenantId],
    ),
    getPatientFinderRecipes(tenantId),
  ]);

  return { filters: filters.rows, followUps: followUps.rows, recipes };
}

export async function createPatientFinderFilter(input: {
  tenantId?: string;
  name: string;
  goal: string;
  description?: string;
  criteriaText: string;
  defaultOwnerRoleKey: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("pff");
  const criteria = { operatorNotes: input.criteriaText.trim(), createdFrom: "manual_patient_finder" };
  await query(
    `insert into "PatientFinderSavedFilter"
       ("id", "tenantId", "name", "description", "goal", "criteria", "defaultOwnerRoleKey", "updatedAt")
     values ($1, $2, $3, $4, $5, $6::jsonb, $7, current_timestamp)
     on conflict ("tenantId", "name") do update set
       "description" = excluded."description",
       "goal" = excluded."goal",
       "criteria" = excluded."criteria",
       "defaultOwnerRoleKey" = excluded."defaultOwnerRoleKey",
       "updatedAt" = current_timestamp`,
    [id, tenantId, input.name.trim(), input.description?.trim() || null, input.goal, JSON.stringify(criteria), input.defaultOwnerRoleKey],
  );
  await addAudit(tenantId, input.defaultOwnerRoleKey, "PATIENT_FINDER_FILTER_UPSERTED", "PatientFinderSavedFilter", id, { goal: input.goal });
}

export async function createFollowUpFromRecipe(input: { tenantId?: string; recipeKey: string; patientId: string; ownerRoleKey: string; nextAction: string }) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("pfu");
  const recipe = recipeDefinitions.find((item) => item.key === input.recipeKey) ?? recipeDefinitions[0];
  const opportunity = await estimateOpportunityCents(tenantId, input.patientId, recipe.key);
  await query(
    `insert into "PatientFinderFollowUp"
       ("id", "tenantId", "filterId", "patientId", "reason", "sourceModule", "priority", "ownerRoleKey", "recommendedChannel", "dueAt", "nextAction", "opportunityCents", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, current_timestamp + interval '1 day', $10, $11, current_timestamp)`,
    [id, tenantId, recipe.filterId, input.patientId, recipe.reason, recipe.sourceModule, recipe.priority, input.ownerRoleKey, recipe.channel, input.nextAction.trim(), opportunity],
  );
  await addAudit(tenantId, input.ownerRoleKey, "PATIENT_FINDER_FOLLOW_UP_CREATED", "PatientFinderFollowUp", id, { recipeKey: input.recipeKey });
}

export async function updatePatientFinderFollowUp(input: { id: string; status: string; outcome: string; actorRole: string }) {
  const result = await query<{ tenantId: string }>(
    `update "PatientFinderFollowUp"
     set "status" = $2,
         "attemptCount" = "attemptCount" + 1,
         "lastAttemptAt" = current_timestamp,
         "lastAttemptOutcome" = $3,
         "updatedAt" = current_timestamp
     where "id" = $1
     returning "tenantId"`,
    [input.id, input.status, input.outcome],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, input.actorRole, "PATIENT_FINDER_ATTEMPT_RECORDED", "PatientFinderFollowUp", input.id, { status: input.status, outcome: input.outcome });
}

async function getPatientFinderRecipes(tenantId: string) {
  const [hygiene, treatment, ar, broken, phone] = await Promise.all([
    query(
      `select p."id", p."firstName", p."lastName", p."chartNumber", p."phone", p."email", r."dueDate"::text as "dueDate", 0::text as "opportunityCents"
       from "PmsRecall" r
       join "PmsPatient" p on p."id" = r."patientId"
       where r."tenantId" = $1 and r."status" in ('DUE','OVERDUE')
         and not exists (select 1 from "PmsAppointment" a where a."patientId" = p."id" and a."startsAt" >= current_date and a."status" not in ('CANCELED','NO_SHOW','BROKEN'))
       order by r."dueDate" asc
       limit 20`,
      [tenantId],
    ),
    query(
      `select p."id", p."firstName", p."lastName", p."chartNumber", p."phone", p."email", tp."id" as "treatmentPlanId", tp."totalFeeCents"::text as "opportunityCents"
       from "PmsTreatmentPlan" tp
       join "PmsPatient" p on p."id" = tp."patientId"
       where tp."tenantId" = $1 and tp."status" in ('PRESENTED','DRAFT') and tp."totalFeeCents" >= 100000
         and not exists (select 1 from "PmsAppointment" a where a."patientId" = p."id" and a."startsAt" >= current_date and a."status" not in ('CANCELED','NO_SHOW','BROKEN'))
       order by tp."totalFeeCents" desc
       limit 20`,
      [tenantId],
    ),
    query(
      `select p."id", p."firstName", p."lastName", p."chartNumber", p."phone", p."email", sum(le."balanceCents")::text as "opportunityCents"
       from "PmsLedgerEntry" le
       join "PmsPatient" p on p."id" = le."patientId"
       where le."tenantId" = $1 and le."balanceCents" > 0
       group by p."id", p."firstName", p."lastName", p."chartNumber", p."phone", p."email"
       having sum(le."balanceCents") >= 25000
       order by sum(le."balanceCents") desc
       limit 20`,
      [tenantId],
    ),
    query(
      `select distinct on (p."id") p."id", p."firstName", p."lastName", p."chartNumber", p."phone", p."email", a."id" as "appointmentId", a."startsAt"::text as "startsAt", 0::text as "opportunityCents"
       from "PmsAppointment" a
       join "PmsPatient" p on p."id" = a."patientId"
       where a."tenantId" = $1 and a."status" in ('BROKEN','CANCELED','NO_SHOW') and a."startsAt" >= current_date - interval '90 days'
         and not exists (select 1 from "PmsAppointment" future where future."patientId" = p."id" and future."startsAt" >= current_date and future."status" not in ('CANCELED','NO_SHOW','BROKEN'))
       order by p."id", a."startsAt" desc
       limit 20`,
      [tenantId],
    ),
    query(
      `select p."id", p."firstName", p."lastName", p."chartNumber", p."phone", p."email", pc."id" as "conversationId", 0::text as "opportunityCents"
       from "PhoneConversation" pc
       join "PmsPatient" p on p."id" = pc."patientId"
       where pc."tenantId" = $1 and pc."aiSentiment" = 'HIGH_INTENT' and pc."status" = 'OPEN'
       order by pc."startedAt" desc
       limit 20`,
      [tenantId],
    ),
  ]);

  return [
    { ...recipeDefinitions[0], patients: hygiene.rows },
    { ...recipeDefinitions[1], patients: treatment.rows },
    { ...recipeDefinitions[2], patients: ar.rows },
    { ...recipeDefinitions[3], patients: broken.rows },
    { ...recipeDefinitions[4], patients: phone.rows },
  ];
}

async function getPerfectTimeSlotOpenings(tenantId: string) {
  return (await query(
    `with days as (
       select generate_series(current_date, current_date + interval '2 days', interval '1 day')::date as day
     )
     select d.day::text,
       greatest((select count(*) from "PmsOperatory" where "tenantId" = $1 and "status" = 'READY') * 8 - count(a."id"), 0)::text as openings,
       coalesce(sum(a."productionCents"), 0)::text as "scheduledProductionCents"
     from days d
     left join "PmsAppointment" a on a."tenantId" = $1 and a."startsAt"::date = d.day and a."status" not in ('CANCELED','NO_SHOW','BROKEN')
     group by d.day
     order by d.day`,
    [tenantId],
  )).rows;
}

async function estimateOpportunityCents(tenantId: string, patientId: string, recipeKey: string) {
  if (recipeKey === "unscheduled_treatment") {
    const result = await query<{ cents: string }>(
      `select coalesce(max("totalFeeCents"), 0)::text as cents from "PmsTreatmentPlan" where "tenantId" = $1 and "patientId" = $2 and "status" in ('PRESENTED','DRAFT')`,
      [tenantId, patientId],
    );
    return Number(result.rows[0]?.cents ?? 0);
  }
  if (recipeKey === "ar_followup") {
    const result = await query<{ cents: string }>(
      `select coalesce(sum("balanceCents"), 0)::text as cents from "PmsLedgerEntry" where "tenantId" = $1 and "patientId" = $2 and "balanceCents" > 0`,
      [tenantId, patientId],
    );
    return Number(result.rows[0]?.cents ?? 0);
  }
  return 0;
}

const recipeDefinitions = [
  { key: "unscheduled_hygiene", filterId: "pf_filter_unscheduled_hygiene", label: "Unscheduled hygiene", sourceModule: "PMS_RECALL", priority: "NORMAL", channel: "SMS", reason: "Due hygiene recall with no future appointment." },
  { key: "unscheduled_treatment", filterId: "pf_filter_unscheduled_treatment", label: "Unscheduled treatment", sourceModule: "PMS_TREATMENT_PLAN", priority: "HIGH", channel: "PHONE", reason: "Presented treatment remains unscheduled." },
  { key: "ar_followup", filterId: "pf_filter_ar_followup", label: "AR follow-up", sourceModule: "PMS_LEDGER", priority: "HIGH", channel: "PHONE", reason: "Patient balance needs follow-up." },
  { key: "broken_appts", filterId: "pf_filter_broken_appts", label: "Broken appointment recovery", sourceModule: "PMS_SCHEDULE", priority: "NORMAL", channel: "PHONE", reason: "Broken or canceled appointment has no future visit." },
  { key: "high_intent_phone", filterId: "pf_filter_high_intent_phone", label: "High-intent phone leads", sourceModule: "PHONE", priority: "HIGH", channel: "PHONE", reason: "High-intent phone conversation needs conversion follow-up." },
];
