import { newId, query } from "@/lib/db";
import { getOpenAiWebchatConfig } from "@/lib/connector-control-repository";
import { defaultTenantId } from "@/lib/pms-repository";
import { createTwilioCall, twilioRequest, updateTwilioCall, twilioXmlEscape } from "@/lib/twilio-provider";

type VoiceScenario = "recall" | "reactivation" | "appointment_reminder" | "event_greeting" | "inbound_takeover";
type TwilioPayload = Record<string, string>;
type VoiceMemory = {
  callerName?: string;
  callerPhone?: string;
  appointmentIntent?: boolean;
  requestedService?: string;
  requestedWindowRaw?: string;
  requestedDate?: string;
  requestedTime?: string;
  insuranceStatus?: "PROVIDED" | "NONE" | "UNKNOWN";
  insurancePlanName?: string;
  email?: string;
  patientId?: string;
  appointmentId?: string;
  bookingStatus?: "NEEDS_MORE_INFO" | "BOOKED" | "NO_SLOT" | "STAFF_REQUIRED";
  lastAssistantAsk?: string;
  missing?: string[];
};

type VoiceSlot = {
  startsAt: string;
  endsAt: string;
  providerId: string | null;
  providerName: string | null;
  operatoryId: string | null;
  operatoryName: string | null;
};

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

