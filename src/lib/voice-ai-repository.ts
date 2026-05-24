import { newId, query } from "@/lib/db";
import { getOpenAiWebchatConfig } from "@/lib/connector-control-repository";
import { defaultTenantId } from "@/lib/pms-repository";
import { createTwilioCall, updateTwilioCall, twilioXmlEscape } from "@/lib/twilio-provider";

type VoiceScenario = "recall" | "reactivation" | "appointment_reminder" | "event_greeting" | "inbound_takeover";
type TwilioPayload = Record<string, string>;

const defaultOrigin = () => process.env.ONE_DENTAL_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.1dentalai.com";

export async function getVoiceAiReceptionPolicy(tenantId = defaultTenantId) {
  const result = await query<{ ringThreshold: number; voiceSettings: unknown; bookingPolicy: string; billingPolicy: string; pricingPolicy: string }>(
    `select "ringThreshold", "voiceSettings", "bookingPolicy", "billingPolicy", "pricingPolicy"
     from "PhoneAiReceptionPolicy"
     where "tenantId" = $1 and "status" in ('ACTIVE','READY_FOR_SMOKE_TEST')
     order by "updatedAt" desc
     limit 1`,
    [tenantId],
  );
  const row = result.rows[0];
  return {
    ringThreshold: Math.max(2, Math.min(8, Number(row?.ringThreshold ?? 4) || 4)),
    voiceSettings: objectValue(row?.voiceSettings),
    bookingPolicy: row?.bookingPolicy || "BOOK_WITH_PROVIDER_AVAILABILITY",
    billingPolicy: row?.billingPolicy || "ANSWER_BALANCE_QUESTIONS_WITH_IDENTITY_CHECK",
    pricingPolicy: row?.pricingPolicy || "NO_PRICING_WITHOUT_STAFF",
  };
}

