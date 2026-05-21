CREATE TABLE IF NOT EXISTS "RcmWorkItem" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT,
  "appointmentId" TEXT,
  "claimId" TEXT,
  "workType" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "payerName" TEXT,
  "amountCents" INTEGER NOT NULL DEFAULT 0,
  "ownerRoleKey" TEXT NOT NULL DEFAULT 'billing_rcm',
  "sourceRecord" TEXT,
  "blockerReason" TEXT,
  "nextAction" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RcmWorkItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "RcmWorkItem_tenantId_status_priority_idx" ON "RcmWorkItem"("tenantId", "status", "priority");
CREATE INDEX IF NOT EXISTS "RcmWorkItem_tenantId_stage_dueAt_idx" ON "RcmWorkItem"("tenantId", "stage", "dueAt");
CREATE INDEX IF NOT EXISTS "RcmWorkItem_patientId_idx" ON "RcmWorkItem"("patientId");
CREATE INDEX IF NOT EXISTS "RcmWorkItem_claimId_idx" ON "RcmWorkItem"("claimId");

CREATE TABLE IF NOT EXISTS "PhoneConversation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT,
  "appointmentId" TEXT,
  "direction" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'VOICE',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "callerNumber" TEXT,
  "practiceNumber" TEXT,
  "callerName" TEXT,
  "aiIntent" TEXT,
  "aiSentiment" TEXT,
  "transcriptSummary" TEXT,
  "followUpStatus" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
  "outcome" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "durationSeconds" INTEGER,
  "recordingUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhoneConversation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PhoneConversation_tenantId_status_startedAt_idx" ON "PhoneConversation"("tenantId", "status", "startedAt");
CREATE INDEX IF NOT EXISTS "PhoneConversation_patientId_startedAt_idx" ON "PhoneConversation"("patientId", "startedAt");
CREATE INDEX IF NOT EXISTS "PhoneConversation_tenantId_aiIntent_idx" ON "PhoneConversation"("tenantId", "aiIntent");

CREATE TABLE IF NOT EXISTS "ReputationReviewWorkflow" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT,
  "appointmentId" TEXT,
  "providerId" TEXT,
  "locationId" TEXT,
  "sourceEventId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "serviceLine" TEXT,
  "reviewSite" TEXT NOT NULL DEFAULT 'GOOGLE',
  "requestChannel" TEXT NOT NULL DEFAULT 'SMS',
  "requestStatus" TEXT NOT NULL DEFAULT 'READY_FOR_APPROVAL',
  "rating" INTEGER,
  "sentiment" TEXT,
  "publicReviewText" TEXT,
  "responseDraft" TEXT,
  "recoveryStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReputationReviewWorkflow_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ReputationReviewWorkflow_tenantId_status_dueAt_idx" ON "ReputationReviewWorkflow"("tenantId", "status", "dueAt");
CREATE INDEX IF NOT EXISTS "ReputationReviewWorkflow_patientId_status_idx" ON "ReputationReviewWorkflow"("patientId", "status");
CREATE INDEX IF NOT EXISTS "ReputationReviewWorkflow_locationId_reviewSite_idx" ON "ReputationReviewWorkflow"("locationId", "reviewSite");

CREATE TABLE IF NOT EXISTS "PatientSurvey" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT,
  "appointmentId" TEXT,
  "surveyType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "score" INTEGER,
  "nps" INTEGER,
  "responseText" TEXT,
  "recoveryRequired" BOOLEAN NOT NULL DEFAULT false,
  "ownerRoleKey" TEXT NOT NULL DEFAULT 'marketing_growth',
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientSurvey_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PatientSurvey_tenantId_status_dueAt_idx" ON "PatientSurvey"("tenantId", "status", "dueAt");
CREATE INDEX IF NOT EXISTS "PatientSurvey_patientId_surveyType_idx" ON "PatientSurvey"("patientId", "surveyType");

CREATE TABLE IF NOT EXISTS "MarketingLandingPage" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "serviceLine" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "offerSummary" TEXT,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "primaryCta" TEXT NOT NULL,
  "complianceStatus" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
  "publishedUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingLandingPage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MarketingLandingPage_tenantId_slug_key" ON "MarketingLandingPage"("tenantId", "slug");
