ALTER TABLE "PmsInsurancePlan"
  ADD COLUMN "planType" TEXT NOT NULL DEFAULT 'PPO',
  ADD COLUMN "employerName" TEXT,
  ADD COLUMN "effectiveDate" TIMESTAMP(3),
  ADD COLUMN "terminationDate" TIMESTAMP(3),
  ADD COLUMN "networkStatus" TEXT NOT NULL DEFAULT 'UNKNOWN';

CREATE INDEX "PmsInsurancePlan_tenantId_status_idx" ON "PmsInsurancePlan"("tenantId", "status");

ALTER TABLE "PmsPatientInsurance"
  ADD COLUMN "memberNumber" TEXT,
  ADD COLUMN "employer" TEXT,
  ADD COLUMN "verificationNote" TEXT;

CREATE INDEX "PmsPatientInsurance_planId_eligibilityStatus_idx" ON "PmsPatientInsurance"("planId", "eligibilityStatus");

ALTER TABLE "PmsClaim"
  ADD COLUMN "patientInsuranceId" TEXT,
  ADD COLUMN "claimNumber" TEXT,
  ADD COLUMN "clearinghouseTraceId" TEXT,
  ADD COLUMN "attachmentStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN "lastStatusAt" TIMESTAMP(3);

CREATE INDEX "PmsClaim_patientInsuranceId_status_idx" ON "PmsClaim"("patientInsuranceId", "status");

CREATE TABLE "PmsClaimLine" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "claimId" TEXT NOT NULL,
  "procedureLogId" TEXT,
  "procedureCodeId" TEXT NOT NULL,
  "tooth" TEXT,
  "surface" TEXT,
  "serviceDate" TIMESTAMP(3),
  "feeCents" INTEGER NOT NULL DEFAULT 0,
  "allowedCents" INTEGER NOT NULL DEFAULT 0,
  "paidCents" INTEGER NOT NULL DEFAULT 0,
  "patientDueCents" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'READY',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "PmsClaimLine_claimId_status_idx" ON "PmsClaimLine"("claimId", "status");
CREATE INDEX "PmsClaimLine_procedureLogId_idx" ON "PmsClaimLine"("procedureLogId");

ALTER TABLE "PmsLedgerEntry"
  ADD COLUMN "procedureLogId" TEXT,
  ADD COLUMN "treatmentPlanId" TEXT,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'POSTED';

CREATE INDEX "PmsLedgerEntry_claimId_entryType_idx" ON "PmsLedgerEntry"("claimId", "entryType");

ALTER TABLE "PmsPayment"
  ADD COLUMN "reference" TEXT,
  ADD COLUMN "unappliedCents" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "PmsLedgerAdjustment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "ledgerEntryId" TEXT,
  "adjustmentType" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'POSTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "PmsLedgerAdjustment_tenantId_createdAt_idx" ON "PmsLedgerAdjustment"("tenantId", "createdAt");
CREATE INDEX "PmsLedgerAdjustment_patientId_createdAt_idx" ON "PmsLedgerAdjustment"("patientId", "createdAt");

CREATE TABLE "PmsStatement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "familyAccountId" TEXT,
  "statementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "totalCents" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "deliveryMethod" TEXT NOT NULL DEFAULT 'PORTAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "PmsStatement_tenantId_status_idx" ON "PmsStatement"("tenantId", "status");
CREATE INDEX "PmsStatement_patientId_statementDate_idx" ON "PmsStatement"("patientId", "statementDate");