export async function updateVoiceAiReceptionPolicySettings(input: {
  tenantId?: string;
  policyId?: string;
  actorRole?: string;
  ringThreshold: number;
  mode: string;
  voiceSettings: Record<string, unknown>;
  bookingPolicy: string;
  billingPolicy: string;
  pricingPolicy: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = input.policyId || newId("vaip");
  await query(
    `insert into "PhoneAiReceptionPolicy"
      ("id", "tenantId", "name", "status", "ringThreshold", "mode", "pricingPolicy", "bookingPolicy", "billingPolicy", "voiceSettings", "updatedAt")
     values ($1, $2, 'Default AI receptionist', 'ACTIVE', $3, $4, $5, $6, $7, $8::jsonb, current_timestamp)
     on conflict ("id") do update set
       "ringThreshold" = excluded."ringThreshold",
       "mode" = excluded."mode",
       "pricingPolicy" = excluded."pricingPolicy",
       "bookingPolicy" = excluded."bookingPolicy",
       "billingPolicy" = excluded."billingPolicy",
       "voiceSettings" = excluded."voiceSettings",
       "updatedAt" = current_timestamp`,
    [
      id,
      tenantId,
      Math.max(2, Math.min(8, Math.round(Number(input.ringThreshold) || 4))),
      input.mode || "ASSIST_WHEN_BUSY",
      input.pricingPolicy || "NO_PUBLIC_PRICING_HUMAN_ONLY",
      input.bookingPolicy || "DIRECT_BOOKING_WITH_SCHEDULING_GATES",
      input.billingPolicy || "EXPLAIN_BALANCE_ROUTE_SENSITIVE_TO_BILLING",
      JSON.stringify(sanitizeVoiceSettings(input.voiceSettings)),
    ],
  );
  await audit(tenantId, input.actorRole || "practice_manager", "VOICE_AI_RECEPTION_POLICY_UPDATED", "PhoneAiReceptionPolicy", id, "ALLOWED", {
    noSecretLogged: true,
    voiceSettingsKeys: Object.keys(input.voiceSettings),
  });
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
  const loadedMemory = await loadVoiceMemory(tenantId, conversationId);
  const memory = await updateVoiceMemoryFromSpeech({
    tenantId,
    conversationId,
    existing: loadedMemory,
    speech,
    payload: input.payload,
  });
  const replyResult = await generateVoiceReply({ tenantId, conversationId, scenario, speech, memory });
  const reply = replyResult.reply;
  const nextMemory = { ...memory, ...replyResult.memoryPatch, lastAssistantAsk: replyResult.lastAssistantAsk };
  await persistVoiceMemory(tenantId, conversationId, nextMemory);
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
    [
      tenantId,
      conversationId,
      nextMemory.appointmentIntent ? "APPOINTMENT_BOOKING" : scenario.toUpperCase(),
      speech,
      JSON.stringify({
        memory: redactedVoiceMemory(nextMemory),
        lastCallerUtterance: speech || "no input",
        lastAssistantReply: reply.slice(0, 300),
      }),
    ],
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
  const policy = await getVoiceAiReceptionPolicy(input.tenantId).catch(() => null);
  const voiceSettings = sanitizeVoiceSettings(policy?.voiceSettings ?? {});
  const voice = voiceSettings.voice || "Polly.Joanna-Neural";
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
    <Say voice="${twilioXmlEscape(voice)}">${twilioXmlEscape(input.text)}</Say>
  </Gather>
  <Say voice="${twilioXmlEscape(voice)}">I did not catch that. I will keep the note for the front desk so they can follow up if needed. Goodbye.</Say>
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

async function generateVoiceReply(input: { tenantId: string; conversationId: string; scenario: VoiceScenario; speech: string; memory: VoiceMemory }) {
  const speech = input.speech.trim();
  if (!speech) return { reply: "I’m still here. Would you like help scheduling, confirming, rescheduling, or speaking with the front desk?", lastAssistantAsk: "general_help" };
  if (/human|person|staff|front desk|representative|office|manager/i.test(speech)) {
    await createVoiceFollowUpTask(input.tenantId, input.conversationId, "The caller asked to speak with a person. Call back or pick up the live transfer if available.");
    return { reply: "Absolutely. I’ll get a team member involved. If no one is available right away, I’ll stay with this and keep the front desk note ready.", memoryPatch: { bookingStatus: "STAFF_REQUIRED" as const }, lastAssistantAsk: "staff_handoff" };
  }
  if (/price|cost|how much|fee|quote|estimate/i.test(speech)) {
    await createVoiceFollowUpTask(input.tenantId, input.conversationId, "Caller asked about pricing. Qualified staff should review clinical and insurance context before quoting.");
    return { reply: "I understand. Cost matters. The team reviews pricing during the visit because it depends on the exam, insurance, and the doctor’s findings. I can still help you get scheduled.", lastAssistantAsk: "schedule_after_pricing" };
  }
  const booking = await maybeHandleVoiceScheduling(input.tenantId, input.conversationId, input.memory);
  if (booking) return booking;

  const missing = missingVoiceBookingFields(input.memory);
  if (input.memory.appointmentIntent && missing.length) {
    const reply = nextBookingQuestion(input.memory, missing);
    return { reply, memoryPatch: { missing, bookingStatus: "NEEDS_MORE_INFO" as const }, lastAssistantAsk: missing[0] };
  }
  const openAi = await getOpenAiWebchatConfig(input.tenantId).catch(() => null);
  if (!openAi?.apiKey) return { reply: ruleBasedVoiceReply(input.scenario, speech, input.memory), lastAssistantAsk: "rules_fallback" };
  const [policy, history, knowledge] = await Promise.all([
    getVoiceAiReceptionPolicy(input.tenantId),
    getVoiceTranscriptContext(input.tenantId, input.conversationId),
    getDentalKnowledgeContext(input.tenantId, speech),
  ]);
  const voiceSettings = sanitizeVoiceSettings(policy.voiceSettings);
  const instructions = [
    voiceSettings.systemPrompt,
    voiceSettings.voicePrompt,
    "You are a warm, human-sounding dental front desk voice assistant for a dental practice. You remember the caller's details across turns.",
    "Speak in one or two short sentences suitable for a phone call. Acknowledge what the caller just gave you before asking the next question.",
    "You can help with recalls, reactivation, appointment reminders, simple scheduling intent, reschedule handoff, forms, directions, and staff callback requests.",
    "Do not discuss pricing, clinical diagnosis, prescriptions, or guaranteed insurance benefits.",
    "If the caller asks about pricing, clinical diagnosis, prescriptions, emergency symptoms, same-day reschedule, or sensitive billing detail, offer staff follow-up.",
    "Never mention AI, model, connector, PMS, database, implementation, guardrails, staged, or blocked.",
    "Use only the approved local knowledge context when answering dental process questions. If it is not enough, say you can have the team follow up.",
  ].join(" ");
  const payload = {
    model: voiceSettings.textModel || openAi.model || "gpt-4.1-mini",
    temperature: voiceSettings.temperature,
    max_output_tokens: voiceSettings.maxOutputTokens,
    instructions,
    input: [
      `Call scenario: ${input.scenario}`,
      `Structured memory: ${JSON.stringify(redactedVoiceMemory(input.memory))}`,
      `Recent transcript:\n${history}`,
      `Approved dental knowledge:\n${knowledge || "No matching approved dental knowledge found."}`,
      `Caller just said: ${speech}`,
      "Reply naturally. Do not ask again for any value that is already present in structured memory.",
    ].join("\n\n"),
  };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAi.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => null);
  if (!response?.ok) return { reply: ruleBasedVoiceReply(input.scenario, speech, input.memory), lastAssistantAsk: "rules_fallback" };
  const data = await response.json().catch(() => ({}));
  const text = typeof data?.output_text === "string"
    ? data.output_text
    : data?.output?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content ?? []).map((item: { text?: string }) => item.text).filter(Boolean).join(" ");
  return { reply: sanitizeVoiceReply(typeof text === "string" ? text : "") || ruleBasedVoiceReply(input.scenario, speech, input.memory), lastAssistantAsk: "openai_reply" };
}

