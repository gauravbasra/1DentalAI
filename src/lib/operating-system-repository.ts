import { newId, query, withTransaction } from "@/lib/db";
import { defaultTenantId } from "@/lib/pms-repository";
import { recordPayerGeneratedArtifact } from "@/lib/payer-network-repository";
import { buildEobPdfArtifactPayload, buildPriorAuthPdfArtifactPayload } from "@/lib/rcm-payer-artifacts";
import { createTwilioCall, findTwilioConferenceSid, getTwilioCredentials, updateTwilioCall, updateTwilioConferenceParticipant, twilioXmlEscape } from "@/lib/twilio-provider";
import { redirectLiveCallToVoiceAi } from "@/lib/voice-ai-repository";

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

function evidenceChecklist(requiredEvidence?: string[]) {
  const required = requiredEvidence?.length ? requiredEvidence : ["payer rule sheet", "clinical narrative", "supporting image or document", "signed treatment estimate"];
  return {
    requiredEvidence: required,
    items: required.map((label) => ({ label, status: "NEEDS_ATTACHMENT", source: "RCM intake" })),
    payerRulesChecked: false,
    clinicalReviewRequired: true,
    patientFinancialReviewRequired: true,
    externalSubmissionBlocked: true,
  };
}

type EraAdjudicationLineRow = {
  id: string;
  claimLineId: string;
  procedureCode: string;
  serviceDate: string | null;
  tooth: string | null;
  surface: string | null;
  billedCents: number;
  allowedCents: number;
  paidCents: number;
  deductibleCents: number;
  copayCents: number;
  coinsuranceCents: number;
  writeoffCents: number;
  denialCents: number;
  otherAdjustmentCents: number;
  patientResponsibilityCents: number;
  carcCodes: string[];
  rarcCodes: string[];
  status: string;
};

async function getEraAdjudicationLines(eraPostingId: string, tenantId: string) {
  return (await query<EraAdjudicationLineRow>(
    `select "id", "claimLineId", "procedureCode", "serviceDate"::text as "serviceDate", "tooth", "surface",
       "billedCents", "allowedCents", "paidCents", "deductibleCents", "copayCents", "coinsuranceCents",
       "writeoffCents", "denialCents", "otherAdjustmentCents", "patientResponsibilityCents",
       coalesce("carcCodes", '[]'::jsonb) as "carcCodes",
       coalesce("rarcCodes", '[]'::jsonb) as "rarcCodes",
       "status"
     from "RcmEraAdjudicationLine"
     where "eraPostingId" = $1 and "tenantId" = $2
     order by "serviceDate" asc nulls last, "procedureCode", "claimLineId"`,
    [eraPostingId, tenantId],
  )).rows;
}

