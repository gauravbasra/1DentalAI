CREATE TABLE IF NOT EXISTS "PatientFinderSavedFilter" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "goal" TEXT NOT NULL,
  "criteria" JSONB NOT NULL,
  "defaultOwnerRoleKey" TEXT NOT NULL DEFAULT 'front_desk',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "lastResultCount" INTEGER NOT NULL DEFAULT 0,
  "lastRunAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientFinderSavedFilter_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PatientFinderSavedFilter_tenantId_name_key" ON "PatientFinderSavedFilter"("tenantId", "name");
CREATE INDEX IF NOT EXISTS "PatientFinderSavedFilter_tenantId_status_goal_idx" ON "PatientFinderSavedFilter"("tenantId", "status", "goal");

CREATE TABLE IF NOT EXISTS "PatientFinderFollowUp" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "filterId" TEXT,
  "patientId" TEXT NOT NULL,
  "appointmentId" TEXT,
  "treatmentPlanId" TEXT,
  "claimId" TEXT,
  "reason" TEXT NOT NULL,
  "sourceModule" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "ownerRoleKey" TEXT NOT NULL DEFAULT 'front_desk',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "recommendedChannel" TEXT NOT NULL DEFAULT 'PHONE',
  "dueAt" TIMESTAMP(3),
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastAttemptAt" TIMESTAMP(3),
  "lastAttemptOutcome" TEXT,
  "nextAction" TEXT NOT NULL,
  "opportunityCents" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientFinderFollowUp_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PatientFinderFollowUp_tenantId_status_dueAt_idx" ON "PatientFinderFollowUp"("tenantId", "status", "dueAt");
CREATE INDEX IF NOT EXISTS "PatientFinderFollowUp_patientId_status_idx" ON "PatientFinderFollowUp"("patientId", "status");
CREATE INDEX IF NOT EXISTS "PatientFinderFollowUp_filterId_status_idx" ON "PatientFinderFollowUp"("filterId", "status");

CREATE TABLE IF NOT EXISTS "MorningHuddleSnapshot" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "huddleDate" TIMESTAMP(3) NOT NULL,
  "tab" TEXT NOT NULL,
  "metricKey" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "valueText" TEXT NOT NULL,
  "detailText" TEXT,
  "sourceModule" TEXT NOT NULL,
  "drilldownRoute" TEXT,
  "ownerRoleKey" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MorningHuddleSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MorningHuddleSnapshot_tenantId_huddleDate_tab_metricKey_key" ON "MorningHuddleSnapshot"("tenantId", "huddleDate", "tab", "metricKey");
CREATE INDEX IF NOT EXISTS "MorningHuddleSnapshot_tenantId_huddleDate_tab_idx" ON "MorningHuddleSnapshot"("tenantId", "huddleDate", "tab");

INSERT INTO "PatientFinderSavedFilter"
  ("id", "tenantId", "name", "description", "goal", "criteria", "defaultOwnerRoleKey", "status", "lastResultCount", "lastRunAt")
VALUES
  ('pf_filter_unscheduled_hygiene', 'tenant_1dentalai_production', 'Unscheduled hygiene recare', 'Active patients with due or overdue hygiene recall and no future hygiene appointment.', 'RECARE', '{"recallStatus":["DUE","OVERDUE"],"noFutureAppointment":true,"appointmentType":"hygiene"}'::jsonb, 'front_desk', 'ACTIVE', 0, null),
  ('pf_filter_unscheduled_treatment', 'tenant_1dentalai_production', 'Unscheduled treatment above $1,000', 'Presented or draft treatment plans with remaining opportunity and no future treatment appointment.', 'TREATMENT_ACCEPTANCE', '{"treatmentPlanStatus":["PRESENTED","DRAFT"],"minOpportunityCents":100000,"noFutureAppointment":true}'::jsonb, 'treatment_coordinator', 'ACTIVE', 0, null),
  ('pf_filter_ar_followup', 'tenant_1dentalai_production', 'Patient balances over $250', 'Patients with open ledger balances where payment follow-up or plan review is needed.', 'AR_COLLECTIONS', '{"minBalanceCents":25000,"excludeActiveDisputes":true}'::jsonb, 'billing_rcm', 'ACTIVE', 0, null),
  ('pf_filter_broken_appts', 'tenant_1dentalai_production', 'Broken appointment recovery', 'Patients with canceled, broken, or no-show appointments in the last 90 days and no future appointment.', 'SCHEDULE_RECOVERY', '{"appointmentStatuses":["BROKEN","CANCELED","NO_SHOW"],"lookbackDays":90,"noFutureAppointment":true}'::jsonb, 'front_desk', 'ACTIVE', 0, null),
  ('pf_filter_high_intent_phone', 'tenant_1dentalai_production', 'High-intent missed calls', 'Phone conversations with high-intent sentiment that did not result in a booked appointment.', 'PHONE_CONVERSION', '{"phoneSentiment":"HIGH_INTENT","outcomes":["MISSED_CALL","BOOKING_HANDOFF"],"noFutureAppointment":true}'::jsonb, 'front_desk', 'ACTIVE', 0, null)
