insert into "PhoneRoutingRule"
  ("id", "tenantId", "locationId", "name", "triggerType", "destinationType", "destination", "priority", "schedule", "status", "failoverAction")
values
  (
    'phone_route_live_front_desk_bridge',
    'tenant_1dentalai_production',
    'loc_primary',
    'Live front desk bridge with AI fallback',
    'ALL_INBOUND_CALLS',
    'PHONE_NUMBER',
    '+17203312926',
    1,
    '{"days":["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],"start":"00:00","end":"23:59"}'::jsonb,
    'ACTIVE',
    'After 3 rings, redirect caller to AI receptionist takeover.'
  )
on conflict ("id") do update
set "destinationType" = excluded."destinationType",
  "destination" = excluded."destination",
  "priority" = excluded."priority",
  "schedule" = excluded."schedule",
  "status" = excluded."status",
  "failoverAction" = excluded."failoverAction",
  "updatedAt" = current_timestamp;

insert into "PhoneNumber"
  ("id", "tenantId", "locationId", "phoneNumber", "label", "numberType", "provider", "portStatus", "e911Status", "smsStatus", "voiceStatus", "recordingPolicy", "defaultRouteId", "emergencyRoute", "status", "lastVerifiedAt")
values
  (
    'phone_number_twilio_7208176102',
    'tenant_1dentalai_production',
    'loc_primary',
    '+17208176102',
    '1DentalAI Denver live practice line',
    'MAIN',
    'TWILIO',
    'ACTIVE',
    'ACTIVE',
    'ACTIVE',
    'ACTIVE',
    'CONSENT_REQUIRED',
    'phone_route_live_front_desk_bridge',
    'phone_route_emergency',
    'ACTIVE',
    current_timestamp
  )
on conflict ("tenantId", "phoneNumber") do update
set "label" = excluded."label",
  "numberType" = excluded."numberType",
  "provider" = excluded."provider",
  "portStatus" = excluded."portStatus",
  "e911Status" = excluded."e911Status",
  "smsStatus" = excluded."smsStatus",
  "voiceStatus" = excluded."voiceStatus",
  "recordingPolicy" = excluded."recordingPolicy",
  "defaultRouteId" = excluded."defaultRouteId",
  "emergencyRoute" = excluded."emergencyRoute",
  "status" = excluded."status",
  "lastVerifiedAt" = current_timestamp,
  "updatedAt" = current_timestamp;

update "PhoneAiReceptionPolicy"
set "ringThreshold" = 3,
  "mode" = 'ASSIST_WHEN_BUSY',
  "voiceSettings" = jsonb_build_object(
    'voice', 'Polly.Joanna-Neural',
    'language', 'en-US',
    'empathy', 'high',
    'interruptionHandling', 'natural',
    'fallbackAfterRings', 3
  ),
  "handoffPolicy" = jsonb_build_object(
    'frontDeskBusy', 'RING_PRACTICE_PHONE_THEN_AI_AFTER_3_RINGS',
    'pricing', 'WARM_TRANSFER_REQUIRED',
    'urgentSymptoms', 'STAFF_OR_EMERGENCY_ESCALATION'
  ),
  "updatedAt" = current_timestamp
where "tenantId" = 'tenant_1dentalai_production'
  and "locationId" is null;

insert into "PhoneAiReceptionPolicy"
  ("id", "tenantId", "locationId", "name", "status", "ringThreshold", "mode", "handoffPolicy", "voiceSettings")
select
  'phone_ai_policy_default',
  'tenant_1dentalai_production',
  null,
  'Default AI backup receptionist',
  'ACTIVE',
  3,
  'ASSIST_WHEN_BUSY',
  '{"frontDeskBusy":"RING_PRACTICE_PHONE_THEN_AI_AFTER_3_RINGS","pricing":"WARM_TRANSFER_REQUIRED","urgentSymptoms":"STAFF_OR_EMERGENCY_ESCALATION"}'::jsonb,
  '{"voice":"Polly.Joanna-Neural","language":"en-US","empathy":"high","interruptionHandling":"natural","fallbackAfterRings":3}'::jsonb
where not exists (
  select 1 from "PhoneAiReceptionPolicy"
  where "tenantId" = 'tenant_1dentalai_production'
    and "locationId" is null
);

update "PhoneProviderConnection"
set "outboundCallerId" = '+17208176102',
  "credentialStatus" = 'VALIDATED',
  "webhookStatus" = 'CONFIGURED',
  "e911Status" = 'ACTIVE',
  "status" = 'ACTIVE',
  "nextAction" = 'Live Twilio line routes inbound calls to the practice bridge first; AI receptionist takes over after 3 rings when the team does not answer.',
  "updatedAt" = current_timestamp
where "id" = 'phone_provider_primary_sip'
  and "tenantId" = 'tenant_1dentalai_production';
