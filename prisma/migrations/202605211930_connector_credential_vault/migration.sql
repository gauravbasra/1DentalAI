create table if not exists "ConnectorCredentialVault" (
  "id" text primary key,
  "tenantId" text not null,
  "definitionId" text,
  "installationId" text,
  "providerKey" text not null,
  "credentialLabel" text not null,
  "credentialType" text not null,
  "status" text not null default 'STORED_PENDING_VALIDATION',
  "encryptedValue" text not null,
  "encryptionIv" text not null,
  "encryptionTag" text not null,
  "fingerprint" text not null,
  "lastFour" text,
  "createdByRole" text not null default 'support_admin',
  "rotatedAt" timestamp(3) not null default current_timestamp,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create unique index if not exists "ConnectorCredentialVault_tenantId_installationId_providerKey_credentialLabel_key"
  on "ConnectorCredentialVault" ("tenantId", "installationId", "providerKey", "credentialLabel");
create index if not exists "ConnectorCredentialVault_tenantId_providerKey_status_idx"
  on "ConnectorCredentialVault" ("tenantId", "providerKey", "status");
create index if not exists "ConnectorCredentialVault_installationId_status_idx"
  on "ConnectorCredentialVault" ("installationId", "status");

insert into "ConnectorHealthCheck" ("id", "tenantId", "definitionId", "installationId", "checkType", "status", "resultSummary", "latencyMs")
values
  ('conn_health_twilio_credential_vault', 'tenant_1dentalai_production', 'conn_def_phone_carrier', 'conn_inst_phone_denver', 'CREDENTIAL_VAULT_TWILIO', 'NOT_RUN', 'Waiting on Twilio Account SID, Auth Token/API key, messaging service/SMS registration, voice webhook signing secret, and number inventory.', null),
  ('conn_health_stedi_credential_vault', 'tenant_1dentalai_production', 'conn_def_payer_x12', 'conn_inst_payer_router', 'CREDENTIAL_VAULT_STEDI', 'NOT_RUN', 'Waiting on Stedi API key, clearinghouse workspace, submitter IDs, trading partner registry, and webhook evidence.', null),
  ('conn_health_nexhealth_credential_vault', 'tenant_1dentalai_production', 'conn_def_pms_open_dental', 'conn_inst_pms_denver', 'CREDENTIAL_VAULT_NEXHEALTH', 'NOT_RUN', 'Waiting on NexHealth API credentials, subdomain/location mapping, sync/webhook configuration, and scheduling smoke-test evidence.', null)
on conflict ("id") do nothing;
