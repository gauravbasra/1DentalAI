CREATE TABLE IF NOT EXISTS "ReputationListingProfile" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "locationId" TEXT,
  "platform" TEXT NOT NULL,
  "profileUrl" TEXT,
  "nameOnListing" TEXT NOT NULL,
  "phoneOnListing" TEXT,
  "addressOnListing" TEXT,
  "hoursJson" JSONB,
  "categoryJson" JSONB,
  "rating" DOUBLE PRECISION,
  "reviewCount" INTEGER NOT NULL DEFAULT 0,
  "syncStatus" TEXT NOT NULL DEFAULT 'NEEDS_CONNECTION',
  "dataQualityScore" INTEGER NOT NULL DEFAULT 0,
  "issueSummary" TEXT,
  "nextAction" TEXT NOT NULL,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReputationListingProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ReputationListingProfile_tenantId_locationId_platform_key" ON "ReputationListingProfile"("tenantId", "locationId", "platform");
CREATE INDEX IF NOT EXISTS "ReputationListingProfile_tenantId_syncStatus_idx" ON "ReputationListingProfile"("tenantId", "syncStatus");
CREATE INDEX IF NOT EXISTS "ReputationListingProfile_locationId_platform_idx" ON "ReputationListingProfile"("locationId", "platform");

CREATE TABLE IF NOT EXISTS "ReputationReviewResponse" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "reviewWorkflowId" TEXT NOT NULL,
  "responseChannel" TEXT NOT NULL DEFAULT 'PUBLIC_REVIEW_REPLY',
  "draftBody" TEXT NOT NULL,
  "approvalStatus" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
  "publicationStatus" TEXT NOT NULL DEFAULT 'NOT_PUBLISHED',
  "blockedReason" TEXT,
  "approvedByRoleKey" TEXT,
  "approvedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReputationReviewResponse_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ReputationReviewResponse_tenantId_approvalStatus_publicationStatus_idx" ON "ReputationReviewResponse"("tenantId", "approvalStatus", "publicationStatus");
CREATE INDEX IF NOT EXISTS "ReputationReviewResponse_reviewWorkflowId_idx" ON "ReputationReviewResponse"("reviewWorkflowId");

CREATE TABLE IF NOT EXISTS "ReputationCampaignRule" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "triggerEvent" TEXT NOT NULL,
  "serviceLine" TEXT,
  "channel" TEXT NOT NULL DEFAULT 'SMS',
  "targetReviewSite" TEXT NOT NULL DEFAULT 'SMART_LINK',
  "sendDelayHours" INTEGER NOT NULL DEFAULT 24,
  "cooldownDays" INTEGER NOT NULL DEFAULT 90,
  "minimumSurveyScore" INTEGER,
  "suppressions" JSONB,
  "ownerRoleKey" TEXT NOT NULL DEFAULT 'marketing_growth',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "lastEvaluatedAt" TIMESTAMP(3),
  "nextAction" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReputationCampaignRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ReputationCampaignRule_tenantId_status_triggerEvent_idx" ON "ReputationCampaignRule"("tenantId", "status", "triggerEvent");
CREATE INDEX IF NOT EXISTS "ReputationCampaignRule_tenantId_serviceLine_idx" ON "ReputationCampaignRule"("tenantId", "serviceLine");

CREATE TABLE IF NOT EXISTS "ReputationReferralRequest" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT,
  "sourceReviewId" TEXT,
  "requestType" TEXT NOT NULL DEFAULT 'REFERRAL',
  "channel" TEXT NOT NULL DEFAULT 'SMS',
  "status" TEXT NOT NULL DEFAULT 'READY_FOR_APPROVAL',
  "offerSummary" TEXT,
  "messageDraft" TEXT NOT NULL,
  "consentStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "conversionStatus" TEXT NOT NULL DEFAULT 'NOT_SENT',
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReputationReferralRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ReputationReferralRequest_tenantId_status_dueAt_idx" ON "ReputationReferralRequest"("tenantId", "status", "dueAt");
CREATE INDEX IF NOT EXISTS "ReputationReferralRequest_patientId_requestType_idx" ON "ReputationReferralRequest"("patientId", "requestType");

