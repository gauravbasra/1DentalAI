insert into "PhoneNumber"
  ("id", "tenantId", "locationId", "phoneNumber", "label", "numberType", "provider", "portStatus", "e911Status", "smsStatus", "voiceStatus", "recordingPolicy", "defaultRouteId", "emergencyRoute", "status", "lastVerifiedAt")
values
  ('phone_number_twilio_8336870987', 'tenant_1dentalai_production', 'loc_primary', '+18336870987', '1DentalAI patient engagement main line', 'MAIN', 'TWILIO', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'CONSENT_REQUIRED', 'phone_route_new_patient', 'phone_route_emergency', 'ACTIVE', current_timestamp)
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

update "PhoneProviderConnection"
set "name" = 'Twilio patient engagement carrier',
  "providerType" = 'TWILIO',
  "outboundCallerId" = '+18336870987',
  "credentialStatus" = 'VALIDATED',
  "webhookStatus" = 'CONFIGURED',
  "e911Status" = 'ACTIVE',
  "status" = 'ACTIVE',
  "capabilityMap" = jsonb_build_object(
    'inboundCalls', true,
    'outboundCalls', true,
    'hold', true,
    'warmTransfer', true,
    'blindTransfer', true,
    'callPark', false,
    'recording', true,
    'voicemailTranscription', true,
    'sms', true,
    'e911', true,
    'deskPhoneProvisioning', false,
    'softphone', true
  ),
  "lastSmokeTestAt" = current_timestamp,
  "nextAction" = 'Twilio number is active for patient engagement SMS and voice. Continue A2P/brand monitoring, webhook smoke tests, and per-practice number onboarding.',
  "updatedAt" = current_timestamp
where "id" = 'phone_provider_primary_sip'
  and "tenantId" = 'tenant_1dentalai_production';
