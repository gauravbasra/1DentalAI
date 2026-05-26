import { getOpenAiWebchatConfig } from "@/lib/connector-control-repository";
import { defaultTenantId } from "@/lib/pms-repository";
import { appendCallTranscript, createAppointmentRequest, createVoiceAgentCall, loadVoiceAgentSession, upsertVoiceAgentSession } from "./repository";
import { computeMissingFields, mergeEntities, newConversationState, nextQuestion, normalizeIntent } from "./state-manager";
import type { ConversationState, ExtractedEntities, Slot, VoiceAgentIntent } from "./types";
import type { SchedulingAdapter } from "./scheduling/adapters";

const DEFAULT_RULES = { insuranceRequired: false, dobRequired: false, emailRequired: false };

export class VoiceAgentOrchestrator {
  constructor(private readonly scheduling: SchedulingAdapter) {}

  async startCall(input: { tenantId?: string; practiceId?: string | null; callerPhone: string; callProvider: string; providerCallId?: string | null }) {
    const tenantId = input.tenantId ?? defaultTenantId;
    const call = await createVoiceAgentCall({
      tenantId,
      practiceId: input.practiceId ?? null,
      callerPhone: input.callerPhone,
      callProvider: input.callProvider,
      providerCallId: input.providerCallId ?? null,
    });
    const state = newConversationState({ callerPhone: input.callerPhone });
    const missing = computeMissingFields(state, DEFAULT_RULES);
    const session = await upsertVoiceAgentSession({
      callId: call.id,
      tenantId,
      practiceId: input.practiceId ?? null,
      conversationState: state,
      extractedEntities: {},
      missingFields: missing,
      schedulingIntent: "unknown",
      currentStep: missing[0] || null,
      confidenceScore: 0.0,
    });
    return {
      callId: call.id,
      sessionId: session.id,
      greeting: `Thanks for calling. How can I help you today?`,
    };
  }

