create table if not exists "PhoneScreenPopSnapshot" (
  "id" text primary key,
  "tenantId" text not null,
  "conversationId" text not null,
  "activeCallId" text,
  "patientId" text,
  "callerNumber" text,
  "matchStatus" text not null default 'UNMATCHED',
  "matchConfidence" integer not null default 0,
  "matchedBy" text,
  "candidatePatients" jsonb not null default '[]'::jsonb,
  "snapshotJson" jsonb not null default '{}'::jsonb,
  "actionLinks" jsonb not null default '{}'::jsonb,
  "recommendedActions" jsonb not null default '[]'::jsonb,
  "privacyFlags" jsonb not null default '[]'::jsonb,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create unique index if not exists "PhoneScreenPopSnapshot_conversationId_key" on "PhoneScreenPopSnapshot" ("conversationId");
create index if not exists "PhoneScreenPopSnapshot_tenant_match_idx" on "PhoneScreenPopSnapshot" ("tenantId", "matchStatus", "createdAt");
create index if not exists "PhoneScreenPopSnapshot_patient_idx" on "PhoneScreenPopSnapshot" ("patientId", "createdAt");
create index if not exists "PhoneScreenPopSnapshot_activeCall_idx" on "PhoneScreenPopSnapshot" ("activeCallId");

create table if not exists "PhoneCallTranscriptEvent" (
  "id" text primary key,
  "tenantId" text not null,
  "conversationId" text not null,
  "activeCallId" text,
  "provider" text not null default 'TWILIO',
  "providerEventId" text,
  "sequence" integer not null default 0,
  "speaker" text not null default 'UNKNOWN',
  "languageCode" text not null default 'en-US',
  "transcriptText" text not null,
  "translationText" text,
  "confidence" double precision,
  "isFinal" boolean not null default true,
  "eventType" text not null default 'TRANSCRIPTION_CONTENT',
  "metadata" jsonb,
  "createdAt" timestamp(3) not null default current_timestamp
);

create index if not exists "PhoneCallTranscriptEvent_conversation_seq_idx" on "PhoneCallTranscriptEvent" ("conversationId", "sequence", "createdAt");
create index if not exists "PhoneCallTranscriptEvent_tenant_created_idx" on "PhoneCallTranscriptEvent" ("tenantId", "createdAt");
create unique index if not exists "PhoneCallTranscriptEvent_provider_event_key" on "PhoneCallTranscriptEvent" ("tenantId", "provider", "providerEventId") where "providerEventId" is not null;

create table if not exists "PhoneCallAiAssistEvent" (
  "id" text primary key,
  "tenantId" text not null,
  "conversationId" text not null,
  "activeCallId" text,
  "eventType" text not null,
  "severity" text not null default 'INFO',
  "title" text not null,
  "body" text not null,
  "serviceTags" text[] not null default array[]::text[],
  "revenueOpportunityCents" integer not null default 0,
  "requiresHuman" boolean not null default false,
  "status" text not null default 'OPEN',
  "metadata" jsonb,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create index if not exists "PhoneCallAiAssistEvent_conversation_idx" on "PhoneCallAiAssistEvent" ("conversationId", "status", "createdAt");
create index if not exists "PhoneCallAiAssistEvent_tenant_type_idx" on "PhoneCallAiAssistEvent" ("tenantId", "eventType", "status");

create table if not exists "PhoneAiReceptionPolicy" (
  "id" text primary key,
  "tenantId" text not null,
  "locationId" text,
  "name" text not null,
  "status" text not null default 'ACTIVE',
  "ringThreshold" integer not null default 4,
  "mode" text not null default 'ASSIST_WHEN_BUSY',
  "pricingPolicy" text not null default 'NO_PUBLIC_PRICING_HUMAN_ONLY',
  "bookingPolicy" text not null default 'DIRECT_BOOKING_WITH_SCHEDULING_GATES',
  "billingPolicy" text not null default 'EXPLAIN_BALANCE_ROUTE_SENSITIVE_TO_BILLING',
  "handoffPolicy" jsonb not null default '{"frontDeskBusy":"AI_INTERJECTS_AFTER_RING_THRESHOLD","pricing":"WARM_TRANSFER_REQUIRED","urgentSymptoms":"STAFF_OR_EMERGENCY_ESCALATION"}'::jsonb,
  "voiceSettings" jsonb not null default '{"voice":"alloy","speed":1,"language":"en-US","empathy":"high","interruptionHandling":"natural"}'::jsonb,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create unique index if not exists "PhoneAiReceptionPolicy_tenant_location_key" on "PhoneAiReceptionPolicy" ("tenantId", coalesce("locationId", 'enterprise'));
create index if not exists "PhoneAiReceptionPolicy_tenant_status_idx" on "PhoneAiReceptionPolicy" ("tenantId", "status");

insert into "PhoneAiReceptionPolicy" ("id", "tenantId", "name", "status", "ringThreshold", "mode")
select 'phone_ai_policy_default', 'tenant_1dentalai_production', 'Default AI backup receptionist', 'ACTIVE', 4, 'ASSIST_WHEN_BUSY'
where not exists (
  select 1 from "PhoneAiReceptionPolicy"
  where "tenantId" = 'tenant_1dentalai_production' and "locationId" is null
);
