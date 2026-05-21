alter table "PhoneOutboundMessage"
  add column if not exists "provider" text,
  add column if not exists "providerMessageId" text,
  add column if not exists "providerStatus" text,
  add column if not exists "providerError" text,
  add column if not exists "lastAttemptAt" timestamp(3),
  add column if not exists "sentAt" timestamp(3);

create index if not exists "PhoneOutboundMessage_provider_providerMessageId_idx"
  on "PhoneOutboundMessage" ("provider", "providerMessageId");
