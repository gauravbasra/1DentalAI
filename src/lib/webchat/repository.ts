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
  const result = await query(
    `select *
     from "PatientEngagementChannelSetting"
     where "tenantId" = $1 and "channel" = 'WEB_CHAT'
     limit 1`,
    [tenantId],
  );
  return result.rows[0] ?? null;
}

export async function createWebchatSession(input: {
  tenantId?: string;
  visitorName?: string;
  visitorPhone?: string;
  visitorEmail?: string;
  sourcePage?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("chat");
  await query(
    `insert into "PatientWebChatConversation"
      ("id", "tenantId", "visitorName", "visitorPhone", "visitorEmail", "sourcePage", "status", "transcriptSummary", "schedulingOutcome", "pmsWritebackStatus", "ownerRoleKey", "blockedReason")
     values ($1, $2, $3, $4, $5, $6, 'OPEN', 'Conversation started from website widget.', 'NOT_ATTEMPTED', 'PMS_CONNECTOR_REQUIRED', 'front_desk', null)`,
    [id, tenantId, input.visitorName || null, input.visitorPhone || null, input.visitorEmail || null, input.sourcePage || null],
  );
  await query(
    `insert into "PatientWebChatEvent" ("id", "tenantId", "conversationId", "eventType", "pageUrl", "payload")
     values ($1, $2, $3, 'SESSION_STARTED', $4, $5::jsonb)`,
    [newId("evt"), tenantId, id, input.sourcePage || null, JSON.stringify({ source: "webchat_widget" })],
  );
  await addWebchatAudit(tenantId, "SESSION_STARTED", id, "ALLOWED", {
    sourcePage: input.sourcePage ?? null,
    hasPhone: Boolean(input.visitorPhone),
    hasEmail: Boolean(input.visitorEmail),
  });
  return { id, tenantId };
}

export async function getConversationMessages(conversationId: string, tenantId = defaultTenantId) {
  const result = await query(
    `select *
     from "PatientWebChatMessage"
     where "tenantId" = $1 and "conversationId" = $2
     order by "createdAt" asc`,
    [tenantId, conversationId],
  );
  return result.rows;
}

export async function postWebchatMessage(input: {
  tenantId?: string;
  conversationId: string;
  body: string;
  senderName?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const analysis = analyzeMessage(input.body);
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
      JSON.stringify({ analyzer: "rules_v1", externalAiUsed: false }),
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
      JSON.stringify({ sourceTitles: knowledge.map((row) => row.heading ?? row.pageTitle), noClinicalDiagnosis: true, noExternalBooking: true }),
    ],
  );

  await query(
    `update "PatientWebChatConversation"
     set "nlpIntent" = $3,
         "nlpConfidence" = $4,
         "transcriptSummary" = $5,
         "schedulingOutcome" = case when $3 in ('SCHEDULE_APPOINTMENT','RESCHEDULE_APPOINTMENT') then $6 else "schedulingOutcome" end,
         "pmsWritebackStatus" = case when $3 in ('SCHEDULE_APPOINTMENT','RESCHEDULE_APPOINTMENT') then 'PMS_CONNECTOR_REQUIRED' else "pmsWritebackStatus" end,
         "blockedReason" = case when $3 in ('SCHEDULE_APPOINTMENT','RESCHEDULE_APPOINTMENT') then 'PMS scheduling/writeback connector is not approved; staff must complete appointment work.' else "blockedReason" end,
         "updatedAt" = current_timestamp
     where "tenantId" = $1 and "id" = $2`,
    [tenantId, input.conversationId, analysis.intent, analysis.confidence, `Latest visitor intent: ${analysis.intent}. ${input.body.slice(0, 180)}`, analysis.actionStatus ?? "STAFF_APPROVAL_REQUIRED"],
  );

  if (analysis.actionType && analysis.actionType !== "KNOWLEDGE_RESPONSE") {
    await createWebchatTask({ tenantId, conversationId: input.conversationId, analysis, body: input.body });
  }
  await addWebchatAudit(tenantId, "WEBCHAT_MESSAGE_PROCESSED", input.conversationId, "ALLOWED", {
    intent: analysis.intent,
    actionType: analysis.actionType ?? null,
    actionStatus: analysis.actionStatus ?? null,
    connectorBlocked: analysis.actionStatus !== "ANSWERED_WITH_GUARDRAILS",
  });

  return { userMessageId, replyId, reply, analysis };
}

async function createWebchatTask(input: { tenantId: string; conversationId: string; analysis: WebchatAnalysis; body: string }) {
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
      input.analysis.sentiment === "URGENT" ? "HIGH" : "NORMAL",
      input.analysis.intent === "INSURANCE_OR_PRICE" ? "treatment_coordinator" : "front_desk",
      `Review webchat ${input.analysis.intent.toLowerCase().replaceAll("_", " ")}. Do not claim booking/writeback until PMS connector is approved. Visitor said: ${input.body.slice(0, 160)}`,
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
  const context = knowledge[0]?.content ? `Here is what I can share: ${knowledge[0].content}` : "I can help route this to the right dental team member.";
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
