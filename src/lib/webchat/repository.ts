import { createHash } from "node:crypto";
import { newId, query } from "@/lib/db";
import { defaultTenantId } from "@/lib/pms-repository";

export type WebchatAnalysis = {
  intent: string;
  sentiment: string;
  confidence: number;
  actionType?: string;
  actionStatus?: string;
};

type LeadCapture = {
  visitorName?: string;
  visitorPhone?: string;
  visitorEmail?: string;
  serviceLine?: string;
  preferredTime?: string;
  patientStatus?: string;
  urgency?: string;
  sourceChannel?: string;
  campaignSource?: string;
  referrerUrl?: string;
  landingPageSlug?: string;
  consentAccepted?: boolean;
  privacyNoticeVersion?: string;
};

type WebchatMessageRecord = {
  senderType: string;
  intent: string | null;
  sentiment: string | null;
  actionType: string | null;
  actionStatus: string;
  metadata: unknown;
};

type WebchatEventRecord = {
  eventType: string;
  payload: unknown;
};

export function analyzeMessage(message: string): WebchatAnalysis {
  const text = message.toLowerCase();
  if (/(book|appointment|schedule|available|availability|consult)/.test(text)) {
    return { intent: "SCHEDULE_APPOINTMENT", sentiment: "HIGH_INTENT", confidence: 82, actionType: "SCHEDULING_HANDOFF", actionStatus: "STAFF_APPROVAL_REQUIRED" };
  }
  if (/(reschedule|move my appointment|change appointment|cancel)/.test(text)) {
    return { intent: "RESCHEDULE_APPOINTMENT", sentiment: "NEEDS_HELP", confidence: 84, actionType: "RESCHEDULE_HANDOFF", actionStatus: "IDENTITY_CHECK_REQUIRED" };
  }
  if (/(price|cost|insurance|financing|payment|covered)/.test(text)) {
    return { intent: "INSURANCE_OR_PRICE", sentiment: "SHOPPING", confidence: 76, actionType: "RCM_OR_TREATMENT_COORDINATOR_HANDOFF", actionStatus: "NEEDS_STAFF_REVIEW" };
  }
  if (/(pain|swelling|broken|emergency|bleeding|trauma)/.test(text)) {
    return { intent: "EMERGENCY_TRIAGE", sentiment: "URGENT", confidence: 88, actionType: "EMERGENCY_HANDOFF", actionStatus: "STAFF_REVIEW_REQUIRED" };
  }
  return { intent: "GENERAL_QUESTION", sentiment: "NEUTRAL", confidence: 58, actionType: "KNOWLEDGE_RESPONSE", actionStatus: "ANSWERED_WITH_GUARDRAILS" };
}

export async function getWebchatSettings(tenantId = defaultTenantId) {
  const [settingsResult, readinessResult, leadFormsResult] = await Promise.all([
    query(
    `select *
     from "PatientEngagementChannelSetting"
     where "tenantId" = $1 and "channel" = 'WEB_CHAT'
     limit 1`,
    [tenantId],
    ),
    query<{
      readyKnowledgeChunks: string;
      reviewKnowledgeSources: string;
      readyLeadForms: string;
      connectorReady: string;
      schedulingReady: string;
    }>(
      `select
        (select count(*) from "PatientEngagementKnowledgeChunk" where "tenantId" = $1 and "status" = 'READY_FOR_RETRIEVAL')::text as "readyKnowledgeChunks",
        (select count(*) from "PatientEngagementKnowledgeSource" where "tenantId" = $1 and "status" = 'NEEDS_REVIEW')::text as "reviewKnowledgeSources",
        (select count(*) from "PatientEngagementLeadForm" where "tenantId" = $1 and "sourceChannel" = 'WEB_CHAT' and "status" in ('READY','READY_FOR_REVIEW'))::text as "readyLeadForms",
        (select count(*) from "PatientEngagementChannelSetting" where "tenantId" = $1 and "channel" = 'WEB_CHAT' and "connectorStatus" = 'READY')::text as "connectorReady",
        (select count(*) from "PatientEngagementSchedulingRule" where "tenantId" = $1 and "sourceChannel" = 'WEB_CHAT' and "pmsWritebackStatus" = 'READY')::text as "schedulingReady"`,
      [tenantId],
    ),
    query<{ id: string; name: string; serviceLine: string; fieldSchema: unknown; connectorStatus: string }>(
      `select "id", "name", "serviceLine", "fieldSchema", "connectorStatus"
       from "PatientEngagementLeadForm"
       where "tenantId" = $1 and "sourceChannel" = 'WEB_CHAT'
       order by case "status" when 'READY' then 0 when 'READY_FOR_REVIEW' then 1 else 2 end, "serviceLine", "name"`,
      [tenantId],
    ),
  ]);
  const settings = settingsResult.rows[0] ?? null;
  const readiness = readinessResult.rows[0];
  return {
    settings,
    readiness: {
      readyKnowledgeChunks: Number(readiness?.readyKnowledgeChunks ?? 0),
      reviewKnowledgeSources: Number(readiness?.reviewKnowledgeSources ?? 0),
      readyLeadForms: Number(readiness?.readyLeadForms ?? 0),
      connectorReady: Number(readiness?.connectorReady ?? 0) > 0,
      schedulingReady: Number(readiness?.schedulingReady ?? 0) > 0,
      externalSendsBlocked: Number(readiness?.connectorReady ?? 0) === 0,
      schedulingWritebackBlocked: Number(readiness?.schedulingReady ?? 0) === 0,
    },
    leadForms: leadFormsResult.rows,
  };
}