INSERT INTO "ReputationListingProfile"
  ("id", "tenantId", "locationId", "platform", "profileUrl", "nameOnListing", "phoneOnListing", "addressOnListing", "hoursJson", "categoryJson", "rating", "reviewCount", "syncStatus", "dataQualityScore", "issueSummary", "nextAction", "lastSyncedAt")
VALUES
  ('rep_listing_google_denver', 'tenant_1dentalai_production', 'loc_primary', 'GOOGLE_BUSINESS_PROFILE', 'https://business.google.com/', 'Summit Dental Group', '(303) 555-0100', '1400 Market St, Denver, CO 80202', '{"mon":"08:00-17:00","tue":"08:00-17:00","wed":"08:00-17:00","thu":"08:00-17:00","fri":"08:00-14:00"}'::jsonb, '["Dentist","Cosmetic dentist","Emergency dental service"]'::jsonb, 4.7, 318, 'CONNECTED_REVIEW_SYNC', 94, null, 'Monitor review response SLA and confirm holiday hours before next local-search sync.', CURRENT_TIMESTAMP - interval '2 hours'),
  ('rep_listing_facebook_denver', 'tenant_1dentalai_production', 'loc_primary', 'FACEBOOK_PAGE', 'https://www.facebook.com/', 'Summit Dental Group Denver', '(303) 555-0100', '1400 Market St, Denver, CO 80202', '{"mon":"08:00-17:00","tue":"08:00-17:00","wed":"08:00-17:00","thu":"08:00-17:00","fri":"08:00-14:00"}'::jsonb, '["Dentist"]'::jsonb, 4.6, 112, 'CONNECTED_REVIEW_SYNC', 88, 'Cover photo and services list need refresh before implant campaign traffic increases.', 'Refresh service categories and submit owner approval for updated profile content.', CURRENT_TIMESTAMP - interval '3 hours'),
  ('rep_listing_healthgrades_denver', 'tenant_1dentalai_production', 'loc_primary', 'HEALTHGRADES', null, 'Summit Dental Group', '(303) 555-0199', '1400 Market Street, Denver CO', '{"mon":"08:00-17:00"}'::jsonb, '["Dentist"]'::jsonb, 4.2, 28, 'DATA_MISMATCH', 71, 'Phone number does not match practice routing number and Friday hours are missing.', 'Verify provider roster, phone number, and hours before requesting new reviews to this destination.', null),
  ('rep_listing_yelp_denver', 'tenant_1dentalai_production', 'loc_primary', 'YELP', null, 'Summit Dental', '(303) 555-0100', '1400 Market St, Denver, CO 80202', '{"mon":"08:00-17:00","tue":"08:00-17:00"}'::jsonb, '["General dentistry"]'::jsonb, 4.1, 46, 'NEEDS_CONNECTION', 64, 'Listing is not connected; categories and hours are incomplete.', 'Connect listing source or assign manual listing-cleanup task.', null)
ON CONFLICT ("tenantId", "locationId", "platform") DO NOTHING;

INSERT INTO "ReputationReviewResponse"
  ("id", "tenantId", "reviewWorkflowId", "responseChannel", "draftBody", "approvalStatus", "publicationStatus", "blockedReason")
