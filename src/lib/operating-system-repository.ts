import { newId, query } from "@/lib/db";
import { defaultTenantId } from "@/lib/pms-repository";

async function addAudit(tenantId: string, actorRole: string, eventType: string, targetType: string, targetId: string | null, outcome = "ALLOWED", metadata?: unknown) {
  await query(
    `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [newId("audit"), tenantId, actorRole, eventType, targetType, targetId, outcome, metadata ? JSON.stringify(metadata) : null],
  );
}

const verifiedConsentStatuses = new Set(["VERIFIED", "CONSENTED", "OPTED_IN", "ACTIVE"]);
const allowedReviewStatuses = new Set(["READY_FOR_APPROVAL", "APPROVED_STAGED", "BLOCKED_SERVICE_RECOVERY", "BLOCKED_PRIVATE_SURVEY", "BLOCKED_ELIGIBILITY", "COMPLETED"]);
const allowedResponseStatuses = new Set(["NEEDS_REVIEW", "APPROVED", "APPROVED_STAGED", "REVISION_REQUIRED"]);
const allowedListingStatuses = new Set(["CONNECTED_REVIEW_SYNC", "DATA_MISMATCH", "NEEDS_CONNECTION", "MANUAL_REVIEW", "SYNC_ERROR"]);
const allowedReferralStatuses = new Set(["READY_FOR_APPROVAL", "APPROVED_TO_SEND", "BLOCKED_NEEDS_REVIEW", "BLOCKED_CONSENT", "BLOCKED_TREATMENT_NOT_COMPLETE", "COMPLETED", "CLOSED"]);
const allowedMarketingStatuses = new Set(["DRAFT", "READY_FOR_APPROVAL", "APPROVED_STAGED", "ACTIVE_INTERNAL", "BLOCKED_CONNECTOR_REQUIRED", "REVISION_REQUIRED", "APPROVED"]);
const allowedLocalSeoStatuses = new Set(["OPEN", "READY_FOR_APPROVAL", "APPROVED_STAGED", "BLOCKED_CONNECTOR_REQUIRED", "COMPLETED", "CLOSED"]);
const allowedRcmWorkStatuses = new Set(["OPEN", "READY_FOR_REVIEW", "APPROVED_STAGED", "BLOCKED_CONNECTOR_REQUIRED", "MANUAL_PROOF_REQUIRED", "COMPLETED", "CLOSED"]);
const allowedPriorAuthStatuses = new Set(["EVIDENCE_NEEDED", "READY_FOR_REVIEW", "APPROVED_STAGED", "BLOCKED_CONNECTOR_REQUIRED", "MANUAL_PROOF_REQUIRED", "APPROVED", "CLOSED"]);
const allowedDenialStatuses = new Set(["OPEN", "APPEAL_READY", "APPROVED_STAGED", "BLOCKED_CONNECTOR_REQUIRED", "MANUAL_PROOF_REQUIRED", "WON", "CLOSED"]);
const allowedPayerFollowUpStatuses = new Set(["OPEN", "WAITING_ON_PAYER", "MANUAL_PROOF_REQUIRED", "RESOLVED", "CLOSED"]);
const allowedRevenueStatuses = new Set(["OPEN", "IN_REVIEW", "RECOVERY_STAGED", "MANUAL_PROOF_REQUIRED", "RECOVERED", "CLOSED"]);

function requireAllowed(value: string, allowed: Set<string>, fallback: string) {
  return allowed.has(value) ? value : fallback;
}

function parseList(value?: string) {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
}

function isConsentVerified(value?: string | null) {
  return verifiedConsentStatuses.has(String(value ?? "").toUpperCase());
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
       order by case pa."status" when 'EVIDENCE_NEEDED' then 0 when 'READY_FOR_REVIEW' then 1 when 'APPROVED_STAGED' then 2 when 'BLOCKED_CONNECTOR_REQUIRED' then 3 else 4 end, pa."expiresAt" asc nulls last`,
      [tenantId],
    ),
    query(
      `select d.*, p."firstName", p."lastName", p."chartNumber", c."claimNumber"
       from "RcmDenialCase" d
       join "PmsPatient" p on p."id" = d."patientId"
       join "PmsClaim" c on c."id" = d."claimId"
       where d."tenantId" = $1
       order by case d."status" when 'OPEN' then 0 when 'APPEAL_READY' then 1 when 'APPROVED_STAGED' then 2 when 'BLOCKED_CONNECTOR_REQUIRED' then 3 else 4 end, d."appealDeadline" asc nulls last`,
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
       ("id", "tenantId", "patientId", "claimId", "workType", "stage", "priority", "payerName", "amountCents", "blockerReason", "connectorStatus", "proofRequired", "approvalPolicy", "nextAction", "dueAt", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, coalesce($9::int, 0), $10, 'CONNECTOR_REQUIRED', $13::jsonb, $14::jsonb, $11, $12::timestamp, current_timestamp)
     returning *`,
    [
      id,
      tenantId,
      input.patientId || null,
      input.claimId || null,
      input.workType,
      input.stage,
      input.priority,
      input.payerName || null,
      input.amountCents ?? 0,
      input.blockerReason || null,
      input.nextAction,
      input.dueAt || null,
      JSON.stringify(["payer portal reference", "clearinghouse acknowledgement", "manual staff attestation when no connector is active"]),
      JSON.stringify({ requiresHumanApproval: true, externalSubmissionBlockedWithoutConnector: true, writesBackToPms: true }),
    ],
  );
  await addAudit(tenantId, "billing_rcm", "RCM_WORK_ITEM_CREATED", "RcmWorkItem", id);
  return result.rows[0];
}

export async function updateRcmWorkItemStatus(id: string, status: string, actorRole = "billing_rcm") {
  const nextStatus = requireAllowed(status, allowedRcmWorkStatuses, "READY_FOR_REVIEW");
  const result = await query<{ id: string; tenantId: string }>(
    `update "RcmWorkItem"
     set "status" = $2,
       "connectorStatus" = case when $2 = 'APPROVED_STAGED' then 'CONNECTOR_REQUIRED' else "connectorStatus" end,
       "blockerReason" = case when $2 = 'APPROVED_STAGED' then coalesce("blockerReason", 'External payer/payment action is staged only; connector acknowledgement or manual proof is required before completion.') else "blockerReason" end,
       "completedAt" = case when $2 in ('COMPLETED','CLOSED') then current_timestamp else "completedAt" end,
       "updatedAt" = current_timestamp
     where "id" = $1
     returning "id", "tenantId"`,
    [id, nextStatus],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, actorRole, "RCM_WORK_ITEM_STATUS_UPDATED", "RcmWorkItem", id, "ALLOWED", { requestedStatus: status, appliedStatus: nextStatus });
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
       ("id", "tenantId", "patientId", "treatmentPlanId", "patientInsuranceId", "payerName", "requestedCents", "status", "requiredEvidence", "evidenceChecklist", "submissionReadiness", "connectorStatus", "blockedReason", "expiresAt", "nextAction", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, 'EVIDENCE_NEEDED', $8::jsonb, $11::jsonb, $12::jsonb, 'CONNECTOR_REQUIRED', 'Prior authorization cannot be marked submitted until a payer connector acknowledgement or manual proof is attached.', $9::timestamp, $10, current_timestamp)
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
      JSON.stringify({ requiredEvidence: input.requiredEvidence ?? [], payerRulesChecked: false, clinicalReviewRequired: true, patientFinancialReviewRequired: true }),
      JSON.stringify({ evidenceComplete: false, payerConnectorReady: false, humanApprovalRequired: true, externalSubmissionBlocked: true }),
    ],
  );
  await addAudit(tenantId, "billing_rcm", "RCM_PRIOR_AUTH_CREATED", "RcmPriorAuthorization", id);
  return result.rows[0];
}

export async function updatePriorAuthorizationStatus(id: string, status: string, actorRole = "billing_rcm") {
  const nextStatus = requireAllowed(status === "SUBMITTED" ? "BLOCKED_CONNECTOR_REQUIRED" : status, allowedPriorAuthStatuses, "READY_FOR_REVIEW");
  const result = await query<{ tenantId: string }>(
    `update "RcmPriorAuthorization"
     set "status" = $2,
       "connectorStatus" = case when $2 in ('APPROVED_STAGED','BLOCKED_CONNECTOR_REQUIRED') then 'CONNECTOR_REQUIRED' else "connectorStatus" end,
       "blockedReason" = case
         when $2 in ('APPROVED_STAGED','BLOCKED_CONNECTOR_REQUIRED') then 'Prior authorization is staged only. Payer submission requires connector acknowledgement or attached manual proof.'
         else "blockedReason"
       end,
       "submissionReadiness" = coalesce("submissionReadiness", '{"evidenceComplete":false,"payerConnectorReady":false,"humanApprovalRequired":true,"externalSubmissionBlocked":true}'::jsonb),
       "updatedAt" = current_timestamp
     where "id" = $1
     returning "tenantId"`,
    [id, nextStatus],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, actorRole, "RCM_PRIOR_AUTH_STATUS_UPDATED", "RcmPriorAuthorization", id, "ALLOWED", { requestedStatus: status, appliedStatus: nextStatus });
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
       ("id", "tenantId", "patientId", "claimId", "payerName", "denialCode", "denialReason", "deniedCents", "appealDeadline", "status", "requiredEvidence", "appealPacketStatus", "submissionReadiness", "connectorStatus", "blockedReason", "nextAction", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamp, 'OPEN', $10::jsonb, 'EVIDENCE_NEEDED', $12::jsonb, 'CONNECTOR_REQUIRED', 'Appeal cannot be marked submitted until payer connector acknowledgement or manual submission proof is attached.', $11, current_timestamp)
     returning *`,
    [id, tenantId, input.patientId, input.claimId, input.payerName.trim(), input.denialCode?.trim() || null, input.denialReason.trim(), input.deniedCents, input.appealDeadline || null, JSON.stringify(input.requiredEvidence ?? []), input.nextAction.trim(), JSON.stringify({ appealPacketComplete: false, payerConnectorReady: false, humanApprovalRequired: true, externalSubmissionBlocked: true })],
  );
  await addAudit(tenantId, "billing_rcm", "RCM_DENIAL_CASE_CREATED", "RcmDenialCase", id);
  return result.rows[0];
}