CREATE INDEX IF NOT EXISTS "MarketingLandingPage_tenantId_status_serviceLine_idx" ON "MarketingLandingPage"("tenantId", "status", "serviceLine");

CREATE TABLE IF NOT EXISTS "MarketingCampaign" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "landingPageId" TEXT,
  "name" TEXT NOT NULL,
  "campaignType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "audienceDefinition" TEXT NOT NULL,
  "primaryGoal" TEXT NOT NULL,
  "channelMix" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "aiStudioBrief" TEXT,
  "complianceStatus" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
  "estimatedAudience" INTEGER NOT NULL DEFAULT 0,
  "attributedBookings" INTEGER NOT NULL DEFAULT 0,
  "attributedProductionCents" INTEGER NOT NULL DEFAULT 0,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MarketingCampaign_tenantId_status_campaignType_idx" ON "MarketingCampaign"("tenantId", "status", "campaignType");
CREATE INDEX IF NOT EXISTS "MarketingCampaign_landingPageId_idx" ON "MarketingCampaign"("landingPageId");

CREATE TABLE IF NOT EXISTS "AiStudioAsset" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "sourceModule" TEXT NOT NULL,
  "sourceRecordId" TEXT,
  "assetType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "promptInput" TEXT NOT NULL,
  "generatedDraft" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "approvalStatus" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
  "complianceNotes" TEXT,
  "ownerRoleKey" TEXT NOT NULL DEFAULT 'marketing_growth',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiStudioAsset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AiStudioAsset_tenantId_sourceModule_assetType_idx" ON "AiStudioAsset"("tenantId", "sourceModule", "assetType");
CREATE INDEX IF NOT EXISTS "AiStudioAsset_tenantId_approvalStatus_idx" ON "AiStudioAsset"("tenantId", "approvalStatus");

