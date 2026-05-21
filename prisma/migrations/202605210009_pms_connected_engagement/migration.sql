CREATE TABLE IF NOT EXISTS "PatientEngagementEvent" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "appointmentId" TEXT,
  "procedureLogId" TEXT,
  "sourceModule" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "triggerReason" TEXT NOT NULL,
  "messageBody" TEXT NOT NULL,
  "approvalStatus" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
  "scheduledFor" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PatientEngagementEvent_tenantId_status_scheduledFor_idx"
  ON "PatientEngagementEvent" ("tenantId", "status", "scheduledFor");
CREATE INDEX IF NOT EXISTS "PatientEngagementEvent_patientId_eventType_idx"
  ON "PatientEngagementEvent" ("patientId", "eventType");
CREATE INDEX IF NOT EXISTS "PatientEngagementEvent_appointmentId_idx"
  ON "PatientEngagementEvent" ("appointmentId");

CREATE TABLE IF NOT EXISTS "ReputationRecoveryCase" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "appointmentId" TEXT,
  "sourceEventId" TEXT,
  "sentiment" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "ownerRoleKey" TEXT NOT NULL DEFAULT 'practice_manager',
  "reason" TEXT NOT NULL,
  "recoveryNote" TEXT,
  "reviewRequestBlocked" BOOLEAN NOT NULL DEFAULT true,
  "dueAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ReputationRecoveryCase_tenantId_status_dueAt_idx"
  ON "ReputationRecoveryCase" ("tenantId", "status", "dueAt");
CREATE INDEX IF NOT EXISTS "ReputationRecoveryCase_patientId_status_idx"
  ON "ReputationRecoveryCase" ("patientId", "status");
CREATE INDEX IF NOT EXISTS "ReputationRecoveryCase_sourceEventId_idx"
  ON "ReputationRecoveryCase" ("sourceEventId");

INSERT INTO "PatientEngagementEvent"
  ("id", "tenantId", "patientId", "appointmentId", "procedureLogId", "sourceModule", "eventType", "channel", "status", "triggerReason", "messageBody", "approvalStatus", "scheduledFor", "completedAt", "createdAt", "updatedAt")
VALUES
  ('eng_sample_002', 'tenant_1dentalai_production', 'pat_sample_002', null, 'plog_sample_003', 'PMS_PROCEDURE_LOG', 'POST_VISIT_REVIEW_REQUEST', 'SMS', 'READY_FOR_APPROVAL', 'Completed perio maintenance with signed note and claim queued.', 'Hi Ben, thank you for visiting Summit Dental Group. If today felt clear and helpful, we would appreciate your public review. Reply HELP if you need the office first.', 'NEEDS_REVIEW', CURRENT_TIMESTAMP + interval '2 hours', null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('eng_sample_005', 'tenant_1dentalai_production', 'pat_sample_005', 'appt_sample_004', null, 'PMS_RECALL', 'RECALL_REACTIVATION', 'SMS', 'DRAFT', 'Hygiene recall due today and membership renewal noted on family account.', 'Hi Keisha, your hygiene visit and membership renewal are both due. Reply with a good window and we will hold time with Maya, RDH.', 'NEEDS_REVIEW', CURRENT_TIMESTAMP + interval '4 hours', null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('eng_sample_008', 'tenant_1dentalai_production', 'pat_sample_008', null, 'plog_sample_004', 'PMS_LEDGER_AND_CHART', 'POST_OP_INSTRUCTIONS', 'EMAIL', 'APPROVED_TO_SEND', 'Composite completed, clinical note signed, and patient balance posted.', 'Hi Ethan, your restorative visit is complete. Please avoid chewing on the treated side until numbness is gone. Contact us if sensitivity increases after 48 hours.', 'APPROVED', CURRENT_TIMESTAMP + interval '1 hour', null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('eng_sample_009', 'tenant_1dentalai_production', 'pat_sample_009', 'appt_sample_006', null, 'PMS_INSURANCE', 'INSURANCE_DOCUMENT_REQUEST', 'SMS', 'NEEDS_REVIEW', 'Expired insurance card blocks hygiene visit readiness.', 'Hi Ava, we need an updated insurance card before your hygiene visit. Please upload the front and back of the card through the patient portal.', 'NEEDS_REVIEW', CURRENT_TIMESTAMP + interval '30 minutes', null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('eng_sample_010', 'tenant_1dentalai_production', 'pat_sample_010', 'appt_sample_003', 'plog_sample_005', 'PMS_EMERGENCY_VISIT', 'POST_OP_INSTRUCTIONS', 'PHONE', 'DRAFT', 'Emergency exam and draft prescription require provider review before patient instructions.', 'Call Lucas after provider signs the emergency note and prescription directions. Confirm pain level, pharmacy, and follow-up plan.', 'NEEDS_REVIEW', CURRENT_TIMESTAMP + interval '3 hours', null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "ReputationRecoveryCase"
  ("id", "tenantId", "patientId", "appointmentId", "sourceEventId", "sentiment", "status", "ownerRoleKey", "reason", "recoveryNote", "reviewRequestBlocked", "dueAt", "createdAt", "updatedAt")
VALUES
  ('rep_sample_009', 'tenant_1dentalai_production', 'pat_sample_009', 'appt_sample_006', 'eng_sample_009', 'FRUSTRATED', 'OPEN', 'practice_manager', 'Patient arrived with expired insurance card on file; review request must stay blocked until readiness issue is resolved.', 'Manager should call after eligibility is fixed and confirm the patient understands what changed.', true, CURRENT_TIMESTAMP + interval '6 hours', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsTask"
  ("id", "tenantId", "patientId", "appointmentId", "ownerRoleKey", "title", "taskType", "status", "priority", "dueAt", "createdAt", "updatedAt")
VALUES
  ('task_eng_009_recovery', 'tenant_1dentalai_production', 'pat_sample_009', 'appt_sample_006', 'practice_manager', 'Service recovery before any review request', 'REPUTATION_RECOVERY', 'OPEN', 'HIGH', CURRENT_TIMESTAMP + interval '6 hours', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
