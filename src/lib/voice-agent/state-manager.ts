import type { ConversationState, ExtractedEntities, PatientType, VoiceAgentIntent } from "./types";

export function newConversationState(input?: { callerPhone?: string | null }): ConversationState {
  return {
    caller: {
      name: null,
      phone: input?.callerPhone || null,
      relationship_to_patient: null,
    },
    patient: {
      is_new_patient: null,
      first_name: null,
      last_name: null,
      dob: null,
      phone: input?.callerPhone || null,
      email: null,
    },
    appointment: {
      reason: null,
      urgency: null,
      preferred_days: [],
      preferred_time_windows: [],
      preferred_provider: null,
      selected_slot: null,
      offered_slots: [],
    },
    insurance: {
      provider: null,
      member_id: null,
      group_id: null,
    },
    conversation: {
      last_question_asked: null,
      answered_fields: [],
      missing_fields: [],
      confirmation_pending: false,
      human_escalation_required: false,
    },
  };
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

export function mergeEntities(state: ConversationState, entities: ExtractedEntities) {
  // Caller/patient identity
  if (entities.caller_name && !state.caller.name) state.caller.name = entities.caller_name;
  if (entities.relationship_to_patient && !state.caller.relationship_to_patient) state.caller.relationship_to_patient = entities.relationship_to_patient;
  if (entities.phone) {
    state.caller.phone ||= entities.phone;
    state.patient.phone ||= entities.phone;
  }
  // If we only have a caller name, use it as a patient name seed to avoid re-asking.
  if (entities.caller_name && (!state.patient.first_name || !state.patient.last_name)) {
    const parsed = splitName(entities.caller_name);
    state.patient.first_name ||= parsed.first;
    state.patient.last_name ||= parsed.last;
  }
  if (entities.patient_first_name) state.patient.first_name ||= entities.patient_first_name;
  if (entities.patient_last_name) state.patient.last_name ||= entities.patient_last_name;
  if (entities.dob) state.patient.dob ||= entities.dob;
  if (entities.email) state.patient.email ||= entities.email;

  // Patient type
  if (typeof entities.patient_type === "string") {
    if (entities.patient_type === "new") state.patient.is_new_patient = true;
    if (entities.patient_type === "existing") state.patient.is_new_patient = false;
  }

  // Appointment
  if (entities.appointment_reason) state.appointment.reason ||= entities.appointment_reason;
  if (entities.urgency) state.appointment.urgency ||= entities.urgency;
  if (Array.isArray(entities.preferred_days) && entities.preferred_days.length) {
    for (const day of entities.preferred_days) if (day && !state.appointment.preferred_days.includes(day)) state.appointment.preferred_days.push(day);
  }
  if (Array.isArray(entities.preferred_time_windows) && entities.preferred_time_windows.length) {
    for (const win of entities.preferred_time_windows) if (win && !state.appointment.preferred_time_windows.includes(win)) state.appointment.preferred_time_windows.push(win);
  }
  if (entities.preferred_provider) state.appointment.preferred_provider ||= entities.preferred_provider;
  if (entities.selected_slot_start && entities.selected_slot_end && !state.appointment.selected_slot) {
    state.appointment.selected_slot = { slot_start: entities.selected_slot_start, slot_end: entities.selected_slot_end };
  }

  // Insurance
  if (entities.insurance_provider) state.insurance.provider ||= entities.insurance_provider;
  if (entities.insurance_member_id) state.insurance.member_id ||= entities.insurance_member_id;

  // Track answered fields (simple)
  for (const key of Object.keys(entities)) {
    if (!state.conversation.answered_fields.includes(key)) state.conversation.answered_fields.push(key);
  }
  return state;
}

export function computeMissingFields(state: ConversationState, rules: { insuranceRequired: boolean; dobRequired: boolean; emailRequired: boolean }) {
  const missing: string[] = [];
  const isNew = state.patient.is_new_patient;
  if (isNew === null) missing.push("patient_type");
  if (!state.appointment.reason) missing.push("appointment_reason");
  if (!state.appointment.preferred_days.length && !state.appointment.selected_slot) missing.push("preferred_day");
  if (!state.appointment.preferred_time_windows.length && !state.appointment.selected_slot) missing.push("preferred_time_window");
  if (!state.patient.first_name) missing.push("patient_first_name");
  if (!state.patient.last_name) missing.push("patient_last_name");
  if (!state.patient.phone) missing.push("patient_phone");
  if (rules.dobRequired && !state.patient.dob) missing.push("patient_dob");
  if (rules.emailRequired && !state.patient.email) missing.push("patient_email");
  if (rules.insuranceRequired && !state.insurance.provider) missing.push("insurance_provider");
  state.conversation.missing_fields = missing;
  return missing;
}

export function nextQuestion(state: ConversationState, missing: string[]): string {
  const name = state.patient.first_name || state.caller.name;
  const prefix = name ? `Thanks ${name}. ` : "";
  const head = missing[0] || "";
  state.conversation.last_question_asked = head || null;
  if (head === "patient_type") return `${prefix}Are you a new patient, or have you visited us before?`;
  if (head === "patient_first_name") return `Great. What’s the patient’s first name?`;
  if (head === "patient_last_name") return `${prefix}And the last name?`;
  if (head === "patient_phone") return `${prefix}What’s the best phone number for the appointment?`;
  if (head === "patient_dob") return `${prefix}What’s the patient’s date of birth?`;
  if (head === "patient_email") return `${prefix}What’s the best email address for confirmations?`;
  if (head === "insurance_provider") return `${prefix}Do you have dental insurance you’d like us to use, or should I note this as self-pay?`;
  if (head === "appointment_reason") return `${prefix}What type of visit are you looking for today, like a cleaning, exam, consult, or urgent problem?`;
  if (head === "preferred_day") return `${prefix}What day works best for you?`;
  if (head === "preferred_time_window") return `${prefix}What time of day works best, like morning or afternoon?`;
  if (head === "slot_choice") return `${prefix}Which of those times works best for you?`;
  return `${prefix}What would you like help with today?`;
}

export function normalizeIntent(intent: string | null | undefined): VoiceAgentIntent {
  const value = String(intent || "").trim();
  if (!value) return "unknown";
  const known = new Set<VoiceAgentIntent>([
    "schedule_new_appointment",
    "reschedule_appointment",
    "cancel_appointment",
    "confirm_appointment",
    "emergency_dental_issue",
    "insurance_question",
    "pricing_question",
    "office_hours_question",
    "location_question",
    "human_request",
    "unknown",
  ]);
  return (known.has(value as VoiceAgentIntent) ? (value as VoiceAgentIntent) : "unknown");
}

export function normalizePatientType(value: string | null | undefined): PatientType {
  const text = String(value || "").trim().toLowerCase();
  if (text === "new") return "new";
  if (text === "existing") return "existing";
  return "unknown";
}