function reconcileEraAdjudicationLines(
  era: { allowedCents: number; paidCents: number; patientDueCents: number; adjustmentCents: number },
  lines: EraAdjudicationLineRow[],
) {
  const totals = lines.reduce(
    (sum, line) => {
      const patientResponsibilityCents = Number(line.patientResponsibilityCents);
      const lineAdjustmentCents = Number(line.writeoffCents) + Number(line.denialCents) + Number(line.otherAdjustmentCents);
      return {
        allowedCents: sum.allowedCents + Number(line.allowedCents),
        paidCents: sum.paidCents + Number(line.paidCents),
        deductibleCents: sum.deductibleCents + Number(line.deductibleCents),
        copayCents: sum.copayCents + Number(line.copayCents),
        coinsuranceCents: sum.coinsuranceCents + Number(line.coinsuranceCents),
        writeoffCents: sum.writeoffCents + Number(line.writeoffCents),
        denialCents: sum.denialCents + Number(line.denialCents),
        otherAdjustmentCents: sum.otherAdjustmentCents + Number(line.otherAdjustmentCents),
        patientResponsibilityCents: sum.patientResponsibilityCents + patientResponsibilityCents,
        adjustmentCents: sum.adjustmentCents + lineAdjustmentCents,
        lineBalanceVarianceCents: sum.lineBalanceVarianceCents + Math.abs(Number(line.allowedCents) - Number(line.paidCents) - patientResponsibilityCents - lineAdjustmentCents),
        patientResponsibilityVarianceCents:
          sum.patientResponsibilityVarianceCents +
          Math.abs(patientResponsibilityCents - Number(line.deductibleCents) - Number(line.copayCents) - Number(line.coinsuranceCents)),
      };
    },
    {
      allowedCents: 0,
      paidCents: 0,
      deductibleCents: 0,
      copayCents: 0,
      coinsuranceCents: 0,
      writeoffCents: 0,
      denialCents: 0,
      otherAdjustmentCents: 0,
      patientResponsibilityCents: 0,
      adjustmentCents: 0,
      lineBalanceVarianceCents: 0,
      patientResponsibilityVarianceCents: 0,
    },
  );
  const postingVarianceCents = Number(era.allowedCents) - Number(era.paidCents) - Number(era.patientDueCents) - Number(era.adjustmentCents);
  const metadata = {
    inputTotalsMatchLines:
      Number(era.allowedCents) === totals.allowedCents &&
      Number(era.paidCents) === totals.paidCents &&
      Number(era.patientDueCents) === totals.patientResponsibilityCents &&
      Number(era.adjustmentCents) === totals.adjustmentCents,
    lineBalancesToAllowed: totals.lineBalanceVarianceCents === 0,
    patientResponsibilityBalances: totals.patientResponsibilityVarianceCents === 0,
    postingVarianceCents,
    totals,
  };
  return { ...metadata, balancedForPosting: metadata.inputTotalsMatchLines && metadata.lineBalancesToAllowed && metadata.patientResponsibilityBalances && postingVarianceCents === 0 };
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
        coalesce(lines."blockedLines", 0)::int as "blockedLines",
        coalesce(lines."claimLineDetails", '[]'::jsonb) as "claimLineDetails",
        coalesce(denials."openDenialCount", 0)::int as "openDenialCount",
        coalesce(eras."eraPostingCount", 0)::int as "eraPostingCount",
        coalesce(followups."payerFollowUpCount", 0)::int as "payerFollowUpCount",
        jsonb_build_object(
          'coverageVerified', pi."eligibilityStatus" = 'ACTIVE',
          'hasClearinghouseTrace', coalesce(c."clearinghouseTraceId", '') <> '',
          'attachmentsReady', c."attachmentStatus" in ('NOT_REQUIRED','ATTACHED','READY'),
          'lineReadiness', jsonb_build_object('readyLines', coalesce(lines."readyLines", 0), 'blockedLines', coalesce(lines."blockedLines", 0), 'totalLines', coalesce(lines."lineCount", 0)),
          'openDenials', coalesce(denials."openDenialCount", 0),
          'eraPostings', coalesce(eras."eraPostingCount", 0),
          'payerFollowUps', coalesce(followups."payerFollowUpCount", 0),
          'connectorGate', case when coalesce(c."clearinghouseTraceId", '') = '' and c."status" in ('READY','NEEDS_ATTACHMENT') then 'CONNECTOR_OR_MANUAL_PROOF_REQUIRED' else 'TRACK_INTERNAL_LIFECYCLE' end,
          'nextAction', case
            when pi."eligibilityStatus" <> 'ACTIVE' then 'Verify eligibility and benefits before claim movement.'
            when coalesce(lines."blockedLines", 0) > 0 then 'Resolve blocked claim lines and attachment requirements.'
            when coalesce(c."clearinghouseTraceId", '') = '' and c."status" = 'READY' then 'Stage claim for clearinghouse connector; do not mark submitted without acknowledgement.'
            when coalesce(denials."openDenialCount", 0) > 0 then 'Work denial or appeal package before write-off.'
            when coalesce(eras."eraPostingCount", 0) > 0 then 'Reconcile ERA/EOB and ledger posting.'
            else 'Monitor payer lifecycle and patient balance.'
          end
        ) as "claimLifecycle"
       from "PmsClaim" c
       join "PmsPatient" p on p."id" = c."patientId"
       left join "PmsPatientInsurance" pi on pi."id" = c."patientInsuranceId"
       left join (
         select "claimId",
          count(*)::int as "lineCount",
          count(*) filter (where "status" in ('READY','SUBMITTED','PAID'))::int as "readyLines",
          count(*) filter (where "status" like '%NEEDS%' or "status" like '%DENIED%')::int as "blockedLines",
          jsonb_agg(jsonb_build_object(
            'code', pc."code",
            'description', pc."description",
            'tooth', cl."tooth",
            'surface', cl."surface",
            'feeCents', cl."feeCents",
            'allowedCents', cl."allowedCents",
            'patientDueCents', cl."patientDueCents",
            'status', cl."status",
            'serviceDate', cl."serviceDate"
          ) order by cl."serviceDate" desc nulls last, pc."code") as "claimLineDetails"
         from "PmsClaimLine" cl
         left join "PmsProcedureCode" pc on pc."id" = cl."procedureCodeId"
         group by "claimId"
       ) lines on lines."claimId" = c."id"
       left join (
         select "claimId", count(*)::int as "openDenialCount"
         from "RcmDenialCase"
         where "tenantId" = $1 and "status" not in ('WON','CLOSED')
         group by "claimId"
       ) denials on denials."claimId" = c."id"
       left join (
         select "claimId", count(*)::int as "eraPostingCount"
         from "RcmEraPosting"
         where "tenantId" = $1 and "status" <> 'POSTED'
         group by "claimId"
       ) eras on eras."claimId" = c."id"
       left join (
         select "claimId", count(*)::int as "payerFollowUpCount"
         from "RcmPayerFollowUp"
         where "tenantId" = $1 and "status" not in ('RESOLVED','CLOSED')
         group by "claimId"
       ) followups on followups."claimId" = c."id"
       where c."tenantId" = $1
       order by c."lastStatusAt" desc nulls last`,
      [tenantId],
    ),
    query(
      `select pi.*, p."firstName", p."lastName", p."chartNumber",
        ip."payerName", ip."payerId", ip."planName", ip."planType", ip."networkStatus",
        bs."benefitYear", bs."deductibleCents", bs."deductibleMetCents", bs."annualMaxCents", bs."annualUsedCents", bs."frequencies", bs."limitations",
        jsonb_build_object(
          'benefitYear', bs."benefitYear",
          'deductibleRemainingCents', greatest(coalesce(bs."deductibleCents", 0) - coalesce(bs."deductibleMetCents", 0), 0),
          'annualRemainingCents', greatest(coalesce(bs."annualMaxCents", 0) - coalesce(bs."annualUsedCents", 0), 0),
          'frequencies', coalesce(bs."frequencies", '{}'::jsonb),
          'limitations', coalesce(bs."limitations", '{}'::jsonb),
          'verificationAgeDays', case when pi."lastVerifiedAt" is null then null else floor(extract(epoch from (current_timestamp - pi."lastVerifiedAt")) / 86400)::int end,
          'coverageChecklist', jsonb_build_array(
            jsonb_build_object('label', 'Eligibility active', 'status', case when pi."eligibilityStatus" = 'ACTIVE' then 'READY' else 'NEEDS_REVIEW' end),
            jsonb_build_object('label', 'Annual maximum available', 'status', case when greatest(coalesce(bs."annualMaxCents", 0) - coalesce(bs."annualUsedCents", 0), 0) > 0 then 'READY' else 'LIMIT_REVIEW' end),
            jsonb_build_object('label', 'Deductible captured', 'status', case when bs."deductibleCents" is not null then 'READY' else 'UNKNOWN' end),
            jsonb_build_object('label', 'Frequency rules captured', 'status', case when bs."frequencies" is not null then 'READY' else 'UNKNOWN' end),
            jsonb_build_object('label', 'Limitations captured', 'status', case when bs."limitations" is not null then 'READY' else 'UNKNOWN' end)
          )
        ) as "coverageSnapshot"
       from "PmsPatientInsurance" pi
       join "PmsPatient" p on p."id" = pi."patientId"
       join "PmsInsurancePlan" ip on ip."id" = pi."planId"
       left join "PmsBenefitSummary" bs on bs."patientInsuranceId" = pi."id"
       where ip."tenantId" = $1
       order by case pi."eligibilityStatus" when 'NEEDS_REVIEW' then 0 when 'NOT_CHECKED' then 1 when 'INACTIVE' then 2 else 3 end, pi."lastVerifiedAt" asc nulls first, p."lastName"`,
      [tenantId],
    ),
    query(
      `select pa.*, p."firstName", p."lastName", p."chartNumber", tp."name" as "treatmentPlanName",
        coalesce(items."treatmentPlanEvidence", '[]'::jsonb) as "treatmentPlanEvidence",
        coalesce(pa."evidenceChecklist", jsonb_build_object(
          'requiredEvidence', coalesce(pa."requiredEvidence", '[]'::jsonb),
          'items', coalesce(items."evidenceItems", '[]'::jsonb),
          'payerRulesChecked', false,
          'clinicalReviewRequired', true,
          'patientFinancialReviewRequired', true,
          'externalSubmissionBlocked', true
        )) as "evidenceChecklist"
       from "RcmPriorAuthorization" pa
       join "PmsPatient" p on p."id" = pa."patientId"
       left join "PmsTreatmentPlan" tp on tp."id" = pa."treatmentPlanId"
       left join lateral (
         select
          jsonb_agg(jsonb_build_object('code', pc."code", 'description', pc."description", 'tooth', tpi."tooth", 'feeCents', tpi."feeCents", 'status', tpi."status") order by pc."code") as "treatmentPlanEvidence",
          jsonb_agg(jsonb_build_object('label', pc."code" || ' clinical support', 'status', 'NEEDS_PROVIDER_REVIEW', 'source', 'treatment plan line') order by pc."code") as "evidenceItems"
         from "PmsTreatmentPlanItem" tpi
         join "PmsProcedureCode" pc on pc."id" = tpi."procedureCodeId"
         where tpi."treatmentPlanId" = pa."treatmentPlanId"
       ) items on true
       where pa."tenantId" = $1
       order by case pa."status" when 'EVIDENCE_NEEDED' then 0 when 'READY_FOR_REVIEW' then 1 when 'APPROVED_STAGED' then 2 when 'BLOCKED_CONNECTOR_REQUIRED' then 3 else 4 end, pa."expiresAt" asc nulls last`,
      [tenantId],
    ),
    query(
      `select d.*, p."firstName", p."lastName", p."chartNumber", c."claimNumber", c."status" as "claimStatus", c."attachmentStatus",
        case when d."appealDeadline" is null then null else ceil(extract(epoch from (d."appealDeadline" - current_timestamp)) / 86400)::int end as "appealDaysRemaining",
        jsonb_build_object(
          'rootCause', coalesce(d."rootCause", 'Not classified'),
          'claimStatus', c."status",
          'attachmentStatus', c."attachmentStatus",
          'appealDeadline', d."appealDeadline",
          'checklist', jsonb_build_array(
            jsonb_build_object('label', 'EOB or payer denial reason', 'status', case when d."denialReason" <> '' then 'READY' else 'MISSING' end),
            jsonb_build_object('label', 'Root cause classification', 'status', case when coalesce(d."rootCause", '') <> '' then 'READY' else 'NEEDS_REVIEW' end),
            jsonb_build_object('label', 'Required evidence attached', 'status', case when jsonb_array_length(coalesce(d."requiredEvidence", '[]'::jsonb)) > 0 then 'NEEDS_ATTACHMENT_REVIEW' else 'MISSING' end),
            jsonb_build_object('label', 'Human approval', 'status', case when d."status" in ('APPEAL_READY','APPROVED_STAGED') then 'READY_FOR_APPROVAL' else 'PENDING' end),
            jsonb_build_object('label', 'Connector or manual proof', 'status', case when d."connectorStatus" in ('READY_FOR_CONNECTOR','MANUAL_PROOF_REQUIRED') then d."connectorStatus" else 'CONNECTOR_REQUIRED' end)
          )
        ) as "appealPackageChecklist"
       from "RcmDenialCase" d
       join "PmsPatient" p on p."id" = d."patientId"
       join "PmsClaim" c on c."id" = d."claimId"
       where d."tenantId" = $1
       order by case d."status" when 'OPEN' then 0 when 'APPEAL_READY' then 1 when 'APPROVED_STAGED' then 2 when 'BLOCKED_CONNECTOR_REQUIRED' then 3 else 4 end, d."appealDeadline" asc nulls last`,
      [tenantId],
    ),
    query(
      `select era.*, p."firstName", p."lastName", p."chartNumber", c."claimNumber",
        (era."allowedCents" - era."paidCents" - era."adjustmentCents" - era."patientDueCents")::int as "postingVarianceCents",
        jsonb_build_object(
          'hasEraTrace', coalesce(era."eraTraceNumber", '') <> '',
          'hasEobDocument', coalesce(era."eobDocumentId", '') <> '',
          'allowedMatchesClaim', era."allowedCents" = c."allowedCents" or c."allowedCents" = 0,
          'paidAmountPositive', era."paidCents" > 0,
          'adjustmentCents', era."adjustmentCents",
          'patientDueCents', era."patientDueCents",
          'ledgerImpactReviewed', coalesce((era."postingReadiness"->>'ledgerImpactReviewed')::boolean, false),
          'externalPostingBlocked', false,
          'pmsLedgerWriteRequiresReview', true
        ) as "postingChecklist"
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
      `select ri.*, p."firstName", p."lastName", p."chartNumber", c."claimNumber",
        jsonb_build_object(
          'sourceClaim', ri."claimId",
          'ledgerEntryId', ri."ledgerEntryId",
          'leakageType', ri."findingType",
          'expectedCents', ri."expectedCents",
          'actualCents', ri."actualCents",
          'varianceCents', ri."varianceCents",
          'workflow', jsonb_build_array(
            jsonb_build_object('label', 'Detect variance', 'status', 'READY'),
            jsonb_build_object('label', 'Validate payer contract or fee schedule', 'status', case when ri."status" in ('IN_REVIEW','RECOVERY_STAGED','RECOVERED') then 'IN_REVIEW' else 'PENDING' end),
            jsonb_build_object('label', 'Stage recovery action', 'status', case when ri."status" in ('RECOVERY_STAGED','RECOVERED') then 'READY_FOR_APPROVAL' else 'PENDING' end),
            jsonb_build_object('label', 'Attach recovery proof', 'status', case when ri."status" in ('MANUAL_PROOF_REQUIRED','RECOVERED') then 'MANUAL_PROOF_REQUIRED' else 'PENDING' end)
          ),
          'externalRecoveryBlocked', true
        ) as "leakageWorkflow"
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
  actorRole?: string;
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
  await addAudit(tenantId, input.actorRole ?? "billing_rcm", "RCM_WORK_ITEM_CREATED", "RcmWorkItem", id);
  return result.rows[0];
}

export async function updateRcmWorkItemStatus(id: string, status: string, actorRole = "billing_rcm", tenantId = defaultTenantId) {
  const nextStatus = requireAllowed(status === "COMPLETED" ? "MANUAL_PROOF_REQUIRED" : status, allowedRcmWorkStatuses, "READY_FOR_REVIEW");
  const result = await query<{ id: string; tenantId: string }>(
    `update "RcmWorkItem"
     set "status" = $2,
       "connectorStatus" = case when $2 in ('APPROVED_STAGED','MANUAL_PROOF_REQUIRED') then 'MANUAL_PROOF_REQUIRED' else "connectorStatus" end,
       "blockerReason" = case when $2 in ('APPROVED_STAGED','MANUAL_PROOF_REQUIRED') then coalesce("blockerReason", 'External payer/payment action is staged only; connector acknowledgement or manual proof is required before completion.') else "blockerReason" end,
       "completedAt" = case when $2 in ('COMPLETED','CLOSED') then current_timestamp else "completedAt" end,
       "updatedAt" = current_timestamp
	     where "id" = $1 and "tenantId" = $4
	     returning "id", "tenantId"`,
    [id, nextStatus, null, tenantId],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, actorRole, "RCM_WORK_ITEM_STATUS_UPDATED", "RcmWorkItem", id, "ALLOWED", { requestedStatus: status, appliedStatus: nextStatus });
}

export async function createPriorAuthorization(input: {
  tenantId?: string;
  actorRole?: string;
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
       ("id", "tenantId", "patientId", "treatmentPlanId", "patientInsuranceId", "payerName", "requestedCents", "status", "requiredEvidence", "evidenceChecklist", "submissionReadiness", "connectorStatus", "blockedReason", "submissionMode", "expiresAt", "nextAction", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, 'EVIDENCE_NEEDED', $8::jsonb, $11::jsonb, $12::jsonb, 'CONNECTOR_REQUIRED', 'Prior authorization cannot be marked submitted until a payer connector acknowledgement or manual proof is attached.', 'NOT_SUBMITTED', $9::timestamp, $10, current_timestamp)
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
      JSON.stringify(evidenceChecklist(input.requiredEvidence)),
      JSON.stringify({ evidenceComplete: false, payerConnectorReady: false, humanApprovalRequired: true, externalSubmissionBlocked: true }),
    ],
  );
  await addAudit(tenantId, input.actorRole ?? "billing_rcm", "RCM_PRIOR_AUTH_CREATED", "RcmPriorAuthorization", id);
  return result.rows[0];
}

export async function updatePriorAuthorizationStatus(id: string, status: string, actorRole = "billing_rcm", tenantId = defaultTenantId) {
  const nextStatus = requireAllowed(status === "SUBMITTED" ? "BLOCKED_CONNECTOR_REQUIRED" : status, allowedPriorAuthStatuses, "READY_FOR_REVIEW");
  const result = await query<{ tenantId: string }>(
    `update "RcmPriorAuthorization"
	     set "status" = $2,
	       "connectorStatus" = case when $2 in ('APPROVED_STAGED','BLOCKED_CONNECTOR_REQUIRED') then 'CONNECTOR_REQUIRED' else "connectorStatus" end,
	       "submissionMode" = case
	         when $2 = 'APPROVED_STAGED' then 'READY_FOR_CONNECTOR_OR_PORTAL'
	         when $2 = 'MANUAL_PROOF_REQUIRED' then 'MANUAL_PROOF_REQUIRED'
	         else "submissionMode"
	       end,
	       "blockedReason" = case
         when $2 in ('APPROVED_STAGED','BLOCKED_CONNECTOR_REQUIRED') then 'Prior authorization is staged only. Payer submission requires connector acknowledgement or attached manual proof.'
         else "blockedReason"
       end,
       "submissionReadiness" = coalesce("submissionReadiness", '{"evidenceComplete":false,"payerConnectorReady":false,"humanApprovalRequired":true,"externalSubmissionBlocked":true}'::jsonb),
       "updatedAt" = current_timestamp
	     where "id" = $1 and "tenantId" = $3
	     returning "tenantId"`,
    [id, nextStatus, tenantId],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, actorRole, "RCM_PRIOR_AUTH_STATUS_UPDATED", "RcmPriorAuthorization", id, "ALLOWED", { requestedStatus: status, appliedStatus: nextStatus });
}

export async function stagePriorAuthorizationPacket(input: {
  id: string;
  tenantId?: string;
  payerRegistryEntryId?: string;
  clinicalNarrative?: string;
  actorRole?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const priorAuth = (await query<{
    id: string;
    tenantId: string;
    patientId: string;
    treatmentPlanId: string | null;
    payerName: string;
    requestedCents: number;
    requiredEvidence: unknown;
    treatmentPlanName: string | null;
    firstName: string;
    lastName: string;
    chartNumber: string;
    treatmentPlanEvidence: unknown;
  }>(
    `select pa.*, p."firstName", p."lastName", p."chartNumber", tp."name" as "treatmentPlanName",
       coalesce(items."treatmentPlanEvidence", '[]'::jsonb) as "treatmentPlanEvidence"
     from "RcmPriorAuthorization" pa
     join "PmsPatient" p on p."id" = pa."patientId"
     left join "PmsTreatmentPlan" tp on tp."id" = pa."treatmentPlanId"
     left join lateral (
       select jsonb_agg(jsonb_build_object('code', pc."code", 'description', pc."description", 'tooth', tpi."tooth", 'surface', tpi."surface", 'feeCents', tpi."feeCents") order by pc."code") as "treatmentPlanEvidence"
       from "PmsTreatmentPlanItem" tpi
       join "PmsProcedureCode" pc on pc."id" = tpi."procedureCodeId"
       where tpi."treatmentPlanId" = pa."treatmentPlanId"
     ) items on true
     where pa."id" = $1 and pa."tenantId" = $2`,
    [input.id, tenantId],
  )).rows[0];
  if (!priorAuth) throw new Error("Prior authorization was not found.");

  const payload = buildPriorAuthPdfArtifactPayload({
    tenantId: priorAuth.tenantId,
    priorAuthorizationId: priorAuth.id,
    patientLabel: `${priorAuth.lastName}, ${priorAuth.firstName} (${priorAuth.chartNumber})`,
    payerName: priorAuth.payerName,
    requestedCents: Number(priorAuth.requestedCents),
    treatmentPlanName: priorAuth.treatmentPlanName,
    requiredEvidence: priorAuth.requiredEvidence,
    treatmentPlanEvidence: priorAuth.treatmentPlanEvidence,
    clinicalNarrative: input.clinicalNarrative,
  });
  const artifact = await recordPayerGeneratedArtifact({
    tenantId: priorAuth.tenantId,
    payerRegistryEntryId: input.payerRegistryEntryId,
    sourceObjectType: "RcmPriorAuthorization",
    sourceObjectId: priorAuth.id,
    artifactType: payload.artifactType,
    title: payload.title,
    storageUri: `artifact://prior-auth-packet/${payload.checksum}.html`,
    checksum: payload.checksum,
    metadata: { ...payload.metadata, contentType: payload.contentType, renderReady: true },
  });
  await query(
    `update "RcmPriorAuthorization"
	     set "status" = 'READY_FOR_REVIEW',
	       "connectorStatus" = 'MANUAL_PROOF_REQUIRED',
	       "blockedReason" = 'Prior authorization packet is staged; external payer submission still requires connector acknowledgement or manual proof.',
	       "packetArtifactId" = $2,
	       "packetChecksum" = $3,
	       "submissionMode" = 'PACKET_READY_MANUAL_PROOF_REQUIRED',
	       "submissionReadiness" = jsonb_build_object(
	         'evidenceComplete', true,
	         'packetArtifactId', $2::text,
	         'packetChecksum', $3::text,
	         'submissionMode', 'PACKET_READY_MANUAL_PROOF_REQUIRED',
	         'payerPortalRunId', null,
	         'payerAcknowledgementId', null,
	         'payerConnectorReady', false,
	         'humanApprovalRequired', true,
	         'externalSubmissionBlocked', true
	       ),
	       "updatedAt" = current_timestamp
	     where "id" = $1 and "tenantId" = $4`,
    [priorAuth.id, artifact.id, payload.checksum, priorAuth.tenantId],
  );
  await addAudit(priorAuth.tenantId, input.actorRole ?? "billing_rcm", "RCM_PRIOR_AUTH_PACKET_STAGED", "RcmPriorAuthorization", priorAuth.id, "ALLOWED", { artifactId: artifact.id, checksum: payload.checksum });
  return { artifactId: artifact.id, checksum: payload.checksum };
}

