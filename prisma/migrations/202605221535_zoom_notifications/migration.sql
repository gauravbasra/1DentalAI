create table if not exists "ZoomNotificationEvent" (
  "id" text primary key,
  "tenantId" text not null default 'tenant_1dentalai_production',
  "event" text not null,
  "eventTs" timestamptz,
  "payload" jsonb not null,
  "signatureStatus" text not null default 'NOT_CONFIGURED',
  "validationStatus" text not null default 'NOT_VALIDATION_EVENT',
  "sourceIp" text,
  "userAgent" text,
  "receivedAt" timestamptz not null default current_timestamp
);

create index if not exists "ZoomNotificationEvent_tenant_received_idx"
  on "ZoomNotificationEvent" ("tenantId", "receivedAt" desc);

create index if not exists "ZoomNotificationEvent_event_idx"
  on "ZoomNotificationEvent" ("event");
