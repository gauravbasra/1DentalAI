ALTER TABLE "PmsFamilyAccount"
  ADD COLUMN "guarantorPatientId" TEXT,
  ADD COLUMN "billingType" TEXT NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN "addressLine1" TEXT,
  ADD COLUMN "addressLine2" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "state" TEXT,
  ADD COLUMN "postalCode" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "financialNote" TEXT;

ALTER TABLE "PmsPatient"
  ADD COLUMN "sex" TEXT,
  ADD COLUMN "genderIdentity" TEXT,
  ADD COLUMN "preferredProviderId" TEXT,
  ADD COLUMN "primaryLocationId" TEXT,
  ADD COLUMN "responsibleParty" TEXT,
  ADD COLUMN "emergencyContactName" TEXT,
  ADD COLUMN "emergencyContactPhone" TEXT,
  ADD COLUMN "referralSource" TEXT,
  ADD COLUMN "patientNote" TEXT;

CREATE INDEX "PmsFamilyAccount_tenantId_billingType_idx" ON "PmsFamilyAccount"("tenantId", "billingType");
CREATE INDEX "PmsPatient_familyAccountId_idx" ON "PmsPatient"("familyAccountId");
CREATE INDEX "PmsPatient_preferredProviderId_idx" ON "PmsPatient"("preferredProviderId");

INSERT INTO "PmsFamilyAccount"
  ("id", "tenantId", "accountNumber", "displayName", "guarantorPatientId", "billingType", "billingStatus", "phone", "email", "createdAt", "updatedAt")
SELECT
  'fam_' || p."id",
  p."tenantId",
  'F' || substring(p."chartNumber" from 2),
  p."lastName" || ' family',
  p."id",
  'STANDARD',
  'CURRENT',
  p."phone",
  p."email",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "PmsPatient" p
WHERE p."familyAccountId" IS NULL
ON CONFLICT ("tenantId", "accountNumber") DO NOTHING;

UPDATE "PmsPatient" p
SET "familyAccountId" = fa."id", "responsibleParty" = 'SELF', "updatedAt" = CURRENT_TIMESTAMP
FROM "PmsFamilyAccount" fa
WHERE p."familyAccountId" IS NULL
  AND fa."tenantId" = p."tenantId"
  AND fa."accountNumber" = 'F' || substring(p."chartNumber" from 2);