async function loadVoiceMemory(tenantId: string, conversationId: string): Promise<VoiceMemory> {
  const [conversation, event] = await Promise.all([
    query<{
      patientId: string | null;
      appointmentId: string | null;
      callerName: string | null;
      callerNumber: string | null;
      transcriptSummary: string | null;
    }>(
      `select "patientId", "appointmentId", "callerName", "callerNumber", "transcriptSummary"
       from "PhoneConversation"
       where "tenantId" = $1 and "id" = $2
       limit 1`,
      [tenantId, conversationId],
    ),
    query<{ metadata: unknown }>(
      `select "metadata"
       from "PhoneCallAiAssistEvent"
       where "tenantId" = $1
         and "conversationId" = $2
         and "eventType" = 'VOICE_AI_MEMORY_UPDATED'
       order by "createdAt" desc
       limit 1`,
      [tenantId, conversationId],
    ),
  ]);
  const row = conversation.rows[0];
  const metadata = objectValue(event.rows[0]?.metadata);
  const stored = objectValue(metadata.memory) as VoiceMemory;
  const summaryMemory = parseSummaryMemory(row?.transcriptSummary);
  return {
    ...summaryMemory,
    ...stored,
    callerName: stored.callerName || summaryMemory.callerName || cleanCallerName(row?.callerName || ""),
    callerPhone: unmaskedValue(stored.callerPhone) || unmaskedValue(summaryMemory.callerPhone) || row?.callerNumber || undefined,
    patientId: stored.patientId || row?.patientId || undefined,
    appointmentId: stored.appointmentId || row?.appointmentId || undefined,
  };
}

