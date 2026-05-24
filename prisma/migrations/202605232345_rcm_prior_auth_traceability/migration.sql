alter table "RcmPriorAuthorization"
  add column if not exists "packetArtifactId" text,
  add column if not exists "packetChecksum" text,
  add column if not exists "submissionMode" text not null default 'NOT_SUBMITTED',
  add column if not exists "payerPortalRunId" text,
  add column if not exists "payerAcknowledgementId" text,
  add column if not exists "determinationAt" timestamp(3),
  add column if not exists "approvalNumber" text;

create index if not exists "RcmPriorAuthorization_tenantId_submissionMode_connectorStatus_idx"
  on "RcmPriorAuthorization" ("tenantId", "submissionMode", "connectorStatus");

create index if not exists "RcmPriorAuthorization_packetArtifactId_idx"
  on "RcmPriorAuthorization" ("packetArtifactId");

create index if not exists "RcmPriorAuthorization_payerPortalRunId_idx"
  on "RcmPriorAuthorization" ("payerPortalRunId");
