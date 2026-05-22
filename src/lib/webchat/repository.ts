import { createHash } from "node:crypto";
import { newId, query } from "@/lib/db";
import {
  defaultTenantId,
  getOnlineSchedulingAvailability,
  submitOnlineBooking,
  type PmsOnlineSlot,
} from "@/lib/pms-repository";
import {
  createPhoneOutboundMessage,
  sendApprovedPhoneOutboundMessage,
  updatePhoneOutboundMessageApproval,
} from "@/lib/operating-system-repository";

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
  id: string;
  body: string;
  senderType: string;
  intent: string | null;
  sentiment: string | null;
  actionType: string | null;
  actionStatus: string;
  deliveryStatus: string;
  metadata: unknown;
};

type WebchatEventRecord = {
  eventType: string;
  payload: unknown;
};

type WebchatAiDecision = {
  body: string;
  automationMode: string;
  handoffReason: string | null;
  actionStatus: string;
  deliveryStatus: string;
  provider: string;
  providerStatus: string;
  model: string;
  metadata?: Record<string, unknown>;
};

type SchedulingOffer = {
  slug: string;
  serviceLabel: string;
  requestedDay: string;
  options: PmsOnlineSlot[];
};

export function analyzeMessage(message: string): WebchatAnalysis {
  const text = message.toLowerCase();
  if (/^(?:[1-5]|one|two|three|four|five|first|second|third|fourth|fifth|option\s+[1-5]|slot\s+[1-5]|book\s+[1-5])$/.test(text.trim())) {
    return { intent: "SCHEDULE_APPOINTMENT", sentiment: "HIGH_INTENT", confidence: 88, actionType: "DIRECT_PMS_SCHEDULING", actionStatus: "SLOT_SELECTION_RECEIVED" };
  }
  if (/(live person|human|representative|front desk|talk to someone|call me|staff)/.test(text)) {
    return { intent: "LIVE_PERSON_REQUEST", sentiment: "NEEDS_HELP", confidence: 91, actionType: "STAFF_TAKEOVER", actionStatus: "STAFF_REQUIRED" };
  }
  if (/(reschedule|move my appointment|change appointment|cancel)/.test(text)) {
    return { intent: "RESCHEDULE_APPOINTMENT", sentiment: "NEEDS_HELP", confidence: 84, actionType: "RESCHEDULE_APPOINTMENT", actionStatus: "IDENTITY_CHECK_REQUIRED" };
  }
  if (/(book|appointment|schedule|available|availability|consult|opening|slot|cleaning|exam|whitening|implant|crown|filling|root canal|tooth pain|toothache)/.test(text)) {
    return { intent: "SCHEDULE_APPOINTMENT", sentiment: "HIGH_INTENT", confidence: 82, actionType: "DIRECT_PMS_SCHEDULING", actionStatus: "SCHEDULING_IN_PROGRESS" };
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

export async function getConversationStreamState(conversationId: string, tenantId = defaultTenantId) {
  const result = await query<{ messageCount: string; lastMessageAt: string | null; conversationUpdatedAt: string | null; status: string | null }>(
    `select
       (select count(*) from "PatientWebChatMessage" where "tenantId" = $1 and "conversationId" = $2)::text as "messageCount",
       (select max("createdAt")::text from "PatientWebChatMessage" where "tenantId" = $1 and "conversationId" = $2) as "lastMessageAt",
       (select "updatedAt"::text from "PatientWebChatConversation" where "tenantId" = $1 and "id" = $2 limit 1) as "conversationUpdatedAt",
       (select "status" from "PatientWebChatConversation" where "tenantId" = $1 and "id" = $2 limit 1) as "status"`,
    [tenantId, conversationId],
  );
  const row = result.rows[0];
  return {
    messageCount: Number(row?.messageCount ?? 0),
    lastMessageAt: row?.lastMessageAt ?? null,
    conversationUpdatedAt: row?.conversationUpdatedAt ?? null,
    status: row?.status ?? null,
  };
}

export async function getWebchatInboxStreamState(tenantId = defaultTenantId) {
  const result = await query<{ conversationCount: string; openCount: string; lastUpdatedAt: string | null; messageCount: string; lastMessageAt: string | null }>(
    `select
       (select count(*) from "PatientWebChatConversation" where "tenantId" = $1)::text as "conversationCount",
       (select count(*) from "PatientWebChatConversation" where "tenantId" = $1 and "status" = 'OPEN')::text as "openCount",
       (select max("updatedAt")::text from "PatientWebChatConversation" where "tenantId" = $1) as "lastUpdatedAt",
       (select count(*) from "PatientWebChatMessage" where "tenantId" = $1)::text as "messageCount",
       (select max("createdAt")::text from "PatientWebChatMessage" where "tenantId" = $1) as "lastMessageAt"`,
    [tenantId],
  );
  const row = result.rows[0];
  return {
    conversationCount: Number(row?.conversationCount ?? 0),
    openCount: Number(row?.openCount ?? 0),
    lastUpdatedAt: row?.lastUpdatedAt ?? null,
    messageCount: Number(row?.messageCount ?? 0),
    lastMessageAt: row?.lastMessageAt ?? null,
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
  const leadCapture = normalizeLeadCapture(input.leadCapture ?? {});
  if (leadCapture.sourceChannel !== "SMS" && leadCapture.consentAccepted !== true) {
    await addWebchatAudit(tenantId, "WEBCHAT_MESSAGE_BLOCKED", input.conversationId, "BLOCKED", {
      consentAccepted: false,
      sourceChannel: leadCapture.sourceChannel || "WEBSITE",
      reason: "CONSENT_REQUIRED",
    });
    await query(
      `insert into "PatientWebChatEvent" ("id", "tenantId", "conversationId", "eventType", "payload")
       values ($1, $2, $3, 'MESSAGE_BLOCKED_CONSENT_REQUIRED', $4::jsonb)`,
      [newId("evt"), tenantId, input.conversationId, JSON.stringify({ intent: "CONSENT_REQUIRED", reason: "privacy consent missing" })],
    );
    return {
      userMessageId: null,
      replyId: null,
      reply: {
        body: "I can keep helping once you accept the privacy notice. Your information is stored only after consent is confirmed.",
      },
      analysis: {
        intent: "CONSENT_REQUIRED",
        sentiment: "NEEDS_HELP",
        confidence: 100,
        actionType: "CONSENT_BLOCK",
        actionStatus: "CONSENT_REQUIRED",
      },
      qualification: {
        leadScore: 0,
        qualificationStage: "CONSENT_REQUIRED",
        nextBestAction: "Get consent to enable messaging, then continue.",
      },
      automationMode: "BLOCKED",
      handoffReason: "CONSENT_REQUIRED",
    };
  }

  const analysis = analyzeMessage(input.body);
  const qualification = await updateLeadCapture({ tenantId, conversationId: input.conversationId, leadCapture, body: input.body, analysis });
  const userMessageId = newId("msg");
  await query(
    `insert into "PatientWebChatMessage"
      ("id", "tenantId", "conversationId", "senderType", "senderName", "body", "intent", "sentiment", "confidence", "actionType", "actionStatus", "deliveryStatus", "metadata")
     values ($1, $2, $3, 'VISITOR', $4, $5, $6, $7, $8, $9, $10, 'RECEIVED', $11::jsonb)`,
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
  const aiDecision = await buildAiAutoReply({ tenantId, conversationId: input.conversationId, body: input.body, analysis, knowledge, leadCapture, qualification });
  const replyId = newId("msg");
  await query(
    `insert into "PatientWebChatMessage"
      ("id", "tenantId", "conversationId", "senderType", "senderName", "body", "intent", "sentiment", "confidence", "knowledgeSourceIds", "actionType", "actionStatus", "deliveryStatus", "provider", "providerStatus", "metadata")
     values ($1, $2, $3, 'ASSISTANT', '1DentalAI Web Chat', $4, $5, $6, $7, $8::text[], $9, $10, $11, $12, $13, $14::jsonb)`,
    [
      replyId,
      tenantId,
      input.conversationId,
      aiDecision.body,
      analysis.intent,
      analysis.sentiment,
      analysis.confidence,
      knowledge.map((row) => row.id),
      analysis.actionType ?? null,
      aiDecision.actionStatus,
      aiDecision.deliveryStatus,
      aiDecision.provider,
      aiDecision.providerStatus,
      JSON.stringify({
        sourceTitles: knowledge.map((row) => row.heading ?? row.pageTitle),
        noClinicalDiagnosis: true,
        qualification,
        automationMode: aiDecision.automationMode,
        handoffReason: aiDecision.handoffReason,
        model: aiDecision.model,
        scheduling: aiDecision.metadata ?? null,
      }),
    ],
  );

  const appointmentId = typeof aiDecision.metadata?.appointmentId === "string" ? aiDecision.metadata.appointmentId : null;
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
         "pmsWritebackStatus" = case
           when $3 in ('SCHEDULE_APPOINTMENT','RESCHEDULE_APPOINTMENT') and $10 = 'PMS_APPOINTMENT_BOOKED' then 'BOOKED_TO_PMS'
           when $3 in ('SCHEDULE_APPOINTMENT','RESCHEDULE_APPOINTMENT') and $10 in ('PMS_SLOTS_OFFERED','RESCHEDULE_SLOTS_OFFERED') then 'PMS_SLOTS_READ'
           when $3 in ('SCHEDULE_APPOINTMENT','RESCHEDULE_APPOINTMENT') then 'NEEDS_STAFF_REVIEW'
           else "pmsWritebackStatus"
         end,
         "blockedReason" = case
           when $3 in ('SCHEDULE_APPOINTMENT','RESCHEDULE_APPOINTMENT') and $10 in ('PMS_APPOINTMENT_BOOKED','PMS_SLOTS_OFFERED','RESCHEDULE_SLOTS_OFFERED') then null
           when $3 in ('SCHEDULE_APPOINTMENT','RESCHEDULE_APPOINTMENT') then $13
           else "blockedReason"
         end,
         "appointmentId" = coalesce($14, "appointmentId"),
         "patientId" = coalesce($15, "patientId"),
         "automationMode" = $11,
         "handoffReason" = $12,
         "updatedAt" = current_timestamp
     where "tenantId" = $1 and "id" = $2`,
    [
      tenantId,
      input.conversationId,
      analysis.intent,
      analysis.confidence,
      qualification.leadScore,
      qualification.qualificationStage,
      qualification.nextBestAction,
      qualification.dueIn,
      `Latest visitor intent: ${analysis.intent}. Score ${qualification.leadScore}. Stage ${qualification.qualificationStage}. ${input.body.slice(0, 180)}`,
      aiDecision.actionStatus,
      aiDecision.automationMode,
      aiDecision.handoffReason,
      aiDecision.providerStatus,
      appointmentId,
      typeof aiDecision.metadata?.patientId === "string" ? aiDecision.metadata.patientId : null,
    ],
  );

  const schedulingNeedsStaffTask = [
    "SCHEDULING_NO_SLOTS_AVAILABLE",
    "RESCHEDULE_SAME_DAY_APPROVAL_REQUIRED",
    "RESCHEDULE_NO_SLOTS_AVAILABLE",
  ].includes(aiDecision.actionStatus);
  if (aiDecision.automationMode !== "AI_AUTO" || schedulingNeedsStaffTask || (analysis.actionType && !["KNOWLEDGE_RESPONSE", "DIRECT_PMS_SCHEDULING", "RESCHEDULE_APPOINTMENT"].includes(analysis.actionType))) {
    await createWebchatTask({ tenantId, conversationId: input.conversationId, analysis, body: input.body, leadCapture });
  }
  await addWebchatAudit(tenantId, "WEBCHAT_MESSAGE_PROCESSED", input.conversationId, "ALLOWED", {
    intent: analysis.intent,
    actionType: analysis.actionType ?? null,
    actionStatus: aiDecision.actionStatus,
    automationMode: aiDecision.automationMode,
    connectorBlocked: aiDecision.deliveryStatus.includes("BLOCKED"),
    consentAccepted: Boolean(leadCapture.consentAccepted),
    qualification,
  });

  return { userMessageId, replyId, reply: { body: aiDecision.body }, analysis, qualification, automationMode: aiDecision.automationMode, handoffReason: aiDecision.handoffReason };
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
  const actionStatus = senderType === "STAFF" ? "STAFF_REPLY_SENT" : "INTERNAL_NOTE";
  const deliveryStatus = senderType === "STAFF" ? "SENT" : "INTERNAL";
  const id = newId("msg");
  await query(
    `insert into "PatientWebChatMessage"
      ("id", "tenantId", "conversationId", "senderType", "senderName", "body", "intent", "sentiment", "confidence", "actionType", "actionStatus", "deliveryStatus", "provider", "providerStatus", "metadata")
     values ($1, $2, $3, $4, $5, $6, 'STAFF_HANDOFF', 'NEUTRAL', 100, 'OPERATOR_REVIEW', $7, $8, 'WEB_CHAT', $9, $10::jsonb)`,
    [
      id,
      tenantId,
      input.conversationId,
      senderType,
      input.senderName || "Front desk",
      input.body,
      actionStatus,
      deliveryStatus,
      senderType === "STAFF" ? "DELIVERED_TO_WIDGET_STREAM" : "INTERNAL_ONLY",
      JSON.stringify({ internalOnly: senderType === "STAFF_NOTE", realtimeStream: senderType === "STAFF", deliveredToWidget: senderType === "STAFF" }),
    ],
  );
  await query(
    `update "PatientWebChatConversation"
     set "status" = $3,
         "transcriptSummary" = $4,
         "updatedAt" = current_timestamp
     where "tenantId" = $1 and "id" = $2`,
    [tenantId, input.conversationId, input.status || "OPEN", `Staff ${senderType === "STAFF" ? "reply sent" : "note added"}: ${input.body.slice(0, 180)}`],
  );
  await addWebchatAudit(tenantId, senderType === "STAFF" ? "WEBCHAT_STAFF_REPLY_SENT" : "WEBCHAT_STAFF_NOTE_ADDED", input.conversationId, "ALLOWED", {
    realtimeStream: senderType === "STAFF",
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

export async function createWebchatAppointmentHandoff(input: {
  tenantId?: string;
  conversationId: string;
  ownerRoleKey?: string;
  priority?: string;
  requestedWindow?: string;
  note?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const conversation = (await query<{
    id: string;
    patientId: string | null;
    visitorName: string | null;
    visitorPhone: string | null;
    visitorEmail: string | null;
    nlpIntent: string | null;
    qualificationStage: string;
    leadScore: number;
    blockedReason: string | null;
  }>(
    `select "id", "patientId", "visitorName", "visitorPhone", "visitorEmail", "nlpIntent", "qualificationStage", "leadScore", "blockedReason"
     from "PatientWebChatConversation"
     where "tenantId" = $1 and "id" = $2
     limit 1`,
    [tenantId, input.conversationId],
  )).rows[0];
  if (!conversation) return null;

  const ownerRoleKey = input.ownerRoleKey || "front_desk";
  const priority = input.priority || (conversation.leadScore >= 80 ? "HIGH" : "NORMAL");
  const requestedWindow = input.requestedWindow?.trim() || "next available approved scheduling slot";
  const title = `Webchat appointment handoff: ${conversation.visitorName || conversation.visitorPhone || conversation.visitorEmail || "website visitor"}`;
  const taskId = newId("task");
  await query(
    `insert into "PmsTask" ("id", "tenantId", "patientId", "ownerRoleKey", "title", "taskType", "priority", "dueAt", "updatedAt")
     values ($1, $2, $3, $4, $5, 'WEBCHAT_APPOINTMENT_HANDOFF', $6, current_timestamp + interval '30 minutes', current_timestamp)`,
    [taskId, tenantId, conversation.patientId, ownerRoleKey, title, priority],
  );
  await query(
    `update "PatientWebChatConversation"
     set "schedulingOutcome" = 'STAFF_HANDOFF_CREATED',
         "pmsWritebackStatus" = 'PMS_CONNECTOR_REQUIRED',
         "blockedReason" = 'Appointment request is staged for staff. PMS scheduling writeback is blocked until a live PMS connector or manual proof policy is approved.',
         "nextBestAction" = $3,
         "ownerRoleKey" = $4,
         "staffOwnerDueAt" = current_timestamp + interval '30 minutes',
         "updatedAt" = current_timestamp
     where "tenantId" = $1 and "id" = $2`,
    [tenantId, input.conversationId, `Confirm availability, verify identity/contact, and create appointment manually or through approved PMS connector. Requested window: ${requestedWindow}.`, ownerRoleKey],
  );
  await query(
    `insert into "PatientWebChatEvent" ("id", "tenantId", "conversationId", "eventType", "payload")
     values ($1, $2, $3, 'APPOINTMENT_HANDOFF_CREATED', $4::jsonb)`,
    [
      newId("evt"),
      tenantId,
      input.conversationId,
      JSON.stringify({
        pmsTaskId: taskId,
        ownerRoleKey,
        priority,
        requestedWindow,
        note: input.note?.trim() || null,
        pmsWritebackStatus: "PMS_CONNECTOR_REQUIRED",
      }),
    ],
  );
  await addWebchatAudit(tenantId, "WEBCHAT_APPOINTMENT_HANDOFF_CREATED", input.conversationId, "BLOCKED", {
    pmsTaskId: taskId,
    ownerRoleKey,
    priority,
    requestedWindow,
    blockedReason: "PMS scheduling writeback connector is required before direct appointment creation.",
  });
  return { taskId };
}

export async function upsertWebchatLeadForm(input: {
  tenantId?: string;
  id?: string;
  name: string;
  serviceLine: string;
  fields: string;
  routingRule?: string;
  status?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const fields = input.fields.split(",").map((field) => field.trim()).filter(Boolean);
  const id = input.id || newId("leadform");
  const fieldSchema = {
    fields: fields.length ? fields : ["name", "phone", "email", "service_line", "preferred_time", "consent"],
    required: ["name", "phone_or_email", "consent"],
  };
  await query(
    `insert into "PatientEngagementLeadForm"
      ("id", "tenantId", "name", "serviceLine", "sourceChannel", "status", "fieldSchema", "pmsMapping", "routingRule", "connectorStatus", "nextAction")
     values ($1, $2, $3, $4, 'WEB_CHAT', $5, $6::jsonb, $7::jsonb, $8, 'PMS_CONNECTOR_REQUIRED', $9)
     on conflict ("id") do update set
       "name" = excluded."name",
       "serviceLine" = excluded."serviceLine",
       "status" = excluded."status",
       "fieldSchema" = excluded."fieldSchema",
       "routingRule" = excluded."routingRule",
       "nextAction" = excluded."nextAction",
       "updatedAt" = current_timestamp`,
    [
      id,
      tenantId,
      input.name.trim(),
      input.serviceLine.trim(),
      input.status || "READY_FOR_REVIEW",
      JSON.stringify(fieldSchema),
      JSON.stringify({ patientLookup: "phone_or_email", appointmentRequest: "manual_or_connector_gated" }),
      input.routingRule?.trim() || "Route to front desk for verification before PMS writeback.",
      "Review field mapping, consent text, service-line routing, and PMS writeback before publishing.",
    ],
  );
  await addWebchatAudit(tenantId, "WEBCHAT_LEAD_FORM_UPSERTED", id, "ALLOWED", { serviceLine: input.serviceLine, fields });
  return { id };
}

export async function upsertWebchatSchedulingRule(input: {
  tenantId?: string;
  id?: string;
  name: string;
  sourceChannel?: string;
  bookingWindowDays?: number;
  allowReschedule?: boolean;
  requireHumanApproval?: boolean;
  status?: string;
  nextAction?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = input.id || newId("schedrule");
  await query(
    `insert into "PatientEngagementSchedulingRule"
      ("id", "tenantId", "name", "sourceChannel", "status", "bookingWindowDays", "allowReschedule", "requireHumanApproval", "pmsWritebackStatus", "conflictPolicy", "nextAction")
     values ($1, $2, $3, $4, $5, $6, $7, $8, 'PMS_CONNECTOR_REQUIRED', $9::jsonb, $10)
     on conflict ("id") do update set
       "name" = excluded."name",
       "sourceChannel" = excluded."sourceChannel",
       "status" = excluded."status",
       "bookingWindowDays" = excluded."bookingWindowDays",
       "allowReschedule" = excluded."allowReschedule",
       "requireHumanApproval" = excluded."requireHumanApproval",
       "conflictPolicy" = excluded."conflictPolicy",
       "nextAction" = excluded."nextAction",
       "updatedAt" = current_timestamp`,
    [
      id,
      tenantId,
      input.name.trim(),
      input.sourceChannel || "WEB_CHAT",
      input.status || "READY_FOR_REVIEW",
      input.bookingWindowDays || 30,
      input.allowReschedule ?? true,
      input.requireHumanApproval ?? true,
      JSON.stringify({ doubleBook: "block", providerMismatch: "staff_review", medicalAlert: "staff_review", payerRestriction: "staff_review" }),
      input.nextAction?.trim() || "Approve PMS connector route or keep appointment creation as manual staff handoff.",
    ],
  );
  await addWebchatAudit(tenantId, "WEBCHAT_SCHEDULING_RULE_UPSERTED", id, "ALLOWED", { pmsWritebackStatus: "PMS_CONNECTOR_REQUIRED" });
  return { id };
}

export async function updateWebchatChannelSetting(input: {
  tenantId?: string;
  displayName: string;
  primaryColor: string;
  launcherText: string;
  nlpMode?: string;
  nextAction?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  await query(
    `insert into "PatientEngagementChannelSetting"
      ("id", "tenantId", "channel", "displayName", "status", "theme", "nlpMode", "knowledgeBaseStatus", "schedulingStatus", "formsStatus", "connectorStatus", "approvalPolicy", "nextAction")
     values ($1, $2, 'WEB_CHAT', $3, 'READY_FOR_REVIEW', $4::jsonb, $5, 'NEEDS_REVIEW', 'PMS_CONNECTOR_REQUIRED', 'PMS_FORMS_REQUIRED', 'CONNECTOR_REQUIRED', $6::jsonb, $7)
     on conflict ("tenantId", "channel") do update set
       "displayName" = excluded."displayName",
       "theme" = excluded."theme",
       "nlpMode" = excluded."nlpMode",
       "nextAction" = excluded."nextAction",
       "updatedAt" = current_timestamp`,
    [
      newId("channel"),
      tenantId,
      input.displayName.trim(),
      JSON.stringify({ primaryColor: input.primaryColor.trim(), launcherText: input.launcherText.trim(), position: "bottom-right" }),
      input.nlpMode || "RULES_AND_AI_DRAFT",
      JSON.stringify({ staffReplyRequiresApproval: true, appointmentWritebackRequiresPmsConnector: true, clinicalAdviceBlocked: true }),
      input.nextAction?.trim() || "Install widget script, approve knowledge base, approve lead forms, and verify scheduling handoff.",
    ],
  );
  await addWebchatAudit(tenantId, "WEBCHAT_CHANNEL_SETTING_UPDATED", "WEB_CHAT", "ALLOWED", { connectorStatus: "CONNECTOR_REQUIRED" });
}

async function buildAiAutoReply(input: {
  tenantId: string;
  conversationId: string;
  body: string;
  analysis: WebchatAnalysis;
  knowledge: { id: string; heading: string | null; pageTitle: string; content: string }[];
  leadCapture: LeadCapture;
  qualification: { leadScore: number; qualificationStage: string; nextBestAction: string };
}): Promise<WebchatAiDecision> {
  const schedulingReply = await buildSchedulingReply(input);
  if (schedulingReply) return schedulingReply;

  const handoffReason = classifyStaffHandoff(input.analysis, input.body);
  if (handoffReason) {
    return {
      body: handoffReason === "LIVE_PERSON_REQUEST"
        ? "Absolutely. I’m bringing this to the dental team so a live person can help you from here."
        : "I’m going to bring this to the dental team for review so you get the right help safely.",
      automationMode: "STAFF_TAKEOVER",
      handoffReason,
      actionStatus: "STAFF_REQUIRED",
      deliveryStatus: "SENT",
      provider: "WEB_CHAT",
      providerStatus: "DELIVERED_TO_WIDGET",
      model: "handoff_policy",
    };
  }

  const openAiReply = await generateOpenAiReply(input);
  if (openAiReply) {
    return {
      body: sanitizePatientReply(openAiReply, input.analysis),
      automationMode: "AI_AUTO",
      handoffReason: null,
      actionStatus: input.analysis.actionStatus ?? "AI_AUTO_RESPONDED",
      deliveryStatus: "SENT",
      provider: "WEB_CHAT",
      providerStatus: "DELIVERED_TO_WIDGET",
      model: process.env.OPENAI_WEBCHAT_MODEL || "gpt-4o-mini",
    };
  }

  const fallback = buildReply(input.analysis, input.knowledge);
  return {
    body: sanitizePatientReply(fallback.body, input.analysis),
    automationMode: "AI_AUTO",
    handoffReason: null,
    actionStatus: "AI_RULES_FALLBACK_RESPONDED",
    deliveryStatus: process.env.OPENAI_API_KEY ? "SENT" : "SENT_WITH_RULES_FALLBACK",
    provider: process.env.OPENAI_API_KEY ? "WEB_CHAT" : "RULES_ENGINE",
    providerStatus: process.env.OPENAI_API_KEY ? "DELIVERED_TO_WIDGET" : "OPENAI_NOT_CONFIGURED",
    model: process.env.OPENAI_API_KEY ? "rules_fallback_after_openai_error" : "rules_fallback_openai_not_configured",
  };
}

async function buildSchedulingReply(input: {
  tenantId: string;
  conversationId: string;
  body: string;
  analysis: WebchatAnalysis;
  leadCapture: LeadCapture;
  qualification: { leadScore: number; qualificationStage: string; nextBestAction: string };
}): Promise<WebchatAiDecision | null> {
  if (!["SCHEDULE_APPOINTMENT", "RESCHEDULE_APPOINTMENT"].includes(input.analysis.intent)) return null;

  if (input.analysis.intent === "RESCHEDULE_APPOINTMENT") {
    return buildRescheduleReply(input);
  }

  const selectedIndex = parseSlotSelection(input.body);
  if (selectedIndex !== null) {
    const offer = await getLatestSchedulingOffer(input.tenantId, input.conversationId);
    if (!offer) {
      return schedulingDecision(
        "I can book that. Which type of visit should I look for: cleaning, new patient exam, emergency visit, implant consult, or another treatment?",
        "SCHEDULING_NEEDS_PROCEDURE",
        "NEEDS_PROCEDURE",
        { reason: "NO_ACTIVE_SLOT_OFFER" },
      );
    }
    const slot = offer.options[selectedIndex];
    if (!slot) {
      return schedulingDecision(
        `I offered ${offer.options.length} openings. Reply with one of those numbers, or tell me a different day and I’ll check again.`,
        "SCHEDULING_SELECTION_INVALID",
        "INVALID_SLOT_SELECTION",
        { offeredCount: offer.options.length },
      );
    }
    return bookOfferedSlot({ ...input, offer, slot });
  }

  const procedure = inferSchedulingProcedure(input.body, input.leadCapture.serviceLine);
  if (!procedure) {
    return schedulingDecision(
      "What would you like to book: cleaning, new patient exam, emergency visit, implant consult, or another treatment?",
      "SCHEDULING_NEEDS_PROCEDURE",
      "NEEDS_PROCEDURE",
      { reason: "PROCEDURE_REQUIRED" },
    );
  }

  const slots = await getOnlineSchedulingAvailability(procedure.slug, input.tenantId);
  const requestedDay = inferRequestedDay(input.body);
  const dayFiltered = filterSlotsByRequestedDay(slots, requestedDay);
  const options = (dayFiltered.length ? dayFiltered : slots).slice(0, 5);

  if (!options.length) {
    return schedulingDecision(
      `I don’t see online-bookable openings for ${procedure.label.toLowerCase()} right now. I’m alerting the front desk to review the schedule manually.`,
      "SCHEDULING_NO_SLOTS_AVAILABLE",
      "NO_AVAILABLE_SLOTS",
      { slug: procedure.slug, serviceLabel: procedure.label, requestedDay },
    );
  }

  const dayPrefix = requestedDay === "today" && dayFiltered.length === 0
    ? "I don’t see an online-bookable opening today, but I found the next available times:"
    : `I found these openings for ${procedure.label.toLowerCase()}:`;
  const body = [
    dayPrefix,
    ...options.map((slot, index) => `${index + 1}. ${formatSlot(slot)}`),
    "Reply with the number you want and I’ll book it into the calendar.",
  ].join("\n");

  return schedulingDecision(body, "PMS_SLOTS_OFFERED", "SLOTS_READ_FROM_PMS", {
    kind: "SLOT_OFFER",
    slug: procedure.slug,
    serviceLabel: procedure.label,
    requestedDay,
    options,
  });
}

async function buildRescheduleReply(input: {
  tenantId: string;
  conversationId: string;
  body: string;
  leadCapture: LeadCapture;
}): Promise<WebchatAiDecision> {
  const contact = await getConversationContact(input.tenantId, input.conversationId, input.leadCapture);
  const phoneDigits = digits(contact.visitorPhone);
  const email = contact.visitorEmail?.trim() || "";
  if (!phoneDigits && !email) {
    return schedulingDecision(
      "I can help reschedule. Please share the phone number or email on the appointment so I can find it first.",
      "RESCHEDULE_IDENTITY_NEEDED",
      "IDENTITY_NEEDED",
      { reason: "CONTACT_REQUIRED" },
    );
  }
  const appointments = await query<{
    id: string;
    startsAt: string;
    appointmentType: string;
    providerName: string | null;
  }>(
    `select a."id", a."startsAt"::text as "startsAt", a."appointmentType", pr."displayName" as "providerName"
     from "PmsAppointment" a
     join "PmsPatient" p on p."id" = a."patientId"
     left join "PmsProvider" pr on pr."id" = a."providerId"
     where a."tenantId" = $1
       and a."status" not in ('CANCELED', 'NO_SHOW', 'BROKEN', 'COMPLETED')
       and a."startsAt" >= current_timestamp
       and (
        ($2 <> '' and regexp_replace(coalesce(p."phone", ''), '[^0-9]', '', 'g') = $2)
        or ($3 <> '' and lower(coalesce(p."email", '')) = lower($3))
       )
     order by a."startsAt"
     limit 3`,
    [input.tenantId, phoneDigits, email],
  );
  if (!appointments.rows.length) {
    return schedulingDecision(
      "I couldn’t find an upcoming appointment from that phone or email. Please share the appointment date or another contact detail and I’ll check again.",
      "RESCHEDULE_APPOINTMENT_NOT_FOUND",
      "APPOINTMENT_NOT_FOUND",
      { contactMatched: false },
    );
  }
  const sameDay = appointments.rows.some((appointment) => isToday(appointment.startsAt));
  if (sameDay) {
    return schedulingDecision(
      `I found ${formatExistingAppointment(appointments.rows[0])}. Same-day changes need the front desk or practice manager to approve the move so the chair schedule stays accurate. I’ve flagged this conversation for immediate review.`,
      "RESCHEDULE_SAME_DAY_APPROVAL_REQUIRED",
      "SAME_DAY_APPROVAL_REQUIRED",
      { appointmentId: appointments.rows[0].id },
    );
  }
  const procedure = inferSchedulingProcedure(input.body, appointments.rows[0].appointmentType) ?? { slug: "new-patient-exam", label: appointments.rows[0].appointmentType || "visit" };
  const slots = (await getOnlineSchedulingAvailability(procedure.slug, input.tenantId)).slice(0, 5);
  if (!slots.length) {
    return schedulingDecision(
      `I found ${formatExistingAppointment(appointments.rows[0])}, but I don’t see open online reschedule times right now. I’m flagging the front desk to review the schedule manually.`,
      "RESCHEDULE_NO_SLOTS_AVAILABLE",
      "NO_AVAILABLE_SLOTS",
      { appointmentId: appointments.rows[0].id },
    );
  }
  return schedulingDecision(
    [
      `I found ${formatExistingAppointment(appointments.rows[0])}. Here are replacement openings:`,
      ...slots.map((slot, index) => `${index + 1}. ${formatSlot(slot)}`),
      "Reply with the number you want. If this becomes a same-day change, staff approval is required before the calendar is moved.",
    ].join("\n"),
    "RESCHEDULE_SLOTS_OFFERED",
    "SLOTS_READ_FROM_PMS",
    { kind: "RESCHEDULE_SLOT_OFFER", appointmentId: appointments.rows[0].id, slug: procedure.slug, serviceLabel: procedure.label, options: slots },
  );
}

async function bookOfferedSlot(input: {
  tenantId: string;
  conversationId: string;
  body: string;
  leadCapture: LeadCapture;
  offer: SchedulingOffer;
  slot: PmsOnlineSlot;
}): Promise<WebchatAiDecision> {
  const contact = await getConversationContact(input.tenantId, input.conversationId, input.leadCapture);
  const name = splitPatientName(contact.visitorName);
  const missing = [
    !name.firstName ? "name" : null,
    !contact.visitorPhone ? "phone number" : null,
    !contact.visitorEmail ? "email" : null,
  ].filter(Boolean);
  if (missing.length) {
    return schedulingDecision(
      `I can book that time. Please share your ${missing.join(", ")} so I can put it on the calendar.`,
      "SCHEDULING_CONTACT_NEEDED",
      "CONTACT_REQUIRED",
      { reason: "CONTACT_REQUIRED", missing, selectedSlot: input.slot },
    );
  }

  let booking: { bookingId: string; appointmentId: string; patientId: string; isReturningPatient: boolean };
  try {
    booking = await submitOnlineBooking({
      tenantId: input.tenantId,
      slug: input.offer.slug,
      startsAt: input.slot.startsAt,
      providerId: input.slot.providerId,
      operatoryId: input.slot.operatoryId,
      firstName: name.firstName,
      lastName: name.lastName || "Patient",
      phone: contact.visitorPhone,
      email: contact.visitorEmail,
      patientNote: `Booked from webchat. Visitor said: ${input.body.slice(0, 180)}`,
      utmSource: "webchat",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "That appointment time is no longer available.";
    const procedure = { slug: input.offer.slug, label: input.offer.serviceLabel };
    const fresh = (await getOnlineSchedulingAvailability(procedure.slug, input.tenantId)).slice(0, 5);
    const body = fresh.length
      ? [
          `${message}. Here are the current openings:`,
          ...fresh.map((slot, index) => `${index + 1}. ${formatSlot(slot)}`),
          "Reply with the number you want and I’ll book that time.",
        ].join("\n")
      : `${message}. I don’t see another online-bookable slot right now, so I’m flagging this for the front desk.`;
    return schedulingDecision(body, "SCHEDULING_SLOT_REFRESHED", "SLOT_RECHECK_FAILED", {
      kind: "SLOT_OFFER",
      slug: procedure.slug,
      serviceLabel: procedure.label,
      options: fresh,
      blockedReason: message,
    });
  }

  const confirmation = await stageAndSendAppointmentConfirmation({
    tenantId: input.tenantId,
    conversationId: input.conversationId,
    appointmentId: booking.appointmentId,
    patientId: booking.patientId,
    phone: contact.visitorPhone,
    consentAccepted: Boolean(contact.consentAccepted),
    slot: input.slot,
    serviceLabel: input.offer.serviceLabel,
  }).catch((error) => ({
    smsDeliveryStatus: "CONFIRMATION_QUEUE_ERROR",
    reason: error instanceof Error ? error.message : "Confirmation queue failed after appointment booking.",
  }));
  await query(
    `insert into "PatientWebChatEvent" ("id", "tenantId", "conversationId", "eventType", "payload")
     values ($1, $2, $3, 'APPOINTMENT_BOOKED_FROM_WEBCHAT', $4::jsonb)`,
    [
      newId("evt"),
      input.tenantId,
      input.conversationId,
      JSON.stringify({ ...booking, slot: input.slot, serviceLabel: input.offer.serviceLabel, confirmation }),
    ],
  ).catch(() => null);
  const confirmationLine = "The confirmation is saved with the appointment.";
  return schedulingDecision(
    `Booked. You’re confirmed for ${input.offer.serviceLabel.toLowerCase()} on ${formatSlot(input.slot)}. ${confirmationLine}`,
    "PMS_APPOINTMENT_BOOKED",
    "BOOKED_TO_PMS",
    {
      kind: "APPOINTMENT_BOOKED",
      appointmentId: booking.appointmentId,
      patientId: booking.patientId,
      bookingId: booking.bookingId,
      isReturningPatient: booking.isReturningPatient,
      slot: input.slot,
      confirmation,
    },
  );
}

async function stageAndSendAppointmentConfirmation(input: {
  tenantId: string;
  conversationId: string;
  appointmentId: string;
  patientId: string;
  phone?: string;
  consentAccepted: boolean;
  slot: PmsOnlineSlot;
  serviceLabel: string;
}) {
  if (!input.phone) return { smsDeliveryStatus: "NOT_ATTEMPTED", reason: "No mobile number provided." };
  const body = `Your ${input.serviceLabel.toLowerCase()} is confirmed for ${formatSlot(input.slot)}. Reply here if you need to change it.`;
  const staged = await createPhoneOutboundMessage({
    tenantId: input.tenantId,
    conversationId: input.conversationId,
    patientId: input.patientId,
    appointmentId: input.appointmentId,
    channel: "SMS",
    recipientNumber: input.phone,
    messageType: "APPOINTMENT_CONFIRMATION",
    body,
    consentStatus: input.consentAccepted ? "VERIFIED" : "UNKNOWN",
    linkType: "ONLINE_SCHEDULING_LINK",
    linkTargetId: input.appointmentId,
    linkLabel: "Appointment confirmation",
  });
  if (!staged || staged.blockedReason) {
    return { smsMessageId: staged?.id ?? null, smsDeliveryStatus: "BLOCKED", reason: staged?.blockedReason ?? "SMS connector or consent is not ready." };
  }
  await updatePhoneOutboundMessageApproval(staged.id, "APPROVED_STAGED", "webchat_ai_scheduler");
  await sendApprovedPhoneOutboundMessage(staged.id, "webchat_ai_scheduler");
  const result = await query<{ deliveryStatus: string; provider: string | null; providerMessageId: string | null; blockedReason: string | null; providerError: string | null }>(
    `select "deliveryStatus", "provider", "providerMessageId", "blockedReason", "providerError"
     from "PhoneOutboundMessage"
     where "id" = $1`,
    [staged.id],
  );
  return { smsMessageId: staged.id, ...(result.rows[0] ?? { deliveryStatus: "UNKNOWN" }) };
}

function schedulingDecision(body: string, actionStatus: string, providerStatus: string, metadata: Record<string, unknown>): WebchatAiDecision {
  return {
    body,
    automationMode: actionStatus.includes("APPROVAL_REQUIRED") ? "STAFF_TAKEOVER" : "AI_AUTO",
    handoffReason: actionStatus.includes("APPROVAL_REQUIRED") ? actionStatus : null,
    actionStatus,
    deliveryStatus: "SENT",
    provider: "PMS_SCHEDULING",
    providerStatus,
    model: "pms_scheduling_engine_v1",
    metadata,
  };
}

async function getLatestSchedulingOffer(tenantId: string, conversationId: string): Promise<SchedulingOffer | null> {
  const result = await query<{ metadata: unknown }>(
    `select "metadata"
     from "PatientWebChatMessage"
     where "tenantId" = $1
       and "conversationId" = $2
       and "senderType" = 'ASSISTANT'
       and "metadata"->'scheduling'->>'kind' = 'SLOT_OFFER'
     order by "createdAt" desc
     limit 1`,
    [tenantId, conversationId],
  );
  const metadata = result.rows[0]?.metadata as { scheduling?: Partial<SchedulingOffer> } | undefined;
  const scheduling = metadata?.scheduling;
  if (!scheduling?.slug || !scheduling?.serviceLabel || !Array.isArray(scheduling.options)) return null;
  return {
    slug: String(scheduling.slug),
    serviceLabel: String(scheduling.serviceLabel),
    requestedDay: String(scheduling.requestedDay ?? "any"),
    options: scheduling.options as PmsOnlineSlot[],
  };
}

async function getConversationContact(tenantId: string, conversationId: string, leadCapture: LeadCapture) {
  const result = await query<{ visitorName: string | null; visitorPhone: string | null; visitorEmail: string | null }>(
    `select "visitorName", "visitorPhone", "visitorEmail"
     from "PatientWebChatConversation"
     where "tenantId" = $1 and "id" = $2
     limit 1`,
    [tenantId, conversationId],
  );
  const row = result.rows[0];
  return {
    visitorName: leadCapture.visitorName || row?.visitorName || "",
    visitorPhone: leadCapture.visitorPhone || row?.visitorPhone || "",
    visitorEmail: leadCapture.visitorEmail || row?.visitorEmail || "",
    consentAccepted: leadCapture.consentAccepted === true,
  };
}

function inferSchedulingProcedure(body: string, serviceLine?: string) {
  const text = `${body} ${serviceLine ?? ""}`.toLowerCase();
  if (/(emergency|pain|swelling|broken|trauma|toothache|bleeding)/.test(text)) return { slug: "emergency-exam", label: "Emergency exam" };
  if (/(cleaning|hygiene|recall|recare|prophy)/.test(text)) return { slug: "hygiene-recare", label: "Hygiene cleaning" };
  if (/(implant|aligner|invisalign|whitening|cosmetic|consult|crown|filling|root canal|exam|new patient|checkup)/.test(text)) return { slug: "new-patient-exam", label: text.includes("implant") ? "Implant consultation" : "New patient exam" };
  return null;
}

function parseSlotSelection(body: string) {
  const text = body.toLowerCase().trim();
  const wordMap: Record<string, number> = { first: 0, one: 0, second: 1, two: 1, third: 2, three: 2, fourth: 3, four: 3, fifth: 4, five: 4 };
  if (wordMap[text] !== undefined) return wordMap[text];
  const match = text.match(/(?:option|slot|number|book)?\s*([1-5])\b/);
  return match ? Number(match[1]) - 1 : null;
}

function inferRequestedDay(body: string) {
  const text = body.toLowerCase();
  if (/\btoday\b/.test(text)) return "today";
  if (/\btomorrow\b/.test(text)) return "tomorrow";
  return "any";
}

function filterSlotsByRequestedDay(slots: PmsOnlineSlot[], requestedDay: string) {
  if (requestedDay === "any") return slots;
  const target = new Date();
  target.setHours(0, 0, 0, 0);
  if (requestedDay === "tomorrow") target.setDate(target.getDate() + 1);
  return slots.filter((slot) => {
    const startsAt = new Date(slot.startsAt);
    return startsAt.getFullYear() === target.getFullYear() && startsAt.getMonth() === target.getMonth() && startsAt.getDate() === target.getDate();
  });
}

function formatSlot(slot: PmsOnlineSlot) {
  const startsAt = new Date(slot.startsAt);
  const date = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(startsAt);
  return `${date} with ${slot.providerName} in ${slot.operatoryName}`;
}

function formatExistingAppointment(appointment: { startsAt: string; appointmentType: string; providerName: string | null }) {
  const startsAt = new Date(appointment.startsAt);
  const date = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(startsAt);
  return `${appointment.appointmentType} on ${date}${appointment.providerName ? ` with ${appointment.providerName}` : ""}`;
}

function splitPatientName(name?: string) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") || "" };
}

function digits(value?: string) {
  return value?.replace(/\D/g, "") ?? "";
}

function isToday(value: string) {
  const date = new Date(value);
  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
}

function classifyStaffHandoff(analysis: WebchatAnalysis, body: string) {
  const text = body.toLowerCase();
  if (analysis.intent === "LIVE_PERSON_REQUEST") return "LIVE_PERSON_REQUEST";
  if (/(suicide|chest pain|can't breathe|unconscious|911)/.test(text)) return "EMERGENCY_SAFETY";
  if (analysis.intent === "EMERGENCY_TRIAGE") return "DENTAL_EMERGENCY_REVIEW";
  if (analysis.confidence < 55) return "LOW_CONFIDENCE";
  return null;
}

async function generateOpenAiReply(input: {
  body: string;
  analysis: WebchatAnalysis;
  knowledge: { heading: string | null; pageTitle: string; content: string }[];
  qualification: { leadScore: number; qualificationStage: string; nextBestAction: string };
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.OPENAI_WEBCHAT_MODEL || "gpt-4o-mini";
  const knowledgeText = input.knowledge.slice(0, 4).map((row, index) => {
    const title = row.heading || row.pageTitle || `Source ${index + 1}`;
    return `${index + 1}. ${title}: ${row.content.slice(0, 700)}`;
  }).join("\n");
  const system = [
    "You are the patient-facing webchat assistant for a dental practice.",
    "Write like a helpful front desk assistant speaking to a patient, not like a software system.",
    "Never mention internal systems, PMS, RCM, writeback, connectors, workflows, claims, provider approvals, guardrails, statuses, or implementation limits.",
    "Do not diagnose, prescribe, or quote guaranteed insurance benefits.",
    "Booking requests are handled by the scheduling engine before this prompt. If a booking question reaches you, ask what procedure the visitor wants.",
    "For insurance or pricing, ask for the plan name and treatment and say the team will review before giving an estimate.",
    "Keep answers concise, warm, and dental-practice appropriate.",
    "Use approved patient-facing knowledge only. If knowledge sounds like product documentation or operations language, ignore it.",
  ].join(" ");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 220,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            `Visitor message: ${input.body}`,
            `Intent: ${input.analysis.intent}`,
            `Sentiment: ${input.analysis.sentiment}`,
            `Lead stage: ${input.qualification.qualificationStage}`,
            `Next best action: ${input.qualification.nextBestAction}`,
            knowledgeText ? `Approved knowledge:\n${knowledgeText}` : "Approved knowledge: none available",
          ].join("\n\n"),
        },
      ],
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return null;
  const content = data?.choices?.[0]?.message?.content;
  return typeof content === "string" && content.trim() ? content.trim() : null;
}

function sanitizePatientReply(reply: string, analysis: WebchatAnalysis) {
  const text = reply.trim();
  const forbidden =
    /PMS|RCM|writeback|connector|workflow|claim|provider approval|guardrail|approved knowledge base|STAFF_|AI_RULES|SENT_WITH|ANSWERED_WITH|RECEIVED|delivery|automation mode|cannot finalize|blocked|staged|route this to the right dental team member/i;
  if (!text || forbidden.test(text)) {
    return patientSafeFallback(analysis);
  }
  return text;
}

function patientSafeFallback(analysis: WebchatAnalysis) {
  if (analysis.intent === "SCHEDULE_APPOINTMENT") {
    return "What would you like to book: cleaning, new patient exam, emergency visit, implant consult, or another treatment?";
  }
  if (analysis.intent === "RESCHEDULE_APPOINTMENT") {
    return "I can help start that request. Please share the appointment you want to move and your preferred time window. The team will verify your details before changing anything.";
  }
  if (analysis.intent === "INSURANCE_OR_PRICE") {
    return "I can help get that reviewed. Please share your insurance plan name and the treatment you are asking about, and the team will confirm details before giving an estimate.";
  }
  if (analysis.intent === "EMERGENCY_TRIAGE") {
    return "I’m going to flag this as urgent for the practice team. If you have severe swelling, uncontrolled bleeding, trauma, or trouble breathing, call emergency services now. Please share what happened and the best number to reach you.";
  }
  if (analysis.intent === "LIVE_PERSON_REQUEST") {
    return "Absolutely. I’m bringing this to the front desk so a live person can help you from here.";
  }
  return "I can help with appointments, services, insurance questions, forms, and follow-up requests. What would you like help with today?";
}

export async function ingestSmsIntoAiConversation(input: { tenantId?: string; from: string; to: string; body: string; providerMessageId?: string }) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const existing = await query<{ id: string }>(
    `select "id"
     from "PatientWebChatConversation"
     where "tenantId" = $1 and "sourceChannel" = 'SMS' and "visitorPhone" = $2 and "status" = 'OPEN'
     order by "updatedAt" desc
     limit 1`,
    [tenantId, input.from],
  );
  let conversationId = existing.rows[0]?.id;
  if (!conversationId) {
    conversationId = newId("chat");
    await query(
      `insert into "PatientWebChatConversation"
        ("id", "tenantId", "visitorPhone", "sourcePage", "sourceChannel", "status", "transcriptSummary", "schedulingOutcome", "pmsWritebackStatus", "ownerRoleKey", "nextBestAction", "automationMode", "staffOwnerDueAt")
       values ($1, $2, $3, $4, 'SMS', 'OPEN', $5, 'NOT_ATTEMPTED', 'PMS_CONNECTOR_REQUIRED', 'front_desk', 'AI will respond automatically unless staff takeover is required.', 'AI_AUTO', current_timestamp + interval '30 minutes')`,
      [conversationId, tenantId, input.from, `SMS:${input.to}`, `SMS conversation started from ${input.from}.`],
    );
  }
  const result = await postWebchatMessage({
    tenantId,
    conversationId,
    body: input.body,
    senderName: input.from,
    leadCapture: {
      visitorPhone: input.from,
      sourceChannel: "SMS",
      consentAccepted: true,
    },
  });
  return { conversationId, ...result };
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
  const context = knowledgeExcerpt || "I can help with appointments, services, insurance questions, forms, and follow-up requests.";
  if (analysis.intent === "SCHEDULE_APPOINTMENT") {
    return { body: "What would you like to book: cleaning, new patient exam, emergency visit, implant consult, or another treatment?" };
  }
  if (analysis.intent === "RESCHEDULE_APPOINTMENT") {
    return { body: "I can help start that request. Please share the appointment you want to move and your preferred time window. The team will verify your details before changing anything." };
  }
  if (analysis.intent === "EMERGENCY_TRIAGE") {
    return { body: "I’m going to flag this as urgent for the practice team. If you have severe swelling, uncontrolled bleeding, trauma, or trouble breathing, call emergency services now. Please share what happened and the best number to reach you." };
  }
  if (analysis.intent === "INSURANCE_OR_PRICE") {
    return { body: `I can pass this to the team for review. ${context}\n\nFor insurance or financing, please share your plan name and the treatment you are asking about. The team will confirm details before giving any estimate.` };
  }
  return { body: `${context}\n\nWhat would you like help with today?` };
}

function summarizeKnowledge(row?: { content: string; heading: string | null; pageTitle: string }) {
  if (!row?.content) return "";
  const title = row.heading || row.pageTitle;
  if (/1DentalAI|operating system|workflow|PMS|RCM|claim|provider approval|Product\s+Solutions\s+Features|first ring|final payment|patient timeline/i.test(row.content)) {
    return "";
  }
  const text = row.content
    .replace(/\s+/g, " ")
    .replace(/\b(Product|Solutions|Features|Use Cases|Workflows|Resources|Blog|About|Contact|Open platform|Request access|PMS|RCM|AI|workflow|claim|provider approval)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text || text.length < 80) return "";
  const sentences = text.split(/(?<=[.!?])\s+/).filter((sentence) => sentence.length > 35);
  const excerpt = (sentences.slice(0, 2).join(" ") || text).slice(0, 420).trim();
  if (!excerpt || /ssed calls|insurance blockers|unscheduled treatment|review recovery|claim delays|patient timeline/i.test(excerpt)) return "";
  return `${title && !/1DentalAI|Product/i.test(title) ? `${title}: ` : ""}${excerpt}${excerpt.length >= 420 ? "..." : ""}`;
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
