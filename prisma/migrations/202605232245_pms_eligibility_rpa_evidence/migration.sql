CREATE TABLE "PayerPortalLayout" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "payerRegistryEntryId" TEXT NOT NULL,
  "portalHost" TEXT NOT NULL,
  "layoutKey" TEXT NOT NULL,
  "layoutVersion" TEXT NOT NULL,
  "transactionFamily" TEXT NOT NULL DEFAULT 'ELIGIBILITY_270_271',
  "loginPath" TEXT,
  "eligibilityPath" TEXT,
  "screenshotPolicy" JSONB NOT NULL,
  "navigationSteps" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "lastVerifiedAt" TIMESTAMP(3),
  "createdByRole" TEXT NOT NULL DEFAULT 'integration_worker',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "PayerPortalLayout_tenantId_payerRegistryEntryId_layoutKey_layoutVersion_key"
  ON "PayerPortalLayout"("tenantId", "payerRegistryEntryId", "layoutKey", "layoutVersion");
CREATE INDEX "PayerPortalLayout_tenantId_payerRegistryEntryId_status_idx"
  ON "PayerPortalLayout"("tenantId", "payerRegistryEntryId", "status");
CREATE INDEX "PayerPortalLayout_tenantId_portalHost_idx"
  ON "PayerPortalLayout"("tenantId", "portalHost");

CREATE TABLE "PayerPortalLayoutField" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "layoutId" TEXT NOT NULL,
  "fieldKey" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "selector" TEXT NOT NULL,
  "valueType" TEXT NOT NULL,
  "pmsTarget" TEXT NOT NULL,
  "requiredForWriteback" BOOLEAN NOT NULL DEFAULT TRUE,
  "redactionPolicy" TEXT NOT NULL DEFAULT 'MASK_IN_SCREENSHOT',
  "confidenceThreshold" INTEGER NOT NULL DEFAULT 85,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "PayerPortalLayoutField_layoutId_fieldKey_key"
  ON "PayerPortalLayoutField"("layoutId", "fieldKey");
CREATE INDEX "PayerPortalLayoutField_tenantId_pmsTarget_idx"
  ON "PayerPortalLayoutField"("tenantId", "pmsTarget");

CREATE TABLE "PmsEligibilityEvidence" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "patientInsuranceId" TEXT NOT NULL,
  "payerRegistryEntryId" TEXT,
  "rpaRunLogId" TEXT,
  "portalLayoutId" TEXT,
  "sourceType" TEXT NOT NULL DEFAULT 'PAYER_PORTAL_RPA',
  "sourceTraceId" TEXT,
  "eligibilityStatus" TEXT NOT NULL,
  "benefitYear" INTEGER NOT NULL,
  "deductibleCents" INTEGER NOT NULL DEFAULT 0,
  "deductibleMetCents" INTEGER NOT NULL DEFAULT 0,
  "annualMaxCents" INTEGER NOT NULL DEFAULT 0,
  "annualUsedCents" INTEGER NOT NULL DEFAULT 0,
  "frequencies" JSONB,
  "limitations" JSONB,
  "normalizedFields" JSONB NOT NULL,
  "rawFieldEvidence" JSONB NOT NULL,
  "screenshotArtifactId" TEXT NOT NULL,
  "pdfArtifactId" TEXT NOT NULL,
  "writebackStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  "reviewedByRole" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "PmsEligibilityEvidence_tenantId_patientInsuranceId_createdAt_idx"
  ON "PmsEligibilityEvidence"("tenantId", "patientInsuranceId", "createdAt");
CREATE INDEX "PmsEligibilityEvidence_tenantId_eligibilityStatus_writebackStatus_idx"
  ON "PmsEligibilityEvidence"("tenantId", "eligibilityStatus", "writebackStatus");
CREATE INDEX "PmsEligibilityEvidence_rpaRunLogId_idx"
  ON "PmsEligibilityEvidence"("rpaRunLogId");

ALTER TABLE "PmsPatientInsurance"
  ADD COLUMN "tenantId" TEXT;

UPDATE "PmsPatientInsurance" pi
SET "tenantId" = p."tenantId"
FROM "PmsPatient" p
WHERE p."id" = pi."patientId"
  AND pi."tenantId" IS NULL;

ALTER TABLE "PmsPatientInsurance"
  ALTER COLUMN "tenantId" SET NOT NULL;

CREATE INDEX "PmsPatientInsurance_tenantId_eligibilityStatus_idx"
  ON "PmsPatientInsurance"("tenantId", "eligibilityStatus");

ALTER TABLE "PmsBenefitSummary"
  ADD COLUMN "tenantId" TEXT;

UPDATE "PmsBenefitSummary" bs
SET "tenantId" = pi."tenantId"
FROM "PmsPatientInsurance" pi
WHERE pi."id" = bs."patientInsuranceId"
  AND bs."tenantId" IS NULL;

ALTER TABLE "PmsBenefitSummary"
  ALTER COLUMN "tenantId" SET NOT NULL;

CREATE INDEX "PmsBenefitSummary_tenantId_benefitYear_idx"
  ON "PmsBenefitSummary"("tenantId", "benefitYear");
