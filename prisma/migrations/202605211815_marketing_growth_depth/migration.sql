UPDATE "MarketingCampaign"
SET
  "channelPlan" = coalesce("channelPlan", '{}'::jsonb) || jsonb_build_object(
    'pmsRcmReputationAudienceBuilder', case
      when "campaignType" in ('UNSCHEDULED_TREATMENT','IMPLANTS','CLEAR_ALIGNERS') then '{"pms":"presented or accepted treatment without future appointment","rcm":"benefits/financing sensitivity checked","reputation":"no open recovery case","suppressions":["no verified consent","channel opt-out","quiet hours","service recovery hold","unresolved billing dispute","recent duplicate outreach"],"refreshCadence":"Recount from PMS/RCM/reputation graph before each approval review"}'::jsonb
      when "campaignType" in ('RECALL_REACTIVATION','INACTIVE_PATIENTS','FAILED_APPOINTMENTS') then '{"pms":"recall, no-show/cancel, and inactive-patient cohorts","rcm":"exclude unresolved billing disputes","reputation":"exclude low-survey and service-recovery holds","suppressions":["no verified consent","channel opt-out","quiet hours","service recovery hold","unresolved billing dispute","recent duplicate outreach"],"refreshCadence":"Recount from PMS/RCM/reputation graph before each approval review"}'::jsonb
      when "campaignType" = 'BALANCE_FOLLOW_UP' then '{"pms":"active patient and appointment context","rcm":"patient-due balance with claim/ERA context","reputation":"public review asks suppressed during balance sensitivity","suppressions":["no verified consent","channel opt-out","quiet hours","service recovery hold","active billing dispute","recent duplicate outreach"],"refreshCadence":"Recount from PMS/RCM/reputation graph before each approval review"}'::jsonb
      else '{"pms":"appointment, patient, treatment, provider, and location context","rcm":"balance, payer, benefits, financing, and claim sensitivity","reputation":"review, survey, referral, listing, and service recovery context","suppressions":["no verified consent","channel opt-out","quiet hours","service recovery hold","unresolved billing dispute","recent duplicate outreach"],"refreshCadence":"Recount from PMS/RCM/reputation graph before each approval review"}'::jsonb
    end,
    'approvalWorkflow', jsonb_build_object(
      'requiredRoles', case when "campaignType" in ('IMPLANTS','CLEAR_ALIGNERS','WHITENING','LOCAL_SEO','AI_SEO') then jsonb_build_array('marketing_growth','practice_manager','provider') else jsonb_build_array('marketing_growth','practice_manager') end,
      'evidence', jsonb_build_array('audience count snapshot','suppression report','AI Studio draft approval','connector readiness','landing page route test','attribution plan'),
      'externalExecutionBlockedWithoutConnector', true,
      'noFakeSendOrPublishing', true
    )
  ),
  "connectorReadiness" = coalesce("connectorReadiness", '{}'::jsonb) || '{"gbp":"CONNECTOR_REQUIRED","aiSearchContent":"READY_FOR_APPROVAL"}'::jsonb,
  "attribution" = coalesce("attribution", '{}'::jsonb) || jsonb_build_object(
    'firstTouch', case when "landingPageId" is not null then 'landing page UTM or booking route' else 'campaign audience snapshot' end,
    'conversionEvents', jsonb_build_array('lead form','phone call','online booking','PMS appointment completed','treatment accepted','ledger production posted'),
    'revenueSourceOfTruth', 'PMS appointment, treatment plan, ledger, and claim/payment records'
  ),
  "blockedReason" = coalesce("blockedReason", 'External activation blocked until PMS/RCM/reputation audience validation, consent checks, approval, and channel connectors are ready.'),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "tenantId" = 'tenant_1dentalai_production';

UPDATE "MarketingLandingPage"
SET
  "trackingPlan" = coalesce("trackingPlan", '{}'::jsonb) || '{"schemaPlan":"LocalBusiness, Dentist, Service, FAQ, and conversion event schema staged for review","aiSeoGrounding":"Provider, location, services, reviews, booking route, and PMS availability context","callTracking":"connector_required","formTracking":"staged","bookingTracking":"pms_booking_route"}'::jsonb,
  "formMapping" = coalesce("formMapping", '{}'::jsonb) || '{"sourceListing":"localSeo.sourceListing","utmCampaign":"attribution.utmCampaign","bookingReason":"pms.appointmentCategory","providerPreference":"booking.providerId"}'::jsonb,
  "bookingRouting" = coalesce("bookingRouting", 'Route form, phone tracking number, and booking CTA into PMS online scheduling plus CRM lead queue; no lead is marked booked until a PMS appointment exists.'),
  "attribution" = coalesce("attribution", '{}'::jsonb) || '{"formLeads":0,"phoneLeads":0,"bookedAppointments":0,"acceptedTreatmentCents":0,"productionCents":0,"collectionCents":0,"sourceOfTruth":"PMS appointment and ledger"}'::jsonb,
  "connectorStatus" = case when "status" = 'APPROVED_STAGED' then 'STAGED' else "connectorStatus" end,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "tenantId" = 'tenant_1dentalai_production';

