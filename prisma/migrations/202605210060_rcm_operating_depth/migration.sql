CREATE TABLE IF NOT EXISTS "RcmPriorAuthorization" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "treatmentPlanId" TEXT,
  "patientInsuranceId" TEXT,
  "payerName" TEXT NOT NULL,
  "requestedCents" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "requiredEvidence" JSONB,
  "submittedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "determination" TEXT,
  "nextAction" TEXT NOT NULL,
  "ownerRoleKey" TEXT NOT NULL DEFAULT 'billing_rcm',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RcmPriorAuthorization_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "RcmPriorAuthorization_tenantId_status_expiresAt_idx" ON "RcmPriorAuthorization"("tenantId", "status", "expiresAt");
CREATE INDEX IF NOT EXISTS "RcmPriorAuthorization_patientId_status_idx" ON "RcmPriorAuthorization"("patientId", "status");
CREATE INDEX IF NOT EXISTS "RcmPriorAuthorization_treatmentPlanId_idx" ON "RcmPriorAuthorization"("treatmentPlanId");

CREATE TABLE IF NOT EXISTS "RcmDenialCase" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "claimId" TEXT NOT NULL,
  "payerName" TEXT NOT NULL,
  "denialCode" TEXT,
  "denialReason" TEXT NOT NULL,
  "deniedCents" INTEGER NOT NULL DEFAULT 0,
  "appealDeadline" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "appealLevel" TEXT NOT NULL DEFAULT 'FIRST_LEVEL',
  "rootCause" TEXT,
  "requiredEvidence" JSONB,
  "nextAction" TEXT NOT NULL,
  "ownerRoleKey" TEXT NOT NULL DEFAULT 'billing_rcm',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RcmDenialCase_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "RcmDenialCase_tenantId_status_appealDeadline_idx" ON "RcmDenialCase"("tenantId", "status", "appealDeadline");
CREATE INDEX IF NOT EXISTS "RcmDenialCase_claimId_status_idx" ON "RcmDenialCase"("claimId", "status");
CREATE INDEX IF NOT EXISTS "RcmDenialCase_patientId_status_idx" ON "RcmDenialCase"("patientId", "status");

CREATE TABLE IF NOT EXISTS "RcmEraPosting" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "claimId" TEXT NOT NULL,
  "payerName" TEXT NOT NULL,
  "eraTraceNumber" TEXT,
  "eobDocumentId" TEXT,
  "allowedCents" INTEGER NOT NULL DEFAULT 0,
  "paidCents" INTEGER NOT NULL DEFAULT 0,
  "patientDueCents" INTEGER NOT NULL DEFAULT 0,
  "adjustmentCents" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
  "exceptionReason" TEXT,
  "postedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RcmEraPosting_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "RcmEraPosting_tenantId_status_createdAt_idx" ON "RcmEraPosting"("tenantId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "RcmEraPosting_claimId_status_idx" ON "RcmEraPosting"("claimId", "status");
CREATE INDEX IF NOT EXISTS "RcmEraPosting_patientId_idx" ON "RcmEraPosting"("patientId");

CREATE TABLE IF NOT EXISTS "RcmPayerFollowUp" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT,
  "claimId" TEXT,
  "payerName" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'PHONE',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "dueAt" TIMESTAMP(3),
  "lastContactAt" TIMESTAMP(3),
  "contactOutcome" TEXT,
  "referenceNumber" TEXT,
  "nextAction" TEXT NOT NULL,
  "ownerRoleKey" TEXT NOT NULL DEFAULT 'billing_rcm',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RcmPayerFollowUp_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "RcmPayerFollowUp_tenantId_status_dueAt_idx" ON "RcmPayerFollowUp"("tenantId", "status", "dueAt");
CREATE INDEX IF NOT EXISTS "RcmPayerFollowUp_claimId_status_idx" ON "RcmPayerFollowUp"("claimId", "status");
CREATE INDEX IF NOT EXISTS "RcmPayerFollowUp_patientId_status_idx" ON "RcmPayerFollowUp"("patientId", "status");

CREATE TABLE IF NOT EXISTS "RcmRevenueIntegrityFinding" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT,
  "claimId" TEXT,
  "ledgerEntryId" TEXT,
  "payerName" TEXT,
  "findingType" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'NORMAL',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "expectedCents" INTEGER NOT NULL DEFAULT 0,
  "actualCents" INTEGER NOT NULL DEFAULT 0,
  "varianceCents" INTEGER NOT NULL DEFAULT 0,
  "rootCause" TEXT,
  "nextAction" TEXT NOT NULL,
  "ownerRoleKey" TEXT NOT NULL DEFAULT 'billing_rcm',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RcmRevenueIntegrityFinding_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "RcmRevenueIntegrityFinding_tenantId_status_severity_idx" ON "RcmRevenueIntegrityFinding"("tenantId", "status", "severity");
CREATE INDEX IF NOT EXISTS "RcmRevenueIntegrityFinding_claimId_status_idx" ON "RcmRevenueIntegrityFinding"("claimId", "status");
CREATE INDEX IF NOT EXISTS "RcmRevenueIntegrityFinding_patientId_status_idx" ON "RcmRevenueIntegrityFinding"("patientId", "status");

