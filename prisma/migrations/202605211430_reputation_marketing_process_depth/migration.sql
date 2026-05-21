ALTER TABLE "ReputationReviewWorkflow"
  ADD COLUMN IF NOT EXISTS "eligibilitySummary" JSONB,
  ADD COLUMN IF NOT EXISTS "suppressionReasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "privateSurveyRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "connectorStatus" TEXT NOT NULL DEFAULT 'CONNECTOR_REQUIRED',
  ADD COLUMN IF NOT EXISTS "blockedReason" TEXT;

ALTER TABLE "PatientSurvey"
  ADD COLUMN IF NOT EXISTS "connectorStatus" TEXT NOT NULL DEFAULT 'CONNECTOR_REQUIRED',
  ADD COLUMN IF NOT EXISTS "blockedReason" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceObjectType" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceObjectId" TEXT;

ALTER TABLE "ReputationListingProfile"
  ADD COLUMN IF NOT EXISTS "napConsistencyStatus" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
  ADD COLUMN IF NOT EXISTS "profileCompleteness" JSONB,
  ADD COLUMN IF NOT EXISTS "syncReadiness" JSONB,
  ADD COLUMN IF NOT EXISTS "ownerAction" TEXT;

ALTER TABLE "ReputationReviewResponse"
  ADD COLUMN IF NOT EXISTS "hipaaGuardrails" JSONB,
  ADD COLUMN IF NOT EXISTS "sourceSiteStatus" TEXT NOT NULL DEFAULT 'CONNECTOR_REQUIRED';

ALTER TABLE "ReputationReferralRequest"
  ADD COLUMN IF NOT EXISTS "complianceText" TEXT,
  ADD COLUMN IF NOT EXISTS "bookingAttributionStatus" TEXT NOT NULL DEFAULT 'NOT_ATTRIBUTED',
  ADD COLUMN IF NOT EXISTS "attribution" JSONB,
  ADD COLUMN IF NOT EXISTS "connectorStatus" TEXT NOT NULL DEFAULT 'CONNECTOR_REQUIRED',
  ADD COLUMN IF NOT EXISTS "blockedReason" TEXT;

ALTER TABLE "MarketingCampaign"
  ADD COLUMN IF NOT EXISTS "sourceAudience" TEXT NOT NULL DEFAULT 'PMS',
  ADD COLUMN IF NOT EXISTS "channelPlan" JSONB,
  ADD COLUMN IF NOT EXISTS "connectorReadiness" JSONB,
  ADD COLUMN IF NOT EXISTS "attribution" JSONB,
  ADD COLUMN IF NOT EXISTS "blockedReason" TEXT;

ALTER TABLE "MarketingLandingPage"
  ADD COLUMN IF NOT EXISTS "providerId" TEXT,
  ADD COLUMN IF NOT EXISTS "locationId" TEXT,
  ADD COLUMN IF NOT EXISTS "trackingPlan" JSONB,
  ADD COLUMN IF NOT EXISTS "formMapping" JSONB,
  ADD COLUMN IF NOT EXISTS "bookingRouting" TEXT,
  ADD COLUMN IF NOT EXISTS "attribution" JSONB,
  ADD COLUMN IF NOT EXISTS "connectorStatus" TEXT NOT NULL DEFAULT 'CONNECTOR_REQUIRED';

ALTER TABLE "AiStudioAsset"
  ADD COLUMN IF NOT EXISTS "brief" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceData" JSONB,
  ADD COLUMN IF NOT EXISTS "reviewerRoleKey" TEXT,
  ADD COLUMN IF NOT EXISTS "revisionState" TEXT NOT NULL DEFAULT 'NO_REVISION',
  ADD COLUMN IF NOT EXISTS "useTarget" TEXT,
  ADD COLUMN IF NOT EXISTS "approvalNotes" TEXT;

CREATE TABLE IF NOT EXISTS "MarketingLocalSeoTask" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "locationId" TEXT,
  "sourceListingId" TEXT,
  "taskType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "platform" TEXT,
  "serviceLine" TEXT,
  "issueSummary" TEXT NOT NULL,
  "nextAction" TEXT NOT NULL,
  "connectorStatus" TEXT NOT NULL DEFAULT 'CONNECTOR_REQUIRED',
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingLocalSeoTask_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MarketingLocalSeoTask_tenantId_status_dueAt_idx" ON "MarketingLocalSeoTask"("tenantId", "status", "dueAt");
CREATE INDEX IF NOT EXISTS "MarketingLocalSeoTask_locationId_taskType_idx" ON "MarketingLocalSeoTask"("locationId", "taskType");