export async function createDenialCase(input: {
  tenantId?: string;
  actorRole?: string;
  patientId: string;
  claimId: string;
  payerName: string;
  denialCode?: string;
  denialReason: string;
  rootCause?: string;
  deniedCents: number;
  appealDeadline?: string;
  requiredEvidence?: string[];
  nextAction: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("denial");
  const result = await query(
    `insert into "RcmDenialCase"
       ("id", "tenantId", "patientId", "claimId", "payerName", "denialCode", "denialReason", "deniedCents", "appealDeadline", "status", "rootCause", "requiredEvidence", "appealPacketStatus", "submissionReadiness", "connectorStatus", "blockedReason", "nextAction", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamp, 'OPEN', $13, $10::jsonb, 'EVIDENCE_NEEDED', $12::jsonb, 'CONNECTOR_REQUIRED', 'Appeal cannot be marked submitted until payer connector acknowledgement or manual submission proof is attached.', $11, current_timestamp)
     returning *`,
    [
      id,
      tenantId,
      input.patientId,
      input.claimId,
      input.payerName.trim(),
      input.denialCode?.trim() || null,
      input.denialReason.trim(),
      input.deniedCents,
      input.appealDeadline || null,
      JSON.stringify(input.requiredEvidence ?? []),
      input.nextAction.trim(),
      JSON.stringify({
        appealPacketComplete: false,
        payerConnectorReady: false,
        humanApprovalRequired: true,
        externalSubmissionBlocked: true,
        evidenceChecklist: evidenceChecklist(input.requiredEvidence).items,
      }),
      input.rootCause?.trim() || null,
    ],
  );
  await addAudit(tenantId, input.actorRole ?? "billing_rcm", "RCM_DENIAL_CASE_CREATED", "RcmDenialCase", id);
  return result.rows[0];
}

export async function updateDenialCaseStatus(id: string, status: string, actorRole = "billing_rcm", tenantId = defaultTenantId) {
  const nextStatus = requireAllowed(status === "SUBMITTED" ? "BLOCKED_CONNECTOR_REQUIRED" : status, allowedDenialStatuses, "APPEAL_READY");
  const result = await query<{ tenantId: string }>(
    `update "RcmDenialCase"
     set "status" = $2,
       "appealPacketStatus" = case when $2 in ('APPEAL_READY','APPROVED_STAGED') then 'READY_FOR_APPROVAL' else "appealPacketStatus" end,
       "connectorStatus" = case when $2 in ('APPROVED_STAGED','BLOCKED_CONNECTOR_REQUIRED') then 'CONNECTOR_REQUIRED' else "connectorStatus" end,
       "blockedReason" = case when $2 in ('APPROVED_STAGED','BLOCKED_CONNECTOR_REQUIRED') then 'Appeal package is staged only. External submission requires payer connector acknowledgement or attached manual proof.' else "blockedReason" end,
       "submissionReadiness" = coalesce("submissionReadiness", '{"appealPacketComplete":false,"payerConnectorReady":false,"humanApprovalRequired":true,"externalSubmissionBlocked":true}'::jsonb),
       "updatedAt" = current_timestamp
	     where "id" = $1 and "tenantId" = $3 returning "tenantId"`,
    [id, nextStatus, tenantId],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, actorRole, "RCM_DENIAL_STATUS_UPDATED", "RcmDenialCase", id, "ALLOWED", { requestedStatus: status, appliedStatus: nextStatus });
}

export async function createPayerFollowUp(input: {
  tenantId?: string;
  actorRole?: string;
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
  await addAudit(tenantId, input.actorRole ?? "billing_rcm", "RCM_PAYER_FOLLOW_UP_CREATED", "RcmPayerFollowUp", id);
  return result.rows[0];
}

export async function updatePayerFollowUpStatus(id: string, status: string, outcome?: string, actorRole = "billing_rcm", tenantId = defaultTenantId) {
  const nextStatus = requireAllowed(status === "RESOLVED" ? "MANUAL_PROOF_REQUIRED" : status, allowedPayerFollowUpStatuses, "WAITING_ON_PAYER");
  const result = await query<{ tenantId: string }>(
    `update "RcmPayerFollowUp"
     set "status" = $2,
       "lastContactAt" = current_timestamp,
       "contactOutcome" = coalesce($3, "contactOutcome"),
       "connectorStatus" = case when $2 in ('WAITING_ON_PAYER','MANUAL_PROOF_REQUIRED') then 'MANUAL_PROOF_REQUIRED' else "connectorStatus" end,
       "blockedReason" = case when $2 in ('WAITING_ON_PAYER','MANUAL_PROOF_REQUIRED') then 'Payer contact is recorded internally; external 276/277 or portal proof is required before payer status is treated as verified.' else "blockedReason" end,
       "updatedAt" = current_timestamp
	     where "id" = $1 and "tenantId" = $4
	     returning "tenantId"`,
    [id, nextStatus, outcome || null, tenantId],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, actorRole, "RCM_PAYER_FOLLOW_UP_UPDATED", "RcmPayerFollowUp", id, "ALLOWED", { requestedStatus: status, appliedStatus: nextStatus, outcome });
}

export async function postEraToLedger(id: string, actorRole = "billing_rcm", tenantId = defaultTenantId) {
  const result = await withTransaction(async (client) => {
    const era = (await client.query<{
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
      status: string;
    }>(`select * from "RcmEraPosting" where "id" = $1 and "tenantId" = $2 for update`, [id, tenantId])).rows[0];
    if (!era) throw new Error("ERA posting was not found.");

    const existing = (await client.query<{ ledgerEntryId: string; paymentId: string }>(
      `select p."ledgerEntryId", p."id" as "paymentId"
       from "PmsPayment" p
       where p."tenantId" = $1 and p."reference" = $2 and p."paymentType" = 'INSURANCE_ERA'
       order by p."createdAt" desc
       limit 1`,
      [tenantId, id],
    )).rows[0];
    if (existing) return { ...existing, tenantId: era.tenantId, audit: "IDEMPOTENT_RETURN" as const };
    if (era.status === "POSTED") throw new Error("ERA posting is already posted and cannot be posted again.");
    if (Number(era.paidCents) <= 0) throw new Error("ERA paid amount must be greater than zero before posting.");

    const postingVarianceCents = Number(era.allowedCents) - Number(era.paidCents) - Number(era.patientDueCents) - Number(era.adjustmentCents);
    if (postingVarianceCents !== 0) {
      await client.query(
        `update "RcmEraPosting"
         set "status" = 'NEEDS_REVIEW',
           "connectorStatus" = 'MANUAL_PROOF_REQUIRED',
           "blockedReason" = 'EOB/ERA allowed, paid, patient due, and adjustment amounts must balance before ledger posting.',
           "postingReadiness" = coalesce("postingReadiness", '{}'::jsonb) || jsonb_build_object(
             'hasEraOrEobProof', coalesce("eraTraceNumber", '') <> '' or coalesce("eobDocumentId", '') <> '',
             'ledgerImpactReviewed', false,
             'adjustmentsReviewed', false,
             'postingVarianceCents', $2::int,
             'varianceResolved', false,
             'pmsLedgerWriteRequiresReview', true
           ),
           "updatedAt" = current_timestamp
         where "id" = $1 and "tenantId" = $3`,
        [id, postingVarianceCents, tenantId],
      );
      return { tenantId: era.tenantId, audit: "BLOCKED_VARIANCE" as const, error: "EOB/ERA amounts must balance before posting to the PMS ledger.", postingVarianceCents };
    }
    if (!era.eraTraceNumber && !era.eobDocumentId) {
      await client.query(
        `update "RcmEraPosting"
         set "connectorStatus" = 'MANUAL_PROOF_REQUIRED',
           "blockedReason" = 'Manual EOB proof or ERA trace is required before posting to the PMS ledger.',
           "postingReadiness" = coalesce("postingReadiness", '{"hasEraOrEobProof":false,"ledgerImpactReviewed":false,"adjustmentsReviewed":false}'::jsonb),
           "updatedAt" = current_timestamp
         where "id" = $1 and "tenantId" = $2`,
        [id, tenantId],
      );
      return { tenantId: era.tenantId, audit: "BLOCKED_PROOF" as const, error: "Manual EOB proof or ERA trace is required before posting to the PMS ledger." };
    }

    const adjudicationLines = (await client.query<EraAdjudicationLineRow>(
      `select "id", "claimLineId", "procedureCode", "serviceDate"::text as "serviceDate", "tooth", "surface",
         "billedCents", "allowedCents", "paidCents", "deductibleCents", "copayCents", "coinsuranceCents",
         "writeoffCents", "denialCents", "otherAdjustmentCents", "patientResponsibilityCents",
         coalesce("carcCodes", '[]'::jsonb) as "carcCodes",
         coalesce("rarcCodes", '[]'::jsonb) as "rarcCodes",
         "status"
       from "RcmEraAdjudicationLine"
       where "eraPostingId" = $1 and "tenantId" = $2
       order by "serviceDate" asc nulls last, "procedureCode", "claimLineId"`,
      [id, tenantId],
    )).rows;
    if (!adjudicationLines.length) throw new Error("ERA posting requires imported line-level 835/EOB adjudication before ledger posting.");
    const uniqueClaimLineIds = new Set(adjudicationLines.map((line) => line.claimLineId));
    if (uniqueClaimLineIds.size !== adjudicationLines.length) {
      await client.query(
        `update "RcmEraPosting"
         set "status" = 'NEEDS_REVIEW',
           "connectorStatus" = 'MANUAL_PROOF_REQUIRED',
           "blockedReason" = 'Imported ERA/EOB adjudication includes duplicate claim lines and cannot be posted.',
           "postingReadiness" = coalesce("postingReadiness", '{}'::jsonb) || jsonb_build_object('lineLevelAdjudicationReady', false, 'duplicateClaimLineIdsRejected', true),
           "updatedAt" = current_timestamp
         where "id" = $1 and "tenantId" = $2`,
        [id, tenantId],
      );
      return { tenantId: era.tenantId, audit: "BLOCKED_LINE_RECONCILIATION" as const, error: "Imported ERA/EOB adjudication includes duplicate claim lines and cannot be posted.", reconciliation: { duplicateClaimLineIdsRejected: true } };
    }
    const matchingClaimLineCount = Number((await client.query<{ count: string }>(
      `select count(*)::text as count
       from "PmsClaimLine" cl
       join jsonb_to_recordset($3::jsonb) as data("claimLineId" text) on data."claimLineId" = cl."id"
       where cl."tenantId" = $1 and cl."claimId" = $2`,
      [tenantId, era.claimId, JSON.stringify(adjudicationLines.map((line) => ({ claimLineId: line.claimLineId })))],
    )).rows[0]?.count ?? 0);
    if (matchingClaimLineCount !== adjudicationLines.length) {
      await client.query(
        `update "RcmEraPosting"
         set "status" = 'NEEDS_REVIEW',
           "connectorStatus" = 'MANUAL_PROOF_REQUIRED',
           "blockedReason" = 'Every imported ERA/EOB adjudication row must map to a claim line on this tenant and claim before posting.',
           "postingReadiness" = coalesce("postingReadiness", '{}'::jsonb) || jsonb_build_object('lineLevelAdjudicationReady', false, 'claimLineMatchCount', $2::int, 'adjudicationLineCount', $3::int),
           "updatedAt" = current_timestamp
         where "id" = $1 and "tenantId" = $4`,
        [id, matchingClaimLineCount, adjudicationLines.length, tenantId],
      );
      return { tenantId: era.tenantId, audit: "BLOCKED_LINE_OWNERSHIP" as const, error: "Every imported ERA/EOB adjudication row must map to a claim line on this tenant and claim before posting.", reconciliation: { matchingClaimLineCount, adjudicationLineCount: adjudicationLines.length } };
    }
    const reconciliation = reconcileEraAdjudicationLines(era, adjudicationLines);
    if (!reconciliation.balancedForPosting) {
      await client.query(
        `update "RcmEraPosting"
         set "status" = 'NEEDS_REVIEW',
           "connectorStatus" = 'MANUAL_PROOF_REQUIRED',
           "blockedReason" = 'Imported ERA/EOB line adjudication totals must reconcile to header totals and line balances before ledger posting.',
           "postingReadiness" = coalesce("postingReadiness", '{}'::jsonb) || jsonb_build_object(
             'lineLevelAdjudicationReady', true,
             'inputTotalsMatchLines', $2::boolean,
             'lineBalancesToAllowed', $3::boolean,
             'patientResponsibilityBalances', $4::boolean,
             'postingVarianceCents', $5::int,
             'lineReconciliationTotals', $6::jsonb,
             'varianceResolved', false,
             'pmsLedgerWriteRequiresReview', true
           ),
           "updatedAt" = current_timestamp
         where "id" = $1 and "tenantId" = $7`,
        [
          id,
          reconciliation.inputTotalsMatchLines,
          reconciliation.lineBalancesToAllowed,
          reconciliation.patientResponsibilityBalances,
          reconciliation.postingVarianceCents,
          JSON.stringify(reconciliation.totals),
          tenantId,
        ],
      );
      return { tenantId: era.tenantId, audit: "BLOCKED_LINE_RECONCILIATION" as const, error: "Imported ERA/EOB line adjudication totals must reconcile before posting to the PMS ledger.", reconciliation };
    }

    await client.query(
      `update "RcmEraPosting"
       set "postingReadiness" = coalesce("postingReadiness", '{}'::jsonb) || jsonb_build_object(
           'hasEraOrEobProof', coalesce("eraTraceNumber", '') <> '' or coalesce("eobDocumentId", '') <> '',
           'ledgerImpactReviewed', true,
           'adjustmentsReviewed', true,
           'lineLevelAdjudicationReady', true,
           'inputTotalsMatchLines', true,
           'lineBalancesToAllowed', true,
           'patientResponsibilityBalances', true,
           'lineCount', $2::int,
           'postingVarianceCents', 0,
           'varianceResolved', true
         ),
         "connectorStatus" = 'MANUAL_PROOF_REQUIRED',
         "blockedReason" = case when coalesce("eraTraceNumber", '') = '' and coalesce("eobDocumentId", '') = '' then 'Manual EOB proof or ERA trace is required for audit review.' else "blockedReason" end
       where "id" = $1 and "tenantId" = $3`,
      [id, adjudicationLines.length, tenantId],
    );

    const ledgerEntryId = newId("led");
    const paymentId = newId("pay");
    await client.query(
      `insert into "PmsLedgerEntry"
         ("id", "tenantId", "patientId", "claimId", "entryType", "description", "amountCents", "balanceCents", "serviceDate")
       values ($1, $2, $3, $4, 'INSURANCE_PAYMENT', $5, $6, $6, current_timestamp)`,
      [ledgerEntryId, era.tenantId, era.patientId, era.claimId, `${era.payerName} ERA insurance payment`, -Math.abs(Number(era.paidCents))],
    );
    await client.query(
      `insert into "PmsPayment"
         ("id", "tenantId", "patientId", "ledgerEntryId", "paymentType", "amountCents", "reference", "unappliedCents", "status")
       values ($1, $2, $3, $4, 'INSURANCE_ERA', $5, $6, 0, 'POSTED')`,
      [paymentId, era.tenantId, era.patientId, ledgerEntryId, Math.abs(Number(era.paidCents)), id],
    );
    const claimLineUpdate = await client.query(
      `update "PmsClaimLine" cl
       set "allowedCents" = data."allowedCents",
         "paidCents" = data."paidCents",
         "deductibleCents" = data."deductibleCents",
         "copayCents" = data."copayCents",
         "coinsuranceCents" = data."coinsuranceCents",
         "writeoffCents" = data."writeoffCents",
         "denialCents" = data."denialCents",
         "otherAdjustmentCents" = data."otherAdjustmentCents",
         "patientDueCents" = data."patientResponsibilityCents",
         "carcCodes" = data."carcCodes"::jsonb,
         "rarcCodes" = data."rarcCodes"::jsonb,
         "eraPostingId" = $2,
         "adjudicatedAt" = current_timestamp,
         "status" = data."status",
         "updatedAt" = current_timestamp
       from jsonb_to_recordset($3::jsonb) as data(
         "claimLineId" text,
         "allowedCents" int,
         "paidCents" int,
         "deductibleCents" int,
         "copayCents" int,
         "coinsuranceCents" int,
         "writeoffCents" int,
         "denialCents" int,
         "otherAdjustmentCents" int,
         "patientResponsibilityCents" int,
         "carcCodes" jsonb,
         "rarcCodes" jsonb,
         "status" text
       )
      where cl."id" = data."claimLineId" and cl."claimId" = $1 and cl."tenantId" = $4`,
      [era.claimId, id, JSON.stringify(adjudicationLines), tenantId],
    );
    if (claimLineUpdate.rowCount !== adjudicationLines.length) {
      throw new Error("ERA posting aborted because not every imported adjudication row updated a matching claim line.");
    }
    await client.query(
      `update "PmsClaim"
       set "allowedCents" = $2, "paidCents" = "paidCents" + $3, "patientDueCents" = $4,
         "status" = case when ("paidCents" + $3) >= $2 then 'PAID' else 'PARTIALLY_PAID' end,
         "lastStatusAt" = current_timestamp, "updatedAt" = current_timestamp
       where "id" = $1 and "tenantId" = $5`,
      [era.claimId, Number(era.allowedCents), Math.abs(Number(era.paidCents)), Number(era.patientDueCents), tenantId],
    );
    await client.query(
      `update "RcmEraPosting"
       set "status" = 'POSTED', "postedAt" = current_timestamp, "updatedAt" = current_timestamp
       where "id" = $1 and "tenantId" = $2`,
      [id, tenantId],
    );

    return { ledgerEntryId, paymentId, tenantId: era.tenantId, audit: "POSTED" as const };
  });
  if (result.audit === "BLOCKED_VARIANCE") {
    await addAudit(result.tenantId, actorRole, "RCM_ERA_POST_BLOCKED_VARIANCE", "RcmEraPosting", id, "BLOCKED", { postingVarianceCents: result.postingVarianceCents });
    throw new Error(result.error);
  }
  if (result.audit === "BLOCKED_PROOF") {
    await addAudit(result.tenantId, actorRole, "RCM_ERA_POST_BLOCKED", "RcmEraPosting", id, "BLOCKED", { blockedReason: "Manual EOB proof or ERA trace is required." });
    throw new Error(result.error);
  }
  if (result.audit === "BLOCKED_LINE_RECONCILIATION" || result.audit === "BLOCKED_LINE_OWNERSHIP") {
    await addAudit(result.tenantId, actorRole, "RCM_ERA_POST_BLOCKED_LINE_RECONCILIATION", "RcmEraPosting", id, "BLOCKED", result.reconciliation);
    throw new Error(result.error);
  }
  await addAudit(result.tenantId, actorRole, result.audit === "POSTED" ? "RCM_ERA_POSTED_TO_LEDGER" : "RCM_ERA_POST_IDEMPOTENT_RETURN", "RcmEraPosting", id, "ALLOWED", { ledgerEntryId: result.ledgerEntryId, paymentId: result.paymentId });
  return { ledgerEntryId: result.ledgerEntryId, paymentId: result.paymentId };
}

export async function attachEobProofToEra(input: {
  id: string;
  tenantId?: string;
  payerRegistryEntryId?: string;
  adjustmentSummary?: unknown;
  actorRole?: string;
}) {
  const era = (await query<{
    id: string;
    tenantId: string;
    patientId: string;
    claimId: string;
    payerName: string;
    eraTraceNumber: string | null;
    allowedCents: number;
    paidCents: number;
    patientDueCents: number;
    adjustmentCents: number;
    firstName: string;
    lastName: string;
    chartNumber: string;
  }>(
    `select era.*, p."firstName", p."lastName", p."chartNumber"
     from "RcmEraPosting" era
     join "PmsPatient" p on p."id" = era."patientId"
	     where era."id" = $1 and era."tenantId" = $2`,
    [input.id, input.tenantId ?? defaultTenantId],
  )).rows[0];
  if (!era) throw new Error("ERA posting was not found.");
  const adjudicationLines = await getEraAdjudicationLines(era.id, era.tenantId);
  if (!adjudicationLines.length) throw new Error("EOB proof requires imported line-level 835/EOB adjudication before proof generation.");

  const payload = buildEobPdfArtifactPayload({
    tenantId: era.tenantId,
    eraPostingId: era.id,
    claimId: era.claimId,
    patientLabel: `${era.lastName}, ${era.firstName} (${era.chartNumber})`,
    payerName: era.payerName,
    allowedCents: Number(era.allowedCents),
    paidCents: Number(era.paidCents),
    patientDueCents: Number(era.patientDueCents),
    adjustmentCents: Number(era.adjustmentCents),
    eraTraceNumber: era.eraTraceNumber,
    adjudicationLines,
    adjustmentSummary: input.adjustmentSummary,
  });
  const artifact = await recordPayerGeneratedArtifact({
    tenantId: era.tenantId,
    payerRegistryEntryId: input.payerRegistryEntryId,
    sourceObjectType: "RcmEraPosting",
    sourceObjectId: era.id,
    artifactType: payload.artifactType,
    title: payload.title,
    storageUri: `artifact://eob-posting/${payload.checksum}.html`,
    checksum: payload.checksum,
    metadata: { ...payload.metadata, contentType: payload.contentType, renderReady: true },
  });
  await query(
    `update "RcmEraPosting"
     set "eobDocumentId" = $2,
       "postingReadiness" = jsonb_build_object(
         'hasEraOrEobProof', true,
         'eobArtifactId', $2::text,
	         'ledgerImpactReviewed', false,
	         'adjustmentsReviewed', false,
	         'lineLevelAdjudicationReady', true,
	         'lineCount', $3::int,
	         'pmsLedgerWriteRequiresReview', true
	       ),
       "connectorStatus" = 'MANUAL_PROOF_REQUIRED',
       "blockedReason" = 'EOB proof is attached; ledger posting still requires billing review.',
       "updatedAt" = current_timestamp
	     where "id" = $1 and "tenantId" = $4`,
    [era.id, artifact.id, adjudicationLines.length, era.tenantId],
  );
  await addAudit(era.tenantId, input.actorRole ?? "billing_rcm", "RCM_EOB_PROOF_ATTACHED", "RcmEraPosting", era.id, "ALLOWED", { artifactId: artifact.id, checksum: payload.checksum });
  return { artifactId: artifact.id, checksum: payload.checksum };
}

export async function updateRevenueFindingStatus(id: string, status: string, actorRole = "billing_rcm", tenantId = defaultTenantId) {
  const nextStatus = requireAllowed(status === "RECOVERED" ? "MANUAL_PROOF_REQUIRED" : status, allowedRevenueStatuses, "IN_REVIEW");
  const result = await query<{ tenantId: string }>(
    `update "RcmRevenueIntegrityFinding"
     set "status" = $2,
       "recoveryStatus" = $2,
       "connectorStatus" = case when $2 in ('RECOVERY_STAGED','MANUAL_PROOF_REQUIRED') then 'MANUAL_PROOF_REQUIRED' else "connectorStatus" end,
       "proofRequired" = coalesce("proofRequired", '["source claim","ledger variance","payer contract or fee schedule","recovery action proof"]'::jsonb),
       "updatedAt" = current_timestamp
	     where "id" = $1 and "tenantId" = $3 returning "tenantId"`,
    [id, nextStatus, tenantId],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, actorRole, "RCM_REVENUE_INTEGRITY_UPDATED", "RcmRevenueIntegrityFinding", id, "ALLOWED", { requestedStatus: status, appliedStatus: nextStatus });
}

export async function getPhoneOperatingCenter(tenantId = defaultTenantId) {
  const [conversations, messages, routes, tasks, analytics, numbers, extensions, devices, providers, activeCalls, controls, voicemails, screenPops, transcriptEvents, aiAssistEvents, aiReceptionPolicies, channelSettings, knowledgeSources, webChats, webChatMessages, leadForms, formPackets, schedulingRules, metrics, patients] = await Promise.all([
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
    query(
      `select s.*, ac."callState", ac."providerCallId", c."callerName", c."practiceNumber", c."startedAt"
       from "PhoneScreenPopSnapshot" s
       left join "PhoneActiveCall" ac on ac."id" = s."activeCallId"
       left join "PhoneConversation" c on c."id" = s."conversationId"
       where s."tenantId" = $1
       order by s."createdAt" desc
       limit 20`,
      [tenantId],
    ),
    query(
      `select te.*
       from "PhoneCallTranscriptEvent" te
       where te."tenantId" = $1
       order by te."createdAt" desc
       limit 80`,
      [tenantId],
    ),
    query(
      `select ae.*
       from "PhoneCallAiAssistEvent" ae
       where ae."tenantId" = $1
       order by case ae."severity" when 'CRITICAL' then 0 when 'WARNING' then 1 else 2 end, ae."createdAt" desc
       limit 80`,
      [tenantId],
    ),
    query(`select * from "PhoneAiReceptionPolicy" where "tenantId" = $1 order by "locationId" nulls first, "name"`, [tenantId]),
    query(`select * from "PatientEngagementChannelSetting" where "tenantId" = $1 order by "channel"`, [tenantId]),
    query(`select * from "PatientEngagementKnowledgeSource" where "tenantId" = $1 order by case "status" when 'NEEDS_REVIEW' then 0 else 1 end, "sourceModule", "title"`, [tenantId]),
    query(
      `select wc.*, p."firstName", p."lastName", p."chartNumber", lf."name" as "leadFormName", lf."serviceLine",
              last_message."body" as "lastMessageBody", last_message."createdAt" as "lastMessageAt", last_message."senderType" as "lastMessageSenderType"
       from "PatientWebChatConversation" wc
       left join "PmsPatient" p on p."id" = wc."patientId"
       left join "PatientEngagementLeadForm" lf on lf."id" = wc."leadFormId"
       left join lateral (
         select wm."body", wm."createdAt", wm."senderType"
         from "PatientWebChatMessage" wm
         where wm."tenantId" = wc."tenantId" and wm."conversationId" = wc."id"
         order by wm."createdAt" desc
         limit 1
       ) last_message on true
       where wc."tenantId" = $1
       order by case wc."status" when 'OPEN' then 0 else 1 end, wc."updatedAt" desc, wc."createdAt" desc`,
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
  const architectureCandidates = buildPhoneArchitectureCandidates({
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
    screenPops: screenPops.rows,
    transcriptEvents: transcriptEvents.rows,
    aiAssistEvents: aiAssistEvents.rows,
    aiReceptionPolicies: aiReceptionPolicies.rows,
    channelSettings: channelSettings.rows,
    knowledgeSources: knowledgeSources.rows,
    webChats: webChats.rows,
    webChatMessages: webChatMessages.rows,
    leadForms: leadForms.rows,
    formPackets: formPackets.rows,
    schedulingRules: schedulingRules.rows,
    metrics: metrics.rows[0],
    setupReadiness,
    architectureCandidates,
    patients,
  };
}

function buildPhoneSetupReadiness(input: { providers: Record<string, unknown>[]; numbers: Record<string, unknown>[]; extensions: Record<string, unknown>[]; devices: Record<string, unknown>[] }) {
  const readyProviders = input.providers.filter((row) => row.status === "ACTIVE" && row.credentialStatus === "VALIDATED" && row.webhookStatus === "VERIFIED");
  const sipProviders = input.providers.filter((row) => String(row.providerType).includes("SIP") || String(row.providerType).includes("VOIP"));
  const readySipProviders = sipProviders.filter((row) => row.status === "ACTIVE" && row.credentialStatus === "VALIDATED" && row.webhookStatus === "VERIFIED" && row.trunkDomain && row.outboundCallerId);
  const pbxProviders = input.providers.filter((row) => isFreeSwitchCandidate(row));
  const readyPbxProviders = pbxProviders.filter((row) => row.status === "ACTIVE" && row.credentialStatus === "VALIDATED" && row.webhookStatus === "VERIFIED");
  const activeVoiceNumbers = input.numbers.filter((row) => row.status === "ACTIVE" && row.voiceStatus === "ACTIVE");
  const smsReadyNumbers = input.numbers.filter((row) => row.status === "ACTIVE" && row.smsStatus === "ACTIVE");
  const e911ReadyNumbers = input.numbers.filter((row) => row.e911Status === "VALIDATED" || row.e911Status === "ACTIVE");
  const complianceReadyNumbers = input.numbers.filter((row) => row.status === "ACTIVE" && row.voiceStatus === "ACTIVE" && row.e911Status && !["NOT_CONFIGURED", "NEEDS_VALIDATION", "BLOCKED"].includes(String(row.e911Status)));
  const provisionedExtensions = input.extensions.filter((row) => row.status === "ACTIVE");
  const registeredDevices = input.devices.filter((row) => row.provisioningStatus === "PROVISIONED" && row.registrationStatus === "ONLINE");
  const deskPhonesWithMac = input.devices.filter((row) => row.deviceType === "DESK_PHONE" && row.macAddress);
  const sipCredentialedDevices = input.devices.filter((row) => row.sipUsername && row.provisioningStatus !== "NOT_PROVISIONED");
  const checks = [
    { label: "Carrier credentials", status: readyProviders.length ? "READY" : "BLOCKED_CONNECTOR_REQUIRED", nextAction: readyProviders.length ? "Provider credentials and webhooks are ready for smoke testing." : "Store SIP/WebRTC credentials, verify call-control webhooks, and run provider smoke tests." },
    { label: "FreeSWITCH PBX/media layer", status: readyPbxProviders.length ? "READY" : "SETUP_REQUIRED", nextAction: readyPbxProviders.length ? "PBX/media layer is registered as an active connector with event ingestion verified." : "Deploy FreeSWITCH or SignalWire-managed FreeSWITCH as the PBX/media/SIP/WebRTC/call-control layer; do not treat it as a carrier replacement." },
    { label: "SIP trunk and caller ID", status: readySipProviders.length ? "READY" : "SETUP_REQUIRED", nextAction: readySipProviders.length ? "SIP trunk, caller ID, credentials, and webhooks are staged for connector execution." : "Choose the SIP trunk/PBX provider, enter trunk domain and outbound caller ID, and verify call-control webhooks." },
    { label: "Voice numbers", status: activeVoiceNumbers.length ? "READY" : "SETUP_REQUIRED", nextAction: activeVoiceNumbers.length ? "At least one office number is active for voice." : "Complete number porting, caller ID, default route, and inbound voice validation." },
    { label: "SMS registration", status: smsReadyNumbers.length ? "READY" : "BLOCKED_CONNECTOR_REQUIRED", nextAction: smsReadyNumbers.length ? "At least one number is SMS-ready with registration and webhooks." : "Register messaging use case, validate opt-in policy, and enable SMS webhooks before sending texts." },
    { label: "E911", status: e911ReadyNumbers.length ? "READY" : "SETUP_REQUIRED", nextAction: e911ReadyNumbers.length ? "Emergency address validation is ready." : "Validate emergency address and failover route for every live office number." },
    { label: "STIR/SHAKEN and carrier compliance", status: complianceReadyNumbers.length && readySipProviders.length ? "READY" : "SETUP_REQUIRED", nextAction: complianceReadyNumbers.length && readySipProviders.length ? "Carrier compliance readiness is tied to active voice numbers and trunk identity." : "Confirm STIR/SHAKEN attestation, CNAM/caller ID policy, acceptable use, call recording disclosure, and carrier compliance through the selected SIP trunk/provider." },
    { label: "Extensions", status: provisionedExtensions.length ? "READY" : "SETUP_REQUIRED", nextAction: provisionedExtensions.length ? "Extensions exist for role routing and voicemail." : "Create extensions for front desk, billing, clinical triage, and AI receptionist fallback." },
    { label: "Queues, IVR, voicemail, recording", status: readyPbxProviders.length && provisionedExtensions.length ? "READY" : "SETUP_REQUIRED", nextAction: readyPbxProviders.length && provisionedExtensions.length ? "PBX services can be mapped to queues, IVR, voicemail, recording, and conference/transfer workflows." : "Map FreeSWITCH dialplan, mod_callcenter queues, IVR menus, voicemail, recordings, conference/transfer rules, and retention controls." },
    { label: "Event ingestion seam", status: readyPbxProviders.length ? "READY" : "BLOCKED_CONNECTOR_REQUIRED", nextAction: readyPbxProviders.length ? "FreeSWITCH events can be normalized into 1DentalAI call state and audit records." : "No live phone go-live until there is a deployed FreeSWITCH/PBX media layer with verified Event Socket or webhook bridge for channel events, SIP registrations, queue events, voicemail, recordings, IVR, conference, and Verto webphone events." },
    { label: "MAC provisioning", status: deskPhonesWithMac.length || !input.devices.some((row) => row.deviceType === "DESK_PHONE") ? "READY" : "SETUP_REQUIRED", nextAction: deskPhonesWithMac.length ? "Desk phone MAC addresses are captured for provisioning." : "Capture MAC addresses for physical desk phones before zero-touch provisioning or manual SIP setup." },
    { label: "SIP device credentials", status: sipCredentialedDevices.length ? "READY" : "SETUP_REQUIRED", nextAction: sipCredentialedDevices.length ? "At least one desk phone or softphone has SIP/WebRTC identity staged." : "Assign SIP usernames/softphone identities and confirm registration secrets are stored in the vault." },
    { label: "Desk phones and softphones", status: registeredDevices.length ? "READY" : "SETUP_REQUIRED", nextAction: registeredDevices.length ? "At least one provisioned device is registered." : "Assign devices, capture MAC/SIP credentials, and confirm online registration." },
  ];
  const blocked = checks.filter((check) => check.status !== "READY").length;
  return {
    status: blocked ? "SETUP_REQUIRED" : "READY_FOR_CONNECTOR",
    blocked,
    checks,
  };
}

function buildPhoneArchitectureCandidates(input: { providers: Record<string, unknown>[]; numbers: Record<string, unknown>[]; extensions: Record<string, unknown>[]; devices: Record<string, unknown>[] }) {
  const hasFreeSwitch = input.providers.some((row) => isFreeSwitchCandidate(row) && row.status === "ACTIVE" && row.credentialStatus === "VALIDATED" && row.webhookStatus === "VERIFIED");
  const hasSipTrunk = input.providers.some((row) => (String(row.providerType).includes("SIP") || String(row.providerType).includes("VOIP")) && row.status === "ACTIVE" && row.credentialStatus === "VALIDATED");
  const hasDid = input.numbers.some((row) => row.status === "ACTIVE" && row.voiceStatus === "ACTIVE");
  const hasSms = input.numbers.some((row) => row.status === "ACTIVE" && row.smsStatus === "ACTIVE");
  const hasE911 = input.numbers.some((row) => row.e911Status === "VALIDATED" || row.e911Status === "ACTIVE");
  const hasDevices = input.devices.some((row) => row.registrationStatus === "ONLINE" && row.provisioningStatus === "PROVISIONED");
  const hasExtensions = input.extensions.some((row) => row.status === "ACTIVE");
  const readiness = [
    { label: "FreeSWITCH deployment", status: hasFreeSwitch ? "READY" : "SETUP_REQUIRED", nextAction: "Deploy FreeSWITCH or SignalWire-managed FreeSWITCH with mod_sofia, Event Socket, voicemail, recordings, callcenter/conference, and Verto or equivalent webphone support." },
    { label: "SIP trunk/provider", status: hasSipTrunk ? "READY" : "SETUP_REQUIRED", nextAction: "Connect a carrier/SIP trunk separately from FreeSWITCH; FreeSWITCH is the PBX/media layer, not the carrier replacement." },
    { label: "DIDs and inbound routing", status: hasDid ? "READY" : "SETUP_REQUIRED", nextAction: "Provision or port DIDs/toll-free numbers and route them to FreeSWITCH dialplan/queues/IVR." },
    { label: "SMS provider and 10DLC", status: hasSms ? "READY" : "BLOCKED_CONNECTOR_REQUIRED", nextAction: "Use a messaging provider with 10DLC/toll-free verification, opt-in/opt-out, and webhook delivery; do not expect FreeSWITCH to replace SMS registration." },
    { label: "E911", status: hasE911 ? "READY" : "SETUP_REQUIRED", nextAction: "Validate emergency locations and failover routes through the SIP trunk/provider before live calling." },
    { label: "STIR/SHAKEN and carrier compliance", status: hasSipTrunk && hasDid ? "READY" : "SETUP_REQUIRED", nextAction: "Confirm attestation, caller ID/CNAM, traffic profile, recording disclosure, and carrier acceptable-use requirements with the provider." },
    { label: "Physical SIP devices", status: hasDevices ? "READY" : "SETUP_REQUIRED", nextAction: "Provision MAC addresses, SIP usernames/secrets, firmware/profile URLs, BLF/park keys, and registration monitoring." },
    { label: "Extensions, queues, IVR", status: hasExtensions && hasFreeSwitch ? "READY" : "SETUP_REQUIRED", nextAction: "Map extensions, queues/ring groups, IVR menus, hours/failover, voicemail boxes, and recording policy into FreeSWITCH config or generated dialplan." },
    { label: "1DentalAI event bridge", status: hasFreeSwitch ? "READY" : "BLOCKED_CONNECTOR_REQUIRED", nextAction: "Normalize Event Socket, mod_sofia registration/channel events, mod_callcenter queue events, mod_conference transfer/bridge events, voicemail/recording events, and mod_verto webphone events into 1DentalAI." },
  ];
  return [{
    id: "signalwire-freeswitch",
    name: "SignalWire/FreeSWITCH PBX and media control plane",
    role: "Candidate PBX/media/SIP/WebRTC/call-control layer behind 1DentalAI; requires separate carrier/SIP trunk, DID, SMS, E911, and compliance setup.",
    status: hasFreeSwitch && hasSipTrunk && hasDid && hasE911 ? "READY_FOR_CONNECTOR" : "SETUP_REQUIRED",
    externalExecutionPolicy: "No live calls, call control, SMS, E911, or recording claims until FreeSWITCH is deployed, SIP trunk/DIDs are active, credentials are validated, and Event Socket/webhook ingestion is verified.",
    modules: ["mod_sofia", "mod_event_socket", "mod_callcenter", "mod_conference", "mod_verto", "voicemail", "recording", "IVR/dialplan"],
    seams: ["SIP trunk/provider gateway", "DID routing", "SMS provider and 10DLC webhooks", "E911 provider validation", "STIR/SHAKEN/CNAM compliance", "SIP device provisioning", "extensions/queues/IVR", "voicemail and recording ingestion", "Verto/webphone signaling", "1DentalAI webhook/event normalization"],
    readiness,
  }];
}

function isFreeSwitchCandidate(row: Record<string, unknown>) {
  const providerType = String(row.providerType ?? "").toUpperCase();
  const name = String(row.name ?? "").toUpperCase();
  return providerType.includes("FREESWITCH") || providerType.includes("PBX") || providerType.includes("MEDIA_CONTROL") || name.includes("FREESWITCH") || name.includes("SIGNALWIRE");
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
  if (followUpStatus === "SCHEDULING_HANDOFF") return {
    ownerRoleKey: "front_desk",
    taskType: "PHONE_SCHEDULING_HANDOFF",
    priority: "HIGH",
    dueIn: "30 minutes",
    title: (intent: string) => `Phone scheduling handoff: ${intent}`,
    nextAction: () => "Use PMS schedule, recall, treatment-plan, and online-booking context to book or route the patient request; do not mark booked until a PMS appointment/request exists.",
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
  const rawConsentStatus = input.consentStatus || "UNKNOWN";
  const demoConsentOverride = isDemoConsentOverrideEnabled(tenantId);
  const consentStatus = demoConsentOverride ? "VERIFIED" : rawConsentStatus;
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
    demoConsentOverride,
    originalConsentStatus: rawConsentStatus,
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
  await addAudit(tenantId, "front_desk", "PHONE_OUTBOUND_MESSAGE_STAGED", "PhoneOutboundMessage", id, consentBlockedReason ? "BLOCKED" : "ALLOWED", { consentStatus, originalConsentStatus: rawConsentStatus, demoConsentOverride, blockedReason: consentBlockedReason, connectorStatus, readiness });
  return { id, connectorStatus, blockedReason: consentBlockedReason };
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
         when $2::text = 'APPROVED_STAGED' and "consentStatus" <> 'VERIFIED' then 'BLOCKED'
         when $2::text = 'APPROVED_STAGED' and coalesce("blockedReason", '') <> '' then 'BLOCKED'
         else $2::text
       end,
       "deliveryStatus" = case
         when $2::text = 'APPROVED_STAGED' and "consentStatus" = 'VERIFIED' and coalesce("blockedReason", '') = '' and "connectorStatus" = 'READY_FOR_CONNECTOR' then 'READY_FOR_CONNECTOR'
         when $2::text = 'APPROVED_STAGED' and "consentStatus" = 'VERIFIED' and coalesce("blockedReason", '') = '' and "connectorStatus" <> 'READY_FOR_CONNECTOR' then 'BLOCKED_CONNECTOR_REQUIRED'
         else "deliveryStatus"
       end,
       "blockedReason" = case
         when $2::text = 'APPROVED_STAGED' and "consentStatus" <> 'VERIFIED' then 'Cannot approve outbound message until patient channel consent is verified.'
         else "blockedReason"
       end,
       "readiness" = coalesce("readiness", '{}'::jsonb) || jsonb_build_object('approvedByRole', $3::text, 'approvedAt', current_timestamp, 'externalSendBlocked', "connectorStatus" <> 'READY_FOR_CONNECTOR'),
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

export async function sendApprovedPhoneOutboundMessage(id: string, actorRole = "front_desk") {
  const result = await query<{
    id: string;
    tenantId: string;
    channel: string;
    recipientNumber: string | null;
    body: string;
    approvalStatus: string;
    deliveryStatus: string;
    consentStatus: string;
    connectorStatus: string;
    blockedReason: string | null;
  }>(
    `select "id", "tenantId", "channel", "recipientNumber", "body", "approvalStatus", "deliveryStatus", "consentStatus", "connectorStatus", "blockedReason"
     from "PhoneOutboundMessage"
     where "id" = $1
     limit 1`,
    [id],
  );
  const message = result.rows[0];
  if (!message) return;

  const block = await getSmsSendBlock(message);
  if (block) {
    await query(
      `update "PhoneOutboundMessage"
       set "deliveryStatus" = 'BLOCKED',
         "blockedReason" = $2,
         "provider" = 'TWILIO',
         "providerError" = $2,
         "lastAttemptAt" = current_timestamp,
         "readiness" = coalesce("readiness", '{}'::jsonb) || jsonb_build_object('twilioSendAttemptedAt', current_timestamp, 'twilioBlockedReason', $2::text, 'externalSendBlocked', true),
         "updatedAt" = current_timestamp
       where "id" = $1`,
      [id, block],
    );
    await addAudit(message.tenantId, actorRole, "PHONE_SMS_SEND_BLOCKED", "PhoneOutboundMessage", id, "BLOCKED", { blockedReason: block });
    return;
  }

  const fromNumber = await getActiveSmsFromNumber(message.tenantId);
  if (!fromNumber) {
    const reason = "No active SMS-capable practice number is configured for this tenant.";
    await query(
      `update "PhoneOutboundMessage"
       set "deliveryStatus" = 'BLOCKED_CONNECTOR_REQUIRED',
         "blockedReason" = $2,
         "provider" = 'TWILIO',
         "providerError" = $2,
         "lastAttemptAt" = current_timestamp,
         "readiness" = coalesce("readiness", '{}'::jsonb) || jsonb_build_object('twilioBlockedReason', $2::text, 'externalSendBlocked', true),
         "updatedAt" = current_timestamp
       where "id" = $1`,
      [id, reason],
    );
    await addAudit(message.tenantId, actorRole, "PHONE_SMS_SEND_BLOCKED", "PhoneOutboundMessage", id, "BLOCKED", { blockedReason: reason });
    return;
  }

  const callbackUrl = `${(process.env.ONE_DENTAL_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.1dentalai.com").replace(/\/$/, "")}/api/twilio/sms/status`;
  try {
    const twilio = await sendTwilioSms({
      tenantId: message.tenantId,
      from: fromNumber,
      to: message.recipientNumber!,
      body: message.body,
      statusCallback: callbackUrl,
    });
    await query(
      `update "PhoneOutboundMessage"
       set "deliveryStatus" = 'SENT_TO_PROVIDER',
         "provider" = 'TWILIO',
         "providerMessageId" = $2,
         "providerStatus" = $3,
         "providerError" = null,
         "lastAttemptAt" = current_timestamp,
         "sentAt" = current_timestamp,
         "readiness" = coalesce("readiness", '{}'::jsonb) || jsonb_build_object('twilioProviderSid', $2::text, 'twilioProviderStatus', $3::text, 'externalSendBlocked', false),
         "updatedAt" = current_timestamp
       where "id" = $1`,
      [id, twilio.sid, twilio.status],
    );
    await addAudit(message.tenantId, actorRole, "PHONE_SMS_SENT_TO_TWILIO", "PhoneOutboundMessage", id, "ALLOWED", { provider: "TWILIO", providerMessageId: twilio.sid, providerStatus: twilio.status });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Twilio SMS send failed.";
    await query(
      `update "PhoneOutboundMessage"
       set "deliveryStatus" = 'PROVIDER_ERROR',
         "provider" = 'TWILIO',
         "providerError" = $2,
         "lastAttemptAt" = current_timestamp,
         "readiness" = coalesce("readiness", '{}'::jsonb) || jsonb_build_object('twilioProviderError', $2::text, 'externalSendBlocked', true),
         "updatedAt" = current_timestamp
       where "id" = $1`,
      [id, reason],
    );
    await addAudit(message.tenantId, actorRole, "PHONE_SMS_PROVIDER_ERROR", "PhoneOutboundMessage", id, "BLOCKED", { provider: "TWILIO", providerError: reason });
  }
}

async function getSmsSendBlock(message: {
  tenantId: string;
  channel: string;
  recipientNumber: string | null;
  body: string;
  approvalStatus: string;
  deliveryStatus: string;
  consentStatus: string;
  connectorStatus: string;
  blockedReason: string | null;
}) {
  if (message.channel !== "SMS") return "Only SMS messages can be sent through the Twilio SMS connector.";
  if (message.approvalStatus !== "APPROVED_STAGED") return "Message must be approved and staged by staff before external send.";
  if (!["READY_FOR_CONNECTOR", "BLOCKED_CONNECTOR_REQUIRED"].includes(message.deliveryStatus)) return `Message is not in a sendable state (${message.deliveryStatus}).`;
  if (message.connectorStatus !== "READY_FOR_CONNECTOR") return "SMS connector readiness is not complete for this tenant.";
  if (message.consentStatus !== "VERIFIED" && !isDemoConsentOverrideEnabled(message.tenantId)) return "Patient SMS consent is not verified.";
  if (message.blockedReason) return message.blockedReason;
  if (!message.recipientNumber) return "Recipient mobile number is missing.";
  if (!message.body.trim()) return "Message body is empty.";
  const credentials = await getTwilioCredentials(message.tenantId);
  if (!credentials.accountSid || !credentials.authToken) return "Twilio Account SID/Auth Token are not configured in the credential vault or production environment.";
  return null;
}

function isDemoConsentOverrideEnabled(tenantId: string) {
  return tenantId === defaultTenantId && process.env.DEMO_CONSENT_OVERRIDE !== "false";
}

async function getActiveSmsFromNumber(tenantId: string) {
  if (process.env.TWILIO_FROM_NUMBER?.trim()) return normalizePhoneNumber(process.env.TWILIO_FROM_NUMBER);
  const result = await query<{ phoneNumber: string }>(
    `select "phoneNumber"
     from "PhoneNumber"
     where "tenantId" = $1 and "status" = 'ACTIVE' and "smsStatus" = 'ACTIVE'
     order by case when "numberType" = 'MAIN' then 0 else 1 end, "createdAt" desc
     limit 1`,
    [tenantId],
  );
  return result.rows[0]?.phoneNumber ?? null;
}

function normalizePhoneNumber(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("+")) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return trimmed;
}

async function sendTwilioSms(input: { tenantId: string; from: string; to: string; body: string; statusCallback: string }) {
  const credentials = await getTwilioCredentials(input.tenantId);
  if (!credentials.accountSid || !credentials.authToken) throw new Error("Twilio Account SID/Auth Token are not configured in the credential vault or production environment.");
  const params = new URLSearchParams({
    From: input.from,
    To: input.to,
    Body: input.body,
    StatusCallback: input.statusCallback,
  });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${credentials.accountSid}:${credentials.authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof data?.message === "string" ? data.message : `HTTP ${response.status}`;
    throw new Error(`Twilio SMS rejected: ${detail}`);
  }
  return {
    sid: String(data.sid || ""),
    status: String(data.status || "accepted"),
  };
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

export async function createPhoneDispositionTask(input: {
  tenantId?: string;
  conversationId: string;
  disposition: string;
  ownerRoleKey: string;
  priority: string;
  dueIn: string;
  nextAction: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const call = (await query<{ patientId: string | null; appointmentId: string | null; aiIntent: string | null; callerName: string | null; callerNumber: string | null }>(
    `select "patientId", "appointmentId", "aiIntent", "callerName", "callerNumber"
     from "PhoneConversation"
     where "tenantId" = $1 and "id" = $2`,
    [tenantId, input.conversationId],
  )).rows[0];
  if (!call) return;
  const disposition = input.disposition.trim() || "GENERAL_PHONE_DISPOSITION";
  const nextAction = input.nextAction.trim() || "Review call disposition and complete the patient follow-up.";
  const ownerRoleKey = input.ownerRoleKey || "front_desk";
  const priority = input.priority || "NORMAL";
  const dueIn = input.dueIn || "4 hours";
  const title = `Phone disposition: ${cleanTaskTitle(disposition)}${call.aiIntent ? ` (${cleanTaskTitle(call.aiIntent)})` : ""}`;
  await query(
    `insert into "PhoneCallTask" ("id", "tenantId", "conversationId", "patientId", "taskType", "priority", "status", "dueAt", "ownerRoleKey", "nextAction", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, 'OPEN', current_timestamp + ($7::text)::interval, $8, $9, current_timestamp)`,
    [newId("ptask"), tenantId, input.conversationId, call.patientId, disposition, priority, dueIn, ownerRoleKey, nextAction],
  );
  if (call.patientId) {
    await query(
      `insert into "PmsTask" ("id", "tenantId", "patientId", "appointmentId", "ownerRoleKey", "title", "taskType", "priority", "dueAt", "updatedAt")
       values ($1, $2, $3, $4, $5, $6, $7, $8, current_timestamp + ($9::text)::interval, current_timestamp)`,
      [newId("task"), tenantId, call.patientId, call.appointmentId, ownerRoleKey, title, disposition, priority, dueIn],
    );
  }
  await query(
    `update "PhoneConversation"
     set "followUpStatus" = 'DISPOSITION_TASK_CREATED',
       "outcome" = $3,
       "updatedAt" = current_timestamp
     where "tenantId" = $1 and "id" = $2`,
    [tenantId, input.conversationId, disposition],
  );
  await addAudit(tenantId, ownerRoleKey, "PHONE_DISPOSITION_TASK_CREATED", "PhoneConversation", input.conversationId, "ALLOWED", {
    disposition,
    priority,
    dueIn,
    pmsTaskCreated: Boolean(call.patientId),
    callerNumber: call.callerNumber,
    semantics: "Internal PhoneCallTask and PMS task writeback only; no carrier call action was sent.",
  });
}

function cleanTaskTitle(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
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
  const readiness = await query<{ missing: string[]; activeCallProviderId: string | null; providerConferenceId: string | null; providerConferenceName: string | null; bridgeCallSid: string | null; callControlMode: string | null; fromNumber: string | null; toNumber: string | null }>(
    `select array_remove(array[
       case when not exists (select 1 from "PhoneNumber" where "tenantId" = $1 and "voiceStatus" = 'ACTIVE' and "status" = 'ACTIVE') then 'active voice number' end
     ], null) as missing,
     ac."providerCallId" as "activeCallProviderId",
     ac."providerConferenceId",
     ac."providerConferenceName",
     ac."bridgeCallSid",
     ac."callControlMode",
     ac."fromNumber",
     ac."toNumber"
     from "PhoneActiveCall" ac
     where ac."tenantId" = $1 and ac."id" = $2
     union all
     select array['active call leg']::text[] as missing, null, null, null, null, null, null, null
     where not exists (select 1 from "PhoneActiveCall" where "tenantId" = $1 and "id" = $2)
     limit 1`,
    [tenantId, input.activeCallId || null],
  );
  const actionType = input.actionType || "OUTBOUND_DIAL";
  const activeCall = readiness.rows[0];
  const twilioCredentials = await getTwilioCredentials(tenantId);
  const missing = [
    !twilioCredentials.accountSid || !twilioCredentials.authToken ? "Twilio Account SID/Auth Token in credential vault or environment" : null,
    ...(readiness.rows[0]?.missing ?? []),
    ...missingCallControlRequirements(actionType, {
      activeCallId: input.activeCallId,
      providerCallId: activeCall?.activeCallProviderId,
      providerConferenceName: activeCall?.providerConferenceName,
      targetExtensionId: input.targetExtensionId,
      targetNumber: input.targetNumber,
      targetParkSlot: input.targetParkSlot,
    }),
  ];
  let providerStatus = missing.length ? "BLOCKED_CONNECTOR_REQUIRED" : "READY_FOR_PROVIDER";
  let blockedReason = missing.length
    ? `Live call control is blocked until ${missing.join(", ")} are configured. Internal work item was recorded; no fake call action was sent.`
    : null;
  let resultSummary = missing.length ? `${actionType} blocked before provider call.` : `${actionType} ready for Twilio execution.`;
  let providerRequest: Record<string, unknown> | null = null;
  let providerResponse: Record<string, unknown> | null = null;
  let executedAt: Date | null = null;

  if (!missing.length && activeCall?.activeCallProviderId) {
    const execution = await executeTwilioCallControl({
      tenantId,
      actionType,
      activeCallProviderId: activeCall.activeCallProviderId,
      providerConferenceId: activeCall.providerConferenceId,
      providerConferenceName: activeCall.providerConferenceName,
      targetNumber: input.targetNumber,
      targetParkSlot: input.targetParkSlot,
      fromNumber: activeCall.toNumber || activeCall.fromNumber || "",
      conversationId: input.conversationId || "",
    });
    providerStatus = execution.providerStatus;
    blockedReason = execution.ok ? null : execution.error ?? "Twilio provider execution failed.";
    resultSummary = execution.summary;
    providerRequest = execution.providerRequest;
    providerResponse = execution.providerResponse;
    executedAt = execution.ok ? new Date() : null;
  }
  await query(
    `insert into "PhoneCallControlAction"
       ("id", "tenantId", "activeCallId", "conversationId", "actionType", "requestedByRole", "targetExtensionId", "targetNumber", "targetParkSlot", "providerStatus", "blockedReason", "resultSummary", "providerRequest", "providerResponse", "executedAt", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15, current_timestamp)`,
    [id, tenantId, input.activeCallId || null, input.conversationId || null, actionType, input.requestedByRole || "front_desk", input.targetExtensionId || null, input.targetNumber || null, input.targetParkSlot || null, providerStatus, blockedReason, resultSummary, providerRequest ? JSON.stringify(providerRequest) : null, providerResponse ? JSON.stringify(providerResponse) : null, executedAt],
  );
  await addAudit(tenantId, input.requestedByRole || "front_desk", "PHONE_CALL_CONTROL_EXECUTION", "PhoneCallControlAction", id, providerStatus === "PROVIDER_ACCEPTED" ? "ALLOWED" : "BLOCKED", { actionType, providerStatus, missingReadiness: missing, providerRequest, providerResponse });
  return { id, providerStatus, blockedReason, resultSummary };
}

function missingCallControlRequirements(actionType: string, input: { activeCallId?: string; providerCallId?: string | null; providerConferenceName?: string | null; targetExtensionId?: string; targetNumber?: string; targetParkSlot?: string }) {
  const needsActiveCall = new Set(["ANSWER", "HOLD", "RESUME", "WARM_TRANSFER", "BLIND_TRANSFER", "CALL_PARK", "SEND_TO_VOICEMAIL", "END_CALL", "AI_VOICE_TAKEOVER"]);
  const missing = [
    needsActiveCall.has(actionType) && !input.activeCallId ? "active call leg" : null,
    needsActiveCall.has(actionType) && input.activeCallId && !input.providerCallId ? "provider call identifier from webhook" : null,
    ["HOLD", "RESUME", "WARM_TRANSFER", "CALL_PARK", "PICKUP_PARK"].includes(actionType) && !input.providerConferenceName ? "Twilio conference call-control mode" : null,
    ["WARM_TRANSFER", "BLIND_TRANSFER"].includes(actionType) && !input.targetNumber && !input.targetExtensionId ? "target phone number or extension" : null,
    actionType === "OUTBOUND_DIAL" && !input.targetNumber ? "target phone number" : null,
    ["CALL_PARK", "PICKUP_PARK"].includes(actionType) && !input.targetParkSlot ? "park slot" : null,
  ].filter(Boolean) as string[];
  return missing as string[];
}

async function executeTwilioCallControl(input: {
  tenantId: string;
  actionType: string;
  activeCallProviderId: string;
  providerConferenceId?: string | null;
  providerConferenceName?: string | null;
  targetNumber?: string;
  targetParkSlot?: string;
  fromNumber: string;
  conversationId: string;
}) {
  const origin = process.env.ONE_DENTAL_PUBLIC_APP_URL || "https://app.1dentalai.com";
  const providerRequest: Record<string, unknown> = { provider: "TWILIO", actionType: input.actionType, callSid: input.activeCallProviderId };
  const conferenceSid = input.providerConferenceId || (input.providerConferenceName ? await findTwilioConferenceSid({ tenantId: input.tenantId, friendlyName: input.providerConferenceName }) : null);
  if (conferenceSid && input.providerConferenceName) {
    await query(
      `update "PhoneActiveCall" set "providerConferenceId" = $3, "updatedAt" = current_timestamp where "tenantId" = $1 and "conversationId" = $2`,
      [input.tenantId, input.conversationId || null, conferenceSid],
    );
  }
  let result;
  if (input.actionType === "END_CALL") {
    providerRequest.operation = "Calls.update(Status=completed)";
    result = await updateTwilioCall({ tenantId: input.tenantId, callSid: input.activeCallProviderId, status: "completed" });
  } else if (input.actionType === "SEND_TO_VOICEMAIL") {
    providerRequest.operation = "Calls.update(Twiml=Record)";
    result = await updateTwilioCall({
      tenantId: input.tenantId,
      callSid: input.activeCallProviderId,
      twiml: `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">Please leave a message after the tone and a team member will follow up.</Say><Record maxLength="180" playBeep="true" recordingStatusCallback="${twilioXmlEscape(origin)}/api/twilio/voice/recording" recordingStatusCallbackMethod="POST" transcribe="true" transcribeCallback="${twilioXmlEscape(origin)}/api/twilio/voice/transcription" /></Response>`,
    });
  } else if (input.actionType === "HOLD" || input.actionType === "CALL_PARK") {
    if (!conferenceSid) return blockedTwilioExecution("Twilio conference is not active yet; cannot hold or park this call.", providerRequest);
    providerRequest.operation = "ConferenceParticipant.update(Hold=true)";
    result = await updateTwilioConferenceParticipant({
      tenantId: input.tenantId,
      conferenceSid,
      callSid: input.activeCallProviderId,
      hold: true,
      holdUrl: "http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical",
    });
  } else if (input.actionType === "RESUME" || input.actionType === "PICKUP_PARK") {
    if (!conferenceSid) return blockedTwilioExecution("Twilio conference is not active yet; cannot resume this call.", providerRequest);
    providerRequest.operation = "ConferenceParticipant.update(Hold=false)";
    result = await updateTwilioConferenceParticipant({ tenantId: input.tenantId, conferenceSid, callSid: input.activeCallProviderId, hold: false });
  } else if (input.actionType === "WARM_TRANSFER" || input.actionType === "BLIND_TRANSFER") {
    if (!conferenceSid || !input.providerConferenceName) return blockedTwilioExecution("Twilio conference is not active yet; cannot transfer this call.", providerRequest);
    if (!input.targetNumber) return blockedTwilioExecution("Target phone number is required for Twilio transfer execution.", providerRequest);
    providerRequest.operation = "Calls.create(target joins conference)";
    providerRequest.targetNumber = input.targetNumber;
    result = await createTwilioCall({
      tenantId: input.tenantId,
      from: input.fromNumber,
      to: input.targetNumber,
      statusCallback: `${origin}/api/twilio/voice/status`,
      twiml: `<?xml version="1.0" encoding="UTF-8"?><Response><Dial><Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="${input.actionType === "BLIND_TRANSFER" ? "true" : "false"}">${twilioXmlEscape(input.providerConferenceName)}</Conference></Dial></Response>`,
    });
  } else if (input.actionType === "AI_VOICE_TAKEOVER") {
    providerRequest.operation = "Calls.update(Twiml=Voice AI Redirect)";
    result = await redirectLiveCallToVoiceAi({
      tenantId: input.tenantId,
      callSid: input.activeCallProviderId,
      conversationId: input.conversationId,
      scenario: "inbound_takeover",
    });
  } else {
    return blockedTwilioExecution(`${input.actionType} is not mapped to a Twilio provider operation yet.`, providerRequest);
  }
  return {
    ok: result.ok,
    providerStatus: result.providerStatus,
    error: result.error,
    summary: result.ok ? `${input.actionType} accepted by Twilio. Provider status ${result.status}.` : `${input.actionType} was rejected by Twilio: ${result.error}`,
    providerRequest,
    providerResponse: result.data ?? { sid: result.sid, status: result.status, error: result.error },
  };
}

function blockedTwilioExecution(reason: string, providerRequest: Record<string, unknown>) {
  return {
    ok: false,
    providerStatus: "BLOCKED_CONNECTOR_REQUIRED",
    error: reason,
    summary: reason,
    providerRequest,
    providerResponse: { blockedReason: reason },
  };
}

export async function updatePhoneDeviceStatus(id: string, provisioningStatus: string, registrationStatus: string, macAddress?: string, sipUsername?: string, assignedTo?: string, deskLocation?: string) {
  const result = await query<{ tenantId: string }>(
    `update "PhoneDevice"
     set "provisioningStatus" = $2,
       "registrationStatus" = $3,
       "macAddress" = nullif($4, ''),
       "sipUsername" = nullif($5, ''),
       "assignedTo" = nullif($6, ''),
       "deskLocation" = nullif($7, ''),
       "lastSeenAt" = case when $3 = 'ONLINE' then current_timestamp else "lastSeenAt" end,
       "updatedAt" = current_timestamp
     where "id" = $1
     returning "tenantId"`,
    [id, provisioningStatus, registrationStatus, macAddress || "", sipUsername || "", assignedTo || "", deskLocation || ""],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, "practice_manager", "PHONE_DEVICE_STATUS_UPDATED", "PhoneDevice", id, "ALLOWED", { provisioningStatus, registrationStatus, macAddress: macAddress || null, sipUsername: sipUsername || null });
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

export async function updatePhoneProviderStatus(id: string, status: string, credentialStatus: string, webhookStatus: string, e911Status?: string, trunkDomain?: string, outboundCallerId?: string, nextAction?: string) {
  const result = await query<{ tenantId: string }>(
    `update "PhoneProviderConnection"
     set "status" = $2,
       "credentialStatus" = $3,
       "webhookStatus" = $4,
       "e911Status" = coalesce(nullif($5, ''), "e911Status"),
       "trunkDomain" = nullif($6, ''),
       "outboundCallerId" = nullif($7, ''),
       "nextAction" = coalesce(nullif($8, ''), "nextAction"),
       "lastSmokeTestAt" = case when $2 = 'ACTIVE' and $3 = 'VALIDATED' and $4 = 'VERIFIED' then current_timestamp else "lastSmokeTestAt" end,
       "updatedAt" = current_timestamp
     where "id" = $1
     returning "tenantId"`,
    [id, status, credentialStatus, webhookStatus, e911Status || "", trunkDomain || "", outboundCallerId || "", nextAction || ""],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, "practice_manager", "PHONE_PROVIDER_STATUS_UPDATED", "PhoneProviderConnection", id, "ALLOWED", { status, credentialStatus, webhookStatus, e911Status, trunkDomain, outboundCallerId });
}

export async function updatePhoneVoicemailStatus(id: string, status: string) {
  const result = await query<{ tenantId: string }>(
    `update "PhoneVoicemail" set "status" = $2, "updatedAt" = current_timestamp where "id" = $1 returning "tenantId"`,
    [id, status],
  );
  if (result.rows[0]) await addAudit(result.rows[0].tenantId, "front_desk", "PHONE_VOICEMAIL_STATUS_UPDATED", "PhoneVoicemail", id, "ALLOWED", { status });
}

export async function getReputationOperatingCenter(tenantId = defaultTenantId) {
  const [completedVisitEligibility, reviews, surveys, recoveryCases, listings, listingIssueQueue, responses, campaignRules, referralRequests, metrics, patients] = await Promise.all([
    query(
      `select
        a."id" as "appointmentId",
        a."startsAt",
        a."appointmentType",
        a."readinessStatus",
        p."id" as "patientId",
        p."firstName",
        p."lastName",
        p."chartNumber",
        pr."displayName" as "providerName",
        l."name" as "locationName",
        coalesce(holds."openRecovery", 0)::int as "openRecovery",
        coalesce(holds."optedOut", 0)::int as "optedOut",
        coalesce(holds."verifiedConsent", 0)::int as "verifiedConsent",
        coalesce(holds."billingDispute", 0)::int as "billingDispute",
        coalesce(holds."unsignedClinicalNotes", 0)::int as "unsignedClinicalNotes",
        survey."id" as "surveyId",
        survey."status" as "surveyStatus",
        survey."score" as "surveyScore",
        survey."nps" as "surveyNps",
        survey."recoveryRequired" as "surveyRecoveryRequired",
        workflow."id" as "reviewWorkflowId",
        workflow."requestStatus" as "reviewRequestStatus",
        workflow."reviewSite",
        case
          when coalesce(holds."openRecovery", 0) > 0 then 'SERVICE_RECOVERY_SUPPRESSION'
          when coalesce(holds."optedOut", 0) > 0 then 'CONSENT_SUPPRESSION'
          when coalesce(holds."verifiedConsent", 0) = 0 then 'CONSENT_NEEDED'
          when coalesce(holds."billingDispute", 0) > 0 then 'BILLING_SUPPRESSION'
          when coalesce(holds."unsignedClinicalNotes", 0) > 0 then 'CLINICAL_SIGNOFF_NEEDED'
          when survey."id" is null then 'SEND_PRIVATE_SURVEY'
          when survey."recoveryRequired" = true or coalesce(survey."score", 0) < 8 then 'SERVICE_RECOVERY_SUPPRESSION'
          when workflow."id" is null then 'READY_FOR_PUBLIC_REVIEW_REQUEST'
          when workflow."requestStatus" like 'BLOCKED%' then 'WORKFLOW_BLOCKED'
          else 'WORKFLOW_ACTIVE'
        end as "route",
        case
          when coalesce(holds."openRecovery", 0) > 0 then 'Open recovery case suppresses any public review ask.'
          when coalesce(holds."optedOut", 0) > 0 then 'Patient opted out of this channel.'
          when coalesce(holds."verifiedConsent", 0) = 0 then 'Channel consent must be verified before survey or review routing.'
          when coalesce(holds."billingDispute", 0) > 0 then 'Billing sensitivity must clear before reputation outreach.'
          when coalesce(holds."unsignedClinicalNotes", 0) > 0 then 'Clinical note must be signed before reputation outreach.'
          when survey."id" is null then 'Route to private survey first; public review ask is not eligible yet.'
          when survey."recoveryRequired" = true or coalesce(survey."score", 0) < 8 then 'Low/private feedback routes to service recovery, not public review.'
          when workflow."id" is null then 'Completed visit, consent, and positive private survey are clear for request staging.'
          when workflow."requestStatus" like 'BLOCKED%' then coalesce(workflow."blockedReason", 'Existing workflow is blocked.')
          else 'Existing review workflow is already active.'
        end as "routeReason"
       from "PmsAppointment" a
       join "PmsPatient" p on p."id" = a."patientId"
       left join "PmsProvider" pr on pr."id" = a."providerId"
       left join "PmsOperatory" op on op."id" = a."operatoryId"
       left join "Location" l on l."id" = op."locationId"
       left join lateral (
         select
           (select count(*) from "ReputationRecoveryCase" c where c."tenantId" = $1 and c."patientId" = a."patientId" and c."status" not in ('COMPLETED','CLOSED')) as "openRecovery",
           (select count(*) from "PmsPatientCommunicationPreference" cp where cp."patientId" = a."patientId" and cp."channel" in ('SMS','EMAIL') and cp."consentStatus" in ('OPTED_OUT','DO_NOT_CONTACT')) as "optedOut",
           (select count(*) from "PmsPatientCommunicationPreference" cp where cp."patientId" = a."patientId" and cp."channel" in ('SMS','EMAIL') and cp."consentStatus" in ('VERIFIED','CONSENTED','OPTED_IN','ACTIVE')) as "verifiedConsent",
           (select count(*) from "PmsClaim" cl where cl."tenantId" = $1 and cl."patientId" = a."patientId" and cl."patientDueCents" > 0 and cl."status" in ('NEEDS_REVIEW','DENIED','PARTIAL','OPEN')) as "billingDispute",
           (select count(*) from "PmsClinicalNote" cn where cn."patientId" = a."patientId" and cn."status" <> 'SIGNED' and cn."signedAt" is null and cn."createdAt" >= a."startsAt" - interval '1 day') as "unsignedClinicalNotes"
       ) holds on true
       left join lateral (
         select "id", "status", "score", "nps", "recoveryRequired"
         from "PatientSurvey"
         where "tenantId" = $1 and "patientId" = a."patientId" and ("appointmentId" = a."id" or "sourceObjectId" = a."id")
         order by "createdAt" desc
         limit 1
       ) survey on true
       left join lateral (
         select "id", "requestStatus", "reviewSite", "blockedReason"
         from "ReputationReviewWorkflow"
         where "tenantId" = $1 and "patientId" = a."patientId" and ("appointmentId" = a."id" or "createdAt" >= a."startsAt")
         order by "createdAt" desc
         limit 1
       ) workflow on true
       where a."tenantId" = $1 and a."status" = 'COMPLETED' and a."patientId" is not null
       order by a."startsAt" desc
       limit 24`,
      [tenantId],
    ),
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
      `select t.*, l."name" as "locationName", lp."platform", lp."syncStatus" as "listingSyncStatus", lp."napConsistencyStatus", lp."dataQualityScore" as "listingDataQualityScore"
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
      `select rr.*, rw."reviewSite", rw."rating", rw."publicReviewText", p."firstName", p."lastName", p."chartNumber",
        case
          when rr."draftBody" ~* '(diagnos|tooth|procedure|insurance|claim|balance|medication|x-ray|appointment|chart)' then 'HIPAA_REVIEW_REQUIRED'
          when rr."draftBody" ~* '(sorry|contact|directly|offline|manager|team)' then 'SAFE_SERVICE_RECOVERY_TEMPLATE'
          else 'NEEDS_HUMAN_REVIEW'
        end as "guardrailStatus"
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
      `select rr.*, p."firstName", p."lastName", p."chartNumber",
        rw."reviewSite" as "sourceReviewSite", rw."rating" as "sourceReviewRating", rw."sentiment" as "sourceReviewSentiment",
        coalesce(surveySignals."positiveSurveyCount", 0)::int as "positiveSurveyCount",
        coalesce(treatmentSignals."completedTreatmentCount", 0)::int as "completedTreatmentCount"
       from "ReputationReferralRequest" rr
       left join "PmsPatient" p on p."id" = rr."patientId"
       left join "ReputationReviewWorkflow" rw on rw."id" = rr."sourceReviewId"
       left join lateral (
         select count(*) as "positiveSurveyCount"
         from "PatientSurvey" s
         where s."tenantId" = rr."tenantId" and s."patientId" = rr."patientId" and s."score" >= 8 and s."recoveryRequired" = false
       ) surveySignals on true
       left join lateral (
         select count(*) as "completedTreatmentCount"
         from "PmsProcedureLog" pl
         where pl."patientId" = rr."patientId" and pl."status" = 'COMPLETED'
       ) treatmentSignals on true
       where rr."tenantId" = $1
       order by case rr."status" when 'READY_FOR_APPROVAL' then 0 when 'BLOCKED_TREATMENT_NOT_COMPLETE' then 1 else 2 end, rr."dueAt" asc nulls last`,
      [tenantId],
    ),
    query<{ readyRequests: string; blockedRequests: string; lowSurveys: string; responseDrafts: string; listingIssues: string; openRecovery: string; referralReady: string; reviewVolume: string; averageRating: string; surveyRouting: string; publicAskReady: string; responseConnectorBlocked: string }>(
      `select
        (select count(*) from "ReputationReviewWorkflow" where "tenantId" = $1 and "requestStatus" = 'READY_FOR_APPROVAL')::text as "readyRequests",
        (select count(*) from "ReputationReviewWorkflow" where "tenantId" = $1 and "requestStatus" like 'BLOCKED%')::text as "blockedRequests",
        (select count(*) from "PatientSurvey" where "tenantId" = $1 and "recoveryRequired" = true)::text as "lowSurveys",
        (select count(*) from "ReputationReviewResponse" where "tenantId" = $1 and "approvalStatus" = 'NEEDS_REVIEW')::text as "responseDrafts",
        (select count(*) from "ReputationListingProfile" where "tenantId" = $1 and "syncStatus" in ('DATA_MISMATCH','NEEDS_CONNECTION','SYNC_ERROR'))::text as "listingIssues",
        (select count(*) from "ReputationRecoveryCase" where "tenantId" = $1 and "status" not in ('COMPLETED','CLOSED'))::text as "openRecovery",
        (select count(*) from "ReputationReferralRequest" where "tenantId" = $1 and "status" = 'READY_FOR_APPROVAL')::text as "referralReady",
        (select coalesce(sum("reviewCount"), 0) from "ReputationListingProfile" where "tenantId" = $1)::text as "reviewVolume",
        (select coalesce(round(avg("rating")::numeric, 2), 0) from "ReputationListingProfile" where "tenantId" = $1 and "rating" is not null)::text as "averageRating",
        (select count(*) from "PatientSurvey" where "tenantId" = $1 and "status" in ('DRAFT','READY_FOR_APPROVAL') and "surveyType" like '%POST_VISIT%')::text as "surveyRouting",
        (select count(*) from "ReputationReviewWorkflow" where "tenantId" = $1 and "requestStatus" = 'READY_FOR_APPROVAL' and "privateSurveyRequired" = false and cardinality("suppressionReasons") = 0)::text as "publicAskReady",
        (select count(*) from "ReputationReviewResponse" where "tenantId" = $1 and "publicationStatus" = 'BLOCKED_CONNECTOR_REQUIRED')::text as "responseConnectorBlocked"`,
      [tenantId],
    ),
    listPatientOptions(tenantId),
  ]);
  return {
    completedVisitEligibility: completedVisitEligibility.rows,
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
  const needsPrivateSurvey = Boolean(input.patientId && !privateSurveyPassed);
  const hasServiceRecoveryHold =
    Number(row?.openRecovery ?? 0) > 0 ||
    Number(row?.clinicalIncident ?? 0) > 0 ||
    row?.privateSurveyRecoveryRequired === true;
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
  const requestStatus = hasServiceRecoveryHold ? "BLOCKED_SERVICE_RECOVERY" : needsPrivateSurvey ? "BLOCKED_PRIVATE_SURVEY" : blockedReasons.length ? "BLOCKED_ELIGIBILITY" : "READY_FOR_APPROVAL";
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
    route: hasServiceRecoveryHold ? "service recovery suppression" : needsPrivateSurvey ? "private survey before public review" : blockedReasons.length ? "blocked eligibility" : "public review request approval queue",
  };
  let routedSurveyId = row?.privateSurveyId;
  if (input.patientId && needsPrivateSurvey && row?.completedAppointmentId && !row?.privateSurveyId) {
    routedSurveyId = newId("survey");
    await query(
      `insert into "PatientSurvey"
         ("id", "tenantId", "patientId", "appointmentId", "surveyType", "status", "ownerRoleKey", "connectorStatus", "blockedReason", "sourceObjectType", "sourceObjectId", "dueAt", "updatedAt")
       values ($1, $2, $3, $4, 'POST_VISIT_CSAT', 'READY_FOR_APPROVAL', 'marketing_growth', 'CONNECTOR_REQUIRED', $5, 'PmsAppointment', $4, current_timestamp + interval '4 hours', current_timestamp)
       on conflict ("id") do nothing`,
      [
        routedSurveyId,
        tenantId,
        input.patientId,
        row.completedAppointmentId,
        Number(row?.verifiedConsent ?? 0) === 0
          ? "Private survey is staged but cannot be sent until channel consent and connector readiness are verified."
          : "Private survey must be completed before any public review request is approved.",
      ],
    );
    await addAudit(tenantId, "marketing_growth", "PRIVATE_SURVEY_ROUTED_BEFORE_REVIEW", "PatientSurvey", routedSurveyId, "ALLOWED", {
      patientId: input.patientId,
      appointmentId: row.completedAppointmentId,
      reviewWorkflowId: id,
    });
  }
  if (routedSurveyId && !eligibilitySummary.privateSurvey.surveyId) {
    eligibilitySummary.privateSurvey.surveyId = routedSurveyId;
    eligibilitySummary.privateSurvey.status = needsPrivateSurvey ? "READY_FOR_APPROVAL" : eligibilitySummary.privateSurvey.status;
  }
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
         when $2 in ('APPROVED_STAGED','READY_FOR_APPROVAL') and exists (
           select 1 from "ReputationRecoveryCase" c
           where c."tenantId" = "ReputationReviewWorkflow"."tenantId"
             and c."patientId" = "ReputationReviewWorkflow"."patientId"
             and c."status" not in ('COMPLETED','CLOSED')
         ) then 'BLOCKED_SERVICE_RECOVERY'
         when $2 = 'APPROVED_STAGED' and "patientId" is not null and not exists (
           select 1 from "PmsAppointment" a
           where a."tenantId" = "ReputationReviewWorkflow"."tenantId"
             and a."patientId" = "ReputationReviewWorkflow"."patientId"
             and a."status" = 'COMPLETED'
             and ("ReputationReviewWorkflow"."appointmentId" is null or a."id" = "ReputationReviewWorkflow"."appointmentId")
         ) then 'BLOCKED_ELIGIBILITY'
         when $2 = 'APPROVED_STAGED' and "patientId" is not null and not exists (
           select 1 from "PatientSurvey" s
           where s."tenantId" = "ReputationReviewWorkflow"."tenantId"
             and s."patientId" = "ReputationReviewWorkflow"."patientId"
             and s."status" in ('RECEIVED','COMPLETED','APPROVED')
             and s."score" >= 8
             and s."recoveryRequired" = false
             and ("ReputationReviewWorkflow"."appointmentId" is null or s."appointmentId" = "ReputationReviewWorkflow"."appointmentId" or s."sourceObjectId" = "ReputationReviewWorkflow"."appointmentId")
         ) then 'BLOCKED_PRIVATE_SURVEY'
         when $2 in ('APPROVED_STAGED','READY_FOR_APPROVAL') and "recoveryStatus" in ('REQUIRED','OPEN') then 'BLOCKED_SERVICE_RECOVERY'
         when $2 = 'APPROVED_STAGED' and "privateSurveyRequired" = true then 'BLOCKED_PRIVATE_SURVEY'
         when $2 = 'APPROVED_STAGED' and cardinality("suppressionReasons") > 0 then 'BLOCKED_ELIGIBILITY'
         else $2
       end,
       "connectorStatus" = case
         when $2 = 'APPROVED_STAGED'
           and "privateSurveyRequired" = false
           and "recoveryStatus" not in ('REQUIRED','OPEN')
           and cardinality("suppressionReasons") = 0
           and not exists (
             select 1 from "ReputationRecoveryCase" c
             where c."tenantId" = "ReputationReviewWorkflow"."tenantId"
               and c."patientId" = "ReputationReviewWorkflow"."patientId"
               and c."status" not in ('COMPLETED','CLOSED')
           )
           and ("patientId" is null or exists (
             select 1 from "PatientSurvey" s
             where s."tenantId" = "ReputationReviewWorkflow"."tenantId"
               and s."patientId" = "ReputationReviewWorkflow"."patientId"
               and s."status" in ('RECEIVED','COMPLETED','APPROVED')
               and s."score" >= 8
               and s."recoveryRequired" = false
               and ("ReputationReviewWorkflow"."appointmentId" is null or s."appointmentId" = "ReputationReviewWorkflow"."appointmentId" or s."sourceObjectId" = "ReputationReviewWorkflow"."appointmentId")
           )) then 'READY_FOR_CONNECTOR'
         else "connectorStatus"
       end,
       "blockedReason" = case
         when $2 in ('APPROVED_STAGED','READY_FOR_APPROVAL') and exists (
           select 1 from "ReputationRecoveryCase" c
           where c."tenantId" = "ReputationReviewWorkflow"."tenantId"
             and c."patientId" = "ReputationReviewWorkflow"."patientId"
             and c."status" not in ('COMPLETED','CLOSED')
         ) then 'Service recovery must close before any public review request.'
         when $2 = 'APPROVED_STAGED' and "patientId" is not null and not exists (
           select 1 from "PmsAppointment" a
           where a."tenantId" = "ReputationReviewWorkflow"."tenantId"
             and a."patientId" = "ReputationReviewWorkflow"."patientId"
             and a."status" = 'COMPLETED'
             and ("ReputationReviewWorkflow"."appointmentId" is null or a."id" = "ReputationReviewWorkflow"."appointmentId")
         ) then 'Completed PMS visit is required before any public review request.'
         when $2 = 'APPROVED_STAGED' and "patientId" is not null and not exists (
           select 1 from "PatientSurvey" s
           where s."tenantId" = "ReputationReviewWorkflow"."tenantId"
             and s."patientId" = "ReputationReviewWorkflow"."patientId"
             and s."status" in ('RECEIVED','COMPLETED','APPROVED')
             and s."score" >= 8
             and s."recoveryRequired" = false
             and ("ReputationReviewWorkflow"."appointmentId" is null or s."appointmentId" = "ReputationReviewWorkflow"."appointmentId" or s."sourceObjectId" = "ReputationReviewWorkflow"."appointmentId")
         ) then 'Private survey must be completed with positive score before any public review request.'
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
    query<{ campaigns: string; landingPages: string; aiDrafts: string; attributedProduction: string; localSeoOpen: string; stagedChannels: string; approvalQueue: string; bookedAppointments: string; acceptedTreatment: string; aiSeoOpen: string }>(
      `select
        (select count(*) from "MarketingCampaign" where "tenantId" = $1)::text as campaigns,
        (select count(*) from "MarketingLandingPage" where "tenantId" = $1)::text as "landingPages",
        (select count(*) from "AiStudioAsset" where "tenantId" = $1 and "approvalStatus" = 'NEEDS_REVIEW')::text as "aiDrafts",
        (select coalesce(sum("attributedProductionCents"), 0) from "MarketingCampaign" where "tenantId" = $1)::text as "attributedProduction",
        (select count(*) from "MarketingLocalSeoTask" where "tenantId" = $1 and "status" not in ('COMPLETED','CLOSED'))::text as "localSeoOpen",
        (select count(*) from "MarketingCampaign" where "tenantId" = $1 and "status" in ('READY_FOR_APPROVAL','APPROVED_STAGED','ACTIVE_INTERNAL'))::text as "stagedChannels",
        (
          (select count(*) from "MarketingCampaign" where "tenantId" = $1 and "status" in ('READY_FOR_APPROVAL','APPROVED_STAGED')) +
          (select count(*) from "MarketingLandingPage" where "tenantId" = $1 and "status" in ('READY_FOR_APPROVAL','APPROVED_STAGED')) +
          (select count(*) from "AiStudioAsset" where "tenantId" = $1 and "approvalStatus" in ('NEEDS_REVIEW','REVISION_REQUIRED')) +
          (select count(*) from "MarketingLocalSeoTask" where "tenantId" = $1 and "status" in ('READY_FOR_APPROVAL','APPROVED_STAGED','BLOCKED_CONNECTOR_REQUIRED'))
        )::text as "approvalQueue",
        (select coalesce(sum("attributedBookings"), 0) from "MarketingCampaign" where "tenantId" = $1)::text as "bookedAppointments",
        (select coalesce(sum(coalesce(("attribution"->>'acceptedTreatmentCents')::int, 0)), 0) from "MarketingCampaign" where "tenantId" = $1)::text as "acceptedTreatment",
        (select count(*) from "MarketingLocalSeoTask" where "tenantId" = $1 and "status" not in ('COMPLETED','CLOSED') and "taskType" in ('AI_SEO','SCHEMA','LOCATION_PAGE','GBP_POST'))::text as "aiSeoOpen"`,
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
  const selectedChannels = channels.length ? channels : defaultMarketingChannels(input.campaignType);
  const sourceAudience = marketingSourceAudience(input.campaignType);
  const estimatedAudience = await estimateMarketingAudience(tenantId, input.campaignType);
  const audienceBlueprint = marketingAudienceBlueprint(input.campaignType);
  const channelPlan = {
    channels: selectedChannels,
    sourceAudience,
    audienceBlueprint,
    pmsRcmReputationAudienceBuilder: {
      pms: audienceBlueprint.pms,
      rcm: audienceBlueprint.rcm,
      reputation: audienceBlueprint.reputation,
      suppressions: ["no verified consent", "channel opt-out", "quiet hours", "service recovery hold", "unresolved billing dispute", "recent duplicate outreach"],
      refreshCadence: "Recount from PMS/RCM/reputation graph before each approval review",
    },
    approvalWorkflow: marketingApprovalPolicy(input.campaignType),
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
      selectedChannels,
      input.aiStudioBrief || null,
      sourceAudience,
      JSON.stringify(channelPlan),
      JSON.stringify(marketingConnectorReadiness(selectedChannels, Boolean(input.landingPageId))),
      JSON.stringify(marketingAttributionPlan(input.campaignType, input.landingPageId)),
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
  if (["LOCAL_SEO", "AI_SEO"].includes(campaignType)) return { pms: "location, provider, service-line, booking availability, and treatment-plan context", rcm: "high-value procedure and insurance/financing signals", reputation: "review themes, listing gaps, service recovery holds, and testimonial eligibility" };
  return { pms: "appointment, patient, and treatment context", rcm: "balance and payer sensitivity", reputation: "review, survey, referral, and service recovery context" };
}

function defaultMarketingChannels(campaignType: string) {
  if (campaignType === "BALANCE_FOLLOW_UP") return ["EMAIL", "PHONE"];
  if (["LOCAL_SEO", "AI_SEO"].includes(campaignType)) return ["LANDING_PAGE", "GBP_POST", "AI_SEARCH_CONTENT"];
  if (["REFERRAL_GROWTH", "TESTIMONIALS"].includes(campaignType)) return ["EMAIL", "SMS", "PRIVATE_SURVEY"];
  return ["SMS", "EMAIL", "PHONE", "LANDING_PAGE"];
}

function marketingApprovalPolicy(campaignType: string) {
  const clinicalReviewRequired = ["IMPLANTS", "CLEAR_ALIGNERS", "WHITENING", "LOCAL_SEO", "AI_SEO"].includes(campaignType);
  return {
    requiredRoles: clinicalReviewRequired ? ["marketing_growth", "practice_manager", "provider"] : ["marketing_growth", "practice_manager"],
    evidence: ["audience count snapshot", "suppression report", "AI Studio draft approval", "connector readiness", "landing page route test", "attribution plan"],
    externalExecutionBlockedWithoutConnector: true,
    noFakeSendOrPublishing: true,
  };
}

function marketingConnectorReadiness(channels: string[], hasLandingPage: boolean) {
  return {
    sms: channels.includes("SMS") ? "CONNECTOR_REQUIRED" : "NOT_SELECTED",
    email: channels.includes("EMAIL") ? "CONNECTOR_REQUIRED" : "NOT_SELECTED",
    phone: channels.includes("PHONE") ? "CONNECTOR_REQUIRED" : "NOT_SELECTED",
    landingPage: hasLandingPage || channels.includes("LANDING_PAGE") ? "STAGED" : "NOT_SELECTED",
    aiVoice: channels.includes("AI_VOICE") ? "CONNECTOR_REQUIRED" : "NOT_SELECTED",
    gbp: channels.includes("GBP_POST") ? "CONNECTOR_REQUIRED" : "NOT_SELECTED",
    aiSearchContent: channels.includes("AI_SEARCH_CONTENT") ? "READY_FOR_APPROVAL" : "NOT_SELECTED",
  };
}

function marketingAttributionPlan(campaignType: string, landingPageId?: string) {
  return {
    bookedAppointments: 0,
    acceptedTreatmentCents: 0,
    productionCents: 0,
    collectionCents: 0,
    reviewOutcomes: 0,
    referralOutcomes: 0,
    firstTouch: landingPageId ? "landing page UTM or booking route" : "campaign audience snapshot",
    conversionEvents: ["lead form", "phone call", "online booking", "PMS appointment completed", "treatment accepted", "ledger production posted"],
    revenueSourceOfTruth: "PMS appointment, treatment plan, ledger, and claim/payment records",
    campaignType,
  };
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
