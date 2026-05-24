create table if not exists "PayerMatrixSnapshot" (
  "id" text primary key,
  "tenantId" text not null,
  "source" text not null,
  "sourceUrl" text,
  "version" text not null,
  "rowCount" integer not null default 0,
  "checksum" text not null,
  "importStatus" text not null default 'IMPORTED',
  "importedByRole" text not null default 'integration_worker',
  "importedAt" timestamp(3) not null default current_timestamp,
  "createdAt" timestamp(3) not null default current_timestamp
);

create unique index if not exists "PayerMatrixSnapshot_tenantId_source_version_key"
  on "PayerMatrixSnapshot" ("tenantId", "source", "version");
create index if not exists "PayerMatrixSnapshot_tenantId_importedAt_idx"
  on "PayerMatrixSnapshot" ("tenantId", "importedAt");
create index if not exists "PayerMatrixSnapshot_tenantId_importStatus_idx"
  on "PayerMatrixSnapshot" ("tenantId", "importStatus");

create table if not exists "PayerRegistryEntry" (
  "id" text primary key,
  "tenantId" text not null,
  "payerName" text not null,
  "normalizedName" text not null,
  "primaryPayerId" text not null,
  "payerType" text not null default 'UNKNOWN',
  "coverageType" text not null default 'DENTAL',
  "operatingStates" text[] not null default array[]::text[],
  "active" boolean not null default true,
  "source" text not null default 'MANUAL',
  "sourceUrl" text,
  "sourceSnapshotId" text,
  "sourceUpdatedAt" timestamp(3),
  "lastVerifiedAt" timestamp(3),
  "confidenceScore" integer not null default 100,
  "metadata" jsonb,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create unique index if not exists "PayerRegistryEntry_tenantId_primaryPayerId_key"
  on "PayerRegistryEntry" ("tenantId", "primaryPayerId");
create index if not exists "PayerRegistryEntry_tenantId_active_payerName_idx"
  on "PayerRegistryEntry" ("tenantId", "active", "payerName");
create index if not exists "PayerRegistryEntry_tenantId_normalizedName_idx"
  on "PayerRegistryEntry" ("tenantId", "normalizedName");

create table if not exists "PayerAlias" (
  "id" text primary key,
  "tenantId" text not null,
  "payerRegistryEntryId" text not null,
  "alias" text not null,
  "normalizedAlias" text not null,
  "aliasType" text not null default 'CARD_OR_PLAN',
  "confidence" integer not null default 80,
  "source" text not null default 'MANUAL',
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create unique index if not exists "PayerAlias_tenantId_payerRegistryEntryId_normalizedAlias_key"
  on "PayerAlias" ("tenantId", "payerRegistryEntryId", "normalizedAlias");
create index if not exists "PayerAlias_tenantId_normalizedAlias_idx"
  on "PayerAlias" ("tenantId", "normalizedAlias");
create index if not exists "PayerAlias_payerRegistryEntryId_idx"
  on "PayerAlias" ("payerRegistryEntryId");

create table if not exists "PayerTransactionCapability" (
  "id" text primary key,
  "tenantId" text not null,
  "payerRegistryEntryId" text not null,
  "transactionFamily" text not null,
  "x12Transaction" text not null,
  "stediTransactionKey" text,
  "supported" boolean not null default false,
  "clearinghouse" text,
  "clearinghousePayerId" text,
  "payerEnrollmentMode" text not null default 'UNKNOWN',
  "portalFallbackReason" text,
  "serviceLine" text not null default 'DENTAL',
  "requiresEnrollment" boolean not null default false,
  "requiresProviderEnrollment" boolean not null default false,
  "requiresLocationEnrollment" boolean not null default false,
  "requiresPayerPortalFallback" boolean not null default false,
  "supportsRealtime" boolean not null default false,
  "status" text not null default 'UNKNOWN',
  "limitations" jsonb,
  "lastVerifiedAt" timestamp(3),
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create unique index if not exists "PayerTransactionCapability_tenantId_payerRegistryEntryId_transactionFamily_serviceLine_key"
  on "PayerTransactionCapability" ("tenantId", "payerRegistryEntryId", "transactionFamily", "serviceLine");
create index if not exists "PayerTransactionCapability_tenantId_transactionFamily_supported_idx"
  on "PayerTransactionCapability" ("tenantId", "transactionFamily", "supported");
create index if not exists "PayerTransactionCapability_payerRegistryEntryId_status_idx"
  on "PayerTransactionCapability" ("payerRegistryEntryId", "status");

create table if not exists "PayerNetworkModel" (
  "id" text primary key,
  "tenantId" text not null,
  "payerRegistryEntryId" text not null,
  "networkType" text not null default 'UNKNOWN',
  "routeType" text not null default 'BLOCKED',
  "clearinghouse" text,
  "clearinghouseRouteKey" text,
  "clearinghousePayerId" text,
  "directEndpoint" text,
  "portalUrl" text,
  "portalInstructions" jsonb,
  "portalRpaProfile" jsonb,
  "manualFallbackAllowed" boolean not null default false,
  "enrollmentStatus" text not null default 'NOT_STARTED',
  "credentialingStatus" text not null default 'UNKNOWN',
  "credentialingOwnerRole" text,
  "credentialingDueAt" timestamp(3),
  "providerNpi" text,
  "locationCode" text,
  "effectiveFrom" timestamp(3),
  "effectiveTo" timestamp(3),
  "lastVerifiedAt" timestamp(3),
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create index if not exists "PayerNetworkModel_tenantId_networkType_routeType_idx"
  on "PayerNetworkModel" ("tenantId", "networkType", "routeType");
create index if not exists "PayerNetworkModel_tenantId_payerRegistryEntryId_enrollmentStatus_idx"
  on "PayerNetworkModel" ("tenantId", "payerRegistryEntryId", "enrollmentStatus");
create index if not exists "PayerNetworkModel_payerRegistryEntryId_effectiveTo_idx"
  on "PayerNetworkModel" ("payerRegistryEntryId", "effectiveTo");

create table if not exists "PayerRoutePolicy" (
  "id" text primary key,
  "tenantId" text not null,
  "payerRegistryEntryId" text not null,
  "transactionFamily" text not null,
  "preferredRouteType" text not null,
  "fallbackRouteType" text not null default 'MANUAL_ONLY',
  "approvalPolicy" text not null default 'CONNECTOR_ACK_REQUIRED',
  "proofRequired" jsonb,
  "routeDecisionMetadata" jsonb,
  "externalActionBlockedReason" text,
  "requiresElectronicAcknowledgement" boolean not null default true,
  "allowPortalRpa" boolean not null default false,
  "allowManualAttestation" boolean not null default false,
  "requiresValidatedCredential" boolean not null default false,
  "connectorHealthRequired" boolean not null default true,
  "clearinghouseRouteDecision" text not null default 'UNDECIDED',
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create unique index if not exists "PayerRoutePolicy_tenantId_payerRegistryEntryId_transactionFamily_key"
  on "PayerRoutePolicy" ("tenantId", "payerRegistryEntryId", "transactionFamily");
create index if not exists "PayerRoutePolicy_tenantId_transactionFamily_preferredRouteType_idx"
  on "PayerRoutePolicy" ("tenantId", "transactionFamily", "preferredRouteType");
create index if not exists "PayerRoutePolicy_payerRegistryEntryId_approvalPolicy_idx"
  on "PayerRoutePolicy" ("payerRegistryEntryId", "approvalPolicy");

create table if not exists "PayerPortalCredentialReference" (
  "id" text primary key,
  "tenantId" text not null,
  "payerRegistryEntryId" text not null,
  "portalHost" text not null,
  "credentialVaultId" text,
  "credentialStatus" text not null default 'MISSING',
  "credentialScope" text not null default 'PAYER_PORTAL_RPA',
  "ownerRoleKey" text not null default 'billing_rcm',
  "lastValidatedAt" timestamp(3),
  "rotationDueAt" timestamp(3),
  "notes" text,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create index if not exists "PayerPortalCredentialReference_tenantId_credentialStatus_idx"
  on "PayerPortalCredentialReference" ("tenantId", "credentialStatus");
create index if not exists "PayerPortalCredentialReference_payerRegistryEntryId_portalHost_idx"
  on "PayerPortalCredentialReference" ("payerRegistryEntryId", "portalHost");
create index if not exists "PayerPortalCredentialReference_credentialVaultId_idx"
  on "PayerPortalCredentialReference" ("credentialVaultId");

create table if not exists "PayerRpaRunLog" (
  "id" text primary key,
  "tenantId" text not null,
  "payerRegistryEntryId" text not null,
  "credentialReferenceId" text,
  "transactionFamily" text not null,
  "sourceObjectType" text not null,
  "sourceObjectId" text,
  "runStatus" text not null default 'QUEUED',
  "botName" text not null,
  "portalHost" text,
  "startedAt" timestamp(3),
  "completedAt" timestamp(3),
  "durationMs" integer,
  "attempt" integer not null default 1,
  "resultSummary" text,
  "evidenceUri" text,
  "errorCode" text,
  "errorMessageRedacted" text,
  "noPhiInLogs" boolean not null default true,
  "createdAt" timestamp(3) not null default current_timestamp
);

create index if not exists "PayerRpaRunLog_tenantId_transactionFamily_createdAt_idx"
  on "PayerRpaRunLog" ("tenantId", "transactionFamily", "createdAt");
create index if not exists "PayerRpaRunLog_tenantId_runStatus_createdAt_idx"
  on "PayerRpaRunLog" ("tenantId", "runStatus", "createdAt");
create index if not exists "PayerRpaRunLog_sourceObjectType_sourceObjectId_idx"
  on "PayerRpaRunLog" ("sourceObjectType", "sourceObjectId");

create table if not exists "PayerGeneratedArtifactReference" (
  "id" text primary key,
  "tenantId" text not null,
  "payerRegistryEntryId" text,
  "rpaRunLogId" text,
  "sourceObjectType" text not null,
  "sourceObjectId" text,
  "artifactType" text not null,
  "title" text not null,
  "storageUri" text not null,
  "checksum" text,
  "documentStatus" text not null default 'GENERATED_PENDING_REVIEW',
  "generatedBy" text not null default 'payer_integration_service',
  "generatedAt" timestamp(3) not null default current_timestamp,
  "reviewedByRole" text,
  "reviewedAt" timestamp(3),
  "metadata" jsonb
);

create index if not exists "PayerGeneratedArtifactReference_tenantId_artifactType_generatedAt_idx"
  on "PayerGeneratedArtifactReference" ("tenantId", "artifactType", "generatedAt");
create index if not exists "PayerGeneratedArtifactReference_sourceObjectType_sourceObjectId_idx"
  on "PayerGeneratedArtifactReference" ("sourceObjectType", "sourceObjectId");
create index if not exists "PayerGeneratedArtifactReference_rpaRunLogId_idx"
  on "PayerGeneratedArtifactReference" ("rpaRunLogId");
