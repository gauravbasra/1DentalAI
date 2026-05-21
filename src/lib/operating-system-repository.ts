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
  const [items, claims, metrics] = await Promise.all([
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
      `select c.*, p."firstName", p."lastName", p."chartNumber"
       from "PmsClaim" c
       join "PmsPatient" p on p."id" = c."patientId"
       where c."tenantId" = $1
       order by c."lastStatusAt" desc nulls last`,
      [tenantId],
    ),
    query<{ openItems: string; highPriority: string; blockedDollars: string; leakageDollars: string }>(
      `select
        count(*) filter (where "status" not in ('COMPLETED','CLOSED'))::text as "openItems",
        count(*) filter (where "priority" = 'HIGH' and "status" not in ('COMPLETED','CLOSED'))::text as "highPriority",
        coalesce(sum("amountCents") filter (where "status" not in ('COMPLETED','CLOSED')), 0)::text as "blockedDollars",
        coalesce(sum("amountCents") filter (where "workType" = 'REVENUE_INTEGRITY' and "status" not in ('COMPLETED','CLOSED')), 0)::text as "leakageDollars"
       from "RcmWorkItem"
       where "tenantId" = $1`,
      [tenantId],
    ),
  ]);
  return { items: items.rows, claims: claims.rows, metrics: metrics.rows[0] };
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

export async function getPhoneOperatingCenter(tenantId = defaultTenantId) {
  const [conversations, metrics, patients] = await Promise.all([
    query(
      `select c.*, p."firstName", p."lastName", p."chartNumber", p."phone", p."email", a."appointmentType", a."startsAt"
       from "PhoneConversation" c
       left join "PmsPatient" p on p."id" = c."patientId"
       left join "PmsAppointment" a on a."id" = c."appointmentId"
       where c."tenantId" = $1
       order by c."startedAt" desc`,
      [tenantId],
    ),
    query<{ openCalls: string; missedCalls: string; needsReview: string; highIntent: string }>(
      `select
        count(*) filter (where "status" = 'OPEN')::text as "openCalls",
        count(*) filter (where "outcome" = 'MISSED_CALL')::text as "missedCalls",
        count(*) filter (where "followUpStatus" like '%REVIEW%' or "followUpStatus" like '%BLOCKED%')::text as "needsReview",
        count(*) filter (where "aiSentiment" = 'HIGH_INTENT')::text as "highIntent"
       from "PhoneConversation"
       where "tenantId" = $1`,
      [tenantId],
    ),
    listPatientOptions(tenantId),
  ]);
  return { conversations: conversations.rows, metrics: metrics.rows[0], patients };
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

export async function getReputationOperatingCenter(tenantId = defaultTenantId) {
  const [reviews, surveys, recoveryCases, metrics, patients] = await Promise.all([
    query(
      `select r.*, p."firstName", p."lastName", p."chartNumber", pr."displayName" as "providerName", l."name" as "locationName"
       from "ReputationReviewWorkflow" r
       left join "PmsPatient" p on p."id" = r."patientId"
       left join "PmsProvider" pr on pr."id" = r."providerId"
       left join "Location" l on l."id" = r."locationId"
       where r."tenantId" = $1
       order by r."dueAt" asc nulls last, r."createdAt" desc`,
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
    query<{ readyRequests: string; blockedRequests: string; lowSurveys: string; responseDrafts: string }>(
      `select
        (select count(*) from "ReputationReviewWorkflow" where "tenantId" = $1 and "requestStatus" = 'READY_FOR_APPROVAL')::text as "readyRequests",
        (select count(*) from "ReputationReviewWorkflow" where "tenantId" = $1 and "requestStatus" like 'BLOCKED%')::text as "blockedRequests",
        (select count(*) from "PatientSurvey" where "tenantId" = $1 and "recoveryRequired" = true)::text as "lowSurveys",
        (select count(*) from "AiStudioAsset" where "tenantId" = $1 and "sourceModule" = 'REPUTATION' and "approvalStatus" = 'NEEDS_REVIEW')::text as "responseDrafts"`,
      [tenantId],
    ),
    listPatientOptions(tenantId),
  ]);
  return { reviews: reviews.rows, surveys: surveys.rows, recoveryCases: recoveryCases.rows, metrics: metrics.rows[0], patients };
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
