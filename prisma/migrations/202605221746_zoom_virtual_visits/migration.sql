create table if not exists "PmsVirtualVisit" (
  "id" text primary key,
  "tenantId" text not null,
  "appointmentId" text not null,
  "patientId" text,
  "providerId" text,
  "provider" text not null default 'ZOOM',
  "providerMeetingId" text not null,
  "providerUuid" text,
  "topic" text not null,
  "startUrl" text,
  "joinUrl" text not null,
  "password" text,
  "status" text not null default 'CREATED',
  "participantStatus" text not null default 'NOT_STARTED',
  "startedAt" timestamptz,
  "endedAt" timestamptz,
  "lastEventAt" timestamptz,
  "createdByRole" text not null default 'front_desk',
  "metadata" jsonb,
  "createdAt" timestamptz not null default current_timestamp,
  "updatedAt" timestamptz not null default current_timestamp
);

create unique index if not exists "PmsVirtualVisit_provider_meeting_key"
  on "PmsVirtualVisit" ("provider", "providerMeetingId");

create index if not exists "PmsVirtualVisit_tenant_appointment_idx"
  on "PmsVirtualVisit" ("tenantId", "appointmentId", "createdAt" desc);

create index if not exists "PmsVirtualVisit_provider_uuid_idx"
  on "PmsVirtualVisit" ("provider", "providerUuid");