INSERT INTO "RcmPriorAuthorization"
  ("id", "tenantId", "patientId", "treatmentPlanId", "patientInsuranceId", "payerName", "requestedCents", "status", "requiredEvidence", "expiresAt", "nextAction", "ownerRoleKey")
VALUES
  ('pa_sample_implant_004', 'tenant_1dentalai_production', 'pat_sample_004', 'txp_sample_004', 'pins_sample_004', 'Guardian Dental', 310000, 'EVIDENCE_NEEDED', '["CBCT report","implant narrative","medical necessity note","periodontal status","signed treatment plan"]'::jsonb, CURRENT_TIMESTAMP + interval '30 days', 'Collect CBCT and provider narrative, then stage prior authorization for human approval.', 'billing_rcm'),
  ('pa_sample_crown_001', 'tenant_1dentalai_production', 'pat_sample_001', 'txp_sample_001', 'pins_sample_001', 'Delta Dental', 182800, 'READY_FOR_REVIEW', '["pre-op PA","crown fracture note","tooth number","signed estimate"]'::jsonb, CURRENT_TIMESTAMP + interval '45 days', 'Review evidence bundle before claim/pre-determination submission.', 'billing_rcm')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "RcmDenialCase"
  ("id", "tenantId", "patientId", "claimId", "payerName", "denialCode", "denialReason", "deniedCents", "appealDeadline", "status", "appealLevel", "rootCause", "requiredEvidence", "nextAction", "ownerRoleKey")
VALUES
  ('denial_sample_crown_003', 'tenant_1dentalai_production', 'pat_sample_003', 'claim_sample_003', 'Cigna Dental', 'MISSING_ATTACHMENT', 'Crown claim requires radiograph and narrative before adjudication.', 74000, CURRENT_TIMESTAMP + interval '21 days', 'OPEN', 'FIRST_LEVEL', 'Evidence missing before submission', '["radiograph","clinical narrative","chart note"]'::jsonb, 'Attach PA image, generate narrative from signed note, and resubmit after biller approval.', 'billing_rcm')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "RcmEraPosting"
  ("id", "tenantId", "patientId", "claimId", "payerName", "eraTraceNumber", "allowedCents", "paidCents", "patientDueCents", "adjustmentCents", "status", "exceptionReason", "postedAt")
VALUES
  ('era_sample_srp_002', 'tenant_1dentalai_production', 'pat_sample_002', 'claim_sample_002', 'Aetna Dental', 'ERA-TRACE-S1002', 14200, 9800, 2600, 4400, 'NEEDS_REVIEW', 'ERA payment below expected allowed amount; verify contractual adjustment before posting.', null),
  ('era_sample_composite_008', 'tenant_1dentalai_production', 'pat_sample_008', 'claim_sample_008', 'Aetna Dental', 'ERA-TRACE-S1008', 28600, 21400, 7200, 0, 'READY_TO_POST', null, null)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "RcmPayerFollowUp"
  ("id", "tenantId", "patientId", "claimId", "payerName", "reason", "channel", "status", "dueAt", "nextAction", "ownerRoleKey")
VALUES
  ('pfu_sample_claim_status_002', 'tenant_1dentalai_production', 'pat_sample_002', 'claim_sample_002', 'Aetna Dental', 'Claim has been submitted without payment and needs status confirmation.', 'PORTAL', 'OPEN', CURRENT_TIMESTAMP + interval '1 day', 'Check payer portal, capture reference number, and update claim status.', 'billing_rcm'),
  ('pfu_sample_eligibility_009', 'tenant_1dentalai_production', 'pat_sample_009', null, 'Cigna Dental', 'Expired card blocks tomorrow hygiene readiness.', 'PHONE', 'OPEN', CURRENT_TIMESTAMP + interval '4 hours', 'Call payer or portal-verify eligibility, then update coverage evidence.', 'front_desk')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "RcmRevenueIntegrityFinding"
  ("id", "tenantId", "patientId", "claimId", "ledgerEntryId", "payerName", "findingType", "severity", "status", "expectedCents", "actualCents", "varianceCents", "rootCause", "nextAction", "ownerRoleKey")
VALUES
  ('ri_sample_underpayment_002', 'tenant_1dentalai_production', 'pat_sample_002', 'claim_sample_002', 'led_sample_002_charge', 'Aetna Dental', 'UNDERPAYMENT', 'HIGH', 'OPEN', 14200, 9800, 4400, 'ERA amount is below stored allowed estimate for perio maintenance.', 'Review EOB, payer contract, and appeal threshold before write-off.', 'billing_rcm'),
  ('ri_sample_unposted_payment_008', 'tenant_1dentalai_production', 'pat_sample_008', 'claim_sample_008', 'led_sample_008_charge', 'Aetna Dental', 'UNPOSTED_ERA', 'NORMAL', 'OPEN', 21400, 0, 21400, 'ERA is ready but not posted to claim or ledger.', 'Post ERA after reconciliation and update claim paid/patient due values.', 'billing_rcm')
ON CONFLICT ("id") DO NOTHING;