  async handleMessage(input: { tenantId?: string; practiceId?: string | null; callId: string; text: string }) {
    const tenantId = input.tenantId ?? defaultTenantId;
    const sessionRow = await loadVoiceAgentSession(tenantId, input.callId);
    const state = toState(sessionRow?.conversation_state, input.text);
    // Slot choice step: pick from previously offered slots.
    if (sessionRow?.current_step === "slot_choice" || (Array.isArray(sessionRow?.missing_fields) && sessionRow?.missing_fields.includes("slot_choice"))) {
      const picked = pickSlotFromUtterance(state.appointment.offered_slots || [], input.text);
      if (picked) {
        state.appointment.selected_slot = { slot_start: picked.slotStart, slot_end: picked.slotEnd, provider_id: picked.providerId };
      }
    }
    const entities = await extractEntities(tenantId, input.text, state, sessionRow?.missing_fields);
    const intent: VoiceAgentIntent = normalizeIntent((entities.intent as string) || sessionRow?.scheduling_intent || "unknown");
    mergeEntities(state, entities);
    const missing = computeMissingFields(state, DEFAULT_RULES);
    await appendCallTranscript(tenantId, input.callId, input.text);

    // If ready to fetch slots, do it and offer 2-3.
    if (!missing.length && !state.appointment.selected_slot && intent === "schedule_new_appointment") {
      const slots = await this.scheduling.fetchAvailableSlots(input.practiceId ?? null, {
        serviceType: state.appointment.reason || "cleaning",
        preferredDays: state.appointment.preferred_days,
        preferredTimeWindows: state.appointment.preferred_time_windows,
        preferredProvider: state.appointment.preferred_provider,
        patientType: state.patient.is_new_patient === true ? "new" : state.patient.is_new_patient === false ? "existing" : "unknown",
      });
      state.appointment.offered_slots = slots;
      const offer = buildSlotOffer(slots);
      state.conversation.last_question_asked = "slot_offer";
      await upsertVoiceAgentSession({
        sessionId: sessionRow?.id,
        callId: input.callId,
        tenantId,
        practiceId: input.practiceId ?? null,
        conversationState: state,
        extractedEntities: entities,
        missingFields: ["slot_choice"],
        schedulingIntent: intent,
        currentStep: "slot_choice",
        confidenceScore: 0.65,
      });
      return { reply: offer, state, intent, slots };
    }

    // If we already have a selected slot, hold + confirm via adapter and persist appointment_request.
    if (state.appointment.selected_slot && intent === "schedule_new_appointment") {
      const slots: Slot[] = [
        {
          slotId: "direct_selected",
          providerId: state.appointment.selected_slot.provider_id || null,
          providerName: null,
          slotStart: state.appointment.selected_slot.slot_start,
          slotEnd: state.appointment.selected_slot.slot_end,
          serviceType: state.appointment.reason || "cleaning",
          sourceSystem: this.scheduling.sourceSystem,
        },
      ];
      const held = await this.scheduling.holdSlot(input.practiceId ?? null, slots[0].slotId, { patient: state.patient, serviceType: state.appointment.reason });
      const confirmed = await this.scheduling.confirmAppointment(input.practiceId ?? null, held.heldSlotId, { patient: state.patient, appointment: state.appointment });
      await createAppointmentRequest({
        tenantId,
        practiceId: input.practiceId ?? null,
        callId: input.callId,
        phone: state.patient.phone || state.caller.phone || input.text,
        patientType: state.patient.is_new_patient === true ? "new" : state.patient.is_new_patient === false ? "existing" : "unknown",
        firstName: state.patient.first_name,
        lastName: state.patient.last_name,
        email: state.patient.email,
        dob: state.patient.dob,
        insuranceProvider: state.insurance.provider,
        memberId: state.insurance.member_id,
        appointmentReason: state.appointment.reason,
        preferredDate: state.appointment.preferred_days[0] || null,
        preferredTimeWindow: state.appointment.preferred_time_windows[0] || null,
        selectedSlotStart: state.appointment.selected_slot.slot_start,
        selectedSlotEnd: state.appointment.selected_slot.slot_end,
        externalAppointmentId: confirmed.externalAppointmentId,
        status: "confirmed",
        notes: "Booked by voice agent.",
        rawPayload: { state, intent },
      });
      const reply = `Perfect. You’re all set. We’ll see you at ${formatTime(state.appointment.selected_slot.slot_start)}. Is there anything else I can help with?`;
      await upsertVoiceAgentSession({
        sessionId: sessionRow?.id,
        callId: input.callId,
        tenantId,
        practiceId: input.practiceId ?? null,
        conversationState: state,
        extractedEntities: entities,
        missingFields: [],
        schedulingIntent: intent,
        currentStep: "complete",
        confidenceScore: 0.8,
      });
      return { reply, state, intent };
    }

    const question = missing.length ? nextQuestion(state, missing) : `Great. Which day and time works best for you?`;
    await upsertVoiceAgentSession({
      sessionId: sessionRow?.id,
      callId: input.callId,
      tenantId,
      practiceId: input.practiceId ?? null,
      conversationState: state,
      extractedEntities: entities,
      missingFields: missing,
      schedulingIntent: intent,
      currentStep: missing[0] || null,
      confidenceScore: 0.5,
    });
    return { reply: question, state, intent };
  }
}

function toState(value: unknown, callerPhone: string): ConversationState {
  if (value && typeof value === "object") return value as ConversationState;
  return newConversationState({ callerPhone });
}