ON CONFLICT ("tenantId", "name") DO NOTHING;

INSERT INTO "PatientFinderFollowUp"
  ("id", "tenantId", "filterId", "patientId", "appointmentId", "treatmentPlanId", "claimId", "reason", "sourceModule", "priority", "ownerRoleKey", "status", "recommendedChannel", "dueAt", "nextAction", "opportunityCents")
VALUES
  ('pf_fu_hygiene_005', 'tenant_1dentalai_production', 'pf_filter_unscheduled_hygiene', 'pat_sample_005', null, null, null, 'Hygiene recall is due and no future hygiene appointment is scheduled.', 'PMS_RECALL', 'NORMAL', 'front_desk', 'OPEN', 'SMS', CURRENT_TIMESTAMP + interval '4 hours', 'Send approved hygiene recare booking link or call if SMS consent is missing.', 0),
  ('pf_fu_treatment_004', 'tenant_1dentalai_production', 'pf_filter_unscheduled_treatment', 'pat_sample_004', null, 'txplan_sample_004', null, 'Presented implant/crown treatment remains unscheduled.', 'PMS_TREATMENT_PLAN', 'HIGH', 'treatment_coordinator', 'OPEN', 'PHONE', CURRENT_TIMESTAMP + interval '2 hours', 'Call patient, review financing, and offer consultation booking link.', 310000),
  ('pf_fu_ar_006', 'tenant_1dentalai_production', 'pf_filter_ar_followup', 'pat_sample_006', null, null, null, 'Patient ledger balance needs explanation after insurance payment.', 'PMS_LEDGER', 'HIGH', 'billing_rcm', 'OPEN', 'PHONE', CURRENT_TIMESTAMP + interval '1 hour', 'Review EOB and call patient with clear balance explanation.', 42600),
  ('pf_fu_phone_004', 'tenant_1dentalai_production', 'pf_filter_high_intent_phone', 'pat_sample_004', null, null, null, 'High-intent implant missed call did not convert to appointment.', 'PHONE', 'HIGH', 'front_desk', 'OPEN', 'PHONE', CURRENT_TIMESTAMP + interval '30 minutes', 'Call back and offer implant consult booking times.', 0)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "MorningHuddleSnapshot"
  ("id", "tenantId", "huddleDate", "tab", "metricKey", "label", "valueText", "detailText", "sourceModule", "drilldownRoute", "ownerRoleKey", "sortOrder")
VALUES
  ('mh_yesterday_collection_gap', 'tenant_1dentalai_production', CURRENT_DATE, 'YESTERDAY', 'collection_gap', 'Collection follow-up', '$426', 'Underpayment/balance issue requires RCM review before patient response.', 'RCM', '/app/rcm', 'billing_rcm', 10),
  ('mh_today_readiness', 'tenant_1dentalai_production', CURRENT_DATE, 'TODAY', 'appointment_readiness', 'Schedule readiness', 'Needs review', 'Insurance and form blockers should be cleared before reminders.', 'PMS', '/app/pms/schedule', 'front_desk', 10),
  ('mh_today_patient_finder', 'tenant_1dentalai_production', CURRENT_DATE, 'TODAY', 'patient_finder_queue', 'Patient Finder work', '4 open', 'Hygiene, treatment, AR, and high-intent phone follow-ups are ready.', 'PATIENT_FINDER', '/app/patient-finder', 'front_desk', 20),
  ('mh_tomorrow_production', 'tenant_1dentalai_production', CURRENT_DATE, 'TOMORROW', 'scheduled_production', 'Tomorrow production', 'Review', 'Look at scheduled production, openings, and Perfect Time Slot fill opportunities.', 'PMS_REPORTS', '/app/pms/reports', 'practice_manager', 10)
ON CONFLICT ("tenantId", "huddleDate", "tab", "metricKey") DO NOTHING;
