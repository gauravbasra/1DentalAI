CREATE TABLE IF NOT EXISTS "PhoneOutboundMessage" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "conversationId" TEXT,
  "patientId" TEXT,
  "appointmentId" TEXT,
  "channel" TEXT NOT NULL DEFAULT 'SMS',
  "recipientNumber" TEXT,
  "messageType" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "approvalStatus" TEXT NOT NULL DEFAULT 'DRAFT',
  "deliveryStatus" TEXT NOT NULL DEFAULT 'NOT_SENT',
  "consentStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "blockedReason" TEXT,
  "ownerRoleKey" TEXT NOT NULL DEFAULT 'front_desk',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhoneOutboundMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PhoneOutboundMessage_tenantId_approvalStatus_deliveryStatus_idx" ON "PhoneOutboundMessage"("tenantId", "approvalStatus", "deliveryStatus");
CREATE INDEX IF NOT EXISTS "PhoneOutboundMessage_conversationId_idx" ON "PhoneOutboundMessage"("conversationId");
CREATE INDEX IF NOT EXISTS "PhoneOutboundMessage_patientId_messageType_idx" ON "PhoneOutboundMessage"("patientId", "messageType");

CREATE TABLE IF NOT EXISTS "PhoneRoutingRule" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "locationId" TEXT,
  "name" TEXT NOT NULL,
  "triggerType" TEXT NOT NULL,
  "destinationType" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "schedule" JSONB,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "failoverAction" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhoneRoutingRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PhoneRoutingRule_tenantId_status_priority_idx" ON "PhoneRoutingRule"("tenantId", "status", "priority");
CREATE INDEX IF NOT EXISTS "PhoneRoutingRule_locationId_status_idx" ON "PhoneRoutingRule"("locationId", "status");

CREATE TABLE IF NOT EXISTS "PhoneCallTask" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "conversationId" TEXT,
  "patientId" TEXT,
  "taskType" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "dueAt" TIMESTAMP(3),
  "ownerRoleKey" TEXT NOT NULL DEFAULT 'front_desk',
  "nextAction" TEXT NOT NULL,
  "sourceModule" TEXT NOT NULL DEFAULT 'PHONE',
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhoneCallTask_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PhoneCallTask_tenantId_status_priority_idx" ON "PhoneCallTask"("tenantId", "status", "priority");
CREATE INDEX IF NOT EXISTS "PhoneCallTask_conversationId_idx" ON "PhoneCallTask"("conversationId");
CREATE INDEX IF NOT EXISTS "PhoneCallTask_patientId_status_idx" ON "PhoneCallTask"("patientId", "status");

CREATE TABLE IF NOT EXISTS "PhoneCallAnalytics" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "talkRatio" JSONB,
  "sentimentTimeline" JSONB,
  "keywords" JSONB,
  "riskFlags" JSONB,
  "bookingIntentScore" INTEGER NOT NULL DEFAULT 0,
  "serviceRecoveryScore" INTEGER NOT NULL DEFAULT 0,
  "revenueOpportunityCents" INTEGER NOT NULL DEFAULT 0,
  "summaryQuality" TEXT NOT NULL DEFAULT 'AI_DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhoneCallAnalytics_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PhoneCallAnalytics_conversationId_key" ON "PhoneCallAnalytics"("conversationId");
CREATE INDEX IF NOT EXISTS "PhoneCallAnalytics_tenantId_bookingIntentScore_idx" ON "PhoneCallAnalytics"("tenantId", "bookingIntentScore");
CREATE INDEX IF NOT EXISTS "PhoneCallAnalytics_tenantId_serviceRecoveryScore_idx" ON "PhoneCallAnalytics"("tenantId", "serviceRecoveryScore");

INSERT INTO "PhoneRoutingRule" ("id", "tenantId", "locationId", "name", "triggerType", "destinationType", "destination", "priority", "schedule", "status", "failoverAction")
VALUES
  ('phone_route_new_patient', 'tenant_1dentalai_production', 'loc_primary', 'New patient and implant consult priority ring group', 'INTENT_NEW_PATIENT_OR_IMPLANT', 'RING_GROUP', 'front-desk-growth', 10, '{"days":["Mon","Tue","Wed","Thu","Fri"],"start":"08:00","end":"17:00"}'::jsonb, 'ACTIVE', 'Missed-call text and Patient Finder follow-up'),
  ('phone_route_emergency', 'tenant_1dentalai_production', 'loc_primary', 'Emergency pain escalation', 'INTENT_EMERGENCY', 'RING_GROUP', 'clinical-triage', 5, '{"days":["Mon","Tue","Wed","Thu","Fri"],"start":"07:30","end":"18:00"}'::jsonb, 'ACTIVE', 'After-hours emergency voicemail and provider alert'),
  ('phone_route_billing', 'tenant_1dentalai_production', 'loc_primary', 'Billing and insurance questions', 'INTENT_BILLING_OR_INSURANCE', 'QUEUE', 'billing-rcm', 20, '{"days":["Mon","Tue","Wed","Thu","Fri"],"start":"09:00","end":"16:00"}'::jsonb, 'ACTIVE', 'Create RCM handoff task')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "PhoneOutboundMessage" ("id", "tenantId", "conversationId", "patientId", "appointmentId", "channel", "recipientNumber", "messageType", "body", "approvalStatus", "deliveryStatus", "consentStatus", "blockedReason", "ownerRoleKey")
