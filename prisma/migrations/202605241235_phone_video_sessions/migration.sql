create table if not exists "PhoneVideoSession" (
  "id" text primary key,
  "tenantId" text not null,
  "conversationId" text,
  "activeCallId" text,
  "patientId" text,
  "provider" text not null default 'ZOOM',
  "providerMeetingId" text not null,
  "providerUuid" text,
  "topic" text not null,
  "startUrl" text,
  "joinUrl" text not null,
  "password" text,
  "status" text not null default 'CREATED',
  "createdByRole" text not null default 'front_desk',
  "metadata" jsonb,
  "startedAt" timestamp(3),
  "endedAt" timestamp(3),
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create unique index if not exists "PhoneVideoSession_provider_meeting_uidx"
  on "PhoneVideoSession" ("provider", "providerMeetingId");

create index if not exists "PhoneVideoSession_tenant_conversation_idx"
  on "PhoneVideoSession" ("tenantId", "conversationId", "createdAt");

create index if not exists "PhoneVideoSession_tenant_status_idx"
  on "PhoneVideoSession" ("tenantId", "status");