UPDATE "ReputationReviewWorkflow"
SET
  "eligibilitySummary" = coalesce("eligibilitySummary", jsonb_build_object(
    'source', 'PMS completed visit or imported review',
    'requiredChecks', jsonb_build_array('completed visit', 'consent', 'quiet hours', 'recovery hold', 'billing dispute', 'clinical incident', 'duplicate cooldown', 'patient preference')
  )),
  "suppressionReasons" = case
    when "requestStatus" like 'BLOCKED%' and cardinality("suppressionReasons") = 0 then ARRAY[coalesce("responseDraft", 'Existing workflow requires suppression review')]
    else "suppressionReasons"
  end,
  "privateSurveyRequired" = case when "recoveryStatus" in ('REQUIRED','OPEN') or "sentiment" in ('NEGATIVE','FRUSTRATED') then true else "privateSurveyRequired" end,
  "connectorStatus" = case when "requestStatus" in ('READY_FOR_APPROVAL','APPROVED_STAGED') then 'READY_FOR_CONNECTOR' else 'CONNECTOR_REQUIRED' end,
  "blockedReason" = case when "requestStatus" like 'BLOCKED%' then coalesce("blockedReason", "responseDraft", 'Suppression policy blocks public review request.') else "blockedReason" end
WHERE "tenantId" = 'tenant_1dentalai_production';

UPDATE "PatientSurvey"
SET
  "connectorStatus" = 'CONNECTOR_REQUIRED',
  "blockedReason" = case when "status" in ('READY_FOR_APPROVAL','DRAFT') then 'Survey delivery connector and consent validation required before sending.' else "blockedReason" end,
  "sourceObjectType" = coalesce("sourceObjectType", case when "appointmentId" is not null then 'PmsAppointment' else 'ServiceRecovery' end),
  "sourceObjectId" = coalesce("sourceObjectId", "appointmentId")
WHERE "tenantId" = 'tenant_1dentalai_production';

UPDATE "ReputationListingProfile"
SET
  "napConsistencyStatus" = case when "syncStatus" = 'DATA_MISMATCH' then 'MISMATCH' when "syncStatus" = 'NEEDS_CONNECTION' then 'UNVERIFIED' else 'CONSISTENT' end,
  "profileCompleteness" = coalesce("profileCompleteness", jsonb_build_object(
    'name', "nameOnListing" is not null,
    'address', "addressOnListing" is not null,
    'phone', "phoneOnListing" is not null,
    'hours', "hoursJson" is not null,
    'categories', "categoryJson" is not null
  )),
  "syncReadiness" = coalesce("syncReadiness", jsonb_build_object(
    'profileConnected', "syncStatus" like 'CONNECTED%',
    'napConsistent', "syncStatus" <> 'DATA_MISMATCH',
    'connectorStatus', case when "syncStatus" like 'CONNECTED%' then 'READY_FOR_SYNC' else 'CONNECTOR_REQUIRED' end
  )),
  "ownerAction" = coalesce("ownerAction", "nextAction")
WHERE "tenantId" = 'tenant_1dentalai_production';

UPDATE "ReputationReviewResponse"
SET
  "hipaaGuardrails" = coalesce("hipaaGuardrails", '{"noPhi":true,"noTreatmentDetails":true,"noDiagnosis":true,"movePrivateDetailsOffline":true,"humanApprovalRequired":true}'::jsonb),
  "sourceSiteStatus" = case when "publicationStatus" = 'BLOCKED_CONNECTOR_REQUIRED' then 'CONNECTOR_REQUIRED' else 'NEEDS_REVIEW' end,
  "blockedReason" = coalesce("blockedReason", 'Public response requires HIPAA guardrail review, human approval, and source connector readiness.')
WHERE "tenantId" = 'tenant_1dentalai_production';

UPDATE "ReputationReferralRequest"
SET
  "complianceText" = coalesce("complianceText", 'Use compliance-approved referral language; no inducement, guarantee, or PHI.'),
  "bookingAttributionStatus" = coalesce("bookingAttributionStatus", 'NOT_ATTRIBUTED'),
  "attribution" = coalesce("attribution", '{"newPatientBookings":0,"acceptedTreatmentCents":0,"source":"manual or booking-link pending"}'::jsonb),
  "connectorStatus" = 'CONNECTOR_REQUIRED',
  "blockedReason" = case when "status" like 'BLOCKED%' then coalesce("blockedReason", "conversionStatus") else "blockedReason" end
WHERE "tenantId" = 'tenant_1dentalai_production';