INSERT INTO "RcmWorkItem" ("id", "tenantId", "patientId", "appointmentId", "claimId", "workType", "stage", "priority", "status", "payerName", "amountCents", "ownerRoleKey", "sourceRecord", "blockerReason", "nextAction", "dueAt", "notes") VALUES
  ('rcm_item_eligibility_tomorrow', 'tenant_1dentalai_production', 'pat_sample_002', 'appt_sample_002', null, 'ELIGIBILITY_AND_BENEFITS', 'PRE_VISIT_CLEARANCE', 'HIGH', 'OPEN', 'Delta Dental', 0, 'billing_rcm', 'Tomorrow schedule', 'Eligibility evidence is older than 30 days and deductible remaining is unknown.', 'Run eligibility, capture benefit evidence, and clear appointment readiness before confirmation outreach.', CURRENT_TIMESTAMP + interval '4 hours', 'RCM sits before engagement: reminders should not go out while insurance readiness is blocked.'),
  ('rcm_item_claim_attachment', 'tenant_1dentalai_production', 'pat_sample_004', null, 'claim_sample_002', 'CLAIM_ATTACHMENT', 'CLAIM_READY', 'HIGH', 'OPEN', 'Aetna Dental', 148000, 'billing_rcm', 'PmsClaim', 'Implant/crown narrative needs image and clinical note evidence before payer submission.', 'Attach evidence, create narrative, and move claim to human approval.', CURRENT_TIMESTAMP + interval '1 day', 'No clearinghouse submission until payer connector and approval policy are live.'),
  ('rcm_item_revenue_leakage', 'tenant_1dentalai_production', 'pat_sample_006', null, null, 'REVENUE_INTEGRITY', 'UNDERPAYMENT_REVIEW', 'NORMAL', 'OPEN', 'Cigna Dental', 42600, 'billing_rcm', 'Ledger and fee schedule', 'Posted payment appears below contracted estimate for D2740.', 'Compare fee schedule, EOB allowance, write-off, and appeal threshold.', CURRENT_TIMESTAMP + interval '2 days', 'Revenue leakage work item created from PMS ledger patterns.'),
  ('rcm_item_credentialing', 'tenant_1dentalai_production', null, null, null, 'CREDENTIALING', 'PAYER_ENROLLMENT', 'NORMAL', 'OPEN', 'MetLife Dental', 0, 'practice_manager', 'Provider roster', 'New associate provider not enrolled for selected payer/location.', 'Collect CAQH, license, W-9, location roster, EFT/ERA enrollment status.', CURRENT_TIMESTAMP + interval '7 days', 'Credentialing blocks clean RCM before claims exist.')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "PhoneConversation" ("id", "tenantId", "patientId", "appointmentId", "direction", "channel", "status", "callerNumber", "practiceNumber", "callerName", "aiIntent", "aiSentiment", "transcriptSummary", "followUpStatus", "outcome", "startedAt", "durationSeconds") VALUES
  ('phone_conv_missed_implant', 'tenant_1dentalai_production', 'pat_sample_004', null, 'INBOUND', 'VOICE', 'OPEN', '(303) 555-4410', '(303) 555-0100', 'Maya Patel', 'IMPLANT_CONSULT_PRICE', 'HIGH_INTENT', 'Caller asked about implant consultation pricing and financing. No appointment booked because front desk was unavailable.', 'NEEDS_REVIEW', 'MISSED_CALL', CURRENT_TIMESTAMP - interval '75 minutes', 0),
  ('phone_conv_confirm_hygiene', 'tenant_1dentalai_production', 'pat_sample_005', 'appt_sample_005', 'INBOUND', 'VOICE', 'OPEN', '(303) 555-1255', '(303) 555-0100', 'Jordan Lee', 'CONFIRM_APPOINTMENT', 'NEUTRAL', 'Known patient confirmed hygiene visit and asked whether forms are due.', 'READY_FOR_APPROVAL', 'CALL_SUMMARY_REVIEW', CURRENT_TIMESTAMP - interval '2 hours', 184),
  ('phone_conv_balance', 'tenant_1dentalai_production', 'pat_sample_006', null, 'OUTBOUND', 'VOICE', 'OPEN', '(303) 555-1266', '(303) 555-0100', 'Sofia Ramirez', 'PAYMENT_QUESTION', 'NEEDS_ATTENTION', 'Patient asked why balance changed after insurance payment. Needs ledger and EOB review before response.', 'BLOCKED_RCM_REVIEW', 'BILLING_HANDOFF', CURRENT_TIMESTAMP - interval '5 hours', 310)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "ReputationReviewWorkflow" ("id", "tenantId", "patientId", "appointmentId", "providerId", "locationId", "status", "serviceLine", "reviewSite", "requestChannel", "requestStatus", "rating", "sentiment", "publicReviewText", "responseDraft", "recoveryStatus", "dueAt") VALUES
  ('rep_workflow_review_ready', 'tenant_1dentalai_production', 'pat_sample_005', 'appt_sample_005', 'provider_sample_hyg_santos', 'loc_primary', 'OPEN', 'Hygiene', 'GOOGLE', 'SMS', 'READY_FOR_APPROVAL', null, 'POSITIVE_SIGNAL', null, 'Thank you for trusting our hygiene team. We are grateful you chose us for your care.', 'NOT_REQUIRED', CURRENT_TIMESTAMP + interval '6 hours'),
  ('rep_workflow_recovery', 'tenant_1dentalai_production', 'pat_sample_006', null, 'provider_sample_kapoor', 'loc_primary', 'OPEN', 'Restorative', 'GOOGLE', 'SMS', 'BLOCKED_SERVICE_RECOVERY', 2, 'NEGATIVE', 'Billing was confusing and I could not get someone on the phone.', 'Thank you for telling us. We are reviewing your billing concern and will contact you directly before asking for any public review update.', 'REQUIRED', CURRENT_TIMESTAMP + interval '2 hours')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "PatientSurvey" ("id", "tenantId", "patientId", "appointmentId", "surveyType", "status", "score", "nps", "responseText", "recoveryRequired", "ownerRoleKey", "dueAt") VALUES
  ('survey_post_visit_ready', 'tenant_1dentalai_production', 'pat_sample_005', 'appt_sample_005', 'POST_VISIT_CSAT', 'READY_FOR_APPROVAL', null, null, null, false, 'marketing_growth', CURRENT_TIMESTAMP + interval '8 hours'),
  ('survey_low_score', 'tenant_1dentalai_production', 'pat_sample_006', null, 'BILLING_EXPERIENCE', 'RECEIVED', 2, 1, 'I need a clearer explanation of what insurance paid.', true, 'practice_manager', CURRENT_TIMESTAMP + interval '1 hour')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "MarketingLandingPage" ("id", "tenantId", "slug", "title", "serviceLine", "status", "offerSummary", "seoTitle", "seoDescription", "primaryCta", "complianceStatus", "publishedUrl") VALUES
  ('lp_implants_denver', 'tenant_1dentalai_production', 'denver-dental-implants', 'Denver Dental Implants', 'Implants', 'DRAFT', 'Consult-focused implant page with financing and CBCT readiness language.', 'Dental Implants in Denver | 1DentalAI Sample Practice', 'Learn about implant consultation, financing, imaging, and treatment planning options.', 'Book implant consultation', 'NEEDS_REVIEW', null),
  ('lp_emergency_dentist', 'tenant_1dentalai_production', 'emergency-dentist-denver', 'Emergency Dentist Denver', 'Emergency', 'APPROVED_STAGED', 'After-hours emergency landing page connected to online booking.', 'Emergency Dentist in Denver | Same-Day Dental Care', 'Book an urgent dental exam online and reserve an available appointment.', 'Reserve emergency appointment', 'APPROVED', '/book/emergency-exam')
