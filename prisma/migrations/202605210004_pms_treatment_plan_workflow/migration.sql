ALTER TABLE "PmsTreatmentPlan"
  ADD COLUMN "presentationNote" TEXT,
  ADD COLUMN "acceptedAt" TIMESTAMP(3),
  ADD COLUMN "signedAt" TIMESTAMP(3),
  ADD COLUMN "insuranceEstimateCents" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "PmsTreatmentPlanItem"
  ADD COLUMN "phase" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "insuranceEstimateCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "patientEstimateCents" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "PmsTreatmentPlan_acceptedAt_idx" ON "PmsTreatmentPlan"("acceptedAt");
CREATE INDEX "PmsTreatmentPlanItem_treatmentPlanId_phase_idx" ON "PmsTreatmentPlanItem"("treatmentPlanId", "phase");
