CREATE TYPE "WorkbenchStatus" AS ENUM ('OPEN', 'SETUP_REQUIRED', 'APPROVAL_LOCKED', 'BLOCKED');
CREATE TYPE "WorkbenchActionKind" AS ENUM ('LOCAL_STATE_CHANGE', 'APPROVAL_REQUEST', 'CONNECTOR_SETUP', 'EXTERNAL_EXECUTION_BLOCKED');
CREATE TYPE "WorkbenchAuditOutcome" AS ENUM ('ALLOWED', 'BLOCKED', 'READ_ONLY');

CREATE TABLE "Tenant" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'PRODUCTION_SETUP',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Location" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "timezone" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ONBOARDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenantRole" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "roleKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "scopes" TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkbenchArea" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "status" "WorkbenchStatus" NOT NULL,
  "summary" TEXT NOT NULL,
  "primarySystem" TEXT NOT NULL,
  "liveCapability" BOOLEAN NOT NULL DEFAULT false,
  "setupReason" TEXT,
  "approvalReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkbenchArea_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkbenchAreaRole" (
  "id" TEXT NOT NULL,
  "areaId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "accessLevel" TEXT NOT NULL DEFAULT 'WORK',
  CONSTRAINT "WorkbenchAreaRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkbenchQueueItem" (
  "id" TEXT NOT NULL,
  "areaId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "locationId" TEXT,
  "patientRef" TEXT,
  "ownerRoleKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "detail" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "priority" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3),
  "amountCents" INTEGER,
  "sourceSystem" TEXT NOT NULL,
  "sourceObjectType" TEXT NOT NULL,
  "sourceObjectId" TEXT,
  "clinicalData" JSONB,
  "financialData" JSONB,
  "marketingData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkbenchQueueItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkbenchAction" (
  "id" TEXT NOT NULL,
  "queueItemId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "kind" "WorkbenchActionKind" NOT NULL,
  "requiresScope" TEXT[],
  "externalSystem" TEXT,
  "blockedReason" TEXT,
  "resultStatus" TEXT NOT NULL DEFAULT 'READY',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkbenchAction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConnectorReadinessItem" (
  "id" TEXT NOT NULL,
  "areaId" TEXT NOT NULL,
  "connectorCategory" TEXT NOT NULL,
  "capability" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "requiredFields" TEXT[],
  "missingFields" TEXT[],
  "policyGate" TEXT NOT NULL,
  "nextAction" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConnectorReadinessItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkbenchAuditEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "areaId" TEXT,
  "actionId" TEXT,
  "actorRole" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "outcome" "WorkbenchAuditOutcome" NOT NULL,
  "summary" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkbenchAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE UNIQUE INDEX "Location_tenantId_code_key" ON "Location"("tenantId", "code");
CREATE INDEX "Location_tenantId_status_idx" ON "Location"("tenantId", "status");
CREATE UNIQUE INDEX "TenantRole_tenantId_roleKey_key" ON "TenantRole"("tenantId", "roleKey");
CREATE UNIQUE INDEX "WorkbenchArea_tenantId_slug_key" ON "WorkbenchArea"("tenantId", "slug");
CREATE INDEX "WorkbenchArea_tenantId_domain_idx" ON "WorkbenchArea"("tenantId", "domain");
CREATE INDEX "WorkbenchArea_tenantId_status_idx" ON "WorkbenchArea"("tenantId", "status");
CREATE UNIQUE INDEX "WorkbenchAreaRole_areaId_roleId_key" ON "WorkbenchAreaRole"("areaId", "roleId");
CREATE INDEX "WorkbenchQueueItem_tenantId_ownerRoleKey_idx" ON "WorkbenchQueueItem"("tenantId", "ownerRoleKey");
CREATE INDEX "WorkbenchQueueItem_areaId_priority_idx" ON "WorkbenchQueueItem"("areaId", "priority");
CREATE INDEX "WorkbenchQueueItem_locationId_idx" ON "WorkbenchQueueItem"("locationId");
CREATE INDEX "WorkbenchQueueItem_sourceObjectType_sourceObjectId_idx" ON "WorkbenchQueueItem"("sourceObjectType", "sourceObjectId");
CREATE INDEX "WorkbenchAction_queueItemId_kind_idx" ON "WorkbenchAction"("queueItemId", "kind");
CREATE INDEX "ConnectorReadinessItem_areaId_connectorCategory_idx" ON "ConnectorReadinessItem"("areaId", "connectorCategory");
CREATE INDEX "ConnectorReadinessItem_status_idx" ON "ConnectorReadinessItem"("status");
CREATE INDEX "WorkbenchAuditEvent_tenantId_createdAt_idx" ON "WorkbenchAuditEvent"("tenantId", "createdAt");
CREATE INDEX "WorkbenchAuditEvent_actorRole_idx" ON "WorkbenchAuditEvent"("actorRole");
CREATE INDEX "WorkbenchAuditEvent_outcome_idx" ON "WorkbenchAuditEvent"("outcome");

ALTER TABLE "Location" ADD CONSTRAINT "Location_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantRole" ADD CONSTRAINT "TenantRole_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkbenchArea" ADD CONSTRAINT "WorkbenchArea_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkbenchAreaRole" ADD CONSTRAINT "WorkbenchAreaRole_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "WorkbenchArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkbenchAreaRole" ADD CONSTRAINT "WorkbenchAreaRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "TenantRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkbenchQueueItem" ADD CONSTRAINT "WorkbenchQueueItem_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "WorkbenchArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkbenchQueueItem" ADD CONSTRAINT "WorkbenchQueueItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkbenchAction" ADD CONSTRAINT "WorkbenchAction_queueItemId_fkey" FOREIGN KEY ("queueItemId") REFERENCES "WorkbenchQueueItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConnectorReadinessItem" ADD CONSTRAINT "ConnectorReadinessItem_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "WorkbenchArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkbenchAuditEvent" ADD CONSTRAINT "WorkbenchAuditEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkbenchAuditEvent" ADD CONSTRAINT "WorkbenchAuditEvent_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "WorkbenchArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkbenchAuditEvent" ADD CONSTRAINT "WorkbenchAuditEvent_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "WorkbenchAction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