export async function updateDenialCaseStatus(id: string, status: string, actorRole = "billing_rcm") {
  const nextStatus = requireAllowed(status === "SUBMITTED" ? "BLOCKED_CONNECTOR_REQUIRED" : status, allowedDenialStatuses, "APPEAL_READY");
  const result = await query<{ tenantId: string }>(
    `update "RcmDenialCase"
     set "status" = $2,
       "appealPacketStatus" = case when $2 in ('APPEAL_READY','APPROVED_STAGED') then 'READY_FOR_APPROVAL' else "appealPacketStatus" end,
       "connectorStatus" = case when $2 in ('APPROVED_STAGED','BLOCKED_CONNECTOR_REQUIRED') then 'CONNECTOR_REQUIRED' else "connectorStatus" end,
       "blockedReason" = case when $2 in ('APPROVED_STAGED','BLOCKED_CONNECTOR_REQUIRED') then 'Appeal package is staged only. External submission requires payer connector acknowledgement or attached manual proof.' else "blockedReason" end,
       "submissionReadiness" = coalesce("submissionReadiness", '{"appealPacketComplete":false,"payerConnectorReady":false,"humanApprovalRequired":true,"externalSubmissionBlocked":true}'::jsonb),
       "updatedAt" = current_timestamp
     where "id" = $1 returning "tenantId"`,
    [id, nextStatus],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, actorRole, "RCM_DENIAL_STATUS_UPDATED", "RcmDenialCase", id, "ALLOWED", { requestedStatus: status, appliedStatus: nextStatus });
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
       ("id", "tenantId", "patientId", "claimId", "payerName", "reason", "channel", "dueAt", "connectorStatus", "blockedReason", "proofRequired", "nextAction", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8::timestamp, 'CONNECTOR_REQUIRED', 'Payer follow-up is a work queue item until a connector response or manual proof is recorded.', $10::jsonb, $9, current_timestamp)
     returning *`,
    [id, tenantId, input.patientId || null, input.claimId || null, input.payerName.trim(), input.reason.trim(), input.channel, input.dueAt || null, input.nextAction.trim(), JSON.stringify(["payer portal screenshot/reference", "call note", "276/277 status response", "staff attestation"])],
  );
  await addAudit(tenantId, "billing_rcm", "RCM_PAYER_FOLLOW_UP_CREATED", "RcmPayerFollowUp", id);
  return result.rows[0];
}

export async function updatePayerFollowUpStatus(id: string, status: string, outcome?: string, actorRole = "billing_rcm") {
  const nextStatus = requireAllowed(status, allowedPayerFollowUpStatuses, "WAITING_ON_PAYER");
  const result = await query<{ tenantId: string }>(
    `update "RcmPayerFollowUp"
     set "status" = $2,
       "lastContactAt" = current_timestamp,
       "contactOutcome" = coalesce($3, "contactOutcome"),
       "connectorStatus" = case when $2 = 'WAITING_ON_PAYER' then 'MANUAL_PROOF_REQUIRED' else "connectorStatus" end,
       "blockedReason" = case when $2 = 'WAITING_ON_PAYER' then 'Payer contact is recorded internally; external 276/277 or portal proof is required before payer status is treated as verified.' else "blockedReason" end,
       "updatedAt" = current_timestamp
     where "id" = $1
     returning "tenantId"`,
    [id, nextStatus, outcome || null],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, actorRole, "RCM_PAYER_FOLLOW_UP_UPDATED", "RcmPayerFollowUp", id, "ALLOWED", { requestedStatus: status, appliedStatus: nextStatus, outcome });
}

export async function postEraToLedger(id: string, actorRole = "billing_rcm") {
  const era = (await query<{
    id: string;
    tenantId: string;
    patientId: string;
    claimId: string;
    payerName: string;
    eraTraceNumber: string | null;
    eobDocumentId: string | null;
    paidCents: number;
    allowedCents: number;
    patientDueCents: number;
    adjustmentCents: number;
  }>(`select * from "RcmEraPosting" where "id" = $1`, [id])).rows[0];
  if (!era) throw new Error("ERA posting was not found.");
  if (Number(era.paidCents) <= 0) throw new Error("ERA paid amount must be greater than zero before posting.");
  if (!era.eraTraceNumber && !era.eobDocumentId) {
    await query(
      `update "RcmEraPosting"
       set "connectorStatus" = 'MANUAL_PROOF_REQUIRED',
         "blockedReason" = 'Manual EOB proof or ERA trace is required before posting to the PMS ledger.',
         "postingReadiness" = coalesce("postingReadiness", '{"hasEraOrEobProof":false,"ledgerImpactReviewed":false,"adjustmentsReviewed":false}'::jsonb),
         "updatedAt" = current_timestamp
       where "id" = $1`,
      [id],
    );
    await addAudit(era.tenantId, actorRole, "RCM_ERA_POST_BLOCKED", "RcmEraPosting", id, "BLOCKED", { blockedReason: "Manual EOB proof or ERA trace is required." });
    throw new Error("Manual EOB proof or ERA trace is required before posting to the PMS ledger.");
  }
  await query(
    `update "RcmEraPosting"
     set "postingReadiness" = coalesce("postingReadiness", jsonb_build_object('hasEraOrEobProof', coalesce("eraTraceNumber", '') <> '' or coalesce("eobDocumentId", '') <> '', 'ledgerImpactReviewed', true, 'adjustmentsReviewed', true)),
       "connectorStatus" = 'MANUAL_PROOF_REQUIRED',
       "blockedReason" = case when coalesce("eraTraceNumber", '') = '' and coalesce("eobDocumentId", '') = '' then 'Manual EOB proof or ERA trace is required for audit review.' else "blockedReason" end
     where "id" = $1`,
    [id],
  );
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
  const nextStatus = requireAllowed(status, allowedRevenueStatuses, "IN_REVIEW");
  const result = await query<{ tenantId: string }>(
    `update "RcmRevenueIntegrityFinding"
     set "status" = $2,
       "recoveryStatus" = $2,
       "connectorStatus" = case when $2 in ('RECOVERY_STAGED','RECOVERED') then 'MANUAL_PROOF_REQUIRED' else "connectorStatus" end,
       "proofRequired" = coalesce("proofRequired", '["source claim","ledger variance","payer contract or fee schedule","recovery action proof"]'::jsonb),
       "updatedAt" = current_timestamp
     where "id" = $1 returning "tenantId"`,
    [id, nextStatus],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, actorRole, "RCM_REVENUE_INTEGRITY_UPDATED", "RcmRevenueIntegrityFinding", id, "ALLOWED", { requestedStatus: status, appliedStatus: nextStatus });
}

export async function getPhoneOperatingCenter(tenantId = defaultTenantId) {
  const [conversations, messages, routes, tasks, analytics, numbers, extensions, devices, providers, activeCalls, controls, voicemails, channelSettings, knowledgeSources, webChats, webChatMessages, leadForms, formPackets, schedulingRules, metrics, patients] = await Promise.all([
    query(
      `select c.*, p."firstName", p."lastName", p."chartNumber", p."phone", p."email",
        a."appointmentType", a."startsAt",
        coalesce(ca."bookingIntentScore", 0)::int as "bookingIntentScore",
        coalesce(ca."serviceRecoveryScore", 0)::int as "serviceRecoveryScore",
        coalesce(ca."revenueOpportunityCents", 0)::int as "revenueOpportunityCents",
        ca."keywords", ca."riskFlags",
        coalesce(ledger."openBalanceCents", 0)::int as "openBalanceCents",
        coalesce(ledger."overdueBalanceCents", 0)::int as "overdueBalanceCents",
        coalesce(pms_tasks."openPmsTasks", 0)::int as "openPmsTasks",
        coalesce(appts."nextAppointments", '[]'::jsonb) as "nextAppointments",
        coalesce(treatment."openTreatmentPlans", '[]'::jsonb) as "openTreatmentPlans",
        coalesce(recalls."dueRecalls", '[]'::jsonb) as "dueRecalls",
        coalesce(forms."openForms", '[]'::jsonb) as "openForms",
        coalesce(prefs."communicationPreferences", '[]'::jsonb) as "communicationPreferences"
       from "PhoneConversation" c
       left join "PmsPatient" p on p."id" = c."patientId"
       left join "PmsAppointment" a on a."id" = c."appointmentId"
       left join "PhoneCallAnalytics" ca on ca."conversationId" = c."id"
       left join lateral (
         select
          coalesce(sum(le."balanceCents") filter (where le."balanceCents" > 0), 0) as "openBalanceCents",
          coalesce(sum(le."balanceCents") filter (where le."balanceCents" > 0 and coalesce(le."serviceDate", le."postedAt") < current_timestamp - interval '30 days'), 0) as "overdueBalanceCents"
         from "PmsLedgerEntry" le
         where le."tenantId" = $1 and le."patientId" = p."id"
       ) ledger on true
       left join lateral (
         select count(*) as "openPmsTasks"
         from "PmsTask" t
         where t."tenantId" = $1 and t."patientId" = p."id" and t."status" = 'OPEN'
       ) pms_tasks on true
       left join lateral (
         select jsonb_agg(jsonb_build_object(
           'id', rows."id",
           'appointmentType', rows."appointmentType",
           'startsAt', rows."startsAt",
           'status', rows."status",
           'readinessStatus', rows."readinessStatus",
           'productionCents', rows."productionCents"
         )) as "nextAppointments"
         from (
           select "id", "appointmentType", "startsAt", "status", "readinessStatus", "productionCents"
           from "PmsAppointment"
           where "tenantId" = $1 and "patientId" = p."id" and "startsAt" >= current_timestamp and "status" not in ('CANCELED','NO_SHOW','BROKEN')
           order by "startsAt" asc
           limit 3
         ) rows
       ) appts on true
       left join lateral (
         select jsonb_agg(jsonb_build_object(
           'id', rows."id",
           'name', rows."name",
           'status', rows."status",
           'totalFeeCents', rows."totalFeeCents",
           'patientEstimateCents', rows."patientEstimateCents"
         )) as "openTreatmentPlans"
         from (
           select "id", "name", "status", "totalFeeCents", "patientEstimateCents"
           from "PmsTreatmentPlan"
           where "tenantId" = $1 and "patientId" = p."id" and "status" in ('DRAFT','PRESENTED','ACCEPTED')
           order by "updatedAt" desc
           limit 3
         ) rows
       ) treatment on true
       left join lateral (
         select jsonb_agg(jsonb_build_object(
           'id', rows."id",
           'recallType', rows."recallType",
           'dueDate', rows."dueDate",
           'status', rows."status"
         )) as "dueRecalls"
         from (
           select "id", "recallType", "dueDate", "status"
           from "PmsRecall"
           where "tenantId" = $1 and "patientId" = p."id" and "status" in ('DUE','OVERDUE')
           order by "dueDate" asc
           limit 3
         ) rows
       ) recalls on true
       left join lateral (
         select jsonb_agg(jsonb_build_object(
           'id', rows."id",
           'templateName', rows."templateName",
           'status', rows."status",
           'dueAt', rows."dueAt"
         )) as "openForms"
         from (
           select fa."id", ft."name" as "templateName", fa."status", fa."dueAt"
           from "PmsFormAssignment" fa
           left join "PmsFormTemplate" ft on ft."id" = fa."templateId"
           where fa."tenantId" = $1 and fa."patientId" = p."id" and fa."status" in ('ASSIGNED','IN_PROGRESS','NEEDS_REVIEW')
           order by fa."dueAt" asc nulls last
           limit 3
         ) rows
       ) forms on true
       left join lateral (
         select jsonb_agg(jsonb_build_object(
           'channel', rows."channel",
           'destination', rows."destination",
           'consentStatus', rows."consentStatus",
           'quietHoursStart', rows."quietHoursStart",
           'quietHoursEnd', rows."quietHoursEnd"
         )) as "communicationPreferences"
         from (
           select "channel", "destination", "consentStatus", "quietHoursStart", "quietHoursEnd", "priority"
           from "PmsPatientCommunicationPreference"
           where "patientId" = p."id"
           order by "priority" asc, "channel"
           limit 5
         ) rows
       ) prefs on true
       where c."tenantId" = $1
       order by c."startedAt" desc`,
      [tenantId],
    ),
    query(
      `select m.*, p."firstName", p."lastName", p."chartNumber", c."aiIntent",
        coalesce(ledger."openBalanceCents", 0)::int as "openBalanceCents",
        coalesce(forms."openFormCount", 0)::int as "openFormCount"
       from "PhoneOutboundMessage" m
       left join "PmsPatient" p on p."id" = m."patientId"
       left join "PhoneConversation" c on c."id" = m."conversationId"
       left join lateral (
         select coalesce(sum("balanceCents") filter (where "balanceCents" > 0), 0) as "openBalanceCents"
         from "PmsLedgerEntry"
         where "tenantId" = $1 and "patientId" = p."id"
       ) ledger on true
       left join lateral (
         select count(*) as "openFormCount"
         from "PmsFormAssignment"
         where "tenantId" = $1 and "patientId" = p."id" and "status" in ('ASSIGNED','IN_PROGRESS','NEEDS_REVIEW')
       ) forms on true
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
    query(`select * from "PatientEngagementChannelSetting" where "tenantId" = $1 order by "channel"`, [tenantId]),
    query(`select * from "PatientEngagementKnowledgeSource" where "tenantId" = $1 order by case "status" when 'NEEDS_REVIEW' then 0 else 1 end, "sourceModule", "title"`, [tenantId]),
    query(
      `select wc.*, p."firstName", p."lastName", p."chartNumber", lf."name" as "leadFormName", lf."serviceLine"
       from "PatientWebChatConversation" wc
       left join "PmsPatient" p on p."id" = wc."patientId"
       left join "PatientEngagementLeadForm" lf on lf."id" = wc."leadFormId"
       where wc."tenantId" = $1
       order by case wc."status" when 'OPEN' then 0 else 1 end, wc."createdAt" desc`,
      [tenantId],
    ),
    query(
      `select wm.*, wc."visitorName", wc."visitorPhone", wc."visitorEmail", wc."sourcePage", wc."status" as "conversationStatus"
       from "PatientWebChatMessage" wm
       join "PatientWebChatConversation" wc on wc."id" = wm."conversationId"
       where wm."tenantId" = $1
       order by wm."createdAt" desc
       limit 40`,
      [tenantId],
    ),
    query(`select * from "PatientEngagementLeadForm" where "tenantId" = $1 order by "serviceLine", "name"`, [tenantId]),
    query(
      `select fp.*, p."firstName", p."lastName", p."chartNumber", a."appointmentType", a."startsAt"
       from "PatientEngagementFormPacket" fp
       left join "PmsPatient" p on p."id" = fp."patientId"
       left join "PmsAppointment" a on a."id" = fp."appointmentId"
       where fp."tenantId" = $1
       order by fp."dueAt" asc nulls last, fp."packetType"`,
      [tenantId],
    ),
    query(
      `select sr.*, ac."name" as "appointmentCategoryName", pr."displayName" as "providerName", l."name" as "locationName"
       from "PatientEngagementSchedulingRule" sr
       left join "PmsAppointmentCategory" ac on ac."id" = sr."appointmentCategoryId"
       left join "PmsProvider" pr on pr."id" = sr."providerId"
       left join "Location" l on l."id" = sr."locationId"
       where sr."tenantId" = $1
       order by sr."sourceChannel", sr."name"`,
      [tenantId],
    ),
    query<{ openCalls: string; missedCalls: string; needsReview: string; highIntent: string; stagedMessages: string; openTasks: string; opportunityCents: string; setupRequired: string; activeCallControls: string; offlineDevices: string; newVoicemails: string; openWebChats: string; kbNeedsReview: string; schedulingBlocked: string; formPackets: string }>(
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
        (select count(*) from "PhoneVoicemail" where "tenantId" = $1 and "status" in ('NEW','TRIAGE_REQUIRED'))::text as "newVoicemails",
        (select count(*) from "PatientWebChatConversation" where "tenantId" = $1 and "status" = 'OPEN')::text as "openWebChats",
        (select count(*) from "PatientEngagementKnowledgeSource" where "tenantId" = $1 and "status" = 'NEEDS_REVIEW')::text as "kbNeedsReview",
        (select count(*) from "PatientEngagementSchedulingRule" where "tenantId" = $1 and "pmsWritebackStatus" <> 'READY')::text as "schedulingBlocked",
        (select count(*) from "PatientEngagementFormPacket" where "tenantId" = $1 and "status" in ('DRAFT','READY_FOR_REVIEW'))::text as "formPackets"`,
      [tenantId],
    ),
    listPatientOptions(tenantId),
  ]);
  const setupReadiness = buildPhoneSetupReadiness({
    providers: providers.rows,
    numbers: numbers.rows,
    extensions: extensions.rows,
    devices: devices.rows,
  });
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
    channelSettings: channelSettings.rows,
    knowledgeSources: knowledgeSources.rows,
    webChats: webChats.rows,
    webChatMessages: webChatMessages.rows,
    leadForms: leadForms.rows,
    formPackets: formPackets.rows,
    schedulingRules: schedulingRules.rows,
    metrics: metrics.rows[0],
    setupReadiness,
    patients,
  };
}

function buildPhoneSetupReadiness(input: { providers: Record<string, unknown>[]; numbers: Record<string, unknown>[]; extensions: Record<string, unknown>[]; devices: Record<string, unknown>[] }) {
  const readyProviders = input.providers.filter((row) => row.status === "ACTIVE" && row.credentialStatus === "VALIDATED" && row.webhookStatus === "VERIFIED");
  const activeVoiceNumbers = input.numbers.filter((row) => row.status === "ACTIVE" && row.voiceStatus === "ACTIVE");
  const smsReadyNumbers = input.numbers.filter((row) => row.status === "ACTIVE" && row.smsStatus === "ACTIVE");
  const e911ReadyNumbers = input.numbers.filter((row) => row.e911Status === "VALIDATED" || row.e911Status === "ACTIVE");
  const provisionedExtensions = input.extensions.filter((row) => row.status === "ACTIVE");
  const registeredDevices = input.devices.filter((row) => row.provisioningStatus === "PROVISIONED" && row.registrationStatus === "ONLINE");
  const checks = [
    { label: "Carrier credentials", status: readyProviders.length ? "READY" : "BLOCKED_CONNECTOR_REQUIRED", nextAction: readyProviders.length ? "Provider credentials and webhooks are ready for smoke testing." : "Store SIP/WebRTC credentials, verify call-control webhooks, and run provider smoke tests." },
    { label: "Voice numbers", status: activeVoiceNumbers.length ? "READY" : "SETUP_REQUIRED", nextAction: activeVoiceNumbers.length ? "At least one office number is active for voice." : "Complete number porting, caller ID, default route, and inbound voice validation." },
    { label: "SMS texting", status: smsReadyNumbers.length ? "READY" : "BLOCKED_CONNECTOR_REQUIRED", nextAction: smsReadyNumbers.length ? "At least one number is SMS-ready." : "Register messaging use case, validate opt-in policy, and enable SMS webhooks before sending texts." },
    { label: "E911", status: e911ReadyNumbers.length ? "READY" : "SETUP_REQUIRED", nextAction: e911ReadyNumbers.length ? "Emergency address validation is ready." : "Validate emergency address and failover route for every live office number." },
    { label: "Extensions", status: provisionedExtensions.length ? "READY" : "SETUP_REQUIRED", nextAction: provisionedExtensions.length ? "Extensions exist for role routing and voicemail." : "Create extensions for front desk, billing, clinical triage, and AI receptionist fallback." },
    { label: "Desk phones and softphones", status: registeredDevices.length ? "READY" : "SETUP_REQUIRED", nextAction: registeredDevices.length ? "At least one provisioned device is registered." : "Assign devices, capture MAC/SIP credentials, and confirm online registration." },
  ];
  const blocked = checks.filter((check) => check.status !== "READY").length;
  return {
    status: blocked ? "SETUP_REQUIRED" : "READY_FOR_CONNECTOR",
    blocked,
    checks,
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
  const result = await query<{ tenantId: string; patientId: string | null; appointmentId: string | null; aiIntent: string | null; transcriptSummary: string | null }>(
    `update "PhoneConversation" set "status" = $2, "followUpStatus" = $3, "updatedAt" = current_timestamp where "id" = $1 returning "tenantId", "patientId", "appointmentId", "aiIntent", "transcriptSummary"`,
    [id, status, followUpStatus],
  );
  if (result.rows[0]) {
    const row = result.rows[0];
    await createPhoneHandoffTasks({
      tenantId: row.tenantId,
      conversationId: id,
      patientId: row.patientId ?? undefined,
      appointmentId: row.appointmentId ?? undefined,
      followUpStatus,
      aiIntent: row.aiIntent ?? "PHONE_CALL",
      transcriptSummary: row.transcriptSummary ?? "",
    });
    await addAudit(row.tenantId, "front_desk", "PHONE_WORK_STATUS_UPDATED", "PhoneConversation", id, "ALLOWED", { status, followUpStatus });
  }
}

async function createPhoneHandoffTasks(input: { tenantId: string; conversationId: string; patientId?: string; appointmentId?: string; followUpStatus: string; aiIntent: string; transcriptSummary: string }) {
  const handoff = classifyPhoneHandoff(input.followUpStatus);
  if (!handoff) return;
  const phoneTaskExists = (await query<{ count: string }>(
    `select count(*)::text as count from "PhoneCallTask" where "tenantId" = $1 and "conversationId" = $2 and "taskType" = $3 and "status" = 'OPEN'`,
    [input.tenantId, input.conversationId, handoff.taskType],
  )).rows[0];
  if (Number(phoneTaskExists?.count ?? 0) === 0) {
    await query(
      `insert into "PhoneCallTask" ("id", "tenantId", "conversationId", "patientId", "taskType", "priority", "status", "dueAt", "ownerRoleKey", "nextAction", "updatedAt")
       values ($1, $2, $3, $4, $5, $6, 'OPEN', current_timestamp + ($7::text)::interval, $8, $9, current_timestamp)`,
      [newId("ptask"), input.tenantId, input.conversationId, input.patientId || null, handoff.taskType, handoff.priority, handoff.dueIn, handoff.ownerRoleKey, handoff.nextAction()],
    );
  }
  const pmsTaskExists = (await query<{ count: string }>(
    `select count(*)::text as count
     from "PmsTask"
     where "tenantId" = $1 and coalesce("patientId", '') = coalesce($2::text, '') and "taskType" = $3 and "status" = 'OPEN' and "title" = $4`,
    [input.tenantId, input.patientId || null, handoff.taskType, handoff.title(input.aiIntent)],
  )).rows[0];
  if (Number(pmsTaskExists?.count ?? 0) === 0) {
    await query(
      `insert into "PmsTask" ("id", "tenantId", "patientId", "appointmentId", "ownerRoleKey", "title", "taskType", "priority", "dueAt", "updatedAt")
       values ($1, $2, $3, $4, $5, $6, $7, $8, current_timestamp + ($9::text)::interval, current_timestamp)`,
      [newId("task"), input.tenantId, input.patientId || null, input.appointmentId || null, handoff.ownerRoleKey, handoff.title(input.aiIntent), handoff.taskType, handoff.priority, handoff.dueIn],
    );
  }
  await addAudit(input.tenantId, "front_desk", "PHONE_HANDOFF_TASK_STAGED", "PhoneConversation", input.conversationId, "ALLOWED", {
    followUpStatus: input.followUpStatus,
    ownerRoleKey: handoff.ownerRoleKey,
    taskType: handoff.taskType,
    chartSummaryReadyForReview: input.followUpStatus === "CHART_NOTE_REVIEW",
  });
}

function classifyPhoneHandoff(followUpStatus: string) {
  if (followUpStatus === "BLOCKED_RCM_REVIEW") return {
    ownerRoleKey: "billing_rcm",
    taskType: "PHONE_BILLING_HANDOFF",
    priority: "HIGH",
    dueIn: "1 hour",
    title: (intent: string) => `Phone billing handoff: ${intent}`,
    nextAction: () => "Review PMS ledger, claim/EOB context, and patient balance before any payment link or billing SMS is staged.",
  };
  if (followUpStatus === "PATIENT_FINDER") return {
    ownerRoleKey: "front_desk",
    taskType: "PHONE_PATIENT_FINDER_FOLLOW_UP",
    priority: "NORMAL",
    dueIn: "2 hours",
    title: (intent: string) => `Phone follow-up for Patient Finder: ${intent}`,
    nextAction: () => "Convert high-intent call to a Patient Finder follow-up using schedule, recall, and unscheduled treatment context.",
  };
  if (followUpStatus === "CHART_NOTE_REVIEW") return {
    ownerRoleKey: "associate_provider",
    taskType: "PHONE_SUMMARY_CHART_REVIEW",
    priority: "NORMAL",
    dueIn: "1 day",
    title: (intent: string) => `Review AI phone summary for chart: ${intent}`,
    nextAction: () => "Review the AI call summary and copy clinically appropriate content to the chart only after staff approval.",
  };
  if (followUpStatus === "READY_FOR_APPROVAL") return {
    ownerRoleKey: "front_desk",
    taskType: "PHONE_OUTREACH_APPROVAL",
    priority: "NORMAL",
    dueIn: "4 hours",
    title: (intent: string) => `Approve staged phone follow-up: ${intent}`,
    nextAction: () => "Review consent, quiet hours, connector readiness, and PMS context before approving any outbound message.",
  };
  return null;
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
  linkType?: string;
  linkTargetId?: string;
  linkLabel?: string;
  blockedReason?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("pmsg");
  const consentStatus = input.consentStatus || "UNKNOWN";
  const connectorReadiness = await getPhoneOutboundConnectorReadiness(tenantId, input.channel, input.linkType);
  const consentBlockedReason =
    input.blockedReason ||
    (consentStatus === "VERIFIED"
      ? null
      : consentStatus === "OPTED_OUT"
        ? "Patient has opted out of this channel. Message cannot be approved or sent."
        : "Patient communication consent is not verified. Message must stay blocked until consent is confirmed.");
  const connectorStatus = connectorReadiness.ready ? "READY_FOR_CONNECTOR" : "BLOCKED_CONNECTOR_REQUIRED";
  const readiness = {
    ...connectorReadiness,
    consentVerified: consentStatus === "VERIFIED",
    linkType: input.linkType || null,
    linkTargetId: input.linkTargetId || null,
    externalSendBlocked: true,
    semantics: "Internal approval and connector queue only. No SMS, payment link, form link, or scheduling link is sent from this mutation.",
  };
  await query(
    `insert into "PhoneOutboundMessage"
       ("id", "tenantId", "conversationId", "patientId", "appointmentId", "channel", "recipientNumber", "messageType", "body", "approvalStatus", "deliveryStatus", "consentStatus", "connectorStatus", "linkType", "linkTargetId", "linkLabel", "readiness", "blockedReason", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9,
       case when coalesce($16, '') <> '' then 'BLOCKED' else 'NEEDS_APPROVAL' end,
       'NOT_SENT', coalesce($10, 'UNKNOWN'), $11, $12, $13, $14, $15::jsonb, $16, current_timestamp)`,
    [
      id,
      tenantId,
      input.conversationId || null,
      input.patientId || null,
      input.appointmentId || null,
      input.channel,
      input.recipientNumber || null,
      input.messageType,
      input.body.trim(),
      consentStatus,
      connectorStatus,
      input.linkType || null,
      input.linkTargetId || null,
      input.linkLabel || null,
      JSON.stringify(readiness),
      consentBlockedReason,
    ],
  );
  await addAudit(tenantId, "front_desk", "PHONE_OUTBOUND_MESSAGE_STAGED", "PhoneOutboundMessage", id, consentBlockedReason ? "BLOCKED" : "ALLOWED", { consentStatus, blockedReason: consentBlockedReason, connectorStatus, readiness });
}

async function getPhoneOutboundConnectorReadiness(tenantId: string, channel: string, linkType?: string) {
  const checks = await query<{ smsReady: string; voiceReady: string; paymentReady: string; formsReady: string; schedulingReady: string }>(
    `select
      (select count(*) from "PhoneNumber" where "tenantId" = $1 and "status" = 'ACTIVE' and "smsStatus" = 'ACTIVE')::text as "smsReady",
      (select count(*) from "PhoneNumber" where "tenantId" = $1 and "status" = 'ACTIVE' and "voiceStatus" = 'ACTIVE')::text as "voiceReady",
      0::text as "paymentReady",
      0::text as "formsReady",
      (select count(*) from "PmsOnlineSchedulingLink" where "tenantId" = $1 and "status" = 'ACTIVE')::text as "schedulingReady"`,
    [tenantId],
  );
  const row = checks.rows[0] ?? { smsReady: "0", voiceReady: "0", paymentReady: "0", formsReady: "0", schedulingReady: "0" };
  const missing = [
    channel === "SMS" && Number(row.smsReady) === 0 ? "active SMS number and messaging connector" : null,
    linkType === "PAYMENT_LINK" && Number(row.paymentReady) === 0 ? "payment connector and payment-link generator" : null,
    linkType === "FORM_PACKET_LINK" && Number(row.formsReady) === 0 ? "forms portal connector and secure form-link generator" : null,
    linkType === "ONLINE_SCHEDULING_LINK" && Number(row.schedulingReady) === 0 ? "active online scheduling link" : null,
  ].filter(Boolean);
  return {
    ready: missing.length === 0,
    missing,
    smsConnectorReady: Number(row.smsReady) > 0,
    voiceConnectorReady: Number(row.voiceReady) > 0,
    paymentConnectorReady: Number(row.paymentReady) > 0,
    formsConnectorReady: Number(row.formsReady) > 0,
    onlineSchedulingReady: Number(row.schedulingReady) > 0,
  };
}

export async function updatePhoneOutboundMessageApproval(id: string, approvalStatus: string, actorRole = "front_desk") {
  const result = await query<{ tenantId: string; appliedStatus: string; deliveryStatus: string; connectorStatus: string; blockedReason: string | null }>(
    `update "PhoneOutboundMessage"
     set "approvalStatus" = case
         when $2 = 'APPROVED_STAGED' and "consentStatus" <> 'VERIFIED' then 'BLOCKED'
         when $2 = 'APPROVED_STAGED' and coalesce("blockedReason", '') <> '' then 'BLOCKED'
         else $2
       end,
       "deliveryStatus" = case
         when $2 = 'APPROVED_STAGED' and "consentStatus" = 'VERIFIED' and coalesce("blockedReason", '') = '' and "connectorStatus" = 'READY_FOR_CONNECTOR' then 'READY_FOR_CONNECTOR'
         when $2 = 'APPROVED_STAGED' and "consentStatus" = 'VERIFIED' and coalesce("blockedReason", '') = '' and "connectorStatus" <> 'READY_FOR_CONNECTOR' then 'BLOCKED_CONNECTOR_REQUIRED'
         else "deliveryStatus"
       end,
       "blockedReason" = case
         when $2 = 'APPROVED_STAGED' and "consentStatus" <> 'VERIFIED' then 'Cannot approve outbound message until patient channel consent is verified.'
         else "blockedReason"
       end,
       "readiness" = coalesce("readiness", '{}'::jsonb) || jsonb_build_object('approvedByRole', $3, 'approvedAt', current_timestamp, 'externalSendBlocked', "connectorStatus" <> 'READY_FOR_CONNECTOR'),
       "updatedAt" = current_timestamp
     where "id" = $1
     returning "tenantId", "approvalStatus" as "appliedStatus", "deliveryStatus", "connectorStatus", "blockedReason"`,
    [id, approvalStatus, actorRole],
  );
  if (result.rows[0]) {
    const row = result.rows[0];
    await addAudit(row.tenantId, actorRole, "PHONE_MESSAGE_APPROVAL_UPDATED", "PhoneOutboundMessage", id, row.appliedStatus === "BLOCKED" ? "BLOCKED" : "ALLOWED", {
      requestedStatus: approvalStatus,
      appliedStatus: row.appliedStatus,
      deliveryStatus: row.deliveryStatus,
      connectorStatus: row.connectorStatus,
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
  const destination = input.destination.trim();
  const failoverAction = input.failoverAction?.trim() || null;
  const status =
    destination && failoverAction
      ? "READY_FOR_SMOKE_TEST"
      : "BLOCKED_CONFIGURATION";
  const validationSummary =
    destination && failoverAction
      ? "Route saved for smoke test. It is not live until provider webhooks and call routing tests pass."
      : "Route cannot be activated until destination and failover action are configured.";
  await query(
    `insert into "PhoneRoutingRule"
       ("id", "tenantId", "name", "triggerType", "destinationType", "destination", "priority", "failoverAction", "status", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, current_timestamp)`,
    [id, tenantId, input.name.trim(), input.triggerType, input.destinationType, destination, input.priority, failoverAction, status],
  );
  await addAudit(tenantId, "practice_manager", "PHONE_ROUTING_RULE_CREATED", "PhoneRoutingRule", id, status === "BLOCKED_CONFIGURATION" ? "BLOCKED" : "ALLOWED", {
    status,
    validationSummary,
    triggerType: input.triggerType,
    destinationType: input.destinationType,
  });
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
  const readiness = await query<{ missing: string[] }>(
    `select array_remove(array[
       case when not exists (select 1 from "PhoneProviderConnection" where "tenantId" = $1 and "status" = 'ACTIVE') then 'active carrier/provider connection' end,
       case when not exists (select 1 from "PhoneProviderConnection" where "tenantId" = $1 and "credentialStatus" = 'VALIDATED') then 'validated SIP/WebRTC credentials' end,
       case when not exists (select 1 from "PhoneProviderConnection" where "tenantId" = $1 and "webhookStatus" = 'VERIFIED') then 'verified call-control webhooks' end,
       case when not exists (select 1 from "PhoneNumber" where "tenantId" = $1 and "voiceStatus" = 'ACTIVE' and "status" = 'ACTIVE') then 'active voice number' end
     ], null) as missing`,
    [tenantId],
  );
  const missing = readiness.rows[0]?.missing ?? [];
  const blockedReason = missing.length
    ? `Live call control is blocked until ${missing.join(", ")} are configured. Internal work item was recorded; no fake call action was sent.`
    : "Live call control still requires provider API execution. Internal work item was recorded for smoke-test verification; no fake call action was sent.";
  await query(
    `insert into "PhoneCallControlAction"
       ("id", "tenantId", "activeCallId", "conversationId", "actionType", "requestedByRole", "targetExtensionId", "targetNumber", "targetParkSlot", "providerStatus", "blockedReason", "resultSummary", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'CONNECTOR_REQUIRED', $10, $11, current_timestamp)`,
    [id, tenantId, input.activeCallId || null, input.conversationId || null, input.actionType, input.requestedByRole || "front_desk", input.targetExtensionId || null, input.targetNumber || null, input.targetParkSlot || null, blockedReason, `${input.actionType} staged for provider execution.`],
  );
  await addAudit(tenantId, input.requestedByRole || "front_desk", "PHONE_CALL_CONTROL_STAGED", "PhoneCallControlAction", id, "BLOCKED", { actionType: input.actionType, missingReadiness: missing });
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

export async function updatePhoneNumberStatus(id: string, portStatus: string, voiceStatus: string, smsStatus: string, e911Status: string, status: string) {
  const result = await query<{ tenantId: string }>(
    `update "PhoneNumber"
     set "portStatus" = $2,
       "voiceStatus" = $3,
       "smsStatus" = $4,
       "e911Status" = $5,
       "status" = $6,
       "lastVerifiedAt" = case when $3 = 'ACTIVE' and $4 = 'ACTIVE' and $5 in ('VALIDATED','ACTIVE') then current_timestamp else "lastVerifiedAt" end,
       "updatedAt" = current_timestamp
     where "id" = $1
     returning "tenantId"`,
    [id, portStatus, voiceStatus, smsStatus, e911Status, status],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, "practice_manager", "PHONE_NUMBER_PROVISIONING_UPDATED", "PhoneNumber", id, "ALLOWED", { portStatus, voiceStatus, smsStatus, e911Status, status });
}

export async function updatePhoneExtensionStatus(id: string, status: string, voicemailEnabled: boolean) {
  const result = await query<{ tenantId: string }>(
    `update "PhoneExtension"
     set "status" = $2,
       "voicemailEnabled" = $3,
       "updatedAt" = current_timestamp
     where "id" = $1
     returning "tenantId"`,
    [id, status, voicemailEnabled],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, "practice_manager", "PHONE_EXTENSION_PROVISIONING_UPDATED", "PhoneExtension", id, "ALLOWED", { status, voicemailEnabled });
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
  const [reviews, surveys, recoveryCases, listings, listingIssueQueue, responses, campaignRules, referralRequests, metrics, patients] = await Promise.all([
    query(
      `select r.*, p."firstName", p."lastName", p."chartNumber", pr."displayName" as "providerName", l."name" as "locationName",
        a."startsAt", a."appointmentType", a."status" as "appointmentStatus", a."readinessStatus" as "appointmentReadiness",
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
      `select t.*, l."name" as "locationName", lp."platform", lp."syncStatus" as "listingSyncStatus", lp."napConsistencyStatus"
       from "MarketingLocalSeoTask" t
       left join "Location" l on l."id" = t."locationId"
       left join "ReputationListingProfile" lp on lp."id" = t."sourceListingId"
       where t."tenantId" = $1
         and (t."sourceListingId" is not null or t."taskType" in ('NAP_SYNC','GBP_POST','LOCATION_PAGE','SERVICE_CATEGORY','CITATION_CLEANUP'))
         and t."status" not in ('COMPLETED','CLOSED')
       order by case t."priority" when 'HIGH' then 0 when 'NORMAL' then 1 else 2 end, t."dueAt" asc nulls last`,
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
    listingIssueQueue: listingIssueQueue.rows,
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
  const eligibility = input.patientId
    ? await query<{
        openRecovery: string;
        optedOut: string;
        verifiedConsent: string;
        recentReview: string;
        billingDispute: string;
        completedVisit: string;
        clinicalIncident: string;
        unsignedClinicalNotes: string;
        completedAppointmentId: string | null;
        completedProviderId: string | null;
        completedLocationId: string | null;
        completedAppointmentType: string | null;
        completedVisitAt: string | null;
        privateSurveyId: string | null;
        privateSurveyStatus: string | null;
        privateSurveyScore: number | null;
        privateSurveyRecoveryRequired: boolean | null;
        positiveReviewSignal: string;
      }>(
        `select
           (select count(*) from "ReputationRecoveryCase" where "tenantId" = $1 and "patientId" = $2 and "status" not in ('COMPLETED','CLOSED'))::text as "openRecovery",
           (select count(*) from "PmsPatientCommunicationPreference" where "patientId" = $2 and "channel" = $3 and "consentStatus" in ('OPTED_OUT','DO_NOT_CONTACT'))::text as "optedOut",
           (select count(*) from "PmsPatientCommunicationPreference" where "patientId" = $2 and "channel" = $3 and "consentStatus" in ('VERIFIED','CONSENTED','OPTED_IN','ACTIVE'))::text as "verifiedConsent",
           (select count(*) from "ReputationReviewWorkflow" where "tenantId" = $1 and "patientId" = $2 and "createdAt" > current_timestamp - interval '90 days')::text as "recentReview",
           (select count(*) from "PmsClaim" where "tenantId" = $1 and "patientId" = $2 and "patientDueCents" > 0 and "status" in ('NEEDS_REVIEW','DENIED','PARTIAL','OPEN'))::text as "billingDispute",
           (select count(*) from "PmsAppointment" where "tenantId" = $1 and "patientId" = $2 and "status" = 'COMPLETED')::text as "completedVisit",
           (select count(*) from "ReputationRecoveryCase" where "tenantId" = $1 and "patientId" = $2 and "sentiment" in ('CLINICAL_RISK','FRUSTRATED','NEGATIVE') and "status" not in ('COMPLETED','CLOSED'))::text as "clinicalIncident",
           (select count(*) from "PmsClinicalNote" where "patientId" = $2 and "status" <> 'SIGNED' and "signedAt" is null)::text as "unsignedClinicalNotes",
           completed."id" as "completedAppointmentId",
           completed."providerId" as "completedProviderId",
           completed."locationId" as "completedLocationId",
           completed."appointmentType" as "completedAppointmentType",
           completed."startsAt"::text as "completedVisitAt",
           survey."id" as "privateSurveyId",
           survey."status" as "privateSurveyStatus",
           survey."score" as "privateSurveyScore",
           survey."recoveryRequired" as "privateSurveyRecoveryRequired",
           case when survey."score" >= 8 and survey."recoveryRequired" = false then 'POSITIVE_PRIVATE_SURVEY' else 'NO_PUBLIC_ASK_SIGNAL' end as "positiveReviewSignal"
         from (select 1) base
         left join lateral (
           select a."id", a."providerId", op."locationId", a."appointmentType", a."startsAt"
           from "PmsAppointment" a
           left join "PmsOperatory" op on op."id" = a."operatoryId"
           where a."tenantId" = $1 and a."patientId" = $2 and a."status" = 'COMPLETED'
           order by a."startsAt" desc
           limit 1
         ) completed on true
         left join lateral (
           select "id", "status", "score", "recoveryRequired"
           from "PatientSurvey"
           where "tenantId" = $1 and "patientId" = $2
             and ("appointmentId" = completed."id" or completed."id" is null)
           order by "createdAt" desc
           limit 1
         ) survey on true`,
        [tenantId, input.patientId, input.requestChannel],
      )
    : { rows: [{ openRecovery: "0", optedOut: "0", verifiedConsent: "0", recentReview: "0", billingDispute: "0", completedVisit: "0", clinicalIncident: "0", unsignedClinicalNotes: "0", completedAppointmentId: null, completedProviderId: null, completedLocationId: null, completedAppointmentType: null, completedVisitAt: null, privateSurveyId: null, privateSurveyStatus: null, privateSurveyScore: null, privateSurveyRecoveryRequired: null, positiveReviewSignal: "PRACTICE_LEVEL_MANUAL" }] };
  const row = eligibility.rows[0];
  const privateSurveyPassed = !input.patientId || (row?.privateSurveyStatus && ["RECEIVED", "COMPLETED", "APPROVED"].includes(row.privateSurveyStatus) && Number(row.privateSurveyScore ?? 0) >= 8 && row.privateSurveyRecoveryRequired === false);
  const blockedReasons = [
    Number(row?.openRecovery ?? 0) > 0 ? "open service recovery case" : null,
    Number(row?.optedOut ?? 0) > 0 ? "patient channel opt-out" : null,
    input.patientId && Number(row?.verifiedConsent ?? 0) === 0 ? "patient consent not verified for channel" : null,
    Number(row?.recentReview ?? 0) > 0 ? "duplicate review cooldown" : null,
    Number(row?.billingDispute ?? 0) > 0 ? "billing dispute or balance sensitivity" : null,
    input.patientId && Number(row?.completedVisit ?? 0) === 0 ? "no completed PMS visit found" : null,
    Number(row?.unsignedClinicalNotes ?? 0) > 0 ? "unsigned clinical note after visit" : null,
    input.patientId && !privateSurveyPassed ? "private survey must be completed with positive score before public review request" : null,
    Number(row?.clinicalIncident ?? 0) > 0 || row?.privateSurveyRecoveryRequired ? "clinical incident, low survey, or service-risk hold" : null,
  ].filter(Boolean);
  const requestStatus = blockedReasons.some((reason) => String(reason).includes("private survey")) ? "BLOCKED_PRIVATE_SURVEY" : blockedReasons.length ? "BLOCKED_ELIGIBILITY" : "READY_FOR_APPROVAL";
  const recoveryStatus = Number(row?.openRecovery ?? 0) > 0 || row?.privateSurveyRecoveryRequired ? "REQUIRED" : "NOT_REQUIRED";
  const eligibilitySummary = {
    source: input.patientId ? "PmsAppointment completed visit + PatientSurvey private feedback eligibility" : "practice-level manual workflow",
    completedVisit: {
      appointmentId: row?.completedAppointmentId,
      appointmentType: row?.completedAppointmentType,
      startsAt: row?.completedVisitAt,
    },
    privateSurvey: {
      surveyId: row?.privateSurveyId,
      status: row?.privateSurveyStatus,
      score: row?.privateSurveyScore,
      recoveryRequired: row?.privateSurveyRecoveryRequired,
      positiveReviewSignal: row?.positiveReviewSignal,
    },
    checks: {
      completedVisit: Number(row?.completedVisit ?? 0),
      verifiedConsent: Number(row?.verifiedConsent ?? 0),
      optOut: Number(row?.optedOut ?? 0),
      openRecovery: Number(row?.openRecovery ?? 0),
      billingDispute: Number(row?.billingDispute ?? 0),
      unsignedClinicalNotes: Number(row?.unsignedClinicalNotes ?? 0),
      clinicalIncident: Number(row?.clinicalIncident ?? 0),
      duplicateCooldown: Number(row?.recentReview ?? 0),
    },
  };
  await query(
    `insert into "ReputationReviewWorkflow"
       ("id", "tenantId", "patientId", "appointmentId", "providerId", "locationId", "status", "serviceLine", "reviewSite", "requestChannel", "requestStatus", "responseDraft", "recoveryStatus", "eligibilitySummary", "suppressionReasons", "privateSurveyRequired", "connectorStatus", "blockedReason", "dueAt", "updatedAt")
     values ($1, $2, $3, $15, $16, coalesce($17, 'loc_primary'), 'OPEN', $4, $5, $6, $7, $8, $9, $10::jsonb, $11::text[], $12, $13, $14, current_timestamp + interval '1 day', current_timestamp)`,
    [
      id,
      tenantId,
      input.patientId || null,
      input.serviceLine,
      input.reviewSite,
      input.requestChannel,
      requestStatus,
      input.responseDraft || (blockedReasons.length ? `Blocked: ${blockedReasons.join(", ")}.` : null),
      recoveryStatus,
      JSON.stringify(eligibilitySummary),
      blockedReasons,
      input.patientId ? !privateSurveyPassed || blockedReasons.some((reason) => String(reason).includes("service") || String(reason).includes("clinical") || String(reason).includes("billing")) : false,
      blockedReasons.length ? "CONNECTOR_REQUIRED" : "READY_FOR_CONNECTOR",
      blockedReasons.length ? blockedReasons.join("; ") : null,
      row?.completedAppointmentId,
      row?.completedProviderId,
      row?.completedLocationId,
    ],
  );
  await addAudit(tenantId, "marketing_growth", "REPUTATION_WORKFLOW_CREATED", "ReputationReviewWorkflow", id, blockedReasons.length ? "BLOCKED" : "ALLOWED", {
    requestStatus,
    blockedReasons,
    requestChannel: input.requestChannel,
    reviewSite: input.reviewSite,
  });
}

export async function updateReviewWorkflowStatus(id: string, requestStatus: string) {
  const nextStatus = requireAllowed(requestStatus, allowedReviewStatuses, "READY_FOR_APPROVAL");
  const result = await query<{ tenantId: string; appliedStatus: string; recoveryStatus: string }>(
    `update "ReputationReviewWorkflow"
     set "requestStatus" = case
         when $2 in ('APPROVED_STAGED','READY_FOR_APPROVAL') and "recoveryStatus" in ('REQUIRED','OPEN') then 'BLOCKED_SERVICE_RECOVERY'
         when $2 = 'APPROVED_STAGED' and "privateSurveyRequired" = true then 'BLOCKED_PRIVATE_SURVEY'
         when $2 = 'APPROVED_STAGED' and cardinality("suppressionReasons") > 0 then 'BLOCKED_ELIGIBILITY'
         else $2
       end,
       "connectorStatus" = case
         when $2 = 'APPROVED_STAGED' and "privateSurveyRequired" = false and "recoveryStatus" not in ('REQUIRED','OPEN') and cardinality("suppressionReasons") = 0 then 'READY_FOR_CONNECTOR'
         else "connectorStatus"
       end,
       "blockedReason" = case
         when $2 = 'APPROVED_STAGED' and "privateSurveyRequired" = true then 'Private survey must be completed and service recovery cleared before any public review request.'
         when $2 = 'APPROVED_STAGED' and cardinality("suppressionReasons") > 0 then array_to_string("suppressionReasons", '; ')
         when $2 in ('APPROVED_STAGED','READY_FOR_APPROVAL') and "recoveryStatus" in ('REQUIRED','OPEN') then 'Service recovery must close before any public review request.'
         else "blockedReason"
       end,
       "status" = case when $2 = 'COMPLETED' then 'COMPLETED' else "status" end,
       "completedAt" = case when $2 = 'COMPLETED' then current_timestamp else "completedAt" end,
       "updatedAt" = current_timestamp
     where "id" = $1
     returning "tenantId", "requestStatus" as "appliedStatus", "recoveryStatus"`,
    [id, nextStatus],
  );
  if (result.rows[0]) {
    const row = result.rows[0];
    await addAudit(row.tenantId, "marketing_growth", "REPUTATION_STATUS_UPDATED", "ReputationReviewWorkflow", id, row.appliedStatus.startsWith("BLOCKED") ? "BLOCKED" : "ALLOWED", {
      requestedStatus: requestStatus,
      appliedStatus: row.appliedStatus,
      recoveryStatus: row.recoveryStatus,
    });
  }
}

export async function updateReviewResponseApproval(id: string, approvalStatus: string) {
  const nextStatus = requireAllowed(approvalStatus, allowedResponseStatuses, "NEEDS_REVIEW");
  const result = await query<{ tenantId: string; appliedStatus: string; publicationStatus: string; blockedReason: string | null }>(
    `update "ReputationReviewResponse"
     set "approvalStatus" = case when $2 = 'APPROVED' then 'APPROVED_STAGED' else $2 end,
       "approvedByRoleKey" = case when $2 in ('APPROVED','APPROVED_STAGED') then 'marketing_growth' else "approvedByRoleKey" end,
       "approvedAt" = case when $2 in ('APPROVED','APPROVED_STAGED') then current_timestamp else "approvedAt" end,
       "publicationStatus" = case when $2 in ('APPROVED','APPROVED_STAGED') then 'BLOCKED_CONNECTOR_REQUIRED' else "publicationStatus" end,
       "blockedReason" = case when $2 in ('APPROVED','APPROVED_STAGED') then 'Review source connector, listing identity, publication permission, HIPAA guardrails, and human approval policy are required before external posting. Response is staged only.' else "blockedReason" end,
       "hipaaGuardrails" = coalesce("hipaaGuardrails", '{"noPhi":true,"noTreatmentDetails":true,"noDiagnosis":true,"movePrivateDetailsOffline":true,"humanApprovalRequired":true}'::jsonb),
       "sourceSiteStatus" = case when $2 in ('APPROVED','APPROVED_STAGED') then 'CONNECTOR_REQUIRED' else "sourceSiteStatus" end,
       "updatedAt" = current_timestamp
     where "id" = $1
     returning "tenantId", "approvalStatus" as "appliedStatus", "publicationStatus", "blockedReason"`,
    [id, nextStatus],
  );
  if (result.rows[0]) {
    const row = result.rows[0];
    await addAudit(row.tenantId, "marketing_growth", "REVIEW_RESPONSE_APPROVAL_UPDATED", "ReputationReviewResponse", id, row.publicationStatus.startsWith("BLOCKED") ? "BLOCKED" : "ALLOWED", {
      requestedStatus: approvalStatus,
      appliedStatus: row.appliedStatus,
      publicationStatus: row.publicationStatus,
      blockedReason: row.blockedReason,
    });
  }
}

export async function updateListingProfileStatus(id: string, syncStatus: string, nextAction: string) {
  const nextStatus = requireAllowed(syncStatus, allowedListingStatuses, "MANUAL_REVIEW");
  const result = await query<{ tenantId: string }>(
    `update "ReputationListingProfile"
     set "syncStatus" = $2,
       "nextAction" = $3,
       "ownerAction" = $3,
       "napConsistencyStatus" = case when $2 = 'DATA_MISMATCH' then 'MISMATCH' when $2 = 'NEEDS_CONNECTION' then 'UNVERIFIED' else "napConsistencyStatus" end,
       "syncReadiness" = jsonb_build_object('connectorStatus', case when $2 like 'CONNECTED%' then 'READY_FOR_SYNC' else 'CONNECTOR_REQUIRED' end, 'ownerAction', $3),
       "lastSyncedAt" = case when $2 like 'CONNECTED%' then current_timestamp else "lastSyncedAt" end,
       "updatedAt" = current_timestamp
     where "id" = $1
     returning "tenantId"`,
    [id, nextStatus, nextAction.trim()],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, "marketing_growth", "LISTING_PROFILE_STATUS_UPDATED", "ReputationListingProfile", id, "ALLOWED", { syncStatus: nextStatus });
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
  const suppressions = parseList(input.suppressions);
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
  const source = input.patientId
    ? await query<{ sourceReviewId: string | null; completedTreatment: string; positiveSurvey: string }>(
        `select
           (select "id" from "ReputationReviewWorkflow" where "tenantId" = $1 and "patientId" = $2 and ("sentiment" in ('POSITIVE','POSITIVE_SIGNAL') or "rating" >= 4) order by "createdAt" desc limit 1) as "sourceReviewId",
           (select count(*) from "PmsProcedureLog" where "patientId" = $2 and "status" = 'COMPLETED')::text as "completedTreatment",
           (select count(*) from "PatientSurvey" where "tenantId" = $1 and "patientId" = $2 and "score" >= 8 and "recoveryRequired" = false)::text as "positiveSurvey"`,
        [tenantId, input.patientId],
      )
    : { rows: [{ sourceReviewId: null, completedTreatment: "0", positiveSurvey: "0" }] };
  const sourceRow = source.rows[0];
  const blockedReason =
    !isConsentVerified(input.consentStatus)
      ? input.consentStatus === "OPTED_OUT"
        ? "Patient has opted out of this channel. Referral request cannot be sent."
        : "Patient referral communication consent is not verified."
      : ["TESTIMONIAL", "CASE_STORY"].includes(input.requestType) && input.patientId && Number(sourceRow?.completedTreatment ?? 0) === 0
        ? "Testimonial or case story request requires a completed treatment milestone."
        : null;
  const blockedStatus = blockedReason?.includes("completed treatment") ? "BLOCKED_TREATMENT_NOT_COMPLETE" : blockedReason ? "BLOCKED_CONSENT" : "READY_FOR_APPROVAL";
  await query(
    `insert into "ReputationReferralRequest"
       ("id", "tenantId", "patientId", "sourceReviewId", "requestType", "channel", "status", "offerSummary", "messageDraft", "consentStatus", "conversionStatus", "complianceText", "bookingAttributionStatus", "attribution", "connectorStatus", "blockedReason", "dueAt", "updatedAt")
     values ($1, $2, $3, $13, $4, $5, $9, $6, $7, $8, $10, 'Use compliance-approved referral language; no inducement, guarantee, or PHI.', 'NOT_ATTRIBUTED', $11::jsonb, 'CONNECTOR_REQUIRED', $12, current_timestamp + interval '1 day', current_timestamp)`,
    [
      id,
      tenantId,
      input.patientId || null,
      input.requestType,
      input.channel,
      input.offerSummary?.trim() || null,
      input.messageDraft.trim(),
      input.consentStatus,
      blockedStatus,
      blockedReason ? `BLOCKED: ${blockedReason}` : "READY_FOR_CONNECTOR",
      JSON.stringify({ newPatientBookings: 0, acceptedTreatmentCents: 0, source: "booking-link pending", sourceReviewId: sourceRow?.sourceReviewId, completedTreatmentCount: Number(sourceRow?.completedTreatment ?? 0), positiveSurveyCount: Number(sourceRow?.positiveSurvey ?? 0) }),
      blockedReason,
      sourceRow?.sourceReviewId,
    ],
  );
  await addAudit(tenantId, "marketing_growth", "REPUTATION_REFERRAL_REQUEST_CREATED", "ReputationReferralRequest", id, blockedReason ? "BLOCKED" : "ALLOWED", { consentStatus: input.consentStatus, blockedReason });
}

export async function updateReferralRequestStatus(id: string, status: string) {
  const nextStatus = requireAllowed(status, allowedReferralStatuses, "READY_FOR_APPROVAL");
  const result = await query<{ tenantId: string; appliedStatus: string; conversionStatus: string }>(
    `update "ReputationReferralRequest"
     set "status" = case
         when $2 = 'APPROVED_TO_SEND' and "consentStatus" not in ('VERIFIED','CONSENTED','OPTED_IN','ACTIVE') then 'BLOCKED_CONSENT'
         else $2
       end,
       "conversionStatus" = case
         when $2 = 'APPROVED_TO_SEND' and "consentStatus" not in ('VERIFIED','CONSENTED','OPTED_IN','ACTIVE') then 'BLOCKED: consent not verified'
         when $2 = 'APPROVED_TO_SEND' then 'BLOCKED_CONNECTOR_REQUIRED'
         else "conversionStatus"
       end,
       "connectorStatus" = case when $2 = 'APPROVED_TO_SEND' then 'CONNECTOR_REQUIRED' else "connectorStatus" end,
       "blockedReason" = case
         when $2 = 'APPROVED_TO_SEND' and "consentStatus" not in ('VERIFIED','CONSENTED','OPTED_IN','ACTIVE') then 'Referral/testimonial delivery requires verified channel consent.'
         when $2 = 'APPROVED_TO_SEND' then 'Delivery connector is required before patient-facing request is sent.'
         else "blockedReason"
       end,
       "completedAt" = case when $2 in ('COMPLETED','CLOSED') then current_timestamp else "completedAt" end,
       "updatedAt" = current_timestamp
     where "id" = $1
     returning "tenantId", "status" as "appliedStatus", "conversionStatus"`,
    [id, nextStatus],
  );
  if (result.rows[0]) {
    const row = result.rows[0];
    await addAudit(row.tenantId, "marketing_growth", "REPUTATION_REFERRAL_STATUS_UPDATED", "ReputationReferralRequest", id, row.appliedStatus.startsWith("BLOCKED") ? "BLOCKED" : "ALLOWED", {
      requestedStatus: status,
      appliedStatus: row.appliedStatus,
      conversionStatus: row.conversionStatus,
    });
  }
}

export async function getMarketingOperatingCenter(tenantId = defaultTenantId) {
  const [campaigns, landingPages, assets, localSeoTasks, metrics] = await Promise.all([
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
    query(
      `select t.*, l."name" as "locationName"
       from "MarketingLocalSeoTask" t
       left join "Location" l on l."id" = t."locationId"
       where t."tenantId" = $1
       order by case t."priority" when 'HIGH' then 0 when 'NORMAL' then 1 else 2 end, t."dueAt" asc nulls last`,
      [tenantId],
    ),
    query<{ campaigns: string; landingPages: string; aiDrafts: string; attributedProduction: string; localSeoOpen: string; stagedChannels: string }>(
      `select
        (select count(*) from "MarketingCampaign" where "tenantId" = $1)::text as campaigns,
        (select count(*) from "MarketingLandingPage" where "tenantId" = $1)::text as "landingPages",
        (select count(*) from "AiStudioAsset" where "tenantId" = $1 and "approvalStatus" = 'NEEDS_REVIEW')::text as "aiDrafts",
        (select coalesce(sum("attributedProductionCents"), 0) from "MarketingCampaign" where "tenantId" = $1)::text as "attributedProduction",
        (select count(*) from "MarketingLocalSeoTask" where "tenantId" = $1 and "status" not in ('COMPLETED','CLOSED'))::text as "localSeoOpen",
        (select count(*) from "MarketingCampaign" where "tenantId" = $1 and "status" in ('READY_FOR_APPROVAL','APPROVED_STAGED','ACTIVE_INTERNAL'))::text as "stagedChannels"`,
      [tenantId],
    ),
  ]);
  return { campaigns: campaigns.rows, landingPages: landingPages.rows, assets: assets.rows, localSeoTasks: localSeoTasks.rows, metrics: metrics.rows[0] };
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
  const channels = parseList(input.channelMix);
  const sourceAudience = marketingSourceAudience(input.campaignType);
  const estimatedAudience = await estimateMarketingAudience(tenantId, input.campaignType);
  const audienceBlueprint = marketingAudienceBlueprint(input.campaignType);
  const channelPlan = {
    channels,
    sourceAudience,
    audienceBlueprint,
    checks: ["PMS cohort freshness", "RCM balance sensitivity", "reputation recovery hold", "consent", "channel preference", "quiet hours", "approval policy"],
  };
  await query(
    `insert into "MarketingCampaign"
       ("id", "tenantId", "landingPageId", "name", "campaignType", "status", "audienceDefinition", "primaryGoal", "channelMix", "aiStudioBrief", "complianceStatus", "sourceAudience", "channelPlan", "connectorReadiness", "attribution", "blockedReason", "estimatedAudience", "startsAt", "updatedAt")
     values ($1, $2, $3, $4, $5, 'DRAFT', $6, $7, $8, $9, 'NEEDS_REVIEW', $10, $11::jsonb, $12::jsonb, $13::jsonb, 'External activation blocked until PMS/RCM/reputation audience validation, consent checks, approval, and channel connectors are ready.', $14, current_date + interval '1 day', current_timestamp)`,
    [
      id,
      tenantId,
      input.landingPageId || null,
      input.name.trim(),
      input.campaignType,
      input.audienceDefinition.trim(),
      input.primaryGoal.trim(),
      channels,
      input.aiStudioBrief || null,
      sourceAudience,
      JSON.stringify(channelPlan),
      JSON.stringify({ sms: "CONNECTOR_REQUIRED", email: "CONNECTOR_REQUIRED", phone: "CONNECTOR_REQUIRED", landingPage: input.landingPageId ? "STAGED" : "NOT_SELECTED", aiVoice: "CONNECTOR_REQUIRED" }),
      JSON.stringify({ bookedAppointments: 0, acceptedTreatmentCents: 0, productionCents: 0, collectionCents: 0, reviewOutcomes: 0, referralOutcomes: 0 }),
      estimatedAudience,
    ],
  );
  await addAudit(tenantId, "marketing_growth", "MARKETING_CAMPAIGN_CREATED", "MarketingCampaign", id);
}

export async function updateMarketingStatus(target: "campaign" | "landingPage" | "asset", id: string, status: string) {
  const table = target === "campaign" ? "MarketingCampaign" : target === "landingPage" ? "MarketingLandingPage" : "AiStudioAsset";
  const field = target === "asset" ? "approvalStatus" : "status";
  const nextStatus = requireAllowed(status, allowedMarketingStatuses, target === "asset" ? "NEEDS_REVIEW" : "DRAFT");
  const result = await query<{ tenantId: string; appliedStatus: string }>(
    `update "${table}"
     set "${field}" = case when $3 = 'asset' and $2 = 'APPROVED' then 'APPROVED_STAGED' else $2 end,
       "updatedAt" = current_timestamp
     where "id" = $1
     returning "tenantId", "${field}" as "appliedStatus"`,
    [id, nextStatus, target],
  );
  if (target === "campaign") {
    await query(
      `update "MarketingCampaign"
       set "blockedReason" = case
         when "status" in ('APPROVED_STAGED','ACTIVE_INTERNAL') then 'Campaign is internally approved only; external delivery requires channel connector readiness, consent checks, and final approval evidence.'
         else "blockedReason"
       end,
       "connectorReadiness" = coalesce("connectorReadiness", '{"sms":"CONNECTOR_REQUIRED","email":"CONNECTOR_REQUIRED","phone":"CONNECTOR_REQUIRED","landingPage":"STAGED","aiVoice":"CONNECTOR_REQUIRED"}'::jsonb)
       where "id" = $1`,
      [id],
    );
  }
  if (target === "landingPage") {
    await query(
      `update "MarketingLandingPage"
       set "connectorStatus" = case when "status" = 'APPROVED_STAGED' then 'STAGED' else "connectorStatus" end,
         "bookingRouting" = coalesce("bookingRouting", 'Route form, phone tracking number, and booking CTA into PMS online scheduling plus CRM lead queue; no lead is marked booked until a PMS appointment exists.'),
         "trackingPlan" = coalesce("trackingPlan", '{"utmSource":"1dentalai","utmMedium":"campaign","callTracking":"connector_required","formTracking":"staged","bookingTracking":"pms_booking_route","localSeoAction":"validate NAP, service category, schema, and GBP post before publication"}'::jsonb),
         "formMapping" = coalesce("formMapping", '{"name":"lead.name","phone":"lead.phone","email":"lead.email","service":"lead.serviceLine","preferredTime":"booking.preference","sourceListing":"localSeo.sourceListing","utmCampaign":"attribution.utmCampaign"}'::jsonb)
       where "id" = $1`,
      [id],
    );
  }
  if (target === "asset") {
    await query(
      `update "AiStudioAsset"
       set "revisionState" = case when "approvalStatus" = 'REVISION_REQUIRED' then 'REVISION_REQUESTED' else "revisionState" end,
         "reviewerRoleKey" = coalesce("reviewerRoleKey", 'marketing_growth'),
         "brief" = coalesce("brief", "promptInput"),
         "sourceData" = coalesce("sourceData", jsonb_build_object('sourceModule', "sourceModule", 'sourceRecordId', "sourceRecordId"))
       where "id" = $1`,
      [id],
    );
  }
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, "marketing_growth", "MARKETING_STATUS_UPDATED", table, id, "ALLOWED", { field, requestedStatus: status, appliedStatus: result.rows[0].appliedStatus });
}

