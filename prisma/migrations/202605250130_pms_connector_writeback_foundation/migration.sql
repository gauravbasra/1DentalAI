create table if not exists "PmsConnectorCapability" (
  "id" text primary key,
  "tenantId" text not null,
  "connectorInstanceId" text not null references "ConnectorInstallation"("id") on delete cascade,
  "capabilityKey" text not null,
  "resourceType" text not null,
  "operation" text not null,
  "status" text not null default 'UNKNOWN',
  "requiresApproval" boolean not null default true,
  "requiredEvidence" jsonb not null default '[]'::jsonb,
  "lastSmokeTestAt" timestamp(3),
  "lastSmokeTestStatus" text,
  "lastSmokeTestSummary" text,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create unique index if not exists "PmsConnectorCapability_unique"
  on "PmsConnectorCapability"("tenantId", "connectorInstanceId", "capabilityKey");
create index if not exists "PmsConnectorCapability_tenant_status_idx"
  on "PmsConnectorCapability"("tenantId", "status", "operation");

create table if not exists "PmsExternalRecordLink" (
  "id" text primary key,
  "tenantId" text not null,
  "localType" text not null,
  "localId" text not null,
  "connectorInstanceId" text not null references "ConnectorInstallation"("id") on delete cascade,
  "externalType" text not null,
  "externalId" text not null,
  "externalUrl" text,
  "lastSyncedAt" timestamp(3),
  "metadata" jsonb not null default '{}'::jsonb,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create unique index if not exists "PmsExternalRecordLink_unique"
  on "PmsExternalRecordLink"("tenantId", "localType", "localId", "connectorInstanceId", "externalType");
create index if not exists "PmsExternalRecordLink_external_idx"
  on "PmsExternalRecordLink"("tenantId", "connectorInstanceId", "externalType", "externalId");

create table if not exists "PmsWritebackJob" (
  "id" text primary key,
  "tenantId" text not null,
  "connectorInstanceId" text not null references "ConnectorInstallation"("id") on delete cascade,
  "capabilityKey" text not null,
  "localType" text not null,
  "localId" text not null,
  "externalType" text not null,
  "status" text not null default 'PENDING_APPROVAL',
  "idempotencyKey" text not null,
  "requestedByRole" text not null,
  "approvedByRole" text,
  "approvedAt" timestamp(3),
  "payload" jsonb not null,
  "evidence" jsonb not null default '[]'::jsonb,
  "blockedReason" text,
  "externalResponse" jsonb,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create unique index if not exists "PmsWritebackJob_idempotency_unique"
  on "PmsWritebackJob"("tenantId", "idempotencyKey");
create index if not exists "PmsWritebackJob_tenant_status_idx"
  on "PmsWritebackJob"("tenantId", "status", "createdAt");
create index if not exists "PmsWritebackJob_local_idx"
  on "PmsWritebackJob"("tenantId", "localType", "localId");

create table if not exists "PmsWritebackAttempt" (
  "id" text primary key,
  "tenantId" text not null,
  "writebackJobId" text not null references "PmsWritebackJob"("id") on delete cascade,
  "status" text not null,
  "requestPayload" jsonb not null,
  "responsePayload" jsonb,
  "statusCode" integer,
  "errorMessage" text,
  "startedAt" timestamp(3) not null default current_timestamp,
  "finishedAt" timestamp(3)
);

create index if not exists "PmsWritebackAttempt_job_started_idx"
  on "PmsWritebackAttempt"("writebackJobId", "startedAt");

insert into "PmsConnectorCapability"
  ("id", "tenantId", "connectorInstanceId", "capabilityKey", "resourceType", "operation", "status", "requiresApproval", "requiredEvidence", "lastSmokeTestStatus", "lastSmokeTestSummary")
values
  ('pms_cap_open_dental_patients_read', 'tenant_1dentalai_production', 'conn_inst_pms_denver', 'patients.read', 'patient', 'READ', 'UNKNOWN', false, '[]'::jsonb, 'NOT_RUN', 'Read-only smoke test not run.'),
  ('pms_cap_open_dental_appointments_read', 'tenant_1dentalai_production', 'conn_inst_pms_denver', 'appointments.read', 'appointment', 'READ', 'UNKNOWN', false, '[]'::jsonb, 'NOT_RUN', 'Read-only smoke test not run.'),
  ('pms_cap_open_dental_clinical_notes_write', 'tenant_1dentalai_production', 'conn_inst_pms_denver', 'clinical_notes.write', 'clinical_note', 'WRITE', 'APPROVAL_REQUIRED', true, '["providerApprovalId","sourceRecordId"]'::jsonb, 'NOT_RUN', 'Writeback smoke test not run.'),
  ('pms_cap_open_dental_treatment_plans_write', 'tenant_1dentalai_production', 'conn_inst_pms_denver', 'treatment_plans.write', 'treatment_plan', 'WRITE', 'APPROVAL_REQUIRED', true, '["providerApprovalId","cdtValidation"]'::jsonb, 'NOT_RUN', 'Writeback smoke test not run.'),
  ('pms_cap_open_dental_perio_write', 'tenant_1dentalai_production', 'conn_inst_pms_denver', 'perio.write', 'perio_exam', 'WRITE', 'APPROVAL_REQUIRED', true, '["providerApprovalId","perioSignoffId"]'::jsonb, 'NOT_RUN', 'Writeback smoke test not run.'),
  ('pms_cap_open_dental_documents_write', 'tenant_1dentalai_production', 'conn_inst_pms_denver', 'documents.write', 'document', 'WRITE', 'APPROVAL_REQUIRED', true, '["documentArtifactId","checksum"]'::jsonb, 'NOT_RUN', 'Writeback smoke test not run.'),
  ('pms_cap_open_dental_claims_write', 'tenant_1dentalai_production', 'conn_inst_pms_denver', 'claims.write', 'claim', 'WRITE', 'APPROVAL_REQUIRED', true, '["rcmPacketId","evidenceIds"]'::jsonb, 'NOT_RUN', 'Writeback smoke test not run.')
on conflict ("tenantId", "connectorInstanceId", "capabilityKey") do update set
  "resourceType" = excluded."resourceType",
  "operation" = excluded."operation",
  "requiresApproval" = excluded."requiresApproval",
  "requiredEvidence" = excluded."requiredEvidence",
  "updatedAt" = current_timestamp;
