CREATE TABLE "PmsCheckoutSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "completedProcedureIds" TEXT[],
  "readinessOverride" BOOLEAN NOT NULL DEFAULT false,
  "blockerSummary" JSONB,
  "chargeCents" INTEGER NOT NULL DEFAULT 0,
  "patientPaymentCents" INTEGER NOT NULL DEFAULT 0,
  "claimId" TEXT,
  "paymentId" TEXT,
  "checkoutNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "PmsCheckoutSession_tenantId_createdAt_idx" ON "PmsCheckoutSession"("tenantId", "createdAt");
CREATE INDEX "PmsCheckoutSession_appointmentId_createdAt_idx" ON "PmsCheckoutSession"("appointmentId", "createdAt");
CREATE INDEX "PmsCheckoutSession_patientId_createdAt_idx" ON "PmsCheckoutSession"("patientId", "createdAt");

INSERT INTO "PmsAppointmentProcedure"
  ("id", "appointmentId", "procedureCodeId", "tooth", "surface", "feeCents", "status", "createdAt", "updatedAt")
VALUES
  ('aproc_sample_001_crown', 'appt_sample_001', 'proc_d2740', '30', null, 148000, 'PLANNED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('aproc_sample_001_buildup', 'appt_sample_001', 'proc_d2950', '30', null, 34800, 'PLANNED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('aproc_sample_002_perio', 'appt_sample_002', 'proc_d4910', null, null, 16800, 'PLANNED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('aproc_sample_003_exam', 'appt_sample_003', 'proc_d0140', null, null, 11600, 'PLANNED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('aproc_sample_005_crown', 'appt_sample_005', 'proc_d2740', '30', null, 148000, 'PLANNED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