VALUES
  ('rep_response_billing_recovery', 'tenant_1dentalai_production', 'rep_workflow_recovery', 'PUBLIC_REVIEW_REPLY', 'Thank you for telling us about the billing confusion. We are sorry this was not clearer. Our manager is reviewing the account details and will contact you directly so we can help resolve it.', 'NEEDS_REVIEW', 'NOT_PUBLISHED', 'Public response requires manager approval and connected review profile.'),
  ('rep_response_hygiene_positive', 'tenant_1dentalai_production', 'rep_workflow_review_ready', 'PUBLIC_REVIEW_REPLY', 'Thank you for trusting our hygiene team. We appreciate you choosing Summit Dental Group and are glad the visit felt helpful.', 'APPROVED', 'BLOCKED_CONNECTOR_REQUIRED', 'Review source connector must be active before public posting.')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "ReputationCampaignRule"
  ("id", "tenantId", "name", "triggerEvent", "serviceLine", "channel", "targetReviewSite", "sendDelayHours", "cooldownDays", "minimumSurveyScore", "suppressions", "ownerRoleKey", "status", "lastEvaluatedAt", "nextAction")
VALUES
  ('rep_rule_post_visit_hygiene', 'tenant_1dentalai_production', 'Hygiene post-visit review request', 'COMPLETED_APPOINTMENT', 'Hygiene', 'SMS', 'SMART_LINK', 4, 90, 8, '{"blockIfBalanceQuestion":true,"blockIfOpenRecovery":true,"blockIfUnsignedClinicalNote":true,"blockIfNoConsent":true}'::jsonb, 'marketing_growth', 'ACTIVE', CURRENT_TIMESTAMP - interval '45 minutes', 'Evaluate completed hygiene appointments and stage requests only for consented patients without service-recovery or billing holds.'),
  ('rep_rule_implant_testimonial', 'tenant_1dentalai_production', 'Implant testimonial request after accepted treatment', 'TREATMENT_PLAN_ACCEPTED', 'Implants', 'EMAIL', 'GOOGLE_BUSINESS_PROFILE', 72, 180, 9, '{"blockIfFinancingPending":true,"blockIfPriorAuthOpen":true,"blockIfOpenRecovery":true}'::jsonb, 'marketing_growth', 'ACTIVE', CURRENT_TIMESTAMP - interval '2 hours', 'Stage testimonial request after treatment coordinator confirms satisfaction and financial clearance.'),
  ('rep_rule_billing_suppression', 'tenant_1dentalai_production', 'Billing concern suppression', 'LOW_SURVEY_OR_PHONE_SENTIMENT', null, 'SMS', 'NONE', 0, 30, null, '{"blockPublicReviewAsk":true,"createRecoveryCase":true,"routeToOwnerRole":"practice_manager"}'::jsonb, 'practice_manager', 'ACTIVE', CURRENT_TIMESTAMP - interval '15 minutes', 'Suppress public asks and create service recovery when survey or phone sentiment indicates billing confusion.')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "ReputationReferralRequest"
  ("id", "tenantId", "patientId", "sourceReviewId", "requestType", "channel", "status", "offerSummary", "messageDraft", "consentStatus", "conversionStatus", "dueAt")
VALUES
  ('rep_referral_hygiene_ready', 'tenant_1dentalai_production', 'pat_sample_005', 'rep_workflow_review_ready', 'REFERRAL', 'SMS', 'READY_FOR_APPROVAL', 'Invite a friend for a new-patient exam; no discount language until compliance approval.', 'Thank you for trusting our team. If a friend or family member is looking for a dentist, we would be honored to help them too. Reply and we can share a simple scheduling link.', 'CONSENTED', 'NOT_SENT', CURRENT_TIMESTAMP + interval '1 day'),
  ('rep_testimonial_implant_hold', 'tenant_1dentalai_production', 'pat_sample_004', null, 'TESTIMONIAL', 'EMAIL', 'BLOCKED_TREATMENT_NOT_COMPLETE', 'Potential implant story for future campaign after care milestone is complete.', 'When your implant treatment reaches the right milestone, we would love to ask about your experience and whether you would be open to sharing it.', 'CONSENTED', 'NOT_SENT', CURRENT_TIMESTAMP + interval '30 days')
ON CONFLICT ("id") DO NOTHING;