VALUES
  ('phone_msg_missed_implant', 'tenant_1dentalai_production', 'phone_conv_missed_implant', 'pat_sample_004', null, 'SMS', '(303) 555-4410', 'MISSED_CALL_TEXT', 'Sorry we missed your call. We can help with implant consultation questions and available times. Reply here and we will help you schedule.', 'NEEDS_APPROVAL', 'NOT_SENT', 'UNKNOWN', 'SMS connector and consent policy must be active before delivery.', 'front_desk'),
  ('phone_msg_confirm_hygiene', 'tenant_1dentalai_production', 'phone_conv_confirm_hygiene', 'pat_sample_005', 'appt_sample_005', 'SMS', '(303) 555-1255', 'APPOINTMENT_CONFIRMATION_REPLY', 'Thanks for confirming. We will review whether forms are due and send a secure link if anything needs to be completed before your visit.', 'NEEDS_APPROVAL', 'NOT_SENT', 'UNKNOWN', 'Outbound texting is connector-gated.', 'front_desk'),
  ('phone_msg_balance', 'tenant_1dentalai_production', 'phone_conv_balance', 'pat_sample_006', null, 'SMS', '(303) 555-1266', 'BILLING_HANDOFF_REPLY', 'We are reviewing your insurance payment and balance details so we can give you a clear explanation. A billing team member will follow up after review.', 'BLOCKED', 'NOT_SENT', 'UNKNOWN', 'Blocked until RCM reviews ledger and EOB.', 'billing_rcm')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "PhoneCallTask" ("id", "tenantId", "conversationId", "patientId", "taskType", "priority", "status", "dueAt", "ownerRoleKey", "nextAction")
VALUES
  ('phone_task_missed_implant', 'tenant_1dentalai_production', 'phone_conv_missed_implant', 'pat_sample_004', 'MISSED_CALL_RECOVERY', 'HIGH', 'OPEN', CURRENT_TIMESTAMP + interval '20 minutes', 'front_desk', 'Call back implant consult lead, offer next consultation openings, and convert to Patient Finder follow-up if not reached.'),
  ('phone_task_balance_rcm', 'tenant_1dentalai_production', 'phone_conv_balance', 'pat_sample_006', 'BILLING_REVIEW', 'HIGH', 'OPEN', CURRENT_TIMESTAMP + interval '1 hour', 'billing_rcm', 'Review ledger, claim, ERA/EOB, and prepare patient balance explanation before any response.'),
  ('phone_task_forms_check', 'tenant_1dentalai_production', 'phone_conv_confirm_hygiene', 'pat_sample_005', 'FORMS_CHECK', 'NORMAL', 'OPEN', CURRENT_TIMESTAMP + interval '2 hours', 'front_desk', 'Check appointment readiness and send secure forms link only if forms remain due.')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "PhoneCallAnalytics" ("id", "tenantId", "conversationId", "talkRatio", "sentimentTimeline", "keywords", "riskFlags", "bookingIntentScore", "serviceRecoveryScore", "revenueOpportunityCents", "summaryQuality")
VALUES
  ('phone_analytics_missed_implant', 'tenant_1dentalai_production', 'phone_conv_missed_implant', '{"patient":100,"team":0}'::jsonb, '[{"t":"00:00","sentiment":"high_intent"}]'::jsonb, '["implant","price","financing","consultation"]'::jsonb, '["missed_call","new_patient_lead"]'::jsonb, 92, 12, 310000, 'AI_DRAFT'),
  ('phone_analytics_confirm_hygiene', 'tenant_1dentalai_production', 'phone_conv_confirm_hygiene', '{"patient":45,"team":55}'::jsonb, '[{"t":"00:30","sentiment":"neutral"},{"t":"02:10","sentiment":"positive"}]'::jsonb, '["confirmation","forms","hygiene"]'::jsonb, '["forms_question"]'::jsonb, 35, 5, 0, 'AI_DRAFT'),
  ('phone_analytics_balance', 'tenant_1dentalai_production', 'phone_conv_balance', '{"patient":58,"team":42}'::jsonb, '[{"t":"01:10","sentiment":"confused"},{"t":"04:20","sentiment":"needs_attention"}]'::jsonb, '["balance","insurance","payment","EOB"]'::jsonb, '["billing_confusion","service_recovery"]'::jsonb, 15, 78, 42600, 'AI_DRAFT')
ON CONFLICT ("conversationId") DO NOTHING;