async function extractEntities(tenantId: string, text: string, state: ConversationState, missingFields: unknown): Promise<ExtractedEntities> {
  // Lightweight deterministic extraction for production safety; OpenAI can enhance when configured.
  const entities: ExtractedEntities = {};
  const lower = text.toLowerCase();
  if (/(new patient|haven't been|first time)/i.test(text)) entities.patient_type = "new";
  if (/(existing|been there|i've been|returning)/i.test(text)) entities.patient_type = "existing";
  if (/(cleaning|hygiene)/i.test(text)) entities.appointment_reason = "cleaning";
  if (/(pain|toothache|urgent|emergency)/i.test(text)) {
    entities.appointment_reason ||= "urgent problem";
    entities.urgency = /(emergency|bleeding|swelling|fever|trauma)/i.test(text) ? "emergency" : "urgent";
    entities.intent = "emergency_dental_issue";
  }
  if (/(schedule|book|appointment)/i.test(text)) entities.intent = "schedule_new_appointment";
  const nameMatch = text.match(/\b(?:my name is|this is|i am|i'm)\s+([a-z][a-z'\-]+(?:\s+[a-z][a-z'\-]+){0,3})/i);
  if (nameMatch?.[1]) {
    const callerName = titleCase(nameMatch[1]);
    entities.caller_name = callerName;
    const parsed = splitName(callerName);
    if (parsed.first) entities.patient_first_name = parsed.first;
    if (parsed.last) entities.patient_last_name = parsed.last;
  }
  const insuranceMatch = text.match(/\b(delta|cigna|aetna|metlife|guardian|humana)\b/i);
  if (insuranceMatch) entities.insurance_provider = insuranceMatch[1];
  const day = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"].find((d)=>lower.includes(d));
  if (day) entities.preferred_days = [capitalize(day)];
  if (/\bmorning\b/.test(lower)) entities.preferred_time_windows = ["morning"];
  if (/\bafternoon\b/.test(lower)) entities.preferred_time_windows = ["afternoon"];

  const openAi = await getOpenAiWebchatConfig(tenantId).catch(() => null);
  if (!openAi?.apiKey) return entities;
  const missing = Array.isArray(missingFields) ? missingFields : [];
  const prompt = [
    "Extract scheduling facts from the caller message into JSON.",
    "Do not invent values.",
    `Caller message: ${text}`,
    `Existing state: ${JSON.stringify(state)}`,
    `Missing fields: ${JSON.stringify(missing)}`,
  ].join("\n");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAi.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: openAi.model || "gpt-4o-mini", input: prompt, temperature: 0.1, max_output_tokens: 200 }),
  }).catch(() => null);
  if (!response?.ok) return entities;
  const data = await response.json().catch(() => ({}));
  const out = typeof data?.output_text === "string" ? data.output_text : "";
  const parsed = safeJson(out);
  return parsed && typeof parsed === "object" ? { ...entities, ...(parsed as ExtractedEntities) } : entities;
}

function safeJson(text: string) {
  try {
    const trimmed = text.trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function buildSlotOffer(slots: Slot[]) {
  if (!slots.length) return "I’m not seeing openings that match. I can have the team call you back with the closest options.";
  const picks = slots.slice(0, 3).map((slot) => formatTime(slot.slotStart));
  return `I found ${picks.join(", ")}. Which one works best?`;
}

function pickSlotFromUtterance(slots: Slot[], utterance: string): Slot | null {
  if (!slots.length) return null;
  const text = utterance.toLowerCase();
  if (/(first|1st|one)/.test(text)) return slots[0] ?? null;
  if (/(second|2nd|two)/.test(text)) return slots[1] ?? null;
  if (/(third|3rd|three)/.test(text)) return slots[2] ?? null;
  // Try to match "10:30" etc.
  const timeMatch = utterance.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (timeMatch) {
    const hour = Number(timeMatch[1]);
    const minute = Number(timeMatch[2] ?? 0);
    const ampm = (timeMatch[3] || "").toLowerCase();
    return (
      slots.find((slot) => {
        const d = new Date(slot.slotStart);
        let h = d.getHours();
        const m = d.getMinutes();
        if (ampm === "am" && h === 0) h = 12;
        if (ampm === "pm" && h > 12) h = h - 12;
        return h === hour && m === minute;
      }) ?? null
    );
  }
  return null;
}

function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function titleCase(value: string) {
  return value.split(/\s+/).map((part) => part.slice(0, 1).toUpperCase() + part.slice(1).toLowerCase()).join(" ");
}

function splitName(value: string): { first: string | null; last: string | null } {
  const cleaned = value
    .replace(/[,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return { first: null, last: null };
  const parts = cleaned.split(" ").filter(Boolean);
  if (!parts.length) return { first: null, last: null };
  if (parts.length === 1) return { first: parts[0], last: null };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function capitalize(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
