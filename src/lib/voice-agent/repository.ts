import { newId, query } from "@/lib/db";

export async function createVoiceAgentCall(input: {
  id?: string;
  tenantId: string;
  practiceId?: string | null;
  callerPhone: string;
  callProvider: string;
  providerCallId?: string | null;
}) {
  const id = input.id || newId("vacall");
  await query(
    `insert into "voice_agent_calls"
      ("id","tenant_id","practice_id","caller_phone","call_provider","provider_call_id","status","started_at","created_at","updated_at")
     values ($1,$2,$3,$4,$5,$6,'active',current_timestamp,current_timestamp,current_timestamp)`,
    [id, input.tenantId, input.practiceId ?? null, input.callerPhone, input.callProvider, input.providerCallId ?? null],
  );
  return { id };
}

export async function ensureVoiceAgentCall(input: {
  id: string;
  tenantId: string;
  practiceId?: string | null;
  callerPhone: string;
  callProvider: string;
  providerCallId?: string | null;
}) {
  await query(
    `insert into "voice_agent_calls"
      ("id","tenant_id","practice_id","caller_phone","call_provider","provider_call_id","status","started_at","created_at","updated_at")
     values ($1,$2,$3,$4,$5,$6,'active',current_timestamp,current_timestamp,current_timestamp)
     on conflict ("id") do nothing`,
    [input.id, input.tenantId, input.practiceId ?? null, input.callerPhone, input.callProvider, input.providerCallId ?? null],
  );
  return { id: input.id };
}

export async function upsertVoiceAgentSession(input: {
  sessionId?: string | null;
  callId: string;
  tenantId: string;
  practiceId?: string | null;
  conversationState: unknown;
  extractedEntities: unknown;
  missingFields: unknown;
  schedulingIntent?: string | null;
  currentStep?: string | null;
  confidenceScore?: number | null;
  escalationRequired?: boolean;
  escalationReason?: string | null;
}) {
  const id = input.sessionId || newId("vasess");
  await query(
    `insert into "voice_agent_sessions"
      ("id","call_id","tenant_id","practice_id","conversation_state","extracted_entities","missing_fields","scheduling_intent","current_step","confidence_score","escalation_required","escalation_reason","created_at","updated_at")
     values ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8,$9,$10,$11,$12,current_timestamp,current_timestamp)
     on conflict ("id") do update set
       "conversation_state" = excluded."conversation_state",
       "extracted_entities" = excluded."extracted_entities",
       "missing_fields" = excluded."missing_fields",
       "scheduling_intent" = excluded."scheduling_intent",
       "current_step" = excluded."current_step",
       "confidence_score" = excluded."confidence_score",
       "escalation_required" = excluded."escalation_required",
       "escalation_reason" = excluded."escalation_reason",
       "updated_at" = current_timestamp`,
    [
      id,
      input.callId,
      input.tenantId,
      input.practiceId ?? null,
      JSON.stringify(input.conversationState ?? {}),
      JSON.stringify(input.extractedEntities ?? {}),
      JSON.stringify(input.missingFields ?? []),
      input.schedulingIntent ?? null,
      input.currentStep ?? null,
      typeof input.confidenceScore === "number" ? input.confidenceScore : null,
      Boolean(input.escalationRequired),
      input.escalationReason ?? null,
    ],
  );
  return { id };
}

export async function loadVoiceAgentSession(tenantId: string, callId: string) {
  const result = await query<{ id: string; conversation_state: unknown; extracted_entities: unknown; missing_fields: unknown; scheduling_intent: string | null; current_step: string | null; escalation_required: boolean; escalation_reason: string | null }>(
    `select "id","conversation_state","extracted_entities","missing_fields","scheduling_intent","current_step","escalation_required","escalation_reason"
     from "voice_agent_sessions"
     where "tenant_id" = $1 and "call_id" = $2
     order by "updated_at" desc
     limit 1`,
    [tenantId, callId],
  );
  return result.rows[0] ?? null;
}

export async function appendCallTranscript(tenantId: string, callId: string, text: string) {
  await query(
    `update "voice_agent_calls"
     set "transcript" = coalesce("transcript",'') || $3,
         "updated_at" = current_timestamp
     where "tenant_id" = $1 and "id" = $2`,
    [tenantId, callId, `\n${text}`],
  );
}

export async function completeVoiceAgentCall(tenantId: string, callId: string, summary: string) {
  await query(
    `update "voice_agent_calls"
     set "status"='completed',
         "ended_at"=current_timestamp,
         "summary"=$3,
         "updated_at"=current_timestamp
     where "tenant_id"=$1 and "id"=$2`,
    [tenantId, callId, summary],
  );
}

export async function createAppointmentRequest(input: {
  tenantId: string;
  practiceId?: string | null;
  callId?: string | null;
  phone: string;
  patientType: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  dob?: string | null;
  insuranceProvider?: string | null;
  memberId?: string | null;
  appointmentReason?: string | null;
  preferredDate?: string | null;
  preferredTimeWindow?: string | null;
  selectedSlotStart?: string | null;
  selectedSlotEnd?: string | null;
  externalAppointmentId?: string | null;
  status: string;
  notes?: string | null;
  rawPayload?: unknown;
}) {
  const id = newId("apreq");
  await query(
    `insert into "appointment_requests"
      ("id","tenant_id","practice_id","call_id","patient_type","first_name","last_name","date_of_birth","phone","email","insurance_provider","member_id","appointment_reason","preferred_date","preferred_time_window","selected_slot_start","selected_slot_end","external_appointment_id","status","notes","raw_payload","created_at","updated_at")
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::timestamp,$17::timestamp,$18,$19,$20,$21::jsonb,current_timestamp,current_timestamp)`,
    [
      id,
      input.tenantId,
      input.practiceId ?? null,
      input.callId ?? null,
      input.patientType,
      input.firstName ?? null,
      input.lastName ?? null,
      input.dob ?? null,
      input.phone,
      input.email ?? null,
      input.insuranceProvider ?? null,
      input.memberId ?? null,
      input.appointmentReason ?? null,
      input.preferredDate ?? null,
      input.preferredTimeWindow ?? null,
      input.selectedSlotStart ?? null,
      input.selectedSlotEnd ?? null,
      input.externalAppointmentId ?? null,
      input.status,
      input.notes ?? null,
      JSON.stringify(input.rawPayload ?? {}),
    ],
  );
  return { id };
}
