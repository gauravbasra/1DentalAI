ALTER TABLE "PmsProcedureLog"
  ADD COLUMN "tenantId" TEXT,
  ADD COLUMN "appointmentId" TEXT,
  ADD COLUMN "appointmentProcedureId" TEXT,
  ADD COLUMN "checkoutSessionId" TEXT;

UPDATE "PmsProcedureLog" pl
SET "tenantId" = p."tenantId"
FROM "PmsPatient" p
WHERE p."id" = pl."patientId"
  AND pl."tenantId" IS NULL;

CREATE INDEX "PmsProcedureLog_tenantId_appointmentId_idx" ON "PmsProcedureLog"("tenantId", "appointmentId");
CREATE INDEX "PmsProcedureLog_appointmentProcedureId_idx" ON "PmsProcedureLog"("appointmentProcedureId");
CREATE INDEX "PmsProcedureLog_checkoutSessionId_idx" ON "PmsProcedureLog"("checkoutSessionId");