async function updateVoiceMemoryFromSpeech(input: {
  tenantId: string;
  conversationId: string;
  existing: VoiceMemory;
  speech: string;
  payload?: TwilioPayload;
}) {
  const speech = input.speech.trim();
  const memory: VoiceMemory = {
    ...input.existing,
    callerPhone: input.existing.callerPhone || input.payload?.From || input.payload?.Caller || undefined,
  };
  if (!speech) return memory;
  if (/(appointment|schedule|book|see the doctor|cleaning|exam|consult|tooth|pain|hygiene|checkup|check up)/i.test(speech)) {
    memory.appointmentIntent = true;
  }
  const explicitName = speech.match(/\b(?:my name is|this is|i am|i'm)\s+([a-z][a-z'\-]+(?:\s+[a-z][a-z'\-]+){0,3})/i)?.[1];
  if (explicitName) memory.callerName = titleCaseName(explicitName);
  if (!memory.callerName && input.existing.lastAssistantAsk === "callerName" && looksLikePersonName(speech)) {
    memory.callerName = titleCaseName(speech);
  }
  const email = speech.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  if (email) memory.email = email.toLowerCase();
  const service = inferVoiceService(speech, memory.requestedService);
  if (service) {
    memory.requestedService = service;
    memory.appointmentIntent = true;
  }
  const insurance = inferInsurance(speech, input.existing.lastAssistantAsk);
  if (insurance.status) {
    memory.insuranceStatus = insurance.status;
    memory.insurancePlanName = insurance.planName || memory.insurancePlanName;
  }
  const requested = parseRequestedDateTime(speech);
  if (requested) {
    memory.requestedWindowRaw = requested.raw;
    memory.requestedDate = requested.date;
    memory.requestedTime = requested.time;
    memory.appointmentIntent = true;
  }
  if (!memory.patientId && memory.callerPhone) {
    const patient = await findPatientForVoice(input.tenantId, memory);
    if (patient) {
      memory.patientId = patient.id;
      memory.callerName ||= `${patient.firstName} ${patient.lastName}`.trim();
      memory.email ||= patient.email || undefined;
    }
  }
  memory.missing = missingVoiceBookingFields(memory);
  return memory;
}

async function persistVoiceMemory(tenantId: string, conversationId: string, memory: VoiceMemory) {
  const id = newId("paie");
  await query(
    `insert into "PhoneCallAiAssistEvent"
     ("id", "tenantId", "conversationId", "eventType", "severity", "title", "body", "metadata")
     values ($1, $2, $3, 'VOICE_AI_MEMORY_UPDATED', 'INFO', 'Voice AI memory updated', $4, $5::jsonb)`,
    [
      id,
      tenantId,
      conversationId,
      voiceMemorySummary(memory),
      JSON.stringify({ memory }),
    ],
  );
}

async function maybeHandleVoiceScheduling(tenantId: string, conversationId: string, memory: VoiceMemory) {
  if (!memory.appointmentIntent || memory.bookingStatus === "BOOKED" || memory.appointmentId) return null;
  const missing = missingVoiceBookingFields(memory);
  if (missing.length) return null;
  const slot = await findVoiceSlot(tenantId, memory);
  if (!slot) {
    await createVoiceFollowUpTask(tenantId, conversationId, `Caller requested ${memory.requestedService} around ${memory.requestedWindowRaw}, but no available PMS slot was found. Review manually.`);
    return {
      reply: `I have your request for ${memory.requestedService} around ${memory.requestedWindowRaw}. I don’t see that exact time open, so I’m flagging the front desk to find the closest option and follow up.`,
      memoryPatch: { bookingStatus: "NO_SLOT" as const },
      lastAssistantAsk: "staff_slot_review",
    };
  }
  const patient = await ensureVoicePatient(tenantId, memory);
  const appointmentId = newId("appt");
  await query(
    `insert into "PmsAppointment"
       ("id", "tenantId", "patientId", "providerId", "operatoryId", "startsAt", "endsAt", "status", "appointmentType", "readinessStatus", "notes", "updatedAt")
     values ($1, $2, $3, $4, $5, $6::timestamp, $7::timestamp, 'CONFIRMED', $8, 'READY', $9, current_timestamp)`,
    [
      appointmentId,
      tenantId,
      patient.id,
      slot.providerId,
      slot.operatoryId,
      slot.startsAt,
      slot.endsAt,
      memory.requestedService || "Dental visit",
      `Booked by Voice AI from conversation ${conversationId}. Caller requested ${memory.requestedWindowRaw}.`,
    ],
  );
  await query(
    `insert into "PmsAppointmentStatusHistory" ("id", "appointmentId", "status", "actorRole", "note")
     values ($1, $2, 'CONFIRMED', 'voice_ai', $3)`,
    [newId("apst"), appointmentId, `Voice AI booked ${formatVoiceSlot(slot)}.`],
  );
  await query(
    `update "PhoneConversation"
     set "patientId" = $3,
       "appointmentId" = $4,
       "callerName" = $5,
       "followUpStatus" = 'APPOINTMENT_BOOKED',
       "outcome" = 'PMS_APPOINTMENT_BOOKED',
       "updatedAt" = current_timestamp
     where "tenantId" = $1 and "id" = $2`,
    [tenantId, conversationId, patient.id, appointmentId, `${patient.firstName} ${patient.lastName}`.trim()],
  );
  await audit(tenantId, "voice_ai", "APPOINTMENT_BOOKED_FROM_VOICE_AI", "PmsAppointment", appointmentId, "ALLOWED", {
    conversationId,
    slot,
    patientId: patient.id,
  });
  const confirmation = await sendVoiceAppointmentSmsConfirmation({
    tenantId,
    conversationId,
    appointmentId,
    patientId: patient.id,
    phone: memory.callerPhone || patient.phone || "",
    service: memory.requestedService || "Dental visit",
    slot,
  });
  return {
    reply: `You’re booked for ${memory.requestedService} on ${formatVoiceSlot(slot)}. ${confirmation} Is there anything else I can help with?`,
    memoryPatch: { bookingStatus: "BOOKED" as const, patientId: patient.id, appointmentId },
    lastAssistantAsk: "booking_complete",
  };
}

function missingVoiceBookingFields(memory: VoiceMemory) {
  if (!memory.appointmentIntent) return [];
  return [
    !memory.callerName ? "callerName" : null,
    !memory.requestedService ? "requestedService" : null,
    !memory.requestedDate || !memory.requestedTime ? "requestedWindow" : null,
  ].filter(Boolean) as string[];
}

function nextBookingQuestion(memory: VoiceMemory, missing: string[]) {
  if (!missing.length) return "I have the details I need. Let me check the schedule now.";
  const prefix = memory.callerName ? `Thanks, ${firstName(memory.callerName)}. ` : "";
  if (missing[0] === "callerName") {
    const details = memory.requestedWindowRaw ? `I have ${memory.requestedWindowRaw} noted. ` : "";
    return `${details}May I have your first and last name for the appointment?`;
  }
  if (missing[0] === "requestedService") {
    const details = memory.requestedWindowRaw ? `I still have ${memory.requestedWindowRaw} noted. ` : "";
    return `${prefix}${details}What type of visit should I book, like a cleaning, new patient exam, consult, or urgent problem visit?`;
  }
  return `${prefix}What day and time works best for you?`;
}

async function findVoiceSlot(tenantId: string, memory: VoiceMemory): Promise<VoiceSlot | null> {
  if (!memory.requestedDate || !memory.requestedTime) return null;
  const startsAt = `${memory.requestedDate} ${memory.requestedTime}:00`;
  const endsAt = addMinutesIsoish(startsAt, defaultDurationForService(memory.requestedService));
  const candidates = await query<VoiceSlot>(
    `select p."id" as "providerId",
            p."displayName" as "providerName",
            o."id" as "operatoryId",
            o."name" as "operatoryName",
            $2::timestamp::text as "startsAt",
            $3::timestamp::text as "endsAt"
     from "PmsProvider" p
     cross join "PmsOperatory" o
     where p."tenantId" = $1
       and o."tenantId" = $1
       and p."status" = 'ACTIVE'
       and o."status" in ('READY', 'ACTIVE')
       and not exists (
         select 1 from "PmsAppointment" a
         where a."tenantId" = $1
           and a."status" not in ('CANCELED', 'NO_SHOW', 'BROKEN')
           and a."startsAt" < $3::timestamp
           and a."endsAt" > $2::timestamp
           and (a."providerId" = p."id" or a."operatoryId" = o."id")
       )
     order by case when lower(p."providerType") like '%hyg%' and lower($4) like '%hygiene%' then 0 else 1 end,
              p."displayName",
              o."code"
     limit 1`,
    [tenantId, startsAt, endsAt, memory.requestedService || ""],
  );
  return candidates.rows[0] ?? null;
}

async function ensureVoicePatient(tenantId: string, memory: VoiceMemory) {
  const existing = await findPatientForVoice(tenantId, memory);
  if (existing) return existing;
  const name = splitName(memory.callerName || "Voice Patient");
  const chartNumber = `VA-${Date.now().toString(36).toUpperCase()}`;
  const result = await query<{ id: string; firstName: string; lastName: string; email: string | null; phone: string | null }>(
    `insert into "PmsPatient"
       ("id", "tenantId", "chartNumber", "firstName", "lastName", "phone", "email", "patientNote", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, current_timestamp)
     returning "id", "firstName", "lastName", "email", "phone"`,
    [
      newId("pat"),
      tenantId,
      chartNumber,
      name.firstName,
      name.lastName || "Patient",
      memory.callerPhone || null,
      memory.email || null,
      "Created by Voice AI scheduling after caller provided appointment details.",
    ],
  );
  return result.rows[0];
}

async function findPatientForVoice(tenantId: string, memory: VoiceMemory) {
  const phoneDigits = digits(memory.callerPhone || "");
  const name = splitName(memory.callerName || "");
  const result = await query<{ id: string; firstName: string; lastName: string; email: string | null; phone: string | null }>(
    `select "id", "firstName", "lastName", "email", "phone"
     from "PmsPatient"
     where "tenantId" = $1
       and (
         ($2 <> '' and right(regexp_replace(coalesce("phone", ''), '[^0-9]', '', 'g'), 10) = right($2, 10))
         or ($3 <> '' and lower("firstName") = lower($3) and lower("lastName") = lower($4))
       )
     order by case when $2 <> '' and right(regexp_replace(coalesce("phone", ''), '[^0-9]', '', 'g'), 10) = right($2, 10) then 0 else 1 end,
              "updatedAt" desc
     limit 1`,
    [tenantId, phoneDigits, name.firstName, name.lastName],
  );
  return result.rows[0] ?? null;
}

async function sendVoiceAppointmentSmsConfirmation(input: {
  tenantId: string;
  conversationId: string;
  appointmentId: string;
  patientId: string;
  phone: string;
  service: string;
  slot: VoiceSlot;
}) {
  if (!input.phone) return "The appointment is saved; I do not have a mobile number for a text confirmation.";
  const fromNumber = await getActiveSmsFromNumber(input.tenantId);
  const id = newId("pmsg");
  const body = `Your ${input.service.toLowerCase()} is confirmed for ${formatVoiceSlot(input.slot)}. Reply here if you need help changing it.`;
  await query(
    `insert into "PhoneOutboundMessage"
       ("id", "tenantId", "conversationId", "patientId", "appointmentId", "channel", "recipientNumber", "messageType", "body", "approvalStatus", "deliveryStatus", "consentStatus", "connectorStatus", "linkType", "linkTargetId", "linkLabel", "readiness", "updatedAt")
     values ($1, $2, $3, $4, $5, 'SMS', $6, 'VOICE_AI_APPOINTMENT_CONFIRMATION', $7, 'APPROVED_STAGED', $8, 'VERIFIED', $9, 'ONLINE_SCHEDULING_LINK', $5, 'Appointment confirmation', $10::jsonb, current_timestamp)`,
    [
      id,
      input.tenantId,
      input.conversationId,
      input.patientId,
      input.appointmentId,
      input.phone,
      body,
      fromNumber ? "READY_FOR_CONNECTOR" : "BLOCKED_CONNECTOR_REQUIRED",
      fromNumber ? "READY_FOR_CONNECTOR" : "BLOCKED_CONNECTOR_REQUIRED",
      JSON.stringify({ source: "voice_ai_booking", consentVerified: true, externalSendBlocked: !fromNumber }),
    ],
  );
  if (!fromNumber) {
    await audit(input.tenantId, "voice_ai", "VOICE_AI_SMS_CONFIRMATION_BLOCKED", "PhoneOutboundMessage", id, "BLOCKED", { appointmentId: input.appointmentId, reason: "No active SMS-capable number." });
    return "The appointment is saved, but text confirmation is waiting on the SMS number setup.";
  }
  const callbackUrl = `${defaultOrigin()}/api/twilio/sms/status`;
  const twilio = await twilioRequest({
    tenantId: input.tenantId,
    path: "/Messages.json",
    body: new URLSearchParams({ From: fromNumber, To: normalizePhoneNumber(input.phone) || input.phone, Body: body, StatusCallback: callbackUrl }),
  });
  await query(
    `update "PhoneOutboundMessage"
     set "deliveryStatus" = $2,
       "provider" = 'TWILIO',
       "providerMessageId" = $3,
       "providerStatus" = $4,
       "providerError" = $5,
       "lastAttemptAt" = current_timestamp,
       "sentAt" = case when $2 = 'SENT_TO_PROVIDER' then current_timestamp else "sentAt" end,
       "readiness" = coalesce("readiness", '{}'::jsonb) || $6::jsonb,
       "updatedAt" = current_timestamp
     where "id" = $1`,
    [
      id,
      twilio.ok ? "SENT_TO_PROVIDER" : "PROVIDER_ERROR",
      twilio.sid || null,
      twilio.status || twilio.providerStatus,
      twilio.error || null,
      JSON.stringify({ twilioProviderSid: twilio.sid || null, twilioProviderStatus: twilio.status || twilio.providerStatus, externalSendBlocked: !twilio.ok }),
    ],
  );
  await audit(input.tenantId, "voice_ai", twilio.ok ? "VOICE_AI_SMS_CONFIRMATION_SENT" : "VOICE_AI_SMS_CONFIRMATION_ERROR", "PhoneOutboundMessage", id, twilio.ok ? "ALLOWED" : "BLOCKED", {
    appointmentId: input.appointmentId,
    providerStatus: twilio.providerStatus,
    providerError: twilio.error,
  });
  return twilio.ok ? "I sent the text confirmation." : `The appointment is saved, but Twilio did not accept the text confirmation: ${twilio.error}`;
}

async function getVoiceTranscriptContext(tenantId: string, conversationId: string) {
  const result = await query<{ speaker: string; transcriptText: string }>(
    `select "speaker", "transcriptText"
     from "PhoneCallTranscriptEvent"
     where "tenantId" = $1 and "conversationId" = $2
     order by "createdAt" desc
     limit 12`,
    [tenantId, conversationId],
  );
  return result.rows.reverse().map((row) => `${row.speaker}: ${row.transcriptText}`).join("\n");
}

async function getDentalKnowledgeContext(tenantId: string, speech: string) {
  const terms = speech.toLowerCase().match(/[a-z]{4,}/g)?.slice(0, 8) ?? [];
  if (!terms.length) return "";
  const result = await query<{ heading: string | null; content: string; title: string }>(
    `select kc."heading", kc."content", kp."title"
     from "PatientEngagementKnowledgeChunk" kc
     join "PatientEngagementKnowledgePage" kp on kp."id" = kc."pageId"
     where kc."tenantId" = $1
       and kc."status" = 'READY_FOR_RETRIEVAL'
       and exists (
         select 1 from unnest($2::text[]) term
         where lower(kc."content") like '%' || term || '%'
            or lower(coalesce(kc."heading", '')) like '%' || term || '%'
            or lower(kp."title") like '%' || term || '%'
       )
     order by kc."updatedAt" desc
     limit 4`,
    [tenantId, terms],
  ).catch(() => ({ rows: [] }));
  return result.rows.map((row) => `- ${row.heading || row.title}: ${row.content.slice(0, 450)}`).join("\n");
}

function sanitizeVoiceSettings(value: Record<string, unknown>) {
  return {
    textModel: stringValue(value.textModel, "gpt-4.1-mini"),
    realtimeModel: stringValue(value.realtimeModel, "gpt-realtime-mini"),
    transcriptionModel: stringValue(value.transcriptionModel, "gpt-4o-transcribe"),
    voice: stringValue(value.voice, "Polly.Joanna-Neural"),
    speed: boundedNumber(value.speed, 1, 0.6, 1.4),
    temperature: boundedNumber(value.temperature, 0.35, 0, 1.2),
    maxOutputTokens: Math.round(boundedNumber(value.maxOutputTokens, 120, 60, 600)),
    systemPrompt: stringValue(value.systemPrompt, "You are the dental practice's phone receptionist. Sound calm, warm, and human. Keep memory of the caller's name, requested service, insurance answer, and appointment time across turns."),
    voicePrompt: stringValue(value.voicePrompt, "For appointment calls, collect one missing detail at a time, check the PMS schedule, book the appointment when possible, and send confirmation. Never ask again for a detail already collected."),
  };
}

function parseRequestedDateTime(speech: string) {
  const lower = speech.toLowerCase();
  const dayMatch = lower.match(/\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  const timeMatch = lower.match(/\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (!dayMatch || !timeMatch) return null;
  const target = nextDateForDay(dayMatch[1]);
  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2] || 0);
  const meridiem = timeMatch[3];
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (!meridiem && hour >= 1 && hour <= 7) hour += 12;
  target.setHours(hour, minute, 0, 0);
  return {
    raw: `${dayMatch[1]} at ${formatClock(hour, minute)}`,
    date: isoDate(target),
    time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

function nextDateForDay(day: string) {
  const now = new Date();
  const target = new Date(now);
  if (day === "today") return target;
  if (day === "tomorrow") {
    target.setDate(target.getDate() + 1);
    return target;
  }
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const wanted = days.indexOf(day);
  const delta = (wanted - target.getDay() + 7) % 7 || 7;
  target.setDate(target.getDate() + delta);
  return target;
}

function inferVoiceService(speech: string, existing?: string) {
  const text = speech.toLowerCase();
  if (/(cleaning|hygiene|recall|recare|prophy)/.test(text)) return "Hygiene cleaning";
  if (/(emergency|pain|swelling|broken|toothache|bleeding)/.test(text)) return "Emergency exam";
  if (/(implant)/.test(text)) return "Implant consultation";
  if (/(veneer|whitening|cosmetic)/.test(text)) return "Cosmetic consultation";
  if (/(new patient|exam|checkup|check up|consult|appointment)/.test(text) && !existing) return "New patient exam";
  return existing;
}

function inferInsurance(speech: string, lastAsk?: string) {
  const text = speech.toLowerCase();
  if (/\b(no insurance|self pay|cash pay|do not have insurance|don't have insurance)\b/.test(text)) return { status: "NONE" as const };
  const explicit = speech.match(/\b(?:i have|my insurance is|insurance is|with)\s+([a-z0-9 &.'-]{2,60})(?:\s+insurance)?\b/i)?.[1];
  if ((lastAsk === "insuranceStatus" || /insurance/.test(text)) && explicit) return { status: "PROVIDED" as const, planName: titleCaseName(explicit.replace(/\binsurance\b/i, "").trim()) };
  if (/insurance/.test(text)) return { status: "PROVIDED" as const, planName: explicit ? titleCaseName(explicit) : undefined };
  return { status: null, planName: undefined };
}

function redactedVoiceMemory(memory: VoiceMemory) {
  return {
    ...memory,
    callerPhone: memory.callerPhone ? `***${digits(memory.callerPhone).slice(-4)}` : undefined,
    email: memory.email ? maskEmail(memory.email) : undefined,
  };
}

function parseSummaryMemory(value?: string | null): VoiceMemory {
  if (!value?.trim().startsWith("{")) return {};
  try {
    return objectValue(JSON.parse(value).memory) as VoiceMemory;
  } catch {
    return {};
  }
}

function voiceMemorySummary(memory: VoiceMemory) {
  const parts = [
    memory.callerName ? `name ${memory.callerName}` : null,
    memory.requestedService ? `service ${memory.requestedService}` : null,
    memory.requestedWindowRaw ? `time ${memory.requestedWindowRaw}` : null,
    memory.insuranceStatus ? `insurance ${memory.insuranceStatus}` : null,
    memory.bookingStatus ? `booking ${memory.bookingStatus}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Voice AI memory initialized.";
}

function ruleBasedVoiceReply(scenario: VoiceScenario, speech: string, memory?: VoiceMemory) {
  if (memory?.appointmentIntent) return nextBookingQuestion(memory, missingVoiceBookingFields(memory));
  if (/yes|schedule|book|appointment|cleaning|exam/i.test(speech)) {
    return "Great. I can help with that. What type of visit should I look for, like a cleaning, new patient exam, or urgent problem visit?";
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

function splitName(name: string) {
  const parts = name.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  return {
    firstName: titleCaseName(parts[0] || "Voice"),
    lastName: titleCaseName(parts.slice(1).join(" ") || "Patient"),
  };
}

function titleCaseName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1).toLowerCase()}` : "")
    .join(" ");
}

function cleanCallerName(value: string) {
  if (!value || /^\+?\d/.test(value) || /voice ai caller/i.test(value)) return undefined;
  return value.trim();
}

function unmaskedValue(value?: string) {
  if (!value || value.includes("***")) return undefined;
  return value;
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || "there";
}

function looksLikePersonName(value: string) {
  const text = value.trim();
  if (!/^[a-z][a-z'\-]+(?:\s+[a-z][a-z'\-]+){0,3}$/i.test(text)) return false;
  return !/(appointment|cleaning|insurance|monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|morning|afternoon|evening)/i.test(text);
}

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function isoDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function addMinutesIsoish(startsAt: string, minutes: number) {
  const date = new Date(startsAt.replace(" ", "T"));
  date.setMinutes(date.getMinutes() + minutes);
  return `${isoDate(date)} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:00`;
}

function defaultDurationForService(service?: string) {
  if (/hygiene|cleaning/i.test(service || "")) return 60;
  if (/emergency/i.test(service || "")) return 45;
  if (/consult/i.test(service || "")) return 45;
  return 60;
}

function formatVoiceSlot(slot: VoiceSlot) {
  const date = new Date(String(slot.startsAt).replace(" ", "T"));
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${weekday}, ${monthDay} at ${time}`;
}

function formatClock(hour: number, minute: number) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain) return "***";
  return `${name.slice(0, 2)}***@${domain}`;
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
