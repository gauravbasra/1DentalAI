alter table "PhoneActiveCall"
  add column if not exists "providerConferenceId" text,
  add column if not exists "providerConferenceName" text,
  add column if not exists "bridgeCallSid" text,
  add column if not exists "callControlMode" text not null default 'DIRECT_CALL';

create index if not exists "PhoneActiveCall_conference_idx" on "PhoneActiveCall" ("tenantId", "providerConferenceName");

alter table "PhoneCallControlAction"
  add column if not exists "providerRequest" jsonb,
  add column if not exists "providerResponse" jsonb,
  add column if not exists "executedAt" timestamp(3);