function marketingSourceAudience(campaignType: string) {
  if (["UNSCHEDULED_TREATMENT", "RECALL_REACTIVATION", "FAILED_APPOINTMENTS", "INACTIVE_PATIENTS", "MEMBERSHIP"].includes(campaignType)) return "PMS cohort from appointments, recall, treatment plans, and patient status";
  if (["BALANCE_FOLLOW_UP"].includes(campaignType)) return "RCM cohort from balances, claims, ERA exceptions, and collection sensitivity";
  if (["REFERRAL_GROWTH", "TESTIMONIALS"].includes(campaignType)) return "REPUTATION cohort from positive private surveys, review signals, referrals, and recovery-free patients";
  return "PMS+RCM+REPUTATION";
}

function marketingAudienceBlueprint(campaignType: string) {
  if (["UNSCHEDULED_TREATMENT", "IMPLANTS", "CLEAR_ALIGNERS"].includes(campaignType)) return { pms: "presented or accepted treatment without future appointment", rcm: "benefits/financing sensitivity checked", reputation: "no open recovery case" };
  if (["RECALL_REACTIVATION", "INACTIVE_PATIENTS", "FAILED_APPOINTMENTS"].includes(campaignType)) return { pms: "recall, no-show/cancel, and inactive-patient cohorts", rcm: "exclude unresolved billing disputes", reputation: "exclude low-survey and service-recovery holds" };
  if (campaignType === "BALANCE_FOLLOW_UP") return { pms: "active patient and appointment context", rcm: "patient-due balance with claim/ERA context", reputation: "public review asks suppressed during balance sensitivity" };
  if (["REFERRAL_GROWTH", "TESTIMONIALS"].includes(campaignType)) return { pms: "completed visit or treatment milestone", rcm: "financial clearance before testimonial ask", reputation: "positive private survey or review signal" };
  return { pms: "appointment, patient, and treatment context", rcm: "balance and payer sensitivity", reputation: "review, survey, referral, and service recovery context" };
}

