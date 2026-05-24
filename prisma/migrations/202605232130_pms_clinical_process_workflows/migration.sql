CREATE TABLE "PmsClinicalProcessTemplate" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "templateKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "specialty" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "appointmentType" TEXT,
  "triggerCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "requiredArtifacts" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "requiredForms" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "requiredImaging" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "requiredLabs" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "aiPolicy" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "auditPolicy" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "PmsClinicalProcessTemplate_tenantId_templateKey_key"
  ON "PmsClinicalProcessTemplate"("tenantId", "templateKey");
CREATE INDEX "PmsClinicalProcessTemplate_tenantId_status_specialty_idx"
  ON "PmsClinicalProcessTemplate"("tenantId", "status", "specialty");

CREATE TABLE "PmsClinicalProcessStep" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "stepKey" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "ownerRoleKey" TEXT NOT NULL,
  "assignmentType" TEXT NOT NULL,
  "procedureCodeIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "noteRequirements" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "artifactRequirements" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "treatmentPlanRequired" BOOLEAN NOT NULL DEFAULT FALSE,
  "completionPolicy" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "PmsClinicalProcessStep_templateId_stepKey_key"
  ON "PmsClinicalProcessStep"("templateId", "stepKey");
CREATE INDEX "PmsClinicalProcessStep_tenantId_ownerRoleKey_idx"
  ON "PmsClinicalProcessStep"("tenantId", "ownerRoleKey");
CREATE INDEX "PmsClinicalProcessStep_templateId_sequence_idx"
  ON "PmsClinicalProcessStep"("templateId", "sequence");

CREATE TABLE "PmsClinicalRecommendation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "treatmentPlanId" TEXT,
  "templateId" TEXT,
  "sourceModule" TEXT NOT NULL,
  "sourceRecordId" TEXT,
  "recommendationType" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "rationale" TEXT NOT NULL,
  "mappedProcedureCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "assignmentPlan" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "requiredNotes" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "requiredArtifacts" JSONB NOT NULL DEFAULT '[]'::JSONB,
  "confidenceScore" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'NEEDS_PROVIDER_REVIEW',
  "reviewedByRole" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "PmsClinicalRecommendation_tenantId_status_createdAt_idx"
  ON "PmsClinicalRecommendation"("tenantId", "status", "createdAt");
CREATE INDEX "PmsClinicalRecommendation_patientId_status_idx"
  ON "PmsClinicalRecommendation"("patientId", "status");
CREATE INDEX "PmsClinicalRecommendation_treatmentPlanId_idx"
  ON "PmsClinicalRecommendation"("treatmentPlanId");