UPDATE "AiStudioAsset"
SET
  "sourceData" = coalesce("sourceData", '{}'::jsonb) || jsonb_build_object(
    'approvalRequired', true,
    'publishingBlockedWithoutConnector', true,
    'groundingSources', jsonb_build_array('PMS service/provider/location data','RCM sensitivity','reputation recovery status','landing page route','connector readiness')
  ),
  "reviewerRoleKey" = coalesce("reviewerRoleKey", case when "assetType" in ('LANDING_PAGE_COPY','AI_SEO_CONTENT','GBP_POST','REVIEW_RESPONSE') then 'marketing_growth' else "ownerRoleKey" end),
  "useTarget" = coalesce("useTarget", case when "assetType" = 'LANDING_PAGE_COPY' then 'Landing page and AI search answer draft' else "assetType" end),
  "approvalNotes" = coalesce("approvalNotes", "complianceNotes", 'Human approval required before external publication or delivery.'),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "tenantId" = 'tenant_1dentalai_production';

INSERT INTO "MarketingLocalSeoTask"
  ("id", "tenantId", "locationId", "sourceListingId", "taskType", "title", "status", "priority", "platform", "serviceLine", "issueSummary", "nextAction", "connectorStatus", "dueAt")
VALUES
  ('seo_task_ai_implant_answer', 'tenant_1dentalai_production', 'loc_primary', 'lp_implants_denver', 'AI_SEO', 'Ground implant AI search answer with approved page and reviews', 'OPEN', 'HIGH', 'AI_SEARCH', 'Implants', 'AI search answer needs provider-approved claims, review themes, schema, PMS booking route, and attribution tagging before publication.', 'Approve AI Studio brief, attach provider/location evidence, validate landing-page route to PMS booking, then stage content for connector/manual proof.', 'CONNECTOR_REQUIRED', CURRENT_TIMESTAMP + interval '18 hours'),
  ('seo_task_service_schema_review', 'tenant_1dentalai_production', 'loc_primary', 'lp_emergency_dentist', 'SCHEMA', 'Validate emergency service schema and booking attribution', 'READY_FOR_APPROVAL', 'NORMAL', 'WEBSITE', 'Emergency', 'Emergency page has staged publication, but schema, call tracking, and booked-appointment attribution need approval evidence.', 'Review LocalBusiness/Service schema, confirm booking route, and keep publication staged until connector acknowledgement or owner proof is attached.', 'STAGED', CURRENT_TIMESTAMP + interval '1 day')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "AiStudioAsset"
  ("id", "tenantId", "sourceModule", "sourceRecordId", "assetType", "title", "promptInput", "generatedDraft", "status", "approvalStatus", "complianceNotes", "ownerRoleKey", "brief", "sourceData", "reviewerRoleKey", "revisionState", "useTarget", "approvalNotes")
VALUES
  (
    'ai_asset_implant_ai_seo',
    'tenant_1dentalai_production',
    'MARKETING',
    'lp_implants_denver',
    'AI_SEO_CONTENT',
    'Implant AI search answer brief',
    'Create a grounded AI search answer for implant consultations using only approved provider, location, financing, imaging, and booking-route facts.',
    'Dental implant consultations should start with a provider-reviewed exam, health history, imaging plan, and a clear discussion of timing and financial options. Book a consultation route that creates a PMS appointment before revenue is attributed.',
    'DRAFT',
    'NEEDS_REVIEW',
    'Provider review required; no treatment guarantee, no clinical outcome promise, and no publication without connector/manual proof.',
    'marketing_growth',
    'Ground AI SEO content in approved landing page, PMS service data, review themes, and booking attribution.',
    '{"sourceModule":"MarketingLandingPage","sourceRecordId":"lp_implants_denver","approvalRequired":true,"publishingBlockedWithoutConnector":true,"groundingSources":["PMS provider/location/service data","approved landing page","review themes","booking route","attribution plan"]}'::jsonb,
    'marketing_growth',
    'NO_REVISION',
    'AI search answer and landing page FAQ',
    'Needs marketing, provider, and manager approval before publication.'
  )
ON CONFLICT ("id") DO NOTHING;
