import { newId, query } from "@/lib/db";
import { defaultTenantId } from "@/lib/pms-repository";

async function addAudit(tenantId: string, actorRole: string, eventType: string, targetType: string, targetId: string | null, outcome = "ALLOWED", metadata?: unknown) {
  await query(
    `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [newId("audit"), tenantId, actorRole, eventType, targetType, targetId, outcome, metadata ? JSON.stringify(metadata) : null],
  );
}

export async function getRcmOperatingCenter(tenantId = defaultTenantId) {
  const [items, claims, benefits, priorAuths, denials, eras, payerFollowUps, revenueFindings, treatmentPlans, ledger, payments, metrics] = await Promise.all([
    query(
      `select r.*, p."firstName", p."lastName", p."chartNumber", a."startsAt", a."appointmentType"
       from "RcmWorkItem" r
       left join "PmsPatient" p on p."id" = r."patientId"
       left join "PmsAppointment" a on a."id" = r."appointmentId"
       where r."tenantId" = $1
       order by case r."priority" when 'HIGH' then 0 when 'NORMAL' then 1 else 2 end, r."dueAt" asc nulls last, r."createdAt" desc`,
      [tenantId],
    ),
    query(
      `select c.*, p."firstName", p."lastName", p."chartNumber", pi."subscriberId",
        coalesce(lines."lineCount", 0)::int as "lineCount",
        coalesce(lines."readyLines", 0)::int as "readyLines",
        coalesce(lines."blockedLines", 0)::int as "blockedLines"
       from "PmsClaim" c
       join "PmsPatient" p on p."id" = c."patientId"
       left join "PmsPatientInsurance" pi on pi."id" = c."patientInsuranceId"
       left join (
         select "claimId",
          count(*)::int as "lineCount",
          count(*) filter (where "status" in ('READY','SUBMITTED','PAID'))::int as "readyLines",
          count(*) filter (where "status" like '%NEEDS%' or "status" like '%DENIED%')::int as "blockedLines"
         from "PmsClaimLine"
         group by "claimId"
       ) lines on lines."claimId" = c."id"
       where c."tenantId" = $1
       order by c."lastStatusAt" desc nulls last`,
      [tenantId],
    ),
    query(
      `select pi.*, p."firstName", p."lastName", p."chartNumber",
        ip."payerName", ip."payerId", ip."planName", ip."planType", ip."networkStatus",
        bs."benefitYear", bs."deductibleCents", bs."deductibleMetCents", bs."annualMaxCents", bs."annualUsedCents", bs."frequencies", bs."limitations"
       from "PmsPatientInsurance" pi
       join "PmsPatient" p on p."id" = pi."patientId"
       join "PmsInsurancePlan" ip on ip."id" = pi."planId"
       left join "PmsBenefitSummary" bs on bs."patientInsuranceId" = pi."id"
       where ip."tenantId" = $1
       order by case pi."eligibilityStatus" when 'NEEDS_REVIEW' then 0 when 'NOT_CHECKED' then 1 when 'INACTIVE' then 2 else 3 end, pi."lastVerifiedAt" asc nulls first, p."lastName"`,
      [tenantId],
    ),
    query(
      `select pa.*, p."firstName", p."lastName", p."chartNumber", tp."name" as "treatmentPlanName"
       from "RcmPriorAuthorization" pa
       join "PmsPatient" p on p."id" = pa."patientId"
       left join "PmsTreatmentPlan" tp on tp."id" = pa."treatmentPlanId"
       where pa."tenantId" = $1
       order by case pa."status" when 'EVIDENCE_NEEDED' then 0 when 'READY_FOR_REVIEW' then 1 when 'SUBMITTED' then 2 else 3 end, pa."expiresAt" asc nulls last`,
      [tenantId],
    ),
    query(
      `select d.*, p."firstName", p."lastName", p."chartNumber", c."claimNumber"
       from "RcmDenialCase" d
       join "PmsPatient" p on p."id" = d."patientId"
       join "PmsClaim" c on c."id" = d."claimId"
       where d."tenantId" = $1
       order by case d."status" when 'OPEN' then 0 when 'APPEAL_READY' then 1 when 'SUBMITTED' then 2 else 3 end, d."appealDeadline" asc nulls last`,
      [tenantId],
    ),
    query(
      `select era.*, p."firstName", p."lastName", p."chartNumber", c."claimNumber"
       from "RcmEraPosting" era
       join "PmsPatient" p on p."id" = era."patientId"
       join "PmsClaim" c on c."id" = era."claimId"
       where era."tenantId" = $1
       order by case era."status" when 'NEEDS_REVIEW' then 0 when 'READY_TO_POST' then 1 else 2 end, era."createdAt" desc`,
      [tenantId],
    ),
    query(
      `select f.*, p."firstName", p."lastName", p."chartNumber", c."claimNumber"
       from "RcmPayerFollowUp" f
       left join "PmsPatient" p on p."id" = f."patientId"
       left join "PmsClaim" c on c."id" = f."claimId"
       where f."tenantId" = $1
       order by case f."status" when 'OPEN' then 0 when 'WAITING_ON_PAYER' then 1 else 2 end, f."dueAt" asc nulls last`,
      [tenantId],
    ),
    query(
      `select ri.*, p."firstName", p."lastName", p."chartNumber", c."claimNumber"
       from "RcmRevenueIntegrityFinding" ri
       left join "PmsPatient" p on p."id" = ri."patientId"
       left join "PmsClaim" c on c."id" = ri."claimId"
       where ri."tenantId" = $1
       order by case ri."severity" when 'HIGH' then 0 when 'NORMAL' then 1 else 2 end, ri."createdAt" desc`,
      [tenantId],
    ),
    query(
      `select tp.*, p."firstName", p."lastName", p."chartNumber", pi."id" as "patientInsuranceId", ip."payerName",
        coalesce(items."itemCount", 0)::int as "itemCount",
        coalesce(items."requiresAuthCount", 0)::int as "requiresAuthCount"
       from "PmsTreatmentPlan" tp
       join "PmsPatient" p on p."id" = tp."patientId"
       left join "PmsPatientInsurance" pi on pi."patientId" = tp."patientId" and pi."priority" = 1
       left join "PmsInsurancePlan" ip on ip."id" = pi."planId"
       left join (
         select tpi."treatmentPlanId", count(*)::int as "itemCount",
          count(*) filter (where pc."code" in ('D6010','D4341','D4342','D4260','D4261','D2740','D2750','D2950'))::int as "requiresAuthCount"
         from "PmsTreatmentPlanItem" tpi
         join "PmsProcedureCode" pc on pc."id" = tpi."procedureCodeId"
         group by tpi."treatmentPlanId"
       ) items on items."treatmentPlanId" = tp."id"
       where tp."tenantId" = $1 and tp."status" in ('PRESENTED','ACCEPTED','DRAFT')
       order by tp."updatedAt" desc`,
      [tenantId],
    ),
    query(
      `select le.*, p."firstName", p."lastName", p."chartNumber", c."claimNumber"
       from "PmsLedgerEntry" le
       join "PmsPatient" p on p."id" = le."patientId"
       left join "PmsClaim" c on c."id" = le."claimId"
       where le."tenantId" = $1
       order by le."postedAt" desc limit 30`,
      [tenantId],
    ),
    query(
      `select pay.*, p."firstName", p."lastName", p."chartNumber"
       from "PmsPayment" pay
       join "PmsPatient" p on p."id" = pay."patientId"
       where pay."tenantId" = $1
       order by pay."postedAt" desc limit 20`,
      [tenantId],
    ),
    query<{ openItems: string; highPriority: string; blockedDollars: string; leakageDollars: string }>(
      `select
        (select count(*) from "RcmWorkItem" where "tenantId" = $1 and "status" not in ('COMPLETED','CLOSED'))::text as "openItems",
        (select count(*) from "RcmWorkItem" where "tenantId" = $1 and "priority" = 'HIGH' and "status" not in ('COMPLETED','CLOSED'))::text as "highPriority",
        (select coalesce(sum("billedCents" - "paidCents"), 0) from "PmsClaim" where "tenantId" = $1 and "status" not in ('PAID','CLOSED','VOID'))::text as "blockedDollars",
        (select coalesce(sum(abs("varianceCents")), 0) from "RcmRevenueIntegrityFinding" where "tenantId" = $1 and "status" not in ('RECOVERED','CLOSED'))::text as "leakageDollars"`,
      [tenantId],
    ),
  ]);
  return {
    items: items.rows,
    claims: claims.rows,
    benefits: benefits.rows,
    priorAuths: priorAuths.rows,
    denials: denials.rows,
    eras: eras.rows,
    payerFollowUps: payerFollowUps.rows,
    revenueFindings: revenueFindings.rows,
    treatmentPlans: treatmentPlans.rows,
    ledger: ledger.rows,
    payments: payments.rows,
    metrics: metrics.rows[0],
  };
}

export async function createRcmWorkItem(input: {
  tenantId?: string;
  patientId?: string;
  claimId?: string;
  workType: string;
  stage: string;
  priority: string;
  payerName?: string;
  amountCents?: number;
  blockerReason?: string;
  nextAction: string;
  dueAt?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("rcm");
  const result = await query(
    `insert into "RcmWorkItem"
       ("id", "tenantId", "patientId", "claimId", "workType", "stage", "priority", "payerName", "amountCents", "blockerReason", "nextAction", "dueAt", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, coalesce($9::int, 0), $10, $11, $12::timestamp, current_timestamp)
     returning *`,
    [id, tenantId, input.patientId || null, input.claimId || null, input.workType, input.stage, input.priority, input.payerName || null, input.amountCents ?? 0, input.blockerReason || null, input.nextAction, input.dueAt || null],
  );
  await addAudit(tenantId, "billing_rcm", "RCM_WORK_ITEM_CREATED", "RcmWorkItem", id);
  return result.rows[0];
}

export async function updateRcmWorkItemStatus(id: string, status: string, actorRole = "billing_rcm") {
  const result = await query<{ id: string; tenantId: string }>(
    `update "RcmWorkItem"
     set "status" = $2, "completedAt" = case when $2 in ('COMPLETED','CLOSED') then current_timestamp else "completedAt" end, "updatedAt" = current_timestamp
     where "id" = $1
     returning "id", "tenantId"`,
    [id, status],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, actorRole, "RCM_WORK_ITEM_STATUS_UPDATED", "RcmWorkItem", id, "ALLOWED", { status });
}

export async function createPriorAuthorization(input: {
  tenantId?: string;
  patientId: string;
  treatmentPlanId?: string;
  patientInsuranceId?: string;
  payerName: string;
  requestedCents: number;
  requiredEvidence?: string[];
  nextAction: string;
  expiresAt?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("pa");
  const result = await query(
    `insert into "RcmPriorAuthorization"
       ("id", "tenantId", "patientId", "treatmentPlanId", "patientInsuranceId", "payerName", "requestedCents", "status", "requiredEvidence", "expiresAt", "nextAction", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, 'EVIDENCE_NEEDED', $8::jsonb, $9::timestamp, $10, current_timestamp)
     returning *`,
    [
      id,
      tenantId,
      input.patientId,
      input.treatmentPlanId || null,
      input.patientInsuranceId || null,
      input.payerName.trim(),
      input.requestedCents,
      JSON.stringify(input.requiredEvidence ?? []),
      input.expiresAt || null,
      input.nextAction.trim(),
    ],
  );
  await addAudit(tenantId, "billing_rcm", "RCM_PRIOR_AUTH_CREATED", "RcmPriorAuthorization", id);
  return result.rows[0];
}

export async function updatePriorAuthorizationStatus(id: string, status: string, actorRole = "billing_rcm") {
  const result = await query<{ tenantId: string }>(
    `update "RcmPriorAuthorization"
     set "status" = $2,
       "submittedAt" = case when $2 = 'SUBMITTED' then current_timestamp else "submittedAt" end,
       "updatedAt" = current_timestamp
     where "id" = $1
     returning "tenantId"`,
    [id, status],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, actorRole, "RCM_PRIOR_AUTH_STATUS_UPDATED", "RcmPriorAuthorization", id, "ALLOWED", { status });
}

export async function createDenialCase(input: {
  tenantId?: string;
  patientId: string;
  claimId: string;
  payerName: string;
  denialCode?: string;
  denialReason: string;
  deniedCents: number;
  appealDeadline?: string;
  requiredEvidence?: string[];
  nextAction: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("denial");
  const result = await query(
    `insert into "RcmDenialCase"
       ("id", "tenantId", "patientId", "claimId", "payerName", "denialCode", "denialReason", "deniedCents", "appealDeadline", "status", "requiredEvidence", "nextAction", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamp, 'OPEN', $10::jsonb, $11, current_timestamp)
     returning *`,
    [id, tenantId, input.patientId, input.claimId, input.payerName.trim(), input.denialCode?.trim() || null, input.denialReason.trim(), input.deniedCents, input.appealDeadline || null, JSON.stringify(input.requiredEvidence ?? []), input.nextAction.trim()],
  );
  await addAudit(tenantId, "billing_rcm", "RCM_DENIAL_CASE_CREATED", "RcmDenialCase", id);
  return result.rows[0];
}

export async function updateDenialCaseStatus(id: string, status: string, actorRole = "billing_rcm") {
  const result = await query<{ tenantId: string }>(
    `update "RcmDenialCase" set "status" = $2, "updatedAt" = current_timestamp where "id" = $1 returning "tenantId"`,
    [id, status],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, actorRole, "RCM_DENIAL_STATUS_UPDATED", "RcmDenialCase", id, "ALLOWED", { status });
}

export async function createPayerFollowUp(input: {
  tenantId?: string;
  patientId?: string;
  claimId?: string;
  payerName: string;
  reason: string;
  channel: string;
  dueAt?: string;
  nextAction: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("pfu");
  const result = await query(
    `insert into "RcmPayerFollowUp"
       ("id", "tenantId", "patientId", "claimId", "payerName", "reason", "channel", "dueAt", "nextAction", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8::timestamp, $9, current_timestamp)
     returning *`,
    [id, tenantId, input.patientId || null, input.claimId || null, input.payerName.trim(), input.reason.trim(), input.channel, input.dueAt || null, input.nextAction.trim()],
  );
  await addAudit(tenantId, "billing_rcm", "RCM_PAYER_FOLLOW_UP_CREATED", "RcmPayerFollowUp", id);
  return result.rows[0];
}

export async function updatePayerFollowUpStatus(id: string, status: string, outcome?: string, actorRole = "billing_rcm") {
  const result = await query<{ tenantId: string }>(
    `update "RcmPayerFollowUp"
     set "status" = $2,
       "lastContactAt" = current_timestamp,
       "contactOutcome" = coalesce($3, "contactOutcome"),
       "updatedAt" = current_timestamp
     where "id" = $1
     returning "tenantId"`,
    [id, status, outcome || null],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, actorRole, "RCM_PAYER_FOLLOW_UP_UPDATED", "RcmPayerFollowUp", id, "ALLOWED", { status, outcome });
}

export async function postEraToLedger(id: string, actorRole = "billing_rcm") {
  const era = (await query<{
    id: string;
    tenantId: string;
    patientId: string;
    claimId: string;
    payerName: string;
    paidCents: number;
    allowedCents: number;
    patientDueCents: number;
    adjustmentCents: number;
  }>(`select * from "RcmEraPosting" where "id" = $1`, [id])).rows[0];
  if (!era) throw new Error("ERA posting was not found.");
  if (Number(era.paidCents) <= 0) throw new Error("ERA paid amount must be greater than zero before posting.");
  const ledgerEntryId = newId("led");
  const paymentId = newId("pay");
  await query(
    `insert into "PmsLedgerEntry"
       ("id", "tenantId", "patientId", "claimId", "entryType", "description", "amountCents", "balanceCents", "serviceDate")
     values ($1, $2, $3, $4, 'INSURANCE_PAYMENT', $5, $6, $6, current_timestamp)`,
    [ledgerEntryId, era.tenantId, era.patientId, era.claimId, `${era.payerName} ERA insurance payment`, -Math.abs(Number(era.paidCents))],
  );
  await query(
    `insert into "PmsPayment"
       ("id", "tenantId", "patientId", "ledgerEntryId", "paymentType", "amountCents", "reference", "unappliedCents", "status")
     values ($1, $2, $3, $4, 'INSURANCE_ERA', $5, $6, 0, 'POSTED')`,
    [paymentId, era.tenantId, era.patientId, ledgerEntryId, Math.abs(Number(era.paidCents)), id],
  );
  await query(
    `update "PmsClaim"
     set "allowedCents" = $2, "paidCents" = "paidCents" + $3, "patientDueCents" = $4,
       "status" = case when ("paidCents" + $3) >= $2 then 'PAID' else 'PARTIALLY_PAID' end,
       "lastStatusAt" = current_timestamp, "updatedAt" = current_timestamp
     where "id" = $1`,
    [era.claimId, Number(era.allowedCents), Math.abs(Number(era.paidCents)), Number(era.patientDueCents)],
  );
  await query(`update "RcmEraPosting" set "status" = 'POSTED', "postedAt" = current_timestamp, "updatedAt" = current_timestamp where "id" = $1`, [id]);
  await addAudit(era.tenantId, actorRole, "RCM_ERA_POSTED_TO_LEDGER", "RcmEraPosting", id, "ALLOWED", { ledgerEntryId, paymentId });
  return { ledgerEntryId, paymentId };
}

export async function updateRevenueFindingStatus(id: string, status: string, actorRole = "billing_rcm") {
  const result = await query<{ tenantId: string }>(
    `update "RcmRevenueIntegrityFinding" set "status" = $2, "updatedAt" = current_timestamp where "id" = $1 returning "tenantId"`,
    [id, status],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, actorRole, "RCM_REVENUE_INTEGRITY_UPDATED", "RcmRevenueIntegrityFinding", id, "ALLOWED", { status });
}

export async function getPhoneOperatingCenter(tenantId = defaultTenantId) {
  const [conversations, messages, routes, tasks, analytics, numbers, extensions, devices, providers, activeCalls, controls, voicemails, metrics, patients] = await Promise.all([
    query(
      `select c.*, p."firstName", p."lastName", p."chartNumber", p."phone", p."email",
        a."appointmentType", a."startsAt",
        coalesce(ca."bookingIntentScore", 0)::int as "bookingIntentScore",
        coalesce(ca."serviceRecoveryScore", 0)::int as "serviceRecoveryScore",
        coalesce(ca."revenueOpportunityCents", 0)::int as "revenueOpportunityCents",
        ca."keywords", ca."riskFlags"
       from "PhoneConversation" c
       left join "PmsPatient" p on p."id" = c."patientId"
       left join "PmsAppointment" a on a."id" = c."appointmentId"
       left join "PhoneCallAnalytics" ca on ca."conversationId" = c."id"
       where c."tenantId" = $1
       order by c."startedAt" desc`,
      [tenantId],
    ),
    query(
      `select m.*, p."firstName", p."lastName", p."chartNumber", c."aiIntent"
       from "PhoneOutboundMessage" m
       left join "PmsPatient" p on p."id" = m."patientId"
       left join "PhoneConversation" c on c."id" = m."conversationId"
       where m."tenantId" = $1
       order by case m."approvalStatus" when 'BLOCKED' then 0 when 'NEEDS_APPROVAL' then 1 when 'DRAFT' then 2 else 3 end, m."createdAt" desc`,
      [tenantId],
    ),
    query(
      `select r.*, l."name" as "locationName"
       from "PhoneRoutingRule" r
       left join "Location" l on l."id" = r."locationId"
       where r."tenantId" = $1
       order by r."priority" asc, r."name"`,
      [tenantId],
    ),
    query(
      `select t.*, p."firstName", p."lastName", p."chartNumber", c."aiIntent", c."callerNumber"
       from "PhoneCallTask" t
       left join "PmsPatient" p on p."id" = t."patientId"
       left join "PhoneConversation" c on c."id" = t."conversationId"
       where t."tenantId" = $1
       order by case t."priority" when 'HIGH' then 0 when 'NORMAL' then 1 else 2 end, t."dueAt" asc nulls last`,
      [tenantId],
    ),
    query(
      `select ca.*, c."callerName", c."callerNumber", c."aiIntent", p."firstName", p."lastName", p."chartNumber"
       from "PhoneCallAnalytics" ca
       join "PhoneConversation" c on c."id" = ca."conversationId"
       left join "PmsPatient" p on p."id" = c."patientId"
       where ca."tenantId" = $1
       order by ca."bookingIntentScore" desc, ca."serviceRecoveryScore" desc`,
      [tenantId],
    ),
    query(
      `select n.*, l."name" as "locationName", r."name" as "routeName"
       from "PhoneNumber" n
       left join "Location" l on l."id" = n."locationId"
       left join "PhoneRoutingRule" r on r."id" = n."defaultRouteId"
       where n."tenantId" = $1
       order by case n."numberType" when 'MAIN' then 0 when 'TRACKING' then 1 else 2 end, n."label"`,
      [tenantId],
    ),
    query(
      `select e.*, l."name" as "locationName"
       from "PhoneExtension" e
       left join "Location" l on l."id" = e."locationId"
       where e."tenantId" = $1
       order by e."extensionNumber"`,
      [tenantId],
    ),
    query(
      `select d.*, e."extensionNumber", e."displayName" as "extensionName", l."name" as "locationName"
       from "PhoneDevice" d
       left join "PhoneExtension" e on e."id" = d."extensionId"
       left join "Location" l on l."id" = d."locationId"
       where d."tenantId" = $1
       order by case d."registrationStatus" when 'ONLINE' then 1 else 0 end, d."label"`,
      [tenantId],
    ),
    query(`select * from "PhoneProviderConnection" where "tenantId" = $1 order by "providerType", "name"`, [tenantId]),
    query(
      `select ac.*, e."extensionNumber", e."displayName" as "extensionName", c."callerName", c."aiIntent"
       from "PhoneActiveCall" ac
       left join "PhoneExtension" e on e."id" = ac."currentExtensionId"
       left join "PhoneConversation" c on c."id" = ac."conversationId"
       where ac."tenantId" = $1
       order by case ac."callState" when 'RINGING' then 0 when 'CONNECTED' then 1 when 'ON_HOLD_REVIEW' then 2 else 3 end, ac."startedAt" desc`,
      [tenantId],
    ),
    query(
      `select ca.*, e."extensionNumber", e."displayName" as "targetExtensionName"
       from "PhoneCallControlAction" ca
       left join "PhoneExtension" e on e."id" = ca."targetExtensionId"
       where ca."tenantId" = $1
       order by ca."createdAt" desc
       limit 30`,
      [tenantId],
    ),
    query(
      `select vm.*, e."extensionNumber", e."displayName" as "extensionName"
       from "PhoneVoicemail" vm
       left join "PhoneExtension" e on e."id" = vm."extensionId"
       where vm."tenantId" = $1
       order by case vm."status" when 'TRIAGE_REQUIRED' then 0 when 'NEW' then 1 else 2 end, vm."dueAt" asc nulls last`,
      [tenantId],
    ),
    query<{ openCalls: string; missedCalls: string; needsReview: string; highIntent: string; stagedMessages: string; openTasks: string; opportunityCents: string; setupRequired: string; activeCallControls: string; offlineDevices: string; newVoicemails: string }>(
      `select
        (select count(*) from "PhoneConversation" where "tenantId" = $1 and "status" = 'OPEN')::text as "openCalls",
        (select count(*) from "PhoneConversation" where "tenantId" = $1 and "outcome" = 'MISSED_CALL')::text as "missedCalls",
        (select count(*) from "PhoneConversation" where "tenantId" = $1 and ("followUpStatus" like '%REVIEW%' or "followUpStatus" like '%BLOCKED%'))::text as "needsReview",
        (select count(*) from "PhoneConversation" where "tenantId" = $1 and "aiSentiment" = 'HIGH_INTENT')::text as "highIntent",
        (select count(*) from "PhoneOutboundMessage" where "tenantId" = $1 and "approvalStatus" in ('DRAFT','NEEDS_APPROVAL','BLOCKED'))::text as "stagedMessages",
        (select count(*) from "PhoneCallTask" where "tenantId" = $1 and "status" = 'OPEN')::text as "openTasks",
        (select coalesce(sum("revenueOpportunityCents"), 0) from "PhoneCallAnalytics" where "tenantId" = $1)::text as "opportunityCents",
        ((select count(*) from "PhoneProviderConnection" where "tenantId" = $1 and "status" <> 'ACTIVE') +
         (select count(*) from "PhoneNumber" where "tenantId" = $1 and "status" <> 'ACTIVE') +
         (select count(*) from "PhoneDevice" where "tenantId" = $1 and "registrationStatus" <> 'ONLINE'))::text as "setupRequired",
        (select count(*) from "PhoneCallControlAction" where "tenantId" = $1 and "providerStatus" = 'CONNECTOR_REQUIRED')::text as "activeCallControls",
        (select count(*) from "PhoneDevice" where "tenantId" = $1 and "registrationStatus" <> 'ONLINE')::text as "offlineDevices",
        (select count(*) from "PhoneVoicemail" where "tenantId" = $1 and "status" in ('NEW','TRIAGE_REQUIRED'))::text as "newVoicemails"`,
      [tenantId],
    ),
    listPatientOptions(tenantId),
  ]);
  return {
    conversations: conversations.rows,
    messages: messages.rows,
    routes: routes.rows,
    tasks: tasks.rows,
    analytics: analytics.rows,
    numbers: numbers.rows,
    extensions: extensions.rows,
    devices: devices.rows,
    providers: providers.rows,
    activeCalls: activeCalls.rows,
    controls: controls.rows,
    voicemails: voicemails.rows,
    metrics: metrics.rows[0],
    patients,
  };
}

export async function createPhoneConversation(input: {
  tenantId?: string;
  patientId?: string;
  direction: string;
  callerNumber?: string;
  callerName?: string;
  aiIntent: string;
  transcriptSummary: string;
  outcome: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("phone");
  await query(
    `insert into "PhoneConversation"
       ("id", "tenantId", "patientId", "direction", "channel", "status", "callerNumber", "practiceNumber", "callerName", "aiIntent", "aiSentiment", "transcriptSummary", "followUpStatus", "outcome", "updatedAt")
     values ($1, $2, $3, $4, 'VOICE', 'OPEN', $5, '(303) 555-0100', $6, $7, 'NEEDS_REVIEW', $8, 'NEEDS_REVIEW', $9, current_timestamp)`,
    [id, tenantId, input.patientId || null, input.direction, input.callerNumber || null, input.callerName || null, input.aiIntent, input.transcriptSummary, input.outcome],
  );
  await addAudit(tenantId, "front_desk", "PHONE_CONVERSATION_CREATED", "PhoneConversation", id);
}

export async function updatePhoneConversationStatus(id: string, status: string, followUpStatus: string) {
  const result = await query<{ tenantId: string }>(
    `update "PhoneConversation" set "status" = $2, "followUpStatus" = $3, "updatedAt" = current_timestamp where "id" = $1 returning "tenantId"`,
    [id, status, followUpStatus],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, "front_desk", "PHONE_WORK_STATUS_UPDATED", "PhoneConversation", id, "ALLOWED", { status, followUpStatus });
}

export async function createPhoneOutboundMessage(input: {
  tenantId?: string;
  conversationId?: string;
  patientId?: string;
  appointmentId?: string;
  channel: string;
  recipientNumber?: string;
  messageType: string;
  body: string;
  consentStatus?: string;
  blockedReason?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("pmsg");
  const consentStatus = input.consentStatus || "UNKNOWN";
  const blockedReason =
    input.blockedReason ||
    (consentStatus === "VERIFIED"
      ? null
      : consentStatus === "OPTED_OUT"
        ? "Patient has opted out of this channel. Message cannot be approved or sent."
        : "Patient communication consent is not verified. Message must stay blocked until consent is confirmed.");
  await query(
    `insert into "PhoneOutboundMessage"
       ("id", "tenantId", "conversationId", "patientId", "appointmentId", "channel", "recipientNumber", "messageType", "body", "approvalStatus", "deliveryStatus", "consentStatus", "blockedReason", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9,
       case when coalesce($11, '') <> '' then 'BLOCKED' else 'NEEDS_APPROVAL' end,
       'NOT_SENT', coalesce($10, 'UNKNOWN'), $11, current_timestamp)`,
    [id, tenantId, input.conversationId || null, input.patientId || null, input.appointmentId || null, input.channel, input.recipientNumber || null, input.messageType, input.body.trim(), consentStatus, blockedReason],
  );
  await addAudit(tenantId, "front_desk", "PHONE_OUTBOUND_MESSAGE_STAGED", "PhoneOutboundMessage", id, blockedReason ? "BLOCKED" : "ALLOWED", { consentStatus, blockedReason });
}

export async function updatePhoneOutboundMessageApproval(id: string, approvalStatus: string, actorRole = "front_desk") {
  const result = await query<{ tenantId: string; appliedStatus: string; deliveryStatus: string; blockedReason: string | null }>(
    `update "PhoneOutboundMessage"
     set "approvalStatus" = case
         when $2 = 'APPROVED_STAGED' and "consentStatus" <> 'VERIFIED' then 'BLOCKED'
         when $2 = 'APPROVED_STAGED' and coalesce("blockedReason", '') <> '' then 'BLOCKED'
         else $2
       end,
       "deliveryStatus" = case
         when $2 = 'APPROVED_STAGED' and "consentStatus" = 'VERIFIED' and coalesce("blockedReason", '') = '' then 'READY_FOR_CONNECTOR'
         else "deliveryStatus"
       end,
       "blockedReason" = case
         when $2 = 'APPROVED_STAGED' and "consentStatus" <> 'VERIFIED' then 'Cannot approve outbound message until patient channel consent is verified.'
         else "blockedReason"
       end,
       "updatedAt" = current_timestamp
     where "id" = $1
     returning "tenantId", "approvalStatus" as "appliedStatus", "deliveryStatus", "blockedReason"`,
    [id, approvalStatus],
  );
  if (result.rows[0]) {
    const row = result.rows[0];
    await addAudit(row.tenantId, actorRole, "PHONE_MESSAGE_APPROVAL_UPDATED", "PhoneOutboundMessage", id, row.appliedStatus === "BLOCKED" ? "BLOCKED" : "ALLOWED", {
      requestedStatus: approvalStatus,
      appliedStatus: row.appliedStatus,
      deliveryStatus: row.deliveryStatus,
      blockedReason: row.blockedReason,
    });
  }
}

export async function updatePhoneCallTaskStatus(id: string, status: string, actorRole = "front_desk") {
  const result = await query<{ tenantId: string }>(
    `update "PhoneCallTask"
     set "status" = $2,
       "completedAt" = case when $2 in ('COMPLETED','CLOSED') then current_timestamp else "completedAt" end,
       "updatedAt" = current_timestamp
     where "id" = $1
     returning "tenantId"`,
    [id, status],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, actorRole, "PHONE_TASK_STATUS_UPDATED", "PhoneCallTask", id, "ALLOWED", { status });
}

export async function createPhoneRoutingRule(input: {
  tenantId?: string;
  name: string;
  triggerType: string;
  destinationType: string;
  destination: string;
  priority: number;
  failoverAction?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("route");
  await query(
    `insert into "PhoneRoutingRule"
       ("id", "tenantId", "name", "triggerType", "destinationType", "destination", "priority", "failoverAction", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, current_timestamp)`,
    [id, tenantId, input.name.trim(), input.triggerType, input.destinationType, input.destination.trim(), input.priority, input.failoverAction?.trim() || null],
  );
  await addAudit(tenantId, "practice_manager", "PHONE_ROUTING_RULE_CREATED", "PhoneRoutingRule", id);
}

export async function createPhoneCallControlAction(input: {
  tenantId?: string;
  activeCallId?: string;
  conversationId?: string;
  actionType: string;
  requestedByRole?: string;
  targetExtensionId?: string;
  targetNumber?: string;
  targetParkSlot?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("pctrl");
  const blockedReason = "Live call control requires configured SIP/WebRTC provider credentials, active call webhooks, and successful smoke test. Internal work item was recorded; no fake call action was sent.";
  await query(
    `insert into "PhoneCallControlAction"
       ("id", "tenantId", "activeCallId", "conversationId", "actionType", "requestedByRole", "targetExtensionId", "targetNumber", "targetParkSlot", "providerStatus", "blockedReason", "resultSummary", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'CONNECTOR_REQUIRED', $10, $11, current_timestamp)`,
    [id, tenantId, input.activeCallId || null, input.conversationId || null, input.actionType, input.requestedByRole || "front_desk", input.targetExtensionId || null, input.targetNumber || null, input.targetParkSlot || null, blockedReason, `${input.actionType} staged for provider execution.`],
  );
  await addAudit(tenantId, input.requestedByRole || "front_desk", "PHONE_CALL_CONTROL_STAGED", "PhoneCallControlAction", id, "BLOCKED", { actionType: input.actionType });
}

export async function updatePhoneDeviceStatus(id: string, provisioningStatus: string, registrationStatus: string) {
  const result = await query<{ tenantId: string }>(
    `update "PhoneDevice"
     set "provisioningStatus" = $2,
       "registrationStatus" = $3,
       "lastSeenAt" = case when $3 = 'ONLINE' then current_timestamp else "lastSeenAt" end,
       "updatedAt" = current_timestamp
     where "id" = $1
     returning "tenantId"`,
    [id, provisioningStatus, registrationStatus],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, "practice_manager", "PHONE_DEVICE_STATUS_UPDATED", "PhoneDevice", id, "ALLOWED", { provisioningStatus, registrationStatus });
}

export async function updatePhoneProviderStatus(id: string, status: string, credentialStatus: string, webhookStatus: string) {
  const result = await query<{ tenantId: string }>(
    `update "PhoneProviderConnection"
     set "status" = $2,
       "credentialStatus" = $3,
       "webhookStatus" = $4,
       "lastSmokeTestAt" = case when $2 = 'ACTIVE' then current_timestamp else "lastSmokeTestAt" end,
       "updatedAt" = current_timestamp
     where "id" = $1
     returning "tenantId"`,
    [id, status, credentialStatus, webhookStatus],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, "practice_manager", "PHONE_PROVIDER_STATUS_UPDATED", "PhoneProviderConnection", id, "ALLOWED", { status, credentialStatus, webhookStatus });
}

export async function updatePhoneVoicemailStatus(id: string, status: string) {
  const result = await query<{ tenantId: string }>(
    `update "PhoneVoicemail" set "status" = $2, "updatedAt" = current_timestamp where "id" = $1 returning "tenantId"`,
    [id, status],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, "front_desk", "PHONE_VOICEMAIL_STATUS_UPDATED", "PhoneVoicemail", id, "ALLOWED", { status });
}

export async function getReputationOperatingCenter(tenantId = defaultTenantId) {
  const [reviews, surveys, recoveryCases, listings, responses, campaignRules, referralRequests, metrics, patients] = await Promise.all([
    query(
      `select r.*, p."firstName", p."lastName", p."chartNumber", pr."displayName" as "providerName", l."name" as "locationName",
        a."startsAt", a."appointmentType",
        rr."id" as "responseId", rr."approvalStatus" as "responseApprovalStatus", rr."publicationStatus", rr."blockedReason" as "responseBlockedReason"
       from "ReputationReviewWorkflow" r
       left join "PmsPatient" p on p."id" = r."patientId"
       left join "PmsProvider" pr on pr."id" = r."providerId"
       left join "Location" l on l."id" = r."locationId"
       left join "PmsAppointment" a on a."id" = r."appointmentId"
       left join "ReputationReviewResponse" rr on rr."reviewWorkflowId" = r."id"
       where r."tenantId" = $1
       order by case when r."requestStatus" like 'BLOCKED%' then 0 when r."requestStatus" = 'READY_FOR_APPROVAL' then 1 else 2 end, r."dueAt" asc nulls last, r."createdAt" desc`,
      [tenantId],
    ),
    query(
      `select s.*, p."firstName", p."lastName", p."chartNumber"
       from "PatientSurvey" s
       left join "PmsPatient" p on p."id" = s."patientId"
       where s."tenantId" = $1
       order by s."dueAt" asc nulls last, s."createdAt" desc`,
      [tenantId],
    ),
    query(
      `select c.*, p."firstName", p."lastName", p."chartNumber"
       from "ReputationRecoveryCase" c
       left join "PmsPatient" p on p."id" = c."patientId"
       where c."tenantId" = $1
       order by c."dueAt" asc nulls last`,
      [tenantId],
    ),
    query(
      `select lp.*, l."name" as "locationName"
       from "ReputationListingProfile" lp
       left join "Location" l on l."id" = lp."locationId"
       where lp."tenantId" = $1
       order by case lp."syncStatus" when 'DATA_MISMATCH' then 0 when 'NEEDS_CONNECTION' then 1 else 2 end, lp."platform"`,
      [tenantId],
    ),
    query(
      `select rr.*, rw."reviewSite", rw."rating", rw."publicReviewText", p."firstName", p."lastName", p."chartNumber"
       from "ReputationReviewResponse" rr
       join "ReputationReviewWorkflow" rw on rw."id" = rr."reviewWorkflowId"
       left join "PmsPatient" p on p."id" = rw."patientId"
       where rr."tenantId" = $1
       order by case rr."approvalStatus" when 'NEEDS_REVIEW' then 0 when 'APPROVED' then 1 else 2 end, rr."createdAt" desc`,
      [tenantId],
    ),
    query(
      `select *
       from "ReputationCampaignRule"
       where "tenantId" = $1
       order by case "status" when 'ACTIVE' then 0 else 1 end, "triggerEvent", "name"`,
      [tenantId],
    ),
    query(
      `select rr.*, p."firstName", p."lastName", p."chartNumber"
       from "ReputationReferralRequest" rr
       left join "PmsPatient" p on p."id" = rr."patientId"
       where rr."tenantId" = $1
       order by case rr."status" when 'READY_FOR_APPROVAL' then 0 when 'BLOCKED_TREATMENT_NOT_COMPLETE' then 1 else 2 end, rr."dueAt" asc nulls last`,
      [tenantId],
    ),
    query<{ readyRequests: string; blockedRequests: string; lowSurveys: string; responseDrafts: string; listingIssues: string; openRecovery: string; referralReady: string; reviewVolume: string; averageRating: string }>(
      `select
        (select count(*) from "ReputationReviewWorkflow" where "tenantId" = $1 and "requestStatus" = 'READY_FOR_APPROVAL')::text as "readyRequests",
        (select count(*) from "ReputationReviewWorkflow" where "tenantId" = $1 and "requestStatus" like 'BLOCKED%')::text as "blockedRequests",
        (select count(*) from "PatientSurvey" where "tenantId" = $1 and "recoveryRequired" = true)::text as "lowSurveys",
        (select count(*) from "ReputationReviewResponse" where "tenantId" = $1 and "approvalStatus" = 'NEEDS_REVIEW')::text as "responseDrafts",
        (select count(*) from "ReputationListingProfile" where "tenantId" = $1 and "syncStatus" in ('DATA_MISMATCH','NEEDS_CONNECTION','SYNC_ERROR'))::text as "listingIssues",
        (select count(*) from "ReputationRecoveryCase" where "tenantId" = $1 and "status" not in ('COMPLETED','CLOSED'))::text as "openRecovery",
        (select count(*) from "ReputationReferralRequest" where "tenantId" = $1 and "status" = 'READY_FOR_APPROVAL')::text as "referralReady",
        (select coalesce(sum("reviewCount"), 0) from "ReputationListingProfile" where "tenantId" = $1)::text as "reviewVolume",
        (select coalesce(round(avg("rating")::numeric, 2), 0) from "ReputationListingProfile" where "tenantId" = $1 and "rating" is not null)::text as "averageRating"`,
      [tenantId],
    ),
    listPatientOptions(tenantId),
  ]);
  return {
    reviews: reviews.rows,
    surveys: surveys.rows,
    recoveryCases: recoveryCases.rows,
    listings: listings.rows,
    responses: responses.rows,
    campaignRules: campaignRules.rows,
    referralRequests: referralRequests.rows,
    metrics: metrics.rows[0],
    patients,
  };
}

export async function createReviewWorkflow(input: {
  tenantId?: string;
  patientId?: string;
  serviceLine: string;
  reviewSite: string;
  requestChannel: string;
  responseDraft?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("rep");
  await query(
    `insert into "ReputationReviewWorkflow"
       ("id", "tenantId", "patientId", "locationId", "status", "serviceLine", "reviewSite", "requestChannel", "requestStatus", "responseDraft", "dueAt", "updatedAt")
     values ($1, $2, $3, 'loc_primary', 'OPEN', $4, $5, $6, 'READY_FOR_APPROVAL', $7, current_timestamp + interval '1 day', current_timestamp)`,
    [id, tenantId, input.patientId || null, input.serviceLine, input.reviewSite, input.requestChannel, input.responseDraft || null],
  );
  await addAudit(tenantId, "marketing_growth", "REPUTATION_WORKFLOW_CREATED", "ReputationReviewWorkflow", id);
}

export async function updateReviewWorkflowStatus(id: string, requestStatus: string) {
  const result = await query<{ tenantId: string }>(
    `update "ReputationReviewWorkflow" set "requestStatus" = $2, "status" = case when $2 = 'COMPLETED' then 'COMPLETED' else "status" end, "completedAt" = case when $2 = 'COMPLETED' then current_timestamp else "completedAt" end, "updatedAt" = current_timestamp where "id" = $1 returning "tenantId"`,
    [id, requestStatus],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, "marketing_growth", "REPUTATION_STATUS_UPDATED", "ReputationReviewWorkflow", id, "ALLOWED", { requestStatus });
}

export async function updateReviewResponseApproval(id: string, approvalStatus: string) {
  const result = await query<{ tenantId: string }>(
    `update "ReputationReviewResponse"
     set "approvalStatus" = $2,
       "approvedByRoleKey" = case when $2 = 'APPROVED' then 'marketing_growth' else "approvedByRoleKey" end,
       "approvedAt" = case when $2 = 'APPROVED' then current_timestamp else "approvedAt" end,
       "publicationStatus" = case when $2 = 'APPROVED' then 'BLOCKED_CONNECTOR_REQUIRED' else "publicationStatus" end,
       "blockedReason" = case when $2 = 'APPROVED' then 'Review source connector and publication policy are required before external posting.' else "blockedReason" end,
       "updatedAt" = current_timestamp
     where "id" = $1
     returning "tenantId"`,
    [id, approvalStatus],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, "marketing_growth", "REVIEW_RESPONSE_APPROVAL_UPDATED", "ReputationReviewResponse", id, "ALLOWED", { approvalStatus });
}

export async function updateListingProfileStatus(id: string, syncStatus: string, nextAction: string) {
  const result = await query<{ tenantId: string }>(
    `update "ReputationListingProfile"
     set "syncStatus" = $2,
       "nextAction" = $3,
       "lastSyncedAt" = case when $2 like 'CONNECTED%' then current_timestamp else "lastSyncedAt" end,
       "updatedAt" = current_timestamp
     where "id" = $1
     returning "tenantId"`,
    [id, syncStatus, nextAction.trim()],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, "marketing_growth", "LISTING_PROFILE_STATUS_UPDATED", "ReputationListingProfile", id, "ALLOWED", { syncStatus });
}

export async function createReputationCampaignRule(input: {
  tenantId?: string;
  name: string;
  triggerEvent: string;
  serviceLine?: string;
  channel: string;
  targetReviewSite: string;
  sendDelayHours: number;
  cooldownDays: number;
  minimumSurveyScore?: number;
  suppressions?: string;
  nextAction: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("repcamp");
  const suppressions = input.suppressions ? input.suppressions.split(",").map((item) => item.trim()).filter(Boolean) : [];
  await query(
    `insert into "ReputationCampaignRule"
       ("id", "tenantId", "name", "triggerEvent", "serviceLine", "channel", "targetReviewSite", "sendDelayHours", "cooldownDays", "minimumSurveyScore", "suppressions", "status", "nextAction", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, 'ACTIVE', $12, current_timestamp)`,
    [id, tenantId, input.name.trim(), input.triggerEvent, input.serviceLine?.trim() || null, input.channel, input.targetReviewSite, input.sendDelayHours, input.cooldownDays, input.minimumSurveyScore ?? null, JSON.stringify({ rules: suppressions }), input.nextAction.trim()],
  );
  await addAudit(tenantId, "marketing_growth", "REPUTATION_CAMPAIGN_RULE_CREATED", "ReputationCampaignRule", id);
}

export async function createReferralRequest(input: {
  tenantId?: string;
  patientId?: string;
  requestType: string;
  channel: string;
  offerSummary?: string;
  messageDraft: string;
  consentStatus: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("repref");
  await query(
    `insert into "ReputationReferralRequest"
       ("id", "tenantId", "patientId", "requestType", "channel", "status", "offerSummary", "messageDraft", "consentStatus", "conversionStatus", "dueAt", "updatedAt")
     values ($1, $2, $3, $4, $5, 'READY_FOR_APPROVAL', $6, $7, $8, 'NOT_SENT', current_timestamp + interval '1 day', current_timestamp)`,
    [id, tenantId, input.patientId || null, input.requestType, input.channel, input.offerSummary?.trim() || null, input.messageDraft.trim(), input.consentStatus],
  );
  await addAudit(tenantId, "marketing_growth", "REPUTATION_REFERRAL_REQUEST_CREATED", "ReputationReferralRequest", id);
}

export async function updateReferralRequestStatus(id: string, status: string) {
  const result = await query<{ tenantId: string }>(
    `update "ReputationReferralRequest"
     set "status" = $2,
       "conversionStatus" = case when $2 = 'APPROVED_TO_SEND' then 'BLOCKED_CONNECTOR_REQUIRED' else "conversionStatus" end,
       "completedAt" = case when $2 in ('COMPLETED','CLOSED') then current_timestamp else "completedAt" end,
       "updatedAt" = current_timestamp
     where "id" = $1
     returning "tenantId"`,
    [id, status],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, "marketing_growth", "REPUTATION_REFERRAL_STATUS_UPDATED", "ReputationReferralRequest", id, "ALLOWED", { status });
}

export async function getMarketingOperatingCenter(tenantId = defaultTenantId) {
  const [campaigns, landingPages, assets, metrics] = await Promise.all([
    query(
      `select c.*, lp."title" as "landingPageTitle", lp."slug" as "landingPageSlug"
       from "MarketingCampaign" c
       left join "MarketingLandingPage" lp on lp."id" = c."landingPageId"
       where c."tenantId" = $1
       order by c."startsAt" asc nulls last, c."createdAt" desc`,
      [tenantId],
    ),
    query(`select * from "MarketingLandingPage" where "tenantId" = $1 order by "serviceLine", "title"`, [tenantId]),
    query(`select * from "AiStudioAsset" where "tenantId" = $1 order by "createdAt" desc`, [tenantId]),
    query<{ campaigns: string; landingPages: string; aiDrafts: string; attributedProduction: string }>(
      `select
        (select count(*) from "MarketingCampaign" where "tenantId" = $1)::text as campaigns,
        (select count(*) from "MarketingLandingPage" where "tenantId" = $1)::text as "landingPages",
        (select count(*) from "AiStudioAsset" where "tenantId" = $1 and "approvalStatus" = 'NEEDS_REVIEW')::text as "aiDrafts",
        (select coalesce(sum("attributedProductionCents"), 0) from "MarketingCampaign" where "tenantId" = $1)::text as "attributedProduction"`,
      [tenantId],
    ),
  ]);
  return { campaigns: campaigns.rows, landingPages: landingPages.rows, assets: assets.rows, metrics: metrics.rows[0] };
}

export async function createMarketingCampaign(input: {
  tenantId?: string;
  landingPageId?: string;
  name: string;
  campaignType: string;
  audienceDefinition: string;
  primaryGoal: string;
  channelMix: string;
  aiStudioBrief?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("campaign");
  await query(
    `insert into "MarketingCampaign"
       ("id", "tenantId", "landingPageId", "name", "campaignType", "status", "audienceDefinition", "primaryGoal", "channelMix", "aiStudioBrief", "complianceStatus", "startsAt", "updatedAt")
     values ($1, $2, $3, $4, $5, 'DRAFT', $6, $7, $8, $9, 'NEEDS_REVIEW', current_date + interval '1 day', current_timestamp)`,
    [id, tenantId, input.landingPageId || null, input.name, input.campaignType, input.audienceDefinition, input.primaryGoal, input.channelMix.split(",").map((item) => item.trim()).filter(Boolean), input.aiStudioBrief || null],
  );
  await addAudit(tenantId, "marketing_growth", "MARKETING_CAMPAIGN_CREATED", "MarketingCampaign", id);
}

export async function updateMarketingStatus(target: "campaign" | "landingPage" | "asset", id: string, status: string) {
  const table = target === "campaign" ? "MarketingCampaign" : target === "landingPage" ? "MarketingLandingPage" : "AiStudioAsset";
  const field = target === "asset" ? "approvalStatus" : "status";
  const result = await query<{ tenantId: string }>(`update "${table}" set "${field}" = $2, "updatedAt" = current_timestamp where "id" = $1 returning "tenantId"`, [id, status]);
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, "marketing_growth", "MARKETING_STATUS_UPDATED", table, id, "ALLOWED", { field, status });
}

async function listPatientOptions(tenantId: string) {
  return (await query(
    `select "id", "firstName", "lastName", "chartNumber", "phone", "email"
     from "PmsPatient"
     where "tenantId" = $1 and "status" = 'ACTIVE'
     order by "lastName", "firstName"
     limit 50`,
    [tenantId],
  )).rows;
}
