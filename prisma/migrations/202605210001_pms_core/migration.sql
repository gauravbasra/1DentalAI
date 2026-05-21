CREATE TABLE "PmsFamilyAccount" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "accountNumber" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "billingStatus" TEXT NOT NULL DEFAULT 'CURRENT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsFamilyAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsPatient" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "familyAccountId" TEXT,
  "chartNumber" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "preferredName" TEXT,
  "dateOfBirth" TIMESTAMP(3),
  "phone" TEXT,
  "email" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "privacyLevel" TEXT NOT NULL DEFAULT 'STANDARD',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsPatient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsProvider" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "providerType" TEXT NOT NULL,
  "npi" TEXT,
  "licenseNumber" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsProvider_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsStaffMember" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "roleKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsStaffMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsOperatory" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'READY',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsOperatory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsAppointment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT,
  "providerId" TEXT,
  "operatoryId" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL,
  "appointmentType" TEXT NOT NULL,
  "productionCents" INTEGER NOT NULL DEFAULT 0,
  "readinessStatus" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsAppointment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsProcedureCode" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "defaultFeeCents" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsProcedureCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsAppointmentProcedure" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "procedureCodeId" TEXT NOT NULL,
  "tooth" TEXT,
  "surface" TEXT,
  "feeCents" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'PLANNED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsAppointmentProcedure_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsMedicalAlert" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "details" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsMedicalAlert_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsMedication" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "dosage" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsMedication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsAllergy" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "allergen" TEXT NOT NULL,
  "reaction" TEXT,
  "severity" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsAllergy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsClinicalNote" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "providerId" TEXT,
  "noteType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "body" TEXT NOT NULL,
  "signedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsClinicalNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsToothCondition" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "tooth" TEXT NOT NULL,
  "surface" TEXT,
  "condition" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsToothCondition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsProcedureLog" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "providerId" TEXT,
  "procedureCodeId" TEXT NOT NULL,
  "tooth" TEXT,
  "surface" TEXT,
  "status" TEXT NOT NULL,
  "feeCents" INTEGER NOT NULL DEFAULT 0,
  "serviceDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsProcedureLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsPerioExam" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "providerId" TEXT,
  "examDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  "diagnosis" TEXT,
  "bleedingScore" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsPerioExam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsPerioMeasure" (
  "id" TEXT NOT NULL,
  "perioExamId" TEXT NOT NULL,
  "tooth" TEXT NOT NULL,
  "site" TEXT NOT NULL,
  "probingDepth" INTEGER NOT NULL,
  "bleeding" BOOLEAN NOT NULL DEFAULT false,
  "recession" INTEGER,
  "mobility" TEXT,
  "furcation" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsPerioMeasure_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsTreatmentPlan" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "providerId" TEXT,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "totalFeeCents" INTEGER NOT NULL DEFAULT 0,
  "patientEstimateCents" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsTreatmentPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsTreatmentPlanItem" (
  "id" TEXT NOT NULL,
  "treatmentPlanId" TEXT NOT NULL,
  "procedureCodeId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "tooth" TEXT,
  "surface" TEXT,
  "feeCents" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'PROPOSED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsTreatmentPlanItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsInsurancePlan" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "payerName" TEXT NOT NULL,
  "payerId" TEXT,
  "planName" TEXT NOT NULL,
  "groupNumber" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsInsurancePlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsPatientInsurance" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "subscriberId" TEXT NOT NULL,
  "relationship" TEXT NOT NULL,
  "priority" INTEGER NOT NULL,
  "eligibilityStatus" TEXT NOT NULL DEFAULT 'NOT_CHECKED',
  "lastVerifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsPatientInsurance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsBenefitSummary" (
  "id" TEXT NOT NULL,
  "patientInsuranceId" TEXT NOT NULL,
  "benefitYear" INTEGER NOT NULL,
  "deductibleCents" INTEGER NOT NULL DEFAULT 0,
  "deductibleMetCents" INTEGER NOT NULL DEFAULT 0,
  "annualMaxCents" INTEGER NOT NULL DEFAULT 0,
  "annualUsedCents" INTEGER NOT NULL DEFAULT 0,
  "frequencies" JSONB,
  "limitations" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsBenefitSummary_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsClaim" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "appointmentId" TEXT,
  "payerName" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "billedCents" INTEGER NOT NULL DEFAULT 0,
  "allowedCents" INTEGER NOT NULL DEFAULT 0,
  "paidCents" INTEGER NOT NULL DEFAULT 0,
  "patientDueCents" INTEGER NOT NULL DEFAULT 0,
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsClaim_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsLedgerEntry" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "claimId" TEXT,
  "entryType" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "balanceCents" INTEGER NOT NULL DEFAULT 0,
  "serviceDate" TIMESTAMP(3),
  "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsPayment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "ledgerEntryId" TEXT,
  "paymentType" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsDocument" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT,
  "documentType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "storageUri" TEXT,
  "status" TEXT NOT NULL DEFAULT 'REQUIRED',
  "signatureStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsTask" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT,
  "appointmentId" TEXT,
  "ownerRoleKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "taskType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsAuditEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT,
  "outcome" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PmsFamilyAccount_tenantId_accountNumber_key" ON "PmsFamilyAccount"("tenantId", "accountNumber");
CREATE INDEX "PmsFamilyAccount_tenantId_billingStatus_idx" ON "PmsFamilyAccount"("tenantId", "billingStatus");
CREATE UNIQUE INDEX "PmsPatient_tenantId_chartNumber_key" ON "PmsPatient"("tenantId", "chartNumber");
CREATE INDEX "PmsPatient_tenantId_lastName_firstName_idx" ON "PmsPatient"("tenantId", "lastName", "firstName");
CREATE INDEX "PmsPatient_tenantId_status_idx" ON "PmsPatient"("tenantId", "status");
CREATE INDEX "PmsProvider_tenantId_providerType_idx" ON "PmsProvider"("tenantId", "providerType");
CREATE INDEX "PmsProvider_tenantId_status_idx" ON "PmsProvider"("tenantId", "status");
CREATE INDEX "PmsStaffMember_tenantId_roleKey_idx" ON "PmsStaffMember"("tenantId", "roleKey");
CREATE UNIQUE INDEX "PmsOperatory_tenantId_locationId_code_key" ON "PmsOperatory"("tenantId", "locationId", "code");
CREATE INDEX "PmsOperatory_tenantId_status_idx" ON "PmsOperatory"("tenantId", "status");
CREATE INDEX "PmsAppointment_tenantId_startsAt_idx" ON "PmsAppointment"("tenantId", "startsAt");
CREATE INDEX "PmsAppointment_tenantId_providerId_startsAt_idx" ON "PmsAppointment"("tenantId", "providerId", "startsAt");
CREATE INDEX "PmsAppointment_tenantId_operatoryId_startsAt_idx" ON "PmsAppointment"("tenantId", "operatoryId", "startsAt");
CREATE INDEX "PmsAppointment_tenantId_status_idx" ON "PmsAppointment"("tenantId", "status");
CREATE UNIQUE INDEX "PmsProcedureCode_tenantId_code_key" ON "PmsProcedureCode"("tenantId", "code");
CREATE INDEX "PmsProcedureCode_tenantId_category_idx" ON "PmsProcedureCode"("tenantId", "category");
CREATE INDEX "PmsAppointmentProcedure_appointmentId_idx" ON "PmsAppointmentProcedure"("appointmentId");
CREATE INDEX "PmsMedicalAlert_patientId_active_idx" ON "PmsMedicalAlert"("patientId", "active");
CREATE INDEX "PmsMedication_patientId_status_idx" ON "PmsMedication"("patientId", "status");
CREATE INDEX "PmsAllergy_patientId_active_idx" ON "PmsAllergy"("patientId", "active");
CREATE INDEX "PmsClinicalNote_patientId_createdAt_idx" ON "PmsClinicalNote"("patientId", "createdAt");
CREATE INDEX "PmsClinicalNote_providerId_status_idx" ON "PmsClinicalNote"("providerId", "status");
CREATE INDEX "PmsToothCondition_patientId_tooth_idx" ON "PmsToothCondition"("patientId", "tooth");
CREATE INDEX "PmsProcedureLog_patientId_status_idx" ON "PmsProcedureLog"("patientId", "status");
CREATE INDEX "PmsProcedureLog_providerId_serviceDate_idx" ON "PmsProcedureLog"("providerId", "serviceDate");
CREATE INDEX "PmsPerioExam_patientId_examDate_idx" ON "PmsPerioExam"("patientId", "examDate");
CREATE UNIQUE INDEX "PmsPerioMeasure_perioExamId_tooth_site_key" ON "PmsPerioMeasure"("perioExamId", "tooth", "site");
CREATE INDEX "PmsTreatmentPlan_tenantId_status_idx" ON "PmsTreatmentPlan"("tenantId", "status");
CREATE INDEX "PmsTreatmentPlan_patientId_status_idx" ON "PmsTreatmentPlan"("patientId", "status");
CREATE INDEX "PmsTreatmentPlanItem_treatmentPlanId_sequence_idx" ON "PmsTreatmentPlanItem"("treatmentPlanId", "sequence");
CREATE INDEX "PmsInsurancePlan_tenantId_payerName_idx" ON "PmsInsurancePlan"("tenantId", "payerName");
CREATE INDEX "PmsPatientInsurance_patientId_priority_idx" ON "PmsPatientInsurance"("patientId", "priority");
CREATE INDEX "PmsBenefitSummary_patientInsuranceId_benefitYear_idx" ON "PmsBenefitSummary"("patientInsuranceId", "benefitYear");
CREATE INDEX "PmsClaim_tenantId_status_idx" ON "PmsClaim"("tenantId", "status");
CREATE INDEX "PmsClaim_patientId_createdAt_idx" ON "PmsClaim"("patientId", "createdAt");
CREATE INDEX "PmsLedgerEntry_tenantId_postedAt_idx" ON "PmsLedgerEntry"("tenantId", "postedAt");
CREATE INDEX "PmsLedgerEntry_patientId_postedAt_idx" ON "PmsLedgerEntry"("patientId", "postedAt");
CREATE INDEX "PmsPayment_tenantId_postedAt_idx" ON "PmsPayment"("tenantId", "postedAt");
CREATE INDEX "PmsPayment_patientId_postedAt_idx" ON "PmsPayment"("patientId", "postedAt");
CREATE INDEX "PmsDocument_tenantId_status_idx" ON "PmsDocument"("tenantId", "status");
CREATE INDEX "PmsDocument_patientId_documentType_idx" ON "PmsDocument"("patientId", "documentType");
CREATE INDEX "PmsTask_tenantId_ownerRoleKey_status_idx" ON "PmsTask"("tenantId", "ownerRoleKey", "status");
CREATE INDEX "PmsTask_tenantId_dueAt_idx" ON "PmsTask"("tenantId", "dueAt");
CREATE INDEX "PmsAuditEvent_tenantId_createdAt_idx" ON "PmsAuditEvent"("tenantId", "createdAt");
CREATE INDEX "PmsAuditEvent_targetType_targetId_idx" ON "PmsAuditEvent"("targetType", "targetId");

INSERT INTO "Tenant" ("id", "slug", "name", "mode", "createdAt", "updatedAt")
VALUES ('tenant_1dentalai_production', '1dentalai-production', '1DentalAI Production Tenant', 'PRODUCTION_SETUP', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Location" ("id", "tenantId", "code", "name", "timezone", "status", "createdAt", "updatedAt")
VALUES ('loc_primary', 'tenant_1dentalai_production', 'PRIMARY', 'Primary Practice Location', 'America/Denver', 'ONBOARDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("tenantId", "code") DO UPDATE SET "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "PmsProvider" ("id", "tenantId", "displayName", "providerType", "status", "createdAt", "updatedAt")
VALUES
  ('provider_owner_dentist', 'tenant_1dentalai_production', 'Owner Dentist', 'DENTIST', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('provider_hygiene', 'tenant_1dentalai_production', 'Hygiene Provider', 'RDH', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsOperatory" ("id", "tenantId", "locationId", "code", "name", "status", "createdAt", "updatedAt")
VALUES
  ('op_1', 'tenant_1dentalai_production', 'loc_primary', 'OP-1', 'Operatory 1', 'READY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('op_2', 'tenant_1dentalai_production', 'loc_primary', 'OP-2', 'Operatory 2', 'READY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('op_hygiene', 'tenant_1dentalai_production', 'loc_primary', 'HYG-1', 'Hygiene 1', 'READY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("tenantId", "locationId", "code") DO UPDATE SET "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "PmsProcedureCode" ("id", "tenantId", "code", "description", "category", "defaultFeeCents", "createdAt", "updatedAt")
VALUES
  ('proc_d0120', 'tenant_1dentalai_production', 'D0120', 'Periodic oral evaluation - established patient', 'DIAGNOSTIC', 9200, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('proc_d0150', 'tenant_1dentalai_production', 'D0150', 'Comprehensive oral evaluation - new or established patient', 'DIAGNOSTIC', 13800, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('proc_d0210', 'tenant_1dentalai_production', 'D0210', 'Intraoral complete series of radiographic images', 'IMAGING', 18500, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('proc_d1110', 'tenant_1dentalai_production', 'D1110', 'Prophylaxis - adult', 'PREVENTIVE', 11800, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('proc_d4341', 'tenant_1dentalai_production', 'D4341', 'Periodontal scaling and root planing - four or more teeth per quadrant', 'PERIODONTAL', 32600, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('proc_d2392', 'tenant_1dentalai_production', 'D2392', 'Resin-based composite - two surfaces, posterior', 'RESTORATIVE', 28600, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("tenantId", "code") DO UPDATE SET "updatedAt" = CURRENT_TIMESTAMP;
