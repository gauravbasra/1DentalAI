create table if not exists "voice_agent_calls" (
  "id" text primary key,
  "tenant_id" text not null,
  "practice_id" text,
  "caller_phone" text not null,
  "call_provider" text not null,
  "provider_call_id" text,
  "status" text not null default 'active',
  "started_at" timestamp(3) not null default current_timestamp,
  "ended_at" timestamp(3),
  "transcript" text,
  "summary" text,
  "recording_url" text,
  "created_at" timestamp(3) not null default current_timestamp,
  "updated_at" timestamp(3) not null default current_timestamp
);

create table if not exists "voice_agent_sessions" (
  "id" text primary key,
  "call_id" text not null,
  "tenant_id" text not null,
  "practice_id" text,
  "conversation_state" jsonb not null default '{}'::jsonb,
  "extracted_entities" jsonb not null default '{}'::jsonb,
  "missing_fields" jsonb not null default '[]'::jsonb,
  "scheduling_intent" text,
  "current_step" text,
  "confidence_score" double precision,
  "escalation_required" boolean not null default false,
  "escalation_reason" text,
  "created_at" timestamp(3) not null default current_timestamp,
  "updated_at" timestamp(3) not null default current_timestamp
);

create table if not exists "appointment_requests" (
  "id" text primary key,
  "tenant_id" text not null,
  "practice_id" text,
  "call_id" text,
  "patient_type" text not null default 'unknown',
  "first_name" text,
  "last_name" text,
  "date_of_birth" text,
  "phone" text not null,
  "email" text,
  "insurance_provider" text,
  "member_id" text,
  "appointment_reason" text,
  "preferred_provider" text,
  "preferred_date" text,
  "preferred_time_window" text,
  "selected_slot_start" timestamp(3),
  "selected_slot_end" timestamp(3),
  "external_appointment_id" text,
  "status" text not null default 'draft',
  "notes" text,
  "raw_payload" jsonb not null default '{}'::jsonb,
  "created_at" timestamp(3) not null default current_timestamp,
  "updated_at" timestamp(3) not null default current_timestamp
);

create table if not exists "practice_scheduling_rules" (
  "id" text primary key,
  "tenant_id" text not null,
  "practice_id" text,
  "new_patient_duration_minutes" int not null default 60,
  "existing_patient_duration_minutes" int not null default 45,
  "emergency_duration_minutes" int not null default 30,
  "hygiene_duration_minutes" int not null default 60,
  "allowed_services" jsonb not null default '[]'::jsonb,
  "provider_rules" jsonb not null default '{}'::jsonb,
  "insurance_required" boolean not null default false,
  "dob_required" boolean not null default false,
  "email_required" boolean not null default false,
  "emergency_keywords" jsonb not null default '[]'::jsonb,
  "escalation_rules" jsonb not null default '{}'::jsonb,
  "created_at" timestamp(3) not null default current_timestamp,
  "updated_at" timestamp(3) not null default current_timestamp
);

create table if not exists "appointment_slots_cache" (
  "id" text primary key,
  "tenant_id" text not null,
  "practice_id" text,
  "provider_id" text,
  "slot_start" timestamp(3) not null,
  "slot_end" timestamp(3) not null,
  "service_type" text not null,
  "source_system" text not null,
  "external_slot_id" text,
  "is_available" boolean not null default true,
  "expires_at" timestamp(3) not null,
  "created_at" timestamp(3) not null default current_timestamp,
  "updated_at" timestamp(3) not null default current_timestamp
);

create index if not exists "voice_agent_calls_tenant_practice_idx" on "voice_agent_calls" ("tenant_id", "practice_id");
create index if not exists "voice_agent_calls_tenant_status_idx" on "voice_agent_calls" ("tenant_id", "status");
create index if not exists "voice_agent_sessions_tenant_practice_idx" on "voice_agent_sessions" ("tenant_id", "practice_id");
create index if not exists "voice_agent_sessions_tenant_call_idx" on "voice_agent_sessions" ("tenant_id", "call_id");
create index if not exists "appointment_requests_tenant_practice_idx" on "appointment_requests" ("tenant_id", "practice_id");
create index if not exists "appointment_requests_tenant_status_idx" on "appointment_requests" ("tenant_id", "status");
create index if not exists "appointment_slots_cache_tenant_service_idx" on "appointment_slots_cache" ("tenant_id", "practice_id", "service_type");
create index if not exists "appointment_slots_cache_tenant_expires_idx" on "appointment_slots_cache" ("tenant_id", "expires_at");

