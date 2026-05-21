ALTER TABLE "PmsDocument"
  ADD COLUMN "claimId" TEXT,
  ADD COLUMN "appointmentId" TEXT,
  ADD COLUMN "sourceModule" TEXT,
  ADD COLUMN "reviewedByRole" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "expiresAt" TIMESTAMP(3);

CREATE INDEX "PmsDocument_claimId_documentType_idx" ON "PmsDocument"("claimId", "documentType");

CREATE TABLE "PmsImagingStudy" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "providerId" TEXT,
  "appointmentId" TEXT,
  "studyType" TEXT NOT NULL,
  "acquisitionStatus" TEXT NOT NULL DEFAULT 'ORDERED',
  "tooth" TEXT,
  "region" TEXT,
  "dicomStudyUid" TEXT,
  "storageUri" TEXT,
  "findings" TEXT,
  "aiReviewStatus" TEXT NOT NULL DEFAULT 'NOT_REQUESTED',
  "takenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "PmsImagingStudy_tenantId_acquisitionStatus_idx" ON "PmsImagingStudy"("tenantId", "acquisitionStatus");
CREATE INDEX "PmsImagingStudy_patientId_takenAt_idx" ON "PmsImagingStudy"("patientId", "takenAt");

CREATE TABLE "PmsPrescription" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "providerId" TEXT,
  "medicationName" TEXT NOT NULL,
  "dosage" TEXT,
  "directions" TEXT NOT NULL,
  "quantity" TEXT,
  "refills" INTEGER NOT NULL DEFAULT 0,
  "pharmacyName" TEXT,
  "pharmacyPhone" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "writtenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "PmsPrescription_tenantId_status_idx" ON "PmsPrescription"("tenantId", "status");
CREATE INDEX "PmsPrescription_patientId_writtenAt_idx" ON "PmsPrescription"("patientId", "writtenAt");

CREATE TABLE "PmsReferral" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "providerId" TEXT,
  "referralType" TEXT NOT NULL,
  "referredToName" TEXT NOT NULL,
  "referredToSpecialty" TEXT,
  "referredToPhone" TEXT,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "dueAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "PmsReferral_tenantId_status_idx" ON "PmsReferral"("tenantId", "status");
CREATE INDEX "PmsReferral_patientId_createdAt_idx" ON "PmsReferral"("patientId", "createdAt");