export async function buildVoiceAiStartTwiML(input: {
  tenantId?: string;
  conversationId?: string | null;
  activeCallId?: string | null;
  scenario?: string | null;
  reason?: string | null;
  payload?: TwilioPayload;
}) {
  if (input.payload?.DialCallStatus === "completed") {
    return `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  }
  const tenantId = input.tenantId ?? defaultTenantId;
  const conversationId = await ensureVoiceConversation({
    tenantId,
    conversationId: input.conversationId || undefined,
    payload: input.payload,
    scenario: normalizeScenario(input.scenario),
  });
  const scenario = normalizeScenario(input.scenario);
  const text = greetingForScenario(scenario, input.reason || undefined);
  await markAiTakeover(tenantId, conversationId, scenario, text, input.payload);
  return buildGatherTwiML({ tenantId, conversationId, scenario, text });
}

export async function handleVoiceAiTurn(input: {
  tenantId?: string;
  conversationId?: string | null;
  scenario?: string | null;
  payload: TwilioPayload;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const scenario = normalizeScenario(input.scenario);
  const conversationId = await ensureVoiceConversation({
    tenantId,
    conversationId: input.conversationId || undefined,
    payload: input.payload,
    scenario,
  });
  const speech = (input.payload.SpeechResult || input.payload.Digits || "").trim();
  if (speech) {
    await query(
      `insert into "PhoneCallTranscriptEvent"
       ("id", "tenantId", "conversationId", "speaker", "transcriptText", "confidence", "languageCode", "isFinal", "metadata")
       values ($1, $2, $3, 'CALLER', $4, $5, 'en-US', true, $6::jsonb)`,
      [newId("ptrx"), tenantId, conversationId, speech, Number(input.payload.Confidence || 0) || null, JSON.stringify(redactTwilio(input.payload))],
    );
  }
  const reply = await generateVoiceReply({ tenantId, conversationId, scenario, speech });
  await query(
    `insert into "PhoneCallTranscriptEvent"
     ("id", "tenantId", "conversationId", "speaker", "transcriptText", "languageCode", "isFinal", "metadata")
     values ($1, $2, $3, 'AI_AGENT', $4, 'en-US', true, $5::jsonb)`,
    [newId("ptrx"), tenantId, conversationId, reply, JSON.stringify({ scenario, source: "voice_ai" })],
  );
  await query(
    `update "PhoneConversation"
     set "aiIntent" = $3,
       "aiSentiment" = case when lower($4) like '%angry%' or lower($4) like '%upset%' then 'SERVICE_RISK' else coalesce("aiSentiment", 'NEUTRAL') end,
       "transcriptSummary" = $5,
       "followUpStatus" = 'AI_VOICE_ACTIVE',
       "updatedAt" = current_timestamp
     where "tenantId" = $1 and "id" = $2`,
    [tenantId, conversationId, scenario.toUpperCase(), speech, `Voice AI turn: caller said "${speech || "no input"}"; assistant replied "${reply.slice(0, 300)}"`],
  );
  return buildGatherTwiML({ tenantId, conversationId, scenario, text: reply });
}

export async function createVoiceAiTestCall(input: {
  tenantId?: string;
  toNumber: string;
  scenario?: string;
  actorRole?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const toNumber = normalizePhoneNumber(input.toNumber);
  if (!toNumber) throw new Error("A destination phone number is required.");
  const fromNumber = await getActiveVoiceFromNumber(tenantId);
  if (!fromNumber) throw new Error("No active Twilio voice number is configured for this tenant.");
  const scenario = normalizeScenario(input.scenario);
  const conversationId = newId("phone");
  await query(
    `insert into "PhoneConversation"
     ("id", "tenantId", "direction", "channel", "status", "callerNumber", "practiceNumber", "callerName", "aiIntent", "aiSentiment", "transcriptSummary", "followUpStatus", "outcome", "updatedAt")
     values ($1, $2, 'OUTBOUND', 'VOICE', 'OPEN', $3, $4, 'Voice AI test recipient', $5, 'NEUTRAL', $6, 'VOICE_AI_TEST_CALL_CREATED', 'VOICE_AI_TEST_CALL', current_timestamp)`,
    [conversationId, tenantId, toNumber, fromNumber, scenario.toUpperCase(), `Voice AI ${scenario.replaceAll("_", " ")} test call created by ${input.actorRole || "front_desk"}.`],
  );
  const activeCallId = newId("pcall");
  await query(
    `insert into "PhoneActiveCall"
     ("id", "tenantId", "conversationId", "fromNumber", "toNumber", "direction", "callState", "callControlMode", "updatedAt")
     values ($1, $2, $3, $4, $5, 'OUTBOUND', 'INITIATED', 'TWILIO_AI_VOICE', current_timestamp)`,
    [activeCallId, tenantId, conversationId, fromNumber, toNumber],
  );
  const origin = defaultOrigin();
  const result = await createTwilioCall({
    tenantId,
    from: fromNumber,
    to: toNumber,
    statusCallback: `${origin}/api/twilio/voice/status`,
    twiml: `<?xml version="1.0" encoding="UTF-8"?><Response><Redirect method="POST">${twilioXmlEscape(`${origin}/api/twilio/voice/ai/start?conversationId=${encodeURIComponent(conversationId)}&scenario=${encodeURIComponent(scenario)}&reason=test_call`)}</Redirect></Response>`,
  });
  await query(
    `update "PhoneActiveCall"
     set "providerCallId" = $3,
       "callState" = case when $4 = 'PROVIDER_ACCEPTED' then 'RINGING' else 'FAILED' end,
       "updatedAt" = current_timestamp
     where "tenantId" = $1 and "id" = $2`,
    [tenantId, activeCallId, result.sid || null, result.providerStatus],
  );
  await audit(tenantId, input.actorRole || "front_desk", "VOICE_AI_TEST_CALL_REQUESTED", "PhoneConversation", conversationId, result.ok ? "ALLOWED" : "BLOCKED", {
    scenario,
    toNumber,
    providerStatus: result.providerStatus,
    providerError: result.error,
    noSecretLogged: true,
  });
  return {
    conversationId,
    activeCallId,
    providerStatus: result.providerStatus,
    sid: result.sid || null,
    status: result.status || null,
    error: result.error || null,
    providerResponse: result.data || null,
  };
}

export async function redirectLiveCallToVoiceAi(input: {
  tenantId: string;
  callSid: string;
  conversationId: string;
  scenario?: string;
}) {
  const origin = defaultOrigin();
  const scenario = normalizeScenario(input.scenario || "inbound_takeover");
  const url = `${origin}/api/twilio/voice/ai/start?conversationId=${encodeURIComponent(input.conversationId)}&scenario=${encodeURIComponent(scenario)}&reason=staff_takeover`;
  const result = await updateTwilioCall({
    tenantId: input.tenantId,
    callSid: input.callSid,
    twiml: `<?xml version="1.0" encoding="UTF-8"?><Response><Redirect method="POST">${twilioXmlEscape(url)}</Redirect></Response>`,
  });
  if (result.ok) {
    await query(
      `update "PhoneConversation"
       set "followUpStatus" = 'AI_VOICE_TAKEOVER',
         "outcome" = 'AI_VOICE_TAKEOVER',
         "updatedAt" = current_timestamp
       where "tenantId" = $1 and "id" = $2`,
      [input.tenantId, input.conversationId],
    );
  }
  return result;
}

async function buildGatherTwiML(input: { tenantId: string; conversationId: string; scenario: VoiceScenario; text: string }) {
  const origin = defaultOrigin();
  await createVoicePromptEvent({
    tenantId: input.tenantId,
    conversationId: input.conversationId,
    scenario: input.scenario,
    text: input.text,
  });
  const action = `${origin}/api/twilio/voice/ai/turn?conversationId=${encodeURIComponent(input.conversationId)}&scenario=${encodeURIComponent(input.scenario)}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech dtmf" action="${twilioXmlEscape(action)}" method="POST" speechTimeout="auto" timeout="6" language="en-US">
    <Say voice="Polly.Joanna-Neural">${twilioXmlEscape(input.text)}</Say>
  </Gather>
  <Redirect method="POST">${twilioXmlEscape(`${action}&noInput=1`)}</Redirect>
</Response>`;
}

async function createVoicePromptEvent(input: { tenantId: string; conversationId: string; scenario: VoiceScenario; text: string }) {
  const id = newId("paie");
  await query(
    `insert into "PhoneCallAiAssistEvent"
     ("id", "tenantId", "conversationId", "eventType", "severity", "title", "body", "metadata")
     values ($1, $2, $3, 'AI_VOICE_PROMPT', 'INFO', $4, $5, $6::jsonb)`,
    [
      id,
      input.tenantId,
      input.conversationId,
      `Voice AI ${input.scenario.replaceAll("_", " ")}`,
      input.text.slice(0, 500),
      JSON.stringify({ voiceText: input.text, scenario: input.scenario }),
    ],
  );
  return id;
}

async function generateVoiceReply(input: { tenantId: string; conversationId: string; scenario: VoiceScenario; speech: string }) {
  const speech = input.speech.trim();
  if (!speech) return "I’m still here. Would you like help scheduling, confirming, rescheduling, or speaking with the front desk?";
  if (/human|person|staff|front desk|representative|office|manager/i.test(speech)) {
    await createVoiceFollowUpTask(input.tenantId, input.conversationId, "The caller asked to speak with a person. Call back or pick up the live transfer if available.");
    return "Absolutely. I’ll get a team member involved. If no one is available right away, I’ll keep this noted for the front desk and they will follow up.";
  }
  if (/price|cost|how much|fee|quote|estimate/i.test(speech)) {
    await createVoiceFollowUpTask(input.tenantId, input.conversationId, "Caller asked about pricing. Qualified staff should review clinical and insurance context before quoting.");
    return "I understand. Costs are important. I can’t quote pricing over this call because it depends on the visit, insurance, and the doctor’s findings, but I can help get you scheduled or have the team follow up.";
  }
  const openAi = await getOpenAiWebchatConfig(input.tenantId).catch(() => null);
  if (!openAi?.apiKey) return ruleBasedVoiceReply(input.scenario, speech);
  const instructions = [
    "You are a warm, human-sounding dental front desk voice assistant for a dental practice.",
    "Speak in one or two short sentences suitable for a phone call.",
    "You can help with recalls, reactivation, appointment reminders, simple scheduling intent, reschedule handoff, forms, directions, and staff callback requests.",
    "Do not discuss pricing, clinical diagnosis, prescriptions, or guaranteed insurance benefits.",
    "If the caller wants pricing, a person, billing detail, urgent symptoms, same-day reschedule, or anything sensitive, offer staff follow-up.",
    "Never mention AI, model, connector, PMS, database, implementation, guardrails, staged, or blocked.",
  ].join(" ");
  const payload = {
    model: openAi.model || "gpt-4o-mini",
    temperature: 0.45,
    max_output_tokens: 120,
    instructions,
    input: `Call scenario: ${input.scenario}\nCaller said: ${speech}\nReply naturally and move the call forward.`,
  };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAi.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => null);
  if (!response?.ok) return ruleBasedVoiceReply(input.scenario, speech);
  const data = await response.json().catch(() => ({}));
  const text = typeof data?.output_text === "string"
    ? data.output_text
    : data?.output?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content ?? []).map((item: { text?: string }) => item.text).filter(Boolean).join(" ");
  return sanitizeVoiceReply(typeof text === "string" ? text : "") || ruleBasedVoiceReply(input.scenario, speech);
}

function ruleBasedVoiceReply(scenario: VoiceScenario, speech: string) {
  if (/yes|schedule|book|appointment|cleaning|exam/i.test(speech)) {
    return "Great. I can help collect the request. What day or time of day works best for you?";
  }
  if (/reschedule|change|move/i.test(speech)) {
    return "I can help start that. For account security, the team will verify your mobile number before changing an appointment.";
  }
  if (/confirm|ok|sounds good/i.test(speech)) {
    return "Perfect, thank you. I’ll mark this as confirmed and the office will have the note on your timeline.";
  }
  if (scenario === "appointment_reminder") return "No problem. Would you like to confirm this appointment or ask the team for a different time?";
  return "Thanks for sharing that. Would you like me to help with scheduling, forms, insurance follow-up, or a staff callback?";
}

function greetingForScenario(scenario: VoiceScenario, reason?: string) {
  if (scenario === "appointment_reminder") {
    return "Hi, this is your dental office calling with a quick appointment reminder. I can help you confirm, ask for a reschedule, or connect you with the front desk. How can I help?";
  }
  if (scenario === "recall") {
    return "Hi, this is your dental office checking in because you may be due for your next hygiene visit. I can help find a good appointment window or have the front desk follow up. What works best for you?";
  }
  if (scenario === "reactivation") {
    return "Hi, this is your dental office. We haven’t seen you in a while and wanted to make it easy to get back on the schedule. Would you like help finding an appointment time?";
  }
  if (scenario === "event_greeting") {
    return "Hi, thanks for calling. I can help with appointments, forms, directions, or getting a message to the right team member. What can I help with today?";
  }
  return reason === "no_answer"
    ? "Hi, the front desk is helping another patient, but I can help right now. I can take a message, help with scheduling, or get the right team member to follow up. What do you need today?"
    : "Hi, I’m here with the dental team. I can help with scheduling, reminders, forms, or a staff callback. What would you like help with?";
}

async function ensureVoiceConversation(input: { tenantId: string; conversationId?: string; payload?: TwilioPayload; scenario: VoiceScenario }) {
  if (input.conversationId) {
    const existing = await query<{ id: string }>(`select "id" from "PhoneConversation" where "tenantId" = $1 and "id" = $2 limit 1`, [input.tenantId, input.conversationId]);
    if (existing.rows[0]) return input.conversationId;
  }
  const id = newId("phone");
  await query(
    `insert into "PhoneConversation"
     ("id", "tenantId", "direction", "channel", "status", "callerNumber", "practiceNumber", "callerName", "aiIntent", "aiSentiment", "transcriptSummary", "followUpStatus", "outcome", "updatedAt")
     values ($1, $2, $3, 'VOICE', 'OPEN', $4, $5, $6, $7, 'NEUTRAL', $8, 'AI_VOICE_ACTIVE', 'AI_VOICE_STARTED', current_timestamp)`,
    [
      id,
      input.tenantId,
      input.payload?.Direction === "outbound-api" ? "OUTBOUND" : "INBOUND",
      input.payload?.From || null,
      input.payload?.To || null,
      input.payload?.CallerName || input.payload?.From || "Voice AI caller",
      input.scenario.toUpperCase(),
      `Voice AI conversation started for ${input.scenario}.`,
    ],
  );
  return id;
}

async function markAiTakeover(tenantId: string, conversationId: string, scenario: VoiceScenario, text: string, payload?: TwilioPayload) {
  await query(
    `update "PhoneConversation"
     set "followUpStatus" = 'AI_VOICE_ACTIVE',
       "outcome" = 'AI_VOICE_ACTIVE',
       "aiIntent" = $3,
       "updatedAt" = current_timestamp
     where "tenantId" = $1 and "id" = $2`,
    [tenantId, conversationId, scenario.toUpperCase()],
  );
  await audit(tenantId, "voice_ai", "VOICE_AI_STARTED", "PhoneConversation", conversationId, "ALLOWED", {
    scenario,
    callSid: payload?.CallSid || null,
    promptPreview: text.slice(0, 180),
  });
}

async function createVoiceFollowUpTask(tenantId: string, conversationId: string, nextAction: string) {
  await query(
    `insert into "PhoneCallTask"
     ("id", "tenantId", "conversationId", "taskType", "priority", "status", "dueAt", "ownerRoleKey", "nextAction", "sourceModule", "updatedAt")
     values ($1, $2, $3, 'AI_VOICE_FOLLOW_UP', 'HIGH', 'OPEN', current_timestamp + interval '15 minutes', 'front_desk', $4, 'VOICE_AI', current_timestamp)`,
    [newId("ptask"), tenantId, conversationId, nextAction],
  );
}

async function getActiveVoiceFromNumber(tenantId: string) {
  if (process.env.TWILIO_FROM_NUMBER?.trim()) return normalizePhoneNumber(process.env.TWILIO_FROM_NUMBER);
  const result = await query<{ phoneNumber: string }>(
    `select "phoneNumber"
     from "PhoneNumber"
     where "tenantId" = $1 and "status" = 'ACTIVE' and "voiceStatus" = 'ACTIVE'
     order by case when "numberType" = 'MAIN' then 0 else 1 end, "createdAt" desc
     limit 1`,
    [tenantId],
  );
  return result.rows[0]?.phoneNumber ?? null;
}

function normalizeScenario(value?: string | null): VoiceScenario {
  if (value === "recall" || value === "reactivation" || value === "appointment_reminder" || value === "event_greeting" || value === "inbound_takeover") return value;
  return "inbound_takeover";
}

function normalizePhoneNumber(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("+")) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return "";
}

function sanitizeVoiceReply(text: string) {
  const forbidden = /AI|model|connector|PMS|database|guardrail|blocked|staged|workflow|implementation/i;
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean || forbidden.test(clean)) return "";
  return clean.slice(0, 500);
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function redactTwilio(payload: TwilioPayload) {
  const copy = { ...payload };
  delete copy.AccountSid;
  delete copy.ApiVersion;
  return copy;
}

async function audit(tenantId: string, actorRole: string, eventType: string, targetType: string, targetId: string | null, outcome: string, metadata: unknown) {
  await query(
    `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [newId("audit"), tenantId, actorRole, eventType, targetType, targetId, outcome, JSON.stringify(metadata)],
  );
}
