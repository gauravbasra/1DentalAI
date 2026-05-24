CREATE TABLE IF NOT EXISTS "PmsBenefitFact" (
  "id" text PRIMARY KEY,
  "tenantId" text NOT NULL,
  "patientInsuranceId" text NOT NULL,
  "sourceEvidenceId" text,
  "sourceType" text NOT NULL DEFAULT 'ELIGIBILITY_AND_CLAIMS',
  "factKey" text NOT NULL,
  "factLabel" text NOT NULL,
  "factValue" jsonb NOT NULL,
  "valueType" text NOT NULL,
  "cdtCode" text,
  "procedureCategory" text,
  "benefitYear" integer,
  "confidenceScore" integer NOT NULL DEFAULT 0,
  "sourceTraceId" text,
  "evidenceArtifactId" text,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PmsBenefitFact_tenantId_patientInsuranceId_factKey_idx" ON "PmsBenefitFact"("tenantId", "patientInsuranceId", "factKey");
CREATE INDEX IF NOT EXISTS "PmsBenefitFact_tenantId_cdtCode_idx" ON "PmsBenefitFact"("tenantId", "cdtCode");
CREATE INDEX IF NOT EXISTS "PmsBenefitFact_tenantId_procedureCategory_idx" ON "PmsBenefitFact"("tenantId", "procedureCategory");

CREATE TABLE IF NOT EXISTS "PmsBenefitRule" (
  "id" text PRIMARY KEY,
  "tenantId" text NOT NULL,
  "patientInsuranceId" text NOT NULL,
  "sourceFactId" text,
  "ruleType" text NOT NULL,
  "ruleKey" text NOT NULL,
  "ruleText" text NOT NULL,
  "cdtCode" text,
  "procedureCategory" text,
  "toothScope" text,
  "frequencyWindow" text,
  "benefitYear" integer,
  "status" text NOT NULL DEFAULT 'NEEDS_REVIEW',
  "confidenceScore" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PmsBenefitRule_tenantId_patientInsuranceId_ruleType_idx" ON "PmsBenefitRule"("tenantId", "patientInsuranceId", "ruleType");
CREATE INDEX IF NOT EXISTS "PmsBenefitRule_tenantId_cdtCode_ruleType_idx" ON "PmsBenefitRule"("tenantId", "cdtCode", "ruleType");
CREATE INDEX IF NOT EXISTS "PmsBenefitRule_tenantId_procedureCategory_ruleType_idx" ON "PmsBenefitRule"("tenantId", "procedureCategory", "ruleType");

CREATE TABLE IF NOT EXISTS "PmsTreatmentCoverageAnalysis" (
  "id" text PRIMARY KEY,
  "tenantId" text NOT NULL,
  "treatmentPlanId" text NOT NULL,
  "treatmentPlanItemId" text NOT NULL,
  "patientInsuranceId" text NOT NULL,
  "procedureCodeId" text NOT NULL,
  "cdtCode" text NOT NULL,
  "procedureCategory" text NOT NULL,
  "feeCents" integer NOT NULL DEFAULT 0,
  "estimatedInsuranceCents" integer NOT NULL DEFAULT 0,
  "estimatedPatientCents" integer NOT NULL DEFAULT 0,
  "remainingBeforeCents" integer NOT NULL DEFAULT 0,
  "remainingAfterCents" integer NOT NULL DEFAULT 0,
  "coverageStatus" text NOT NULL DEFAULT 'NEEDS_REVIEW',
  "denialRisk" text NOT NULL DEFAULT 'UNKNOWN',
  "confidenceScore" integer NOT NULL DEFAULT 0,
  "matchedRuleIds" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "blockers" jsonb NOT NULL,
  "requiredActions" jsonb NOT NULL,
  "evidenceSummary" jsonb NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "PmsTreatmentCoverageAnalysis_tenantId_treatmentPlanItemId_patientInsuranceId_key" ON "PmsTreatmentCoverageAnalysis"("tenantId", "treatmentPlanItemId", "patientInsuranceId");
CREATE INDEX IF NOT EXISTS "PmsTreatmentCoverageAnalysis_tenantId_treatmentPlanId_coverageStatus_idx" ON "PmsTreatmentCoverageAnalysis"("tenantId", "treatmentPlanId", "coverageStatus");
CREATE INDEX IF NOT EXISTS "PmsTreatmentCoverageAnalysis_tenantId_patientInsuranceId_cdtCode_idx" ON "PmsTreatmentCoverageAnalysis"("tenantId", "patientInsuranceId", "cdtCode");

CREATE TABLE IF NOT EXISTS "PmsPayerCasePacket" (
  "id" text PRIMARY KEY,
  "tenantId" text NOT NULL,
  "treatmentPlanId" text NOT NULL,
  "patientInsuranceId" text NOT NULL,
  "packetStatus" text NOT NULL DEFAULT 'NEEDS_REVIEW',
  "caseType" text NOT NULL DEFAULT 'TREATMENT_BENEFIT_CASE',
  "summary" text NOT NULL,
  "findings" jsonb NOT NULL,
  "blockers" jsonb NOT NULL,
  "nextActions" jsonb NOT NULL,
  "requiredAttachments" jsonb NOT NULL,
  "narrativeDraft" text,
  "estimatedInsuranceCents" integer NOT NULL DEFAULT 0,
  "estimatedPatientCents" integer NOT NULL DEFAULT 0,
  "confidenceScore" integer NOT NULL DEFAULT 0,
  "generatedByRole" text NOT NULL DEFAULT 'billing_rcm',
  "generatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedByRole" text,
  "reviewedAt" timestamp(3),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PmsPayerCasePacket_tenantId_treatmentPlanId_generatedAt_idx" ON "PmsPayerCasePacket"("tenantId", "treatmentPlanId", "generatedAt");
CREATE INDEX IF NOT EXISTS "PmsPayerCasePacket_tenantId_packetStatus_idx" ON "PmsPayerCasePacket"("tenantId", "packetStatus");
CREATE INDEX IF NOT EXISTS "PmsPayerCasePacket_tenantId_patientInsuranceId_idx" ON "PmsPayerCasePacket"("tenantId", "patientInsuranceId");