async function estimateMarketingAudience(tenantId: string, campaignType: string) {
  if (["UNSCHEDULED_TREATMENT", "IMPLANTS", "CLEAR_ALIGNERS"].includes(campaignType)) {
    const result = await query<{ count: string }>(`select count(distinct "patientId")::text as count from "PmsTreatmentPlan" where "tenantId" = $1 and "status" in ('PRESENTED','ACCEPTED')`, [tenantId]);
    return Number(result.rows[0]?.count ?? 0);
  }
  if (["RECALL_REACTIVATION", "INACTIVE_PATIENTS"].includes(campaignType)) {
    const result = await query<{ count: string }>(`select count(distinct "patientId")::text as count from "PmsRecall" where "tenantId" = $1 and "status" in ('DUE','OVERDUE')`, [tenantId]);
    return Number(result.rows[0]?.count ?? 0);
  }
  if (campaignType === "FAILED_APPOINTMENTS") {
    const result = await query<{ count: string }>(`select count(distinct "patientId")::text as count from "PmsAppointment" where "tenantId" = $1 and "status" in ('NO_SHOW','CANCELLED')`, [tenantId]);
    return Number(result.rows[0]?.count ?? 0);
  }
  if (campaignType === "BALANCE_FOLLOW_UP") {
    const result = await query<{ count: string }>(`select count(distinct "patientId")::text as count from "PmsClaim" where "tenantId" = $1 and "patientDueCents" > 0 and "status" not in ('PAID','CLOSED','VOID')`, [tenantId]);
    return Number(result.rows[0]?.count ?? 0);
  }
  if (["REFERRAL_GROWTH", "TESTIMONIALS"].includes(campaignType)) {
    const result = await query<{ count: string }>(`select count(distinct "patientId")::text as count from "PatientSurvey" where "tenantId" = $1 and "score" >= 8 and "recoveryRequired" = false`, [tenantId]);
    return Number(result.rows[0]?.count ?? 0);
  }
  return 0;
}