ON CONFLICT ("tenantId", "slug") DO NOTHING;

INSERT INTO "MarketingCampaign" ("id", "tenantId", "landingPageId", "name", "campaignType", "status", "audienceDefinition", "primaryGoal", "channelMix", "aiStudioBrief", "complianceStatus", "estimatedAudience", "attributedBookings", "attributedProductionCents", "startsAt") VALUES
  ('campaign_unscheduled_treatment', 'tenant_1dentalai_production', 'lp_implants_denver', 'Unscheduled implant and crown treatment recovery', 'UNSCHEDULED_TREATMENT', 'DRAFT', 'Patients with presented treatment plans above $1,000 and no future appointment.', 'Recover accepted treatment and book consults.', ARRAY['SMS','EMAIL','PHONE','LANDING_PAGE'], 'Create compliant treatment follow-up copy that references benefits, financing, and booking without guaranteeing outcomes.', 'NEEDS_REVIEW', 42, 0, 0, CURRENT_DATE + interval '2 days'),
  ('campaign_hygiene_recare', 'tenant_1dentalai_production', null, 'Past-due hygiene recare', 'RECALL_REACTIVATION', 'READY_FOR_APPROVAL', 'Active patients with overdue hygiene recall and no future hygiene appointment.', 'Fill hygiene openings and improve retention.', ARRAY['SMS','EMAIL','ONLINE_SCHEDULING'], 'Write short recall messages with online booking link and no shame language.', 'APPROVED', 68, 3, 72000, CURRENT_DATE + interval '1 day')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "AiStudioAsset" ("id", "tenantId", "sourceModule", "sourceRecordId", "assetType", "title", "promptInput", "generatedDraft", "status", "approvalStatus", "complianceNotes", "ownerRoleKey") VALUES
  ('ai_asset_review_response', 'tenant_1dentalai_production', 'REPUTATION', 'rep_workflow_recovery', 'REVIEW_RESPONSE', 'Billing concern review response', 'Respond to a billing confusion review without disclosing PHI or arguing.', 'Thank you for sharing this feedback. We are sorry the billing experience was unclear. Our team is reviewing the details and will reach out directly so we can help resolve the concern.', 'DRAFT', 'NEEDS_REVIEW', 'No PHI, no admission of fault, direct resolution path.', 'marketing_growth'),
  ('ai_asset_implant_lp', 'tenant_1dentalai_production', 'MARKETING', 'lp_implants_denver', 'LANDING_PAGE_COPY', 'Implant landing page draft', 'Create implant consult page copy with financing and CBCT readiness.', 'A confident implant plan starts with the right records, imaging, and financial options. Schedule a consultation to review your goals, health history, imaging needs, and possible treatment path.', 'DRAFT', 'NEEDS_REVIEW', 'Clinical claims need provider review before publishing.', 'marketing_growth'),
  ('ai_asset_phone_followup', 'tenant_1dentalai_production', 'PHONE', 'phone_conv_missed_implant', 'MISSED_CALL_TEXT', 'Missed implant call follow-up', 'Create a concise missed-call text for an implant consult lead.', 'Sorry we missed your call. We can help with implant consultation questions and available times. Reply here or book a consultation online.', 'DRAFT', 'NEEDS_REVIEW', 'External SMS requires consent and phone connector.', 'front_desk')
ON CONFLICT ("id") DO NOTHING;
