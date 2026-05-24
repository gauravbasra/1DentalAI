ALTER TABLE "PmsClinicalNote"
  ADD COLUMN "tenantId" text,
  ADD COLUMN "appointmentId" text,
  ADD COLUMN "noteTemplateKey" text,
  ADD COLUMN "signedByRole" text,
  ADD COLUMN "signatureHash" text,
  ADD COLUMN "lockedAt" timestamp(3),
  ADD COLUMN "addendumOfNoteId" text,
  ADD COLUMN "addendumReason" text,
  ADD COLUMN "sourceModule" text,
  ADD COLUMN "sourceRecordId" text;

UPDATE "PmsClinicalNote" n
SET "tenantId" = p."tenantId"
FROM "PmsPatient" p
WHERE p."id" = n."patientId" AND n."tenantId" IS NULL;

ALTER TABLE "PmsClinicalNote"
  ALTER COLUMN "tenantId" SET NOT NULL;

CREATE INDEX "PmsClinicalNote_tenantId_status_createdAt_idx" ON "PmsClinicalNote"("tenantId", "status", "createdAt");
CREATE INDEX "PmsClinicalNote_appointmentId_status_idx" ON "PmsClinicalNote"("appointmentId", "status");
CREATE INDEX "PmsClinicalNote_addendumOfNoteId_idx" ON "PmsClinicalNote"("addendumOfNoteId");