UPDATE "MarketingCampaign"
SET
  "sourceAudience" = case
    when "campaignType" in ('UNSCHEDULED_TREATMENT','RECALL_REACTIVATION','FAILED_APPOINTMENTS','MEMBERSHIP') then 'PMS'
    when "campaignType" in ('BALANCE_FOLLOW_UP') then 'RCM'
    when "campaignType" in ('REFERRAL_GROWTH') then 'REPUTATION'
    else 'PMS+RCM+REPUTATION'
  end,
  "channelPlan" = coalesce("channelPlan", jsonb_build_object(
    'channels', to_jsonb("channelMix"),
    'checks', jsonb_build_array('consent', 'channel preference', 'quiet hours', 'service recovery hold', 'balance sensitivity', 'approval policy')
  )),
  "connectorReadiness" = coalesce("connectorReadiness", '{"sms":"CONNECTOR_REQUIRED","email":"CONNECTOR_REQUIRED","phone":"CONNECTOR_REQUIRED","landingPage":"STAGED","aiVoice":"CONNECTOR_REQUIRED"}'::jsonb),
  "attribution" = coalesce("attribution", jsonb_build_object(
    'bookedAppointments', "attributedBookings",
    'acceptedTreatmentCents', 0,
    'productionCents', "attributedProductionCents",
    'collectionCents', 0,
    'reviewOutcomes', 0,
    'referralOutcomes', 0
  )),
  "blockedReason" = case when "status" in ('READY_FOR_APPROVAL','APPROVED_STAGED') then coalesce("blockedReason", 'External delivery is staged until channel connectors, consent checks, and human approval are complete.') else "blockedReason" end
WHERE "tenantId" = 'tenant_1dentalai_production';

UPDATE "MarketingLandingPage"
SET
  "locationId" = coalesce("locationId", 'loc_primary'),
  "trackingPlan" = coalesce("trackingPlan", '{"utmSource":"1dentalai","utmMedium":"campaign","callTracking":"connector_required","formTracking":"staged","bookingTracking":"pms_booking_route"}'::jsonb),
  "formMapping" = coalesce("formMapping", '{"name":"lead.name","phone":"lead.phone","email":"lead.email","service":"lead.serviceLine","preferredTime":"booking.preference"}'::jsonb),
  "bookingRouting" = coalesce("bookingRouting", 'Route form and booking CTA into PMS/CRM lead queue; no lead marked booked until appointment exists.'),
  "attribution" = coalesce("attribution", '{"formLeads":0,"bookedAppointments":0,"productionCents":0,"collectionCents":0}'::jsonb),
  "connectorStatus" = case when "status" = 'APPROVED_STAGED' then 'STAGED' else 'CONNECTOR_REQUIRED' end
WHERE "tenantId" = 'tenant_1dentalai_production';

UPDATE "AiStudioAsset"
SET
  "brief" = coalesce("brief", "promptInput"),
  "sourceData" = coalesce("sourceData", jsonb_build_object('sourceModule', "sourceModule", 'sourceRecordId', "sourceRecordId")),
  "reviewerRoleKey" = coalesce("reviewerRoleKey", case when "assetType" in ('REVIEW_RESPONSE','LANDING_PAGE_COPY') then 'marketing_growth' else "ownerRoleKey" end),
  "revisionState" = case when "approvalStatus" = 'REVISION_REQUIRED' then 'REVISION_REQUESTED' else "revisionState" end,
  "useTarget" = coalesce("useTarget", "assetType"),
  "approvalNotes" = coalesce("approvalNotes", "complianceNotes")
WHERE "tenantId" = 'tenant_1dentalai_production';

INSERT INTO "MarketingLocalSeoTask"
  ("id", "tenantId", "locationId", "sourceListingId", "taskType", "title", "status", "priority", "platform", "serviceLine", "issueSummary", "nextAction", "connectorStatus", "dueAt")
VALUES
  ('seo_task_healthgrades_nap', 'tenant_1dentalai_production', 'loc_primary', 'rep_listing_healthgrades_denver', 'NAP_SYNC', 'Fix Healthgrades phone and hours mismatch', 'OPEN', 'HIGH', 'HEALTHGRADES', 'General dentistry', 'Phone number and Friday hours do not match the PMS location record.', 'Verify location NAP, stage corrected listing fields, and wait for listing connector or manual owner proof.', 'CONNECTOR_REQUIRED', CURRENT_TIMESTAMP + interval '1 day'),
  ('seo_task_implant_service_page', 'tenant_1dentalai_production', 'loc_primary', 'lp_implants_denver', 'LOCATION_PAGE', 'Provider-reviewed implant service page readiness', 'OPEN', 'NORMAL', 'WEBSITE', 'Implants', 'Implant landing page needs provider review, schema plan, tracking, and booking route before publication.', 'Attach provider/location context, approve AI draft, validate booking CTA into PMS, then stage publication.', 'STAGED', CURRENT_TIMESTAMP + interval '2 days'),
  ('seo_task_gbp_post_emergency', 'tenant_1dentalai_production', 'loc_primary', 'lp_emergency_dentist', 'GBP_POST', 'Emergency care GBP post approval', 'READY_FOR_APPROVAL', 'NORMAL', 'GOOGLE_BUSINESS_PROFILE', 'Emergency', 'Post copy is drafted but GBP publication connector is not validated.', 'Review compliance notes and hold publication until GBP connector status is ready.', 'CONNECTOR_REQUIRED', CURRENT_TIMESTAMP + interval '12 hours')
ON CONFLICT ("id") DO NOTHING;
