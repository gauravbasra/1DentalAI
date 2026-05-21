CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "AuthUser" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "emailHash" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "roleKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "passwordHash" TEXT NOT NULL,
  "passwordSalt" TEXT NOT NULL,
  "passwordIterations" INTEGER NOT NULL DEFAULT 310000,
  "mfaRequired" BOOLEAN NOT NULL DEFAULT true,
  "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
  "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthUser_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AuthUser_tenantId_emailHash_key" ON "AuthUser"("tenantId", "emailHash");
CREATE INDEX IF NOT EXISTS "AuthUser_tenantId_status_roleKey_idx" ON "AuthUser"("tenantId", "status", "roleKey");

CREATE TABLE IF NOT EXISTS "AuthSession" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "ipHash" TEXT,
  "userAgentHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");
CREATE INDEX IF NOT EXISTS "AuthSession_tenantId_userId_expiresAt_idx" ON "AuthSession"("tenantId", "userId", "expiresAt");
CREATE INDEX IF NOT EXISTS "AuthSession_revokedAt_expiresAt_idx" ON "AuthSession"("revokedAt", "expiresAt");

CREATE TABLE IF NOT EXISTS "AuthSignupRequest" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "practiceName" TEXT NOT NULL,
  "contactName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "emailHash" TEXT NOT NULL,
  "phone" TEXT,
  "roleRequested" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "verificationNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthSignupRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AuthSignupRequest_tenantId_status_createdAt_idx" ON "AuthSignupRequest"("tenantId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "AuthSignupRequest_emailHash_idx" ON "AuthSignupRequest"("emailHash");

CREATE TABLE IF NOT EXISTS "AuthAuditEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT,
  "sessionId" TEXT,
  "eventType" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "ipHash" TEXT,
  "userAgentHash" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthAuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AuthAuditEvent_tenantId_createdAt_idx" ON "AuthAuditEvent"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuthAuditEvent_userId_eventType_idx" ON "AuthAuditEvent"("userId", "eventType");
CREATE INDEX IF NOT EXISTS "AuthAuditEvent_outcome_idx" ON "AuthAuditEvent"("outcome");

INSERT INTO "AuthUser"
  ("id", "tenantId", "email", "emailHash", "displayName", "roleKey", "status", "passwordHash", "passwordSalt", "passwordIterations", "mfaRequired", "mustChangePassword")
VALUES
  (
    'auth_user_setup_owner',
    'tenant_1dentalai_production',
    'owner@1dentalai.com',
    encode(digest(lower('owner@1dentalai.com'), 'sha256'), 'hex'),
    'Setup Owner',
    'owner_dentist',
    'ACTIVE',
    '9gZWl99gzuxbPpOFIAFZjC_A_vFtCYHIMCMZv-Z-46w',
    'Fc_iexNjeWtXHPl7JGR4ag',
    310000,
    true,
    true
  )
ON CONFLICT ("tenantId", "emailHash") DO NOTHING;

INSERT INTO "AuthAuditEvent"
  ("id", "tenantId", "userId", "eventType", "outcome", "summary", "metadata")
VALUES
  (
    'auth_audit_seed_owner',
    'tenant_1dentalai_production',
    'auth_user_setup_owner',
    'AUTH_USER_SEEDED',
    'ALLOWED',
    'Initial setup owner created with forced password rotation and MFA requirement.',
    '{"phiStored":false,"requiresAdminRotation":true}'::jsonb
  )
ON CONFLICT ("id") DO NOTHING;
