export type VoiceAgentIntent =
  | "schedule_new_appointment"
  | "reschedule_appointment"
  | "cancel_appointment"
  | "confirm_appointment"
  | "emergency_dental_issue"
  | "insurance_question"
  | "pricing_question"
  | "office_hours_question"
  | "location_question"
  | "human_request"
  | "unknown";

export type PatientType = "new" | "existing" | "unknown";

export type ConversationState = {
  caller: {
    name: string | null;
    phone: string | null;
    relationship_to_patient: string | null;
  };
  patient: {
    is_new_patient: boolean | null;
    first_name: string | null;
    last_name: string | null;
    dob: string | null;
    phone: string | null;
    email: string | null;
  };
  appointment: {
    reason: string | null;
    urgency: "routine" | "urgent" | "emergency" | null;
    preferred_days: string[];
    preferred_time_windows: string[];
    preferred_provider: string | null;
    selected_slot: { slot_start: string; slot_end: string; provider_id?: string | null } | null;
    offered_slots?: Slot[];
  };
  insurance: {
    provider: string | null;
    member_id: string | null;
    group_id: string | null;
  };
  conversation: {
    last_question_asked: string | null;
    answered_fields: string[];
    missing_fields: string[];
    confirmation_pending: boolean;
    human_escalation_required: boolean;
  };
};

export type ExtractedEntities = Partial<{
  intent: VoiceAgentIntent;
  patient_type: PatientType;
  caller_name: string;
  relationship_to_patient: string;
  patient_first_name: string;
  patient_last_name: string;
  dob: string;
  phone: string;
  email: string;
  insurance_provider: string;
  insurance_member_id: string;
  appointment_reason: string;
  preferred_days: string[];
  preferred_time_windows: string[];
  preferred_provider: string;
  selected_slot_start: string;
  selected_slot_end: string;
  urgency: "routine" | "urgent" | "emergency";
}>;

export type Slot = {
  slotId: string;
  providerId: string | null;
  providerName: string | null;
  slotStart: string;
  slotEnd: string;
  serviceType: string;
  sourceSystem: string;
};
