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
  const [snapshots, yesterday, today, tomorrow, followUps, openings, providerGoals, serviceLines, workQueue, suggestedPatients, analytics] = await Promise.all([
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
    getProviderGoalPacing(tenantId),
    getServiceLineProduction(tenantId),
    getHuddleWorkQueue(tenantId),
    getSuggestedPatients(tenantId),
    getHuddleAnalytics(tenantId),
  ]);

  return {
    snapshots: snapshots.rows,
    yesterday: yesterday.rows[0],
    today: today.rows[0],
    tomorrow: tomorrow.rows[0],
    followUps: followUps.rows[0],
    openings,
    providerGoals,
    serviceLines,
    workQueue,
    suggestedPatients,
    analytics,
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
  const source = await getRecipeSourceContext(tenantId, input.patientId, recipe.key);
  await query(
    `insert into "PatientFinderFollowUp"
       ("id", "tenantId", "filterId", "patientId", "appointmentId", "treatmentPlanId", "claimId", "reason", "sourceModule", "priority", "ownerRoleKey", "recommendedChannel", "dueAt", "nextAction", "opportunityCents", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, current_timestamp + interval '1 day', $13, $14, current_timestamp)`,
    [
      id,
      tenantId,
      recipe.filterId,
      input.patientId,
      source.appointmentId,
      source.treatmentPlanId,
      source.claimId,
      recipe.reason,
      recipe.sourceModule,
      recipe.priority,
      input.ownerRoleKey,
      recipe.channel,
      input.nextAction.trim(),
      opportunity,
    ],
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
      `with hygiene_fee as (
        select greatest(coalesce(avg(pl."feeCents"), 0)::int, 15500) as cents
        from "PmsProcedureLog" pl
        join "PmsProcedureCode" pc on pc."id" = pl."procedureCodeId"
        join "PmsPatient" hp on hp."id" = pl."patientId"
        where hp."tenantId" = $1 and pl."status" = 'COMPLETED' and pc."category" in ('HYGIENE','PERIODONTAL','PREVENTIVE')
       )
       select p."id", p."firstName", p."lastName", p."chartNumber", p."phone", p."email", r."dueDate"::text as "dueDate",
        (select cents from hygiene_fee)::text as "opportunityCents",
        'Recall due ' || to_char(r."dueDate", 'Mon DD') as "signal",
        'Offer hygiene recare or perio maintenance opening.' as "suggestedAction"
       from "PmsRecall" r
       join "PmsPatient" p on p."id" = r."patientId"
       where r."tenantId" = $1 and r."status" in ('DUE','OVERDUE')
         and not exists (select 1 from "PmsAppointment" a where a."patientId" = p."id" and a."startsAt" >= current_date and a."status" not in ('CANCELED','NO_SHOW','BROKEN'))
       order by r."dueDate" asc
       limit 20`,
      [tenantId],
    ),
    query(
      `select p."id", p."firstName", p."lastName", p."chartNumber", p."phone", p."email", tp."id" as "treatmentPlanId", tp."name" as "treatmentPlanName", tp."totalFeeCents"::text as "opportunityCents",
        coalesce(pr."displayName", 'Unassigned provider') || ' treatment plan' as "signal",
        'Call with financing and schedule the first accepted phase.' as "suggestedAction"
       from "PmsTreatmentPlan" tp
       join "PmsPatient" p on p."id" = tp."patientId"
       left join "PmsProvider" pr on pr."id" = tp."providerId"
       where tp."tenantId" = $1 and tp."status" in ('PRESENTED','DRAFT') and tp."totalFeeCents" >= 100000
         and not exists (select 1 from "PmsAppointment" a where a."patientId" = p."id" and a."startsAt" >= current_date and a."status" not in ('CANCELED','NO_SHOW','BROKEN'))
       order by tp."totalFeeCents" desc
       limit 20`,
      [tenantId],
    ),
    query(
      `select p."id", p."firstName", p."lastName", p."chartNumber", p."phone", p."email", sum(le."balanceCents")::text as "opportunityCents",
        'Open patient balance' as "signal",
        'Review ledger/EOB, then call with payment or plan options.' as "suggestedAction"
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
      `select distinct on (p."id") p."id", p."firstName", p."lastName", p."chartNumber", p."phone", p."email", a."id" as "appointmentId", a."startsAt"::text as "startsAt", a."productionCents"::text as "opportunityCents",
        a."status" || ' ' || a."appointmentType" as "signal",
        'Recover the broken visit into the best matching open slot.' as "suggestedAction"
       from "PmsAppointment" a
       join "PmsPatient" p on p."id" = a."patientId"
       where a."tenantId" = $1 and a."status" in ('BROKEN','CANCELED','NO_SHOW') and a."startsAt" >= current_date - interval '90 days'
         and not exists (select 1 from "PmsAppointment" future where future."patientId" = p."id" and future."startsAt" >= current_date and future."status" not in ('CANCELED','NO_SHOW','BROKEN'))
       order by p."id", a."startsAt" desc
       limit 20`,
      [tenantId],
    ),
    query(
      `select p."id", p."firstName", p."lastName", p."chartNumber", p."phone", p."email", pc."id" as "conversationId", 0::text as "opportunityCents",
        coalesce(pc."aiIntent", pc."aiSentiment", 'Phone opportunity') as "signal",
        'Call back from the practice number and book the requested visit.' as "suggestedAction"
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

async function getProviderGoalPacing(tenantId: string) {
  return (await query(
    `select pr."id", pr."displayName", pr."providerType",
      case when pr."providerType" in ('RDH','HYGIENIST','HYGIENE') then 120000 else 500000 end::text as "dailyGoalCents",
      coalesce((select sum(a."productionCents") from "PmsAppointment" a where a."providerId" = pr."id" and a."tenantId" = $1 and a."startsAt"::date = current_date and a."status" not in ('CANCELED','NO_SHOW','BROKEN')), 0)::text as "todayScheduledCents",
      coalesce((select sum(a."productionCents") from "PmsAppointment" a where a."providerId" = pr."id" and a."tenantId" = $1 and a."startsAt" >= current_date and a."startsAt" < current_date + interval '30 days' and a."status" not in ('CANCELED','NO_SHOW','BROKEN')), 0)::text as "scheduled30Cents",
      coalesce((select sum(le."amountCents") from "PmsLedgerEntry" le join "PmsProcedureLog" pl on pl."id" = le."procedureLogId" where le."tenantId" = $1 and pl."providerId" = pr."id" and le."amountCents" > 0 and le."serviceDate"::date = current_date - interval '1 day'), 0)::text as "yesterdayProductionCents",
      coalesce((select sum(le."amountCents") from "PmsLedgerEntry" le join "PmsProcedureLog" pl on pl."id" = le."procedureLogId" where le."tenantId" = $1 and pl."providerId" = pr."id" and le."amountCents" > 0 and coalesce(le."serviceDate", le."postedAt")::date >= current_date - interval '30 days'), 0)::text as "last30RevenueCents",
      coalesce((select sum(extract(epoch from (a."endsAt" - a."startsAt")) / 3600.0) from "PmsAppointment" a where a."providerId" = pr."id" and a."tenantId" = $1 and a."startsAt"::date = current_date and a."status" not in ('CANCELED','NO_SHOW','BROKEN')), 0)::text as "clinicalHours",
      coalesce((select count(*) from "PmsAppointment" a where a."providerId" = pr."id" and a."tenantId" = $1 and a."startsAt"::date = current_date and a."readinessStatus" <> 'READY' and a."status" not in ('CANCELED','NO_SHOW','BROKEN')), 0)::text as "readinessBlocks"
     from "PmsProvider" pr
     where pr."tenantId" = $1 and pr."status" = 'ACTIVE'
     order by pr."providerType", pr."displayName"`,
    [tenantId],
  )).rows.map((row) => ({
    ...row,
    dailyGoalCents: Number(row.dailyGoalCents ?? 0),
    todayScheduledCents: Number(row.todayScheduledCents ?? 0),
    scheduled30Cents: Number(row.scheduled30Cents ?? 0),
    yesterdayProductionCents: Number(row.yesterdayProductionCents ?? 0),
    last30RevenueCents: Number(row.last30RevenueCents ?? 0),
    clinicalHours: Number(row.clinicalHours ?? 0),
    readinessBlocks: Number(row.readinessBlocks ?? 0),
  }));
}

async function getServiceLineProduction(tenantId: string) {
  return (await query(
    `with service_lines as (
       select unnest(array['Restorative/elective','Hygiene/perio','Diagnostic/new patient','Other']) as "serviceLine"
     ),
     completed as (
       select
        case
          when pc."category" in ('RESTORATIVE','IMPLANT','ORAL_SURGERY','ENDODONTIC','PROSTHODONTIC') then 'Restorative/elective'
          when pc."category" in ('HYGIENE','PERIODONTAL','PREVENTIVE') then 'Hygiene/perio'
          when pc."category" = 'DIAGNOSTIC' then 'Diagnostic/new patient'
          else 'Other'
        end as "serviceLine",
        sum(le."amountCents") as cents
       from "PmsLedgerEntry" le
       left join "PmsProcedureLog" pl on pl."id" = le."procedureLogId"
       left join "PmsProcedureCode" pc on pc."id" = pl."procedureCodeId"
       where le."tenantId" = $1 and le."amountCents" > 0 and le."serviceDate"::date = current_date - interval '1 day'
       group by 1
     ),
     scheduled as (
       select
        case
          when exists (select 1 from "PmsAppointmentProcedure" ap join "PmsProcedureCode" pc on pc."id" = ap."procedureCodeId" where ap."appointmentId" = a."id" and pc."category" in ('RESTORATIVE','IMPLANT','ORAL_SURGERY','ENDODONTIC','PROSTHODONTIC')) then 'Restorative/elective'
          when exists (select 1 from "PmsAppointmentProcedure" ap join "PmsProcedureCode" pc on pc."id" = ap."procedureCodeId" where ap."appointmentId" = a."id" and pc."category" in ('HYGIENE','PERIODONTAL','PREVENTIVE')) or a."appointmentType" ilike '%hygiene%' then 'Hygiene/perio'
          when exists (select 1 from "PmsAppointmentProcedure" ap join "PmsProcedureCode" pc on pc."id" = ap."procedureCodeId" where ap."appointmentId" = a."id" and pc."category" = 'DIAGNOSTIC') or a."appointmentType" ilike '%new%' then 'Diagnostic/new patient'
          else 'Other'
        end as "serviceLine",
        sum(a."productionCents") filter (where a."startsAt"::date = current_date) as today,
        sum(a."productionCents") filter (where a."startsAt"::date = current_date + interval '1 day') as tomorrow,
        count(*) filter (where a."startsAt"::date = current_date and a."readinessStatus" <> 'READY') as blocks
       from "PmsAppointment" a
       where a."tenantId" = $1 and a."startsAt"::date between current_date and current_date + interval '1 day' and a."status" not in ('CANCELED','NO_SHOW','BROKEN')
       group by 1
     )
     select sl."serviceLine",
      coalesce(c.cents, 0)::text as "yesterdayCents",
      coalesce(s.today, 0)::text as "todayScheduledCents",
      coalesce(s.tomorrow, 0)::text as "tomorrowScheduledCents",
      coalesce(s.blocks, 0)::text as "readinessBlocks"
     from service_lines sl
     left join completed c on c."serviceLine" = sl."serviceLine"
     left join scheduled s on s."serviceLine" = sl."serviceLine"
     order by case sl."serviceLine" when 'Restorative/elective' then 0 when 'Hygiene/perio' then 1 when 'Diagnostic/new patient' then 2 else 3 end`,
    [tenantId],
  )).rows.map((row) => ({
    ...row,
    yesterdayCents: Number(row.yesterdayCents ?? 0),
    todayScheduledCents: Number(row.todayScheduledCents ?? 0),
    tomorrowScheduledCents: Number(row.tomorrowScheduledCents ?? 0),
    readinessBlocks: Number(row.readinessBlocks ?? 0),
  }));
}

async function getHuddleWorkQueue(tenantId: string) {
  return (await query(
    `select * from (
       select 'TODAY' as day, 'Readiness blocker' as "workType", p."id" as "patientId", p."firstName", p."lastName", a."startsAt"::text as "eventAt",
        a."readinessStatus" as "signal", coalesce(a."productionCents", 0)::text as "opportunityCents",
        'Clear forms, eligibility, consent, or clinical prep before the visit.' as "nextAction", '/app/pms/schedule' as route, 'front_desk' as "ownerRoleKey"
       from "PmsAppointment" a
       left join "PmsPatient" p on p."id" = a."patientId"
       where a."tenantId" = $1 and a."startsAt"::date = current_date and a."readinessStatus" <> 'READY' and a."status" not in ('CANCELED','NO_SHOW','BROKEN')
       union all
       select 'TODAY', 'Treatment in chair', p."id", p."firstName", p."lastName", a."startsAt"::text,
        tp."name", tp."totalFeeCents"::text,
        'Confirm provider handoff and schedule first treatment phase before checkout.', '/app/pms/treatment-plans', 'treatment_coordinator'
       from "PmsAppointment" a
       join "PmsPatient" p on p."id" = a."patientId"
       join "PmsTreatmentPlan" tp on tp."patientId" = p."id" and tp."tenantId" = $1 and tp."status" in ('PRESENTED','DRAFT')
       where a."tenantId" = $1 and a."startsAt"::date = current_date and a."status" not in ('CANCELED','NO_SHOW','BROKEN')
       union all
       select 'TOMORROW', 'Tomorrow fill', p."id", p."firstName", p."lastName", null,
        'Due recall with no future visit', '15500',
        'Use the opening map and offer a specific hygiene/perio time.', '/app/patient-finder', 'front_desk'
       from "PmsRecall" r
       join "PmsPatient" p on p."id" = r."patientId"
       where r."tenantId" = $1 and r."status" in ('DUE','OVERDUE')
         and not exists (select 1 from "PmsAppointment" future where future."patientId" = p."id" and future."startsAt" >= current_date and future."status" not in ('CANCELED','NO_SHOW','BROKEN'))
     ) q
     order by case day when 'TODAY' then 0 else 1 end, "opportunityCents"::int desc, "eventAt" asc nulls last
     limit 12`,
    [tenantId],
  )).rows.map((row) => ({
    ...row,
    opportunityCents: Number(row.opportunityCents ?? 0),
  }));
}

async function getSuggestedPatients(tenantId: string) {
  return (await query(
    `with hygiene_fee as (
       select greatest(coalesce(avg(pl."feeCents"), 0)::int, 15500) as cents
       from "PmsProcedureLog" pl
       join "PmsProcedureCode" pc on pc."id" = pl."procedureCodeId"
       join "PmsPatient" hp on hp."id" = pl."patientId"
       where hp."tenantId" = $1 and pl."status" = 'COMPLETED' and pc."category" in ('HYGIENE','PERIODONTAL','PREVENTIVE')
     ),
     candidates as (
       select p."id", p."firstName", p."lastName", p."chartNumber", p."phone", p."email",
        'Unscheduled active hygiene' as "suggestionType",
        'Recall ' || lower(r."status") || ' since ' || to_char(r."dueDate", 'Mon DD') as reason,
        (select cents from hygiene_fee) as opportunity,
        r."dueDate" as sort_date,
        'Send recare link or call with a specific opening.' as "nextAction"
       from "PmsRecall" r
       join "PmsPatient" p on p."id" = r."patientId"
       where r."tenantId" = $1 and r."status" in ('DUE','OVERDUE') and p."status" = 'ACTIVE'
         and not exists (select 1 from "PmsAppointment" future where future."patientId" = p."id" and future."startsAt" >= current_date and future."status" not in ('CANCELED','NO_SHOW','BROKEN'))
       union all
       select p."id", p."firstName", p."lastName", p."chartNumber", p."phone", p."email",
        'Unscheduled treatment', tp."name", tp."totalFeeCents", tp."createdAt",
        'Call to remove financing/scheduling friction and book treatment.'
       from "PmsTreatmentPlan" tp
       join "PmsPatient" p on p."id" = tp."patientId"
       where tp."tenantId" = $1 and tp."status" in ('PRESENTED','DRAFT') and tp."totalFeeCents" > 0 and p."status" = 'ACTIVE'
         and not exists (select 1 from "PmsAppointment" future where future."patientId" = p."id" and future."startsAt" >= current_date and future."status" not in ('CANCELED','NO_SHOW','BROKEN'))
     )
     select "id", "firstName", "lastName", "chartNumber", "phone", "email", "suggestionType", reason, opportunity::text as "opportunityCents", "nextAction"
     from candidates
     order by opportunity desc, sort_date asc
     limit 12`,
    [tenantId],
  )).rows.map((row) => ({
    ...row,
    opportunityCents: Number(row.opportunityCents ?? 0),
  }));
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

async function getHuddleAnalytics(tenantId: string) {
  const [hygieneRecall, brokenImpact, roomProviderProduction] = await Promise.all([
    query<{ dueCount: string; overdueCount: string; unscheduledDueCount: string; recallOpportunityCents: string; hygieneVisits30: string; hygieneReappointed30: string; reappointmentRate: string }>(
      `with hygiene_fee as (
        select greatest(coalesce(avg(pl."feeCents"), 0)::int, 15500) as cents
        from "PmsProcedureLog" pl
        join "PmsProcedureCode" pc on pc."id" = pl."procedureCodeId"
        join "PmsPatient" p on p."id" = pl."patientId"
        where p."tenantId" = $1 and pl."status" = 'COMPLETED' and pc."category" in ('HYGIENE','PERIODONTAL','PREVENTIVE')
       ),
       recall_base as (
        select r."id", r."status",
          exists (
            select 1 from "PmsAppointment" a
            where a."patientId" = r."patientId"
              and a."startsAt" >= current_date
              and a."status" not in ('CANCELED','NO_SHOW','BROKEN')
          ) as has_future
        from "PmsRecall" r
        join "PmsPatient" p on p."id" = r."patientId"
        where r."tenantId" = $1 and p."status" = 'ACTIVE' and r."status" in ('DUE','OVERDUE')
       ),
       hygiene_visits as (
        select distinct pl."patientId", pl."serviceDate"::date as service_date
        from "PmsProcedureLog" pl
        join "PmsProcedureCode" pc on pc."id" = pl."procedureCodeId"
        join "PmsPatient" p on p."id" = pl."patientId"
        where p."tenantId" = $1 and pl."status" = 'COMPLETED' and pc."category" in ('HYGIENE','PERIODONTAL','PREVENTIVE') and pl."serviceDate" >= current_date - interval '30 days'
       ),
       reappointed as (
        select hv."patientId"
        from hygiene_visits hv
        where exists (
          select 1 from "PmsAppointment" a
          where a."patientId" = hv."patientId" and a."startsAt"::date > hv.service_date and a."status" not in ('CANCELED','NO_SHOW','BROKEN')
        )
       )
       select
        count(*) filter (where rb."status" = 'DUE')::text as "dueCount",
        count(*) filter (where rb."status" = 'OVERDUE')::text as "overdueCount",
        count(*) filter (where not rb.has_future)::text as "unscheduledDueCount",
        (count(*) filter (where not rb.has_future) * (select cents from hygiene_fee))::text as "recallOpportunityCents",
        (select count(*) from hygiene_visits)::text as "hygieneVisits30",
        (select count(*) from reappointed)::text as "hygieneReappointed30",
        case when (select count(*) from hygiene_visits) = 0 then '0'
          else round(((select count(*) from reappointed)::numeric / nullif((select count(*) from hygiene_visits), 0)) * 100)::text
        end as "reappointmentRate"
       from recall_base rb`,
      [tenantId],
    ),
    query<{ brokenCount: string; noShowCount: string; cancelCount: string; lostProductionCents: string; unscheduledPatientCount: string; recoveredCount: string; recoveredProductionCents: string }>(
      `with broken as (
        select a."patientId", a."startsAt", a."status", a."productionCents",
          exists (
            select 1 from "PmsAppointment" future
            where future."patientId" = a."patientId"
              and future."startsAt" > a."startsAt"
              and future."status" not in ('CANCELED','NO_SHOW','BROKEN')
          ) as recovered
        from "PmsAppointment" a
        where a."tenantId" = $1 and a."startsAt" >= current_date - interval '30 days' and a."status" in ('CANCELED','BROKEN','NO_SHOW')
       )
       select count(*)::text as "brokenCount",
        count(*) filter (where "status" = 'NO_SHOW')::text as "noShowCount",
        count(*) filter (where "status" in ('CANCELED','BROKEN'))::text as "cancelCount",
        coalesce(sum("productionCents"), 0)::text as "lostProductionCents",
        count(distinct "patientId") filter (where not recovered)::text as "unscheduledPatientCount",
        count(*) filter (where recovered)::text as "recoveredCount",
        coalesce(sum("productionCents") filter (where recovered), 0)::text as "recoveredProductionCents"
       from broken`,
      [tenantId],
    ),
    query<{ roomName: string; providerName: string; scheduledCents: string; bookedMinutes: string; appointmentCount: string }>(
      `select coalesce(op."name", 'Unassigned room') as "roomName",
        coalesce(pr."displayName", 'Unassigned provider') as "providerName",
        coalesce(sum(a."productionCents"), 0)::text as "scheduledCents",
        coalesce(sum(extract(epoch from (a."endsAt" - a."startsAt")) / 60), 0)::int::text as "bookedMinutes",
        count(a."id")::text as "appointmentCount"
       from "PmsAppointment" a
       left join "PmsOperatory" op on op."id" = a."operatoryId"
       left join "PmsProvider" pr on pr."id" = a."providerId"
       where a."tenantId" = $1
        and a."startsAt" >= current_date
        and a."startsAt" < current_date + interval '30 days'
        and a."status" not in ('CANCELED','NO_SHOW','BROKEN')
       group by op."name", pr."displayName"
       order by coalesce(sum(a."productionCents"), 0) desc
       limit 6`,
      [tenantId],
    ),
  ]);

  const recall = hygieneRecall.rows[0];
  const broken = brokenImpact.rows[0];
  return {
    hygieneRecall: {
      dueCount: Number(recall?.dueCount ?? 0),
      overdueCount: Number(recall?.overdueCount ?? 0),
      unscheduledDueCount: Number(recall?.unscheduledDueCount ?? 0),
      recallOpportunityCents: Number(recall?.recallOpportunityCents ?? 0),
      hygieneVisits30: Number(recall?.hygieneVisits30 ?? 0),
      hygieneReappointed30: Number(recall?.hygieneReappointed30 ?? 0),
      reappointmentRate: Number(recall?.reappointmentRate ?? 0),
    },
    brokenImpact: {
      brokenCount: Number(broken?.brokenCount ?? 0),
      noShowCount: Number(broken?.noShowCount ?? 0),
      cancelCount: Number(broken?.cancelCount ?? 0),
      lostProductionCents: Number(broken?.lostProductionCents ?? 0),
      unscheduledPatientCount: Number(broken?.unscheduledPatientCount ?? 0),
      recoveredCount: Number(broken?.recoveredCount ?? 0),
      recoveredProductionCents: Number(broken?.recoveredProductionCents ?? 0),
    },
    roomProviderProduction: roomProviderProduction.rows.map((row) => ({
      roomName: row.roomName,
      providerName: row.providerName,
      scheduledCents: Number(row.scheduledCents ?? 0),
      bookedMinutes: Number(row.bookedMinutes ?? 0),
      appointmentCount: Number(row.appointmentCount ?? 0),
    })),
  };
}

async function getRecipeSourceContext(tenantId: string, patientId: string, recipeKey: string) {
  if (recipeKey === "unscheduled_treatment") {
    const result = await query<{ treatmentPlanId: string }>(
      `select "id" as "treatmentPlanId" from "PmsTreatmentPlan"
       where "tenantId" = $1 and "patientId" = $2 and "status" in ('PRESENTED','DRAFT')
       order by "totalFeeCents" desc limit 1`,
      [tenantId, patientId],
    );
    return { appointmentId: null, treatmentPlanId: result.rows[0]?.treatmentPlanId ?? null, claimId: null };
  }
  if (recipeKey === "broken_appts") {
    const result = await query<{ appointmentId: string }>(
      `select "id" as "appointmentId" from "PmsAppointment"
       where "tenantId" = $1 and "patientId" = $2 and "status" in ('BROKEN','CANCELED','NO_SHOW')
       order by "startsAt" desc limit 1`,
      [tenantId, patientId],
    );
    return { appointmentId: result.rows[0]?.appointmentId ?? null, treatmentPlanId: null, claimId: null };
  }
  if (recipeKey === "ar_followup") {
    const result = await query<{ claimId: string }>(
      `select "claimId" from "PmsLedgerEntry"
       where "tenantId" = $1 and "patientId" = $2 and "balanceCents" > 0 and "claimId" is not null
       order by "postedAt" desc limit 1`,
      [tenantId, patientId],
    );
    return { appointmentId: null, treatmentPlanId: null, claimId: result.rows[0]?.claimId ?? null };
  }
  return { appointmentId: null, treatmentPlanId: null, claimId: null };
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
  if (recipeKey === "broken_appts") {
    const result = await query<{ cents: string }>(
      `select coalesce(max("productionCents"), 0)::text as cents from "PmsAppointment" where "tenantId" = $1 and "patientId" = $2 and "status" in ('BROKEN','CANCELED','NO_SHOW')`,
      [tenantId, patientId],
    );
    return Number(result.rows[0]?.cents ?? 0);
  }
  if (recipeKey === "unscheduled_hygiene") {
    const result = await query<{ cents: string }>(
      `select greatest(coalesce(avg(pl."feeCents"), 0)::int, 15500)::text as cents
       from "PmsProcedureLog" pl
       join "PmsProcedureCode" pc on pc."id" = pl."procedureCodeId"
       join "PmsPatient" p on p."id" = pl."patientId"
       where p."tenantId" = $1 and pl."status" = 'COMPLETED' and pc."category" in ('HYGIENE','PERIODONTAL','PREVENTIVE')`,
      [tenantId],
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
