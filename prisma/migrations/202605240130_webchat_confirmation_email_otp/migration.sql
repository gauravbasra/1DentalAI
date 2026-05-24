create table if not exists "EmailOutboundMessage" (
  "id" text primary key,
  "tenantId" text not null,
  "conversationId" text,
  "patientId" text,
  "appointmentId" text,
  "recipientEmail" text not null,
  "messageType" text not null,
  "subject" text not null,
  "bodyText" text not null,
  "bodyHtml" text,
  "deliveryStatus" text not null default 'NOT_SENT',
  "connectorStatus" text not null default 'CONNECTOR_REQUIRED',
  "provider" text,
  "providerMessageId" text,
  "providerStatus" text,
  "providerError" text,
  "blockedReason" text,
  "readiness" jsonb,
  "lastAttemptAt" timestamp,
  "sentAt" timestamp,
  "createdAt" timestamp not null default current_timestamp,
  "updatedAt" timestamp not null default current_timestamp
);

create index if not exists "EmailOutboundMessage_tenant_status_idx"
  on "EmailOutboundMessage" ("tenantId", "deliveryStatus", "createdAt");
create index if not exists "EmailOutboundMessage_appointment_idx"
  on "EmailOutboundMessage" ("appointmentId", "messageType");
create index if not exists "EmailOutboundMessage_provider_idx"
  on "EmailOutboundMessage" ("provider", "providerMessageId");

create table if not exists "PatientCommunicationOtp" (
  "id" text primary key,
  "tenantId" text not null,
  "conversationId" text,
  "patientId" text,
  "appointmentId" text,
  "channel" text not null default 'SMS',
  "destinationHash" text not null,
  "purpose" text not null,
  "otpHash" text not null,
  "status" text not null default 'PENDING',
  "attemptCount" integer not null default 0,
  "maxAttempts" integer not null default 5,
  "expiresAt" timestamp not null,
  "verifiedAt" timestamp,
  "lastSentMessageId" text,
  "metadata" jsonb,
  "createdAt" timestamp not null default current_timestamp,
  "updatedAt" timestamp not null default current_timestamp
);

create index if not exists "PatientCommunicationOtp_lookup_idx"
  on "PatientCommunicationOtp" ("tenantId", "conversationId", "purpose", "status", "expiresAt");
create index if not exists "PatientCommunicationOtp_destination_idx"
  on "PatientCommunicationOtp" ("tenantId", "destinationHash", "purpose", "status");