export async function createWebchatSession(input: {
  tenantId?: string;
  visitorName?: string;
  visitorPhone?: string;
  visitorEmail?: string;
  sourcePage?: string;
  serviceLine?: string;
  preferredTime?: string;
  patientStatus?: string;
  urgency?: string;
  sourceChannel?: string;
  campaignSource?: string;
  referrerUrl?: string;
  landingPageSlug?: string;
  consentAccepted?: boolean;
  privacyNoticeVersion?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("chat");
  const leadFormId = await selectLeadFormId(tenantId, input.serviceLine, "");
  const leadCapture = normalizeLeadCapture(input);
  const qualification = qualifyLead({ analysis: analyzeMessage(`${input.serviceLine ?? ""} ${input.sourcePage ?? ""}`), leadCapture, body: input.sourcePage || "" });
  await query(
    `insert into "PatientWebChatConversation"
      ("id", "tenantId", "visitorName", "visitorPhone", "visitorEmail", "sourcePage", "sourceChannel", "campaignSource", "referrerUrl", "landingPageSlug", "leadScore", "qualificationStage", "status", "transcriptSummary", "schedulingOutcome", "pmsWritebackStatus", "leadFormId", "ownerRoleKey", "nextBestAction", "staffOwnerDueAt", "blockedReason")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'OPEN', $13, 'NOT_ATTEMPTED', 'PMS_CONNECTOR_REQUIRED', $14, $15, $16, current_timestamp + interval '30 minutes', null)`,
    [
      id,
      tenantId,
      input.visitorName || null,
      input.visitorPhone || null,
      input.visitorEmail || null,
      input.sourcePage || null,
      leadCapture.sourceChannel || "WEBSITE",
      leadCapture.campaignSource || inferCampaignSource(input.sourcePage),
      leadCapture.referrerUrl || null,
      leadCapture.landingPageSlug || inferLandingPageSlug(input.sourcePage),
      qualification.leadScore,
      qualification.qualificationStage,
      buildTranscriptSummary("Conversation started from website widget.", leadCapture),
      leadFormId,
      ownerForServiceLine(input.serviceLine),
      qualification.nextBestAction,
    ],
  );
  await query(
    `insert into "PatientWebChatEvent" ("id", "tenantId", "conversationId", "eventType", "pageUrl", "payload")
     values ($1, $2, $3, 'SESSION_STARTED', $4, $5::jsonb)`,
    [newId("evt"), tenantId, id, input.sourcePage || null, JSON.stringify({ source: "webchat_widget", leadCapture })],
  );
  await addWebchatAudit(tenantId, "SESSION_STARTED", id, "ALLOWED", {
    sourcePage: input.sourcePage ?? null,
    hasPhone: Boolean(input.visitorPhone),
    hasEmail: Boolean(input.visitorEmail),
    consentAccepted: Boolean(input.consentAccepted),
    leadFormId,
  });
  return { id, tenantId };
}

export async function getConversationMessages(conversationId: string, tenantId = defaultTenantId) {
  const result = await query<WebchatMessageRecord>(
    `select *
     from "PatientWebChatMessage"
     where "tenantId" = $1 and "conversationId" = $2
     order by "createdAt" asc`,
    [tenantId, conversationId],
  );
  return result.rows;
}

export async function getConversationTranscript(conversationId: string, tenantId = defaultTenantId) {
  const [conversationResult, messagesResult, eventsResult] = await Promise.all([
    query(
      `select *
       from "PatientWebChatConversation"
       where "tenantId" = $1 and "id" = $2
       limit 1`,
      [tenantId, conversationId],
    ),
    getConversationMessages(conversationId, tenantId),
    query<WebchatEventRecord>(
      `select "eventType", "payload", "createdAt"
       from "PatientWebChatEvent"
       where "tenantId" = $1 and "conversationId" = $2
       order by "createdAt" asc`,
      [tenantId, conversationId],
    ),
  ]);
  return {
    conversation: conversationResult.rows[0] ?? null,
    messages: messagesResult,
    events: eventsResult.rows,
    analytics: summarizeTranscript(messagesResult, eventsResult.rows),
  };
}

export async function postWebchatMessage(input: {
  tenantId?: string;
  conversationId: string;
  body: string;
  senderName?: string;
  leadCapture?: LeadCapture;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const analysis = analyzeMessage(input.body);
  const leadCapture = normalizeLeadCapture(input.leadCapture ?? {});
  const qualification = await updateLeadCapture({ tenantId, conversationId: input.conversationId, leadCapture, body: input.body, analysis });
  const userMessageId = newId("msg");
  await query(
    `insert into "PatientWebChatMessage"
      ("id", "tenantId", "conversationId", "senderType", "senderName", "body", "intent", "sentiment", "confidence", "actionType", "actionStatus", "metadata")
     values ($1, $2, $3, 'VISITOR', $4, $5, $6, $7, $8, $9, $10, $11::jsonb)`,
    [
      userMessageId,
      tenantId,
      input.conversationId,
      input.senderName || null,
      input.body,
      analysis.intent,
      analysis.sentiment,
      analysis.confidence,
      analysis.actionType ?? null,
      analysis.actionStatus ?? "NONE",
      JSON.stringify({ analyzer: "rules_v3_dental_qualification", externalAiUsed: false, leadCapture, qualification, consentAccepted: Boolean(leadCapture.consentAccepted) }),
    ],
  );
  await query(
    `insert into "PatientWebChatEvent" ("id", "tenantId", "conversationId", "eventType", "payload")
     values ($1, $2, $3, 'VISITOR_MESSAGE_RECEIVED', $4::jsonb)`,
    [newId("evt"), tenantId, input.conversationId, JSON.stringify({ intent: analysis.intent, sentiment: analysis.sentiment, confidence: analysis.confidence })],
  );

  const knowledge = await retrieveKnowledge(input.body, tenantId);
  const reply = buildReply(analysis, knowledge);
  const replyId = newId("msg");
  await query(
    `insert into "PatientWebChatMessage"
      ("id", "tenantId", "conversationId", "senderType", "senderName", "body", "intent", "sentiment", "confidence", "knowledgeSourceIds", "actionType", "actionStatus", "metadata")
     values ($1, $2, $3, 'ASSISTANT', '1DentalAI Web Chat', $4, $5, $6, $7, $8::text[], $9, $10, $11::jsonb)`,
    [
      replyId,
      tenantId,
      input.conversationId,
      reply.body,
      analysis.intent,
      analysis.sentiment,
      analysis.confidence,
      knowledge.map((row) => row.id),
      analysis.actionType ?? null,
      analysis.actionStatus ?? "NONE",
      JSON.stringify({ sourceTitles: knowledge.map((row) => row.heading ?? row.pageTitle), noClinicalDiagnosis: true, noExternalBooking: true, qualification }),
    ],
  );

  await query(
    `update "PatientWebChatConversation"
     set "nlpIntent" = $3,
         "nlpConfidence" = $4,
         "leadScore" = greatest("leadScore", $5),
         "qualificationStage" = $6,
         "nextBestAction" = $7,
         "staffOwnerDueAt" = current_timestamp + ($8::text)::interval,
         "transcriptSummary" = $9,
         "schedulingOutcome" = case when $3 in ('SCHEDULE_APPOINTMENT','RESCHEDULE_APPOINTMENT') then $10 else "schedulingOutcome" end,
         "pmsWritebackStatus" = case when $3 in ('SCHEDULE_APPOINTMENT','RESCHEDULE_APPOINTMENT') then 'PMS_CONNECTOR_REQUIRED' else "pmsWritebackStatus" end,
         "blockedReason" = case when $3 in ('SCHEDULE_APPOINTMENT','RESCHEDULE_APPOINTMENT') then 'PMS scheduling/writeback connector is not approved; staff must complete appointment work.' else "blockedReason" end,
         "updatedAt" = current_timestamp
     where "tenantId" = $1 and "id" = $2`,
    [tenantId, input.conversationId, analysis.intent, analysis.confidence, qualification.leadScore, qualification.qualificationStage, qualification.nextBestAction, qualification.dueIn, `Latest visitor intent: ${analysis.intent}. Score ${qualification.leadScore}. Stage ${qualification.qualificationStage}. ${input.body.slice(0, 180)}`, analysis.actionStatus ?? "STAFF_APPROVAL_REQUIRED"],
  );

  if (analysis.actionType && analysis.actionType !== "KNOWLEDGE_RESPONSE") {
    await createWebchatTask({ tenantId, conversationId: input.conversationId, analysis, body: input.body, leadCapture });
  }
  await addWebchatAudit(tenantId, "WEBCHAT_MESSAGE_PROCESSED", input.conversationId, "ALLOWED", {
    intent: analysis.intent,
    actionType: analysis.actionType ?? null,
    actionStatus: analysis.actionStatus ?? null,
    connectorBlocked: analysis.actionStatus !== "ANSWERED_WITH_GUARDRAILS",
    consentAccepted: Boolean(leadCapture.consentAccepted),
    qualification,
  });

  return { userMessageId, replyId, reply, analysis, qualification };
}

export async function postStaffWebchatEntry(input: {
  tenantId?: string;
  conversationId: string;
  body: string;
  senderName?: string;
  entryType?: "STAFF_REPLY" | "STAFF_NOTE";
  status?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const senderType = input.entryType === "STAFF_REPLY" ? "STAFF" : "STAFF_NOTE";
  const actionStatus = senderType === "STAFF" ? "STAFF_REPLY_STAGED" : "INTERNAL_NOTE";
  const id = newId("msg");
  await query(
    `insert into "PatientWebChatMessage"
      ("id", "tenantId", "conversationId", "senderType", "senderName", "body", "intent", "sentiment", "confidence", "actionType", "actionStatus", "metadata")
     values ($1, $2, $3, $4, $5, $6, 'STAFF_HANDOFF', 'NEUTRAL', 100, 'OPERATOR_REVIEW', $7, $8::jsonb)`,
    [
      id,
      tenantId,
      input.conversationId,
      senderType,
      input.senderName || "Front desk",
      input.body,
      actionStatus,
      JSON.stringify({ internalOnly: senderType === "STAFF_NOTE", externalSendBlocked: true, connectorGated: true }),
    ],
  );
  await query(
    `update "PatientWebChatConversation"
     set "status" = $3,
         "transcriptSummary" = $4,
         "updatedAt" = current_timestamp
     where "tenantId" = $1 and "id" = $2`,
    [tenantId, input.conversationId, input.status || "OPEN", `Staff ${senderType === "STAFF" ? "reply staged" : "note added"}: ${input.body.slice(0, 180)}`],
  );
  await addWebchatAudit(tenantId, senderType === "STAFF" ? "WEBCHAT_STAFF_REPLY_STAGED" : "WEBCHAT_STAFF_NOTE_ADDED", input.conversationId, "ALLOWED", {
    externalSendBlocked: true,
    status: input.status || "OPEN",
  });
  return { id, actionStatus };
}

export async function updateKnowledgeSourceReview(input: { tenantId?: string; id: string; status: string; actorRole?: string }) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const result = await query<{ id: string }>(
    `update "PatientEngagementKnowledgeSource"
     set "status" = $3,
         "lastReviewedAt" = case when $3 in ('READY','READY_FOR_RETRIEVAL','APPROVED') then current_timestamp else "lastReviewedAt" end,
         "nextAction" = case when $3 in ('READY','READY_FOR_RETRIEVAL','APPROVED') then 'Approved for guarded webchat retrieval and staff-reviewed AI voice use.' else "nextAction" end,
         "updatedAt" = current_timestamp
     where "tenantId" = $1 and "id" = $2
     returning "id"`,
    [tenantId, input.id, input.status],
  );
  if (result.rows[0]) {
    await addWebchatAudit(tenantId, "WEBCHAT_KB_SOURCE_REVIEW_UPDATED", input.id, "ALLOWED", {
      status: input.status,
      actorRole: input.actorRole ?? "practice_manager",
    });
  }
  return result.rows[0] ?? null;
}

async function createWebchatTask(input: { tenantId: string; conversationId: string; analysis: WebchatAnalysis; body: string; leadCapture: LeadCapture }) {
  const qualification = qualifyLead({ analysis: input.analysis, leadCapture: input.leadCapture, body: input.body });
  const exists = await query<{ count: string }>(
    `select count(*)::text as count
     from "PhoneCallTask"
     where "tenantId" = $1 and "conversationId" = $2 and "taskType" = $3 and "status" = 'OPEN'`,
    [input.tenantId, input.conversationId, input.analysis.actionType],
  );
  if (Number(exists.rows[0]?.count ?? 0) > 0) return;
  await query(
    `insert into "PhoneCallTask"
      ("id", "tenantId", "conversationId", "taskType", "priority", "status", "dueAt", "ownerRoleKey", "nextAction", "sourceModule", "updatedAt")
     values ($1, $2, $3, $4, $5, 'OPEN', current_timestamp + interval '30 minutes', $6, $7, 'WEB_CHAT', current_timestamp)`,
    [
      newId("ptask"),
      input.tenantId,
      input.conversationId,
      input.analysis.actionType,
      qualification.priority,
      input.analysis.intent === "INSURANCE_OR_PRICE" ? "treatment_coordinator" : "front_desk",
      `${qualification.nextBestAction} Do not claim booking/writeback until PMS connector is approved. ${leadHandoffSummary(input.leadCapture)} Visitor said: ${input.body.slice(0, 160)}`,
    ],
  );
}

async function retrieveKnowledge(message: string, tenantId: string) {
  const terms = message
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 3)
    .slice(0, 8);
  const result = await query<{ id: string; content: string; heading: string | null; pageTitle: string }>(
    `select kc."id", kc."content", kc."heading", kp."title" as "pageTitle"
     from "PatientEngagementKnowledgeChunk" kc
     join "PatientEngagementKnowledgePage" kp on kp."id" = kc."pageId"
     where kc."tenantId" = $1 and kc."status" = 'READY_FOR_RETRIEVAL'
     order by (
       select count(*)
       from unnest($2::text[]) term
       where lower(kc."content") like '%' || term || '%'
     ) desc, kc."updatedAt" desc
     limit 3`,
    [tenantId, terms],
  );
  return result.rows;
}

function buildReply(analysis: WebchatAnalysis, knowledge: Array<{ content: string; heading: string | null; pageTitle: string }>) {
  const knowledgeExcerpt = summarizeKnowledge(knowledge[0]);
  const context = knowledgeExcerpt ? `Here is what I can share from the approved knowledge base: ${knowledgeExcerpt}` : "I can help route this to the right dental team member.";
  if (analysis.intent === "SCHEDULE_APPOINTMENT") {
    return { body: `${context}\n\nI can collect your request and have the front desk confirm appointment options. I cannot finalize a booking until PMS scheduling writeback is approved.` };
  }
  if (analysis.intent === "RESCHEDULE_APPOINTMENT") {
    return { body: "I can help start a reschedule request. For privacy, the team must verify identity before changing an appointment. Please share your name, phone, and preferred time window." };
  }
  if (analysis.intent === "EMERGENCY_TRIAGE") {
    return { body: "I’m going to flag this as urgent for the practice team. If you have severe swelling, uncontrolled bleeding, trauma, or trouble breathing, seek emergency care immediately. Please share your phone number and what happened." };
  }
  if (analysis.intent === "INSURANCE_OR_PRICE") {
    return { body: `${context}\n\nFor insurance, pricing, or financing, I can collect your question and route it for staff review. Exact benefits or estimates require payer/PMS verification.` };
  }
  return { body: `${context}\n\nWhat would you like help with: booking, rescheduling, insurance, forms, or a service question?` };
}

function summarizeKnowledge(row?: { content: string; heading: string | null; pageTitle: string }) {
  if (!row?.content) return "";
  const title = row.heading || row.pageTitle;
  const text = row.content
    .replace(/\s+/g, " ")
    .replace(/\b(Product|Solutions|Features|Use Cases|Workflows|Resources|Blog|About|Contact|Open platform|Request access)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const sentences = text.split(/(?<=[.!?])\s+/).filter((sentence) => sentence.length > 35);
  const excerpt = (sentences.slice(0, 2).join(" ") || text).slice(0, 420).trim();
  return `${title ? `${title}: ` : ""}${excerpt}${excerpt.length >= 420 ? "..." : ""}`;
}

export async function crawlKnowledgePage(input: { tenantId?: string; url: string }) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const url = new URL(input.url);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only http and https URLs can be crawled.");
  const response = await fetch(url.toString(), { headers: { "User-Agent": "1DentalAI-KnowledgeCrawler/1.0" } });
  if (!response.ok) throw new Error(`Crawler failed with ${response.status}`);
  const html = await response.text();
  const title = extractTitle(html) || url.hostname;
  const text = extractText(html).slice(0, 20000);
  const hash = createHash("sha256").update(text).digest("hex");
  const pageId = newId("kpage");
  const page = await query<{ id: string }>(
    `insert into "PatientEngagementKnowledgePage" ("id", "tenantId", "url", "title", "status", "contentHash", "extractedText")
     values ($1, $2, $3, $4, 'CRAWLED', $5, $6)
     on conflict ("tenantId", "url") do update set
       "title" = excluded."title",
       "status" = 'CRAWLED',
       "contentHash" = excluded."contentHash",
       "extractedText" = excluded."extractedText",
       "lastCrawledAt" = current_timestamp,
       "updatedAt" = current_timestamp
     returning "id"`,
    [pageId, tenantId, url.toString(), title, hash, text],
  );
  const actualPageId = page.rows[0].id;
  await query(`delete from "PatientEngagementKnowledgeChunk" where "pageId" = $1`, [actualPageId]);
  const chunks = chunkText(text);
  for (let index = 0; index < chunks.length; index += 1) {
    await query(
      `insert into "PatientEngagementKnowledgeChunk" ("id", "tenantId", "pageId", "chunkIndex", "heading", "content", "tokenEstimate")
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [newId("kchunk"), tenantId, actualPageId, index, title, chunks[index], Math.ceil(chunks[index].length / 4)],
    );
  }
  return { pageId: actualPageId, title, chunks: chunks.length };
}

async function updateLeadCapture(input: { tenantId: string; conversationId: string; leadCapture: LeadCapture; body: string; analysis: WebchatAnalysis }) {
  const hasCapture = Object.values(input.leadCapture).some((value) => value !== undefined && value !== "" && value !== false);
  const leadFormId = await selectLeadFormId(input.tenantId, input.leadCapture.serviceLine, input.body);
  const qualification = qualifyLead(input);
  await query(
    `update "PatientWebChatConversation"
     set "visitorName" = coalesce(nullif($3, ''), "visitorName"),
         "visitorPhone" = coalesce(nullif($4, ''), "visitorPhone"),
         "visitorEmail" = coalesce(nullif($5, ''), "visitorEmail"),
         "leadFormId" = coalesce($6, "leadFormId"),
         "ownerRoleKey" = $7,
         "sourceChannel" = coalesce(nullif($8, ''), "sourceChannel"),
         "campaignSource" = coalesce(nullif($9, ''), "campaignSource"),
         "referrerUrl" = coalesce(nullif($10, ''), "referrerUrl"),
         "landingPageSlug" = coalesce(nullif($11, ''), "landingPageSlug"),
         "updatedAt" = current_timestamp
     where "tenantId" = $1 and "id" = $2`,
    [
      input.tenantId,
      input.conversationId,
      input.leadCapture.visitorName ?? "",
      input.leadCapture.visitorPhone ?? "",
      input.leadCapture.visitorEmail ?? "",
      leadFormId,
      input.analysis.intent === "INSURANCE_OR_PRICE" ? "treatment_coordinator" : ownerForServiceLine(input.leadCapture.serviceLine),
      input.leadCapture.sourceChannel ?? "",
      input.leadCapture.campaignSource ?? "",
      input.leadCapture.referrerUrl ?? "",
      input.leadCapture.landingPageSlug ?? "",
    ],
  );
  if (hasCapture) {
    await query(
      `insert into "PatientWebChatEvent" ("id", "tenantId", "conversationId", "eventType", "payload")
       values ($1, $2, $3, 'LEAD_CAPTURE_UPDATED', $4::jsonb)`,
      [newId("evt"), input.tenantId, input.conversationId, JSON.stringify({ leadCapture: input.leadCapture, leadFormId })],
    );
  }
  return qualification;
}

async function selectLeadFormId(tenantId: string, serviceLine?: string, body = "") {
  const normalized = `${serviceLine ?? ""} ${body}`.toLowerCase();
  const serviceHint = /emergency|pain|swelling|trauma|broken/.test(normalized) ? "Emergency" : /implant/.test(normalized) ? "Implants" : serviceLine;
  const result = await query<{ id: string }>(
    `select "id"
     from "PatientEngagementLeadForm"
     where "tenantId" = $1
       and "sourceChannel" = 'WEB_CHAT'
       and ($2::text is null or lower("serviceLine") = lower($2) or lower("name") like '%' || lower($2) || '%')
     order by case "status" when 'READY' then 0 when 'READY_FOR_REVIEW' then 1 else 2 end, "updatedAt" desc
     limit 1`,
    [tenantId, serviceHint || null],
  );
  return result.rows[0]?.id ?? null;
}

function normalizeLeadCapture(input: LeadCapture): LeadCapture {
  return {
    visitorName: cleanInput(input.visitorName),
    visitorPhone: cleanInput(input.visitorPhone),
    visitorEmail: cleanInput(input.visitorEmail),
    serviceLine: cleanInput(input.serviceLine),
    preferredTime: cleanInput(input.preferredTime),
    patientStatus: cleanInput(input.patientStatus),
    urgency: cleanInput(input.urgency),
    sourceChannel: cleanInput(input.sourceChannel) || "WEBSITE",
    campaignSource: cleanInput(input.campaignSource),
    referrerUrl: cleanInput(input.referrerUrl),
    landingPageSlug: cleanInput(input.landingPageSlug),
    consentAccepted: input.consentAccepted === true,
    privacyNoticeVersion: cleanInput(input.privacyNoticeVersion) || "webchat-privacy-v1",
  };
}

function qualifyLead(input: { analysis: WebchatAnalysis; leadCapture: LeadCapture; body: string }) {
  const hasContact = Boolean(input.leadCapture.visitorPhone || input.leadCapture.visitorEmail);
  const urgent = input.analysis.intent === "EMERGENCY_TRIAGE" || input.leadCapture.urgency === "URGENT";
  const scheduling = ["SCHEDULE_APPOINTMENT", "RESCHEDULE_APPOINTMENT"].includes(input.analysis.intent);
  const implantOrHighValue = /implant|aligner|cosmetic|veneer|sedation|full arch|clear aligner/i.test(`${input.leadCapture.serviceLine ?? ""} ${input.body}`);
  const financing = /insurance|financing|payment|cost|price|covered/i.test(input.body);
  let leadScore = input.analysis.confidence;
  if (hasContact) leadScore += 12;
  if (urgent) leadScore += 15;
  if (scheduling) leadScore += 10;
  if (implantOrHighValue) leadScore += 8;
  if (financing) leadScore += 4;
  leadScore = Math.max(20, Math.min(100, leadScore));
  const qualificationStage = urgent ? "URGENT_TRIAGE" : hasContact && scheduling ? "BOOKING_READY" : hasContact ? "QUALIFIED_LEAD" : scheduling ? "NEEDS_CONTACT" : "ENGAGED";
  const priority = urgent || leadScore >= 85 ? "HIGH" : leadScore >= 65 ? "NORMAL" : "LOW";
  const dueIn = urgent ? "10 minutes" : leadScore >= 85 ? "15 minutes" : leadScore >= 65 ? "30 minutes" : "4 hours";
  const nextBestAction = urgent
    ? "Call patient immediately, verify red-flag symptoms, and use emergency scheduling protocol."
    : scheduling
      ? "Confirm contact details, check PMS availability, and convert to an approved appointment request."
      : financing
        ? "Route to treatment coordinator for benefits, fee range, financing, and case-acceptance follow-up."
        : "Qualify contact details, answer from approved knowledge, and assign the right practice owner.";
  return { leadScore, qualificationStage, priority, dueIn, nextBestAction, hasContact, scheduling, urgent, implantOrHighValue };
}

function inferCampaignSource(sourcePage?: string) {
  const source = sourcePage ?? "";
  if (/utm_source=google/i.test(source)) return "GOOGLE_ADS";
  if (/utm_source=gbp|google-business/i.test(source)) return "GOOGLE_BUSINESS_PROFILE";
  if (/facebook|instagram|meta/i.test(source)) return "SOCIAL";
  if (/implant/i.test(source)) return "IMPLANT_LANDING_PAGE";
  if (/emergency/i.test(source)) return "EMERGENCY_LANDING_PAGE";
  return "DIRECT_WEBSITE";
}

function inferLandingPageSlug(sourcePage?: string) {
  if (!sourcePage) return "unknown";
  try {
    const url = new URL(sourcePage);
    const slug = url.pathname.split("/").filter(Boolean).pop();
    return slug || "home";
  } catch {
    return "unknown";
  }
}

function cleanInput(value?: string) {
  return typeof value === "string" ? value.trim().slice(0, 240) : undefined;
}

function ownerForServiceLine(serviceLine?: string) {
  const text = (serviceLine ?? "").toLowerCase();
  if (/implant|insurance|financing|cost/.test(text)) return "treatment_coordinator";
  return "front_desk";
}

function buildTranscriptSummary(prefix: string, leadCapture: LeadCapture) {
  const details = leadHandoffSummary(leadCapture);
  return details ? `${prefix} ${details}` : prefix;
}

function leadHandoffSummary(leadCapture: LeadCapture) {
  const fields = [
    leadCapture.serviceLine ? `service ${leadCapture.serviceLine}` : "",
    leadCapture.preferredTime ? `preferred time ${leadCapture.preferredTime}` : "",
    leadCapture.patientStatus ? `patient status ${leadCapture.patientStatus}` : "",
    leadCapture.urgency ? `urgency ${leadCapture.urgency}` : "",
    leadCapture.campaignSource ? `campaign ${leadCapture.campaignSource}` : "",
    leadCapture.consentAccepted ? "privacy/communication notice accepted" : "privacy/communication notice not accepted",
  ].filter(Boolean);
  return fields.length ? `Captured ${fields.join("; ")}.` : "";
}

function summarizeTranscript(messages: WebchatMessageRecord[], events: WebchatEventRecord[]) {
  const visitorMessages = messages.filter((message) => message.senderType === "VISITOR");
  const staffEntries = messages.filter((message) => message.senderType === "STAFF" || message.senderType === "STAFF_NOTE");
  const intents = visitorMessages.map((message) => message.intent).filter(Boolean) as string[];
  const urgent = visitorMessages.some((message) => message.sentiment === "URGENT" || message.intent === "EMERGENCY_TRIAGE");
  const handoffCount = visitorMessages.filter((message) => message.actionType && message.actionType !== "KNOWLEDGE_RESPONSE").length;
  return {
    visitorMessageCount: visitorMessages.length,
    staffEntryCount: staffEntries.length,
    topIntent: intents[0] ?? "UNCLASSIFIED",
    urgent,
    handoffCount,
    eventCount: events.length,
    connectorGated: messages.some((message) => message.actionStatus?.includes("REQUIRED") || message.actionStatus?.includes("STAGED")),
  };
}

async function addWebchatAudit(tenantId: string, eventType: string, targetId: string, outcome: string, metadata: unknown) {
  await query(
    `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
     values ($1, $2, 'website_visitor', $3, 'PatientWebChatConversation', $4, $5, $6::jsonb)`,
    [newId("audit"), tenantId, eventType, targetId, outcome, JSON.stringify(metadata)],
  );
}

function extractTitle(html: string) {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim();
}

function extractText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function chunkText(text: string) {
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += 1200) {
    const chunk = text.slice(index, index + 1200).trim();
    if (chunk.length > 80) chunks.push(chunk);
  }
  return chunks.slice(0, 25);
}