export async function updateLocalSeoTaskStatus(id: string, status: string) {
  const nextStatus = requireAllowed(status, allowedLocalSeoStatuses, "OPEN");
  const result = await query<{ tenantId: string; appliedStatus: string; connectorStatus: string }>(
    `update "MarketingLocalSeoTask"
     set "status" = case when $2 = 'APPROVED_STAGED' and "connectorStatus" = 'CONNECTOR_REQUIRED' then 'BLOCKED_CONNECTOR_REQUIRED' else $2 end,
       "nextAction" = case
         when $2 = 'APPROVED_STAGED' and "connectorStatus" = 'CONNECTOR_REQUIRED' then 'Local SEO action is approved internally, but publication or listing sync requires connector/manual owner proof.'
         else "nextAction"
       end,
       "completedAt" = case when $2 in ('COMPLETED','CLOSED') then current_timestamp else "completedAt" end,
       "updatedAt" = current_timestamp
     where "id" = $1
     returning "tenantId", "status" as "appliedStatus", "connectorStatus"`,
    [id, nextStatus],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, "marketing_growth", "LOCAL_SEO_TASK_STATUS_UPDATED", "MarketingLocalSeoTask", id, result.rows[0].appliedStatus.startsWith("BLOCKED") ? "BLOCKED" : "ALLOWED", { requestedStatus: status, appliedStatus: result.rows[0].appliedStatus, connectorStatus: result.rows[0].connectorStatus });
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
