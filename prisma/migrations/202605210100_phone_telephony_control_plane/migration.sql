CREATE TABLE IF NOT EXISTS "PhoneNumber" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "locationId" TEXT,
  "phoneNumber" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "numberType" TEXT NOT NULL DEFAULT 'MAIN',
  "provider" TEXT,
  "portStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  "e911Status" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
  "smsStatus" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
  "voiceStatus" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
  "recordingPolicy" TEXT NOT NULL DEFAULT 'CONSENT_REQUIRED',
  "defaultRouteId" TEXT,
  "emergencyRoute" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SETUP_REQUIRED',
  "lastVerifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhoneNumber_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PhoneNumber_tenantId_phoneNumber_key" ON "PhoneNumber"("tenantId", "phoneNumber");
CREATE INDEX IF NOT EXISTS "PhoneNumber_tenantId_status_idx" ON "PhoneNumber"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "PhoneNumber_locationId_numberType_idx" ON "PhoneNumber"("locationId", "numberType");

CREATE TABLE IF NOT EXISTS "PhoneExtension" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "locationId" TEXT,
  "extensionNumber" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "ownerRoleKey" TEXT NOT NULL,
  "extensionType" TEXT NOT NULL DEFAULT 'USER',
  "voicemailEnabled" BOOLEAN NOT NULL DEFAULT true,
  "directDialNumberId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhoneExtension_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PhoneExtension_tenantId_extensionNumber_key" ON "PhoneExtension"("tenantId", "extensionNumber");
CREATE INDEX IF NOT EXISTS "PhoneExtension_tenantId_ownerRoleKey_status_idx" ON "PhoneExtension"("tenantId", "ownerRoleKey", "status");

CREATE TABLE IF NOT EXISTS "PhoneDevice" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "locationId" TEXT,
  "extensionId" TEXT,
  "deviceType" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "manufacturer" TEXT,
  "model" TEXT,
  "macAddress" TEXT,
  "sipUsername" TEXT,
  "provisioningStatus" TEXT NOT NULL DEFAULT 'NOT_PROVISIONED',
  "registrationStatus" TEXT NOT NULL DEFAULT 'OFFLINE',
  "lastSeenAt" TIMESTAMP(3),
  "assignedTo" TEXT,
  "deskLocation" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhoneDevice_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PhoneDevice_tenantId_provisioningStatus_registrationStatus_idx" ON "PhoneDevice"("tenantId", "provisioningStatus", "registrationStatus");
CREATE INDEX IF NOT EXISTS "PhoneDevice_extensionId_idx" ON "PhoneDevice"("extensionId");
CREATE INDEX IF NOT EXISTS "PhoneDevice_locationId_deviceType_idx" ON "PhoneDevice"("locationId", "deviceType");

CREATE TABLE IF NOT EXISTS "PhoneProviderConnection" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "providerType" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "trunkDomain" TEXT,
  "outboundCallerId" TEXT,
  "credentialStatus" TEXT NOT NULL DEFAULT 'MISSING',
  "webhookStatus" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
  "e911Status" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
  "status" TEXT NOT NULL DEFAULT 'SETUP_REQUIRED',
  "capabilityMap" JSONB,
  "lastSmokeTestAt" TIMESTAMP(3),
  "nextAction" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhoneProviderConnection_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PhoneProviderConnection_tenantId_status_providerType_idx" ON "PhoneProviderConnection"("tenantId", "status", "providerType");

CREATE TABLE IF NOT EXISTS "PhoneActiveCall" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "conversationId" TEXT,
  "phoneNumberId" TEXT,
  "fromNumber" TEXT NOT NULL,
  "toNumber" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "callState" TEXT NOT NULL DEFAULT 'RINGING',
  "currentExtensionId" TEXT,
  "parkedSlot" TEXT,
  "holdStartedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "providerCallId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhoneActiveCall_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PhoneActiveCall_tenantId_callState_startedAt_idx" ON "PhoneActiveCall"("tenantId", "callState", "startedAt");
CREATE INDEX IF NOT EXISTS "PhoneActiveCall_conversationId_idx" ON "PhoneActiveCall"("conversationId");
CREATE INDEX IF NOT EXISTS "PhoneActiveCall_currentExtensionId_idx" ON "PhoneActiveCall"("currentExtensionId");

CREATE TABLE IF NOT EXISTS "PhoneCallControlAction" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "activeCallId" TEXT,
  "conversationId" TEXT,
  "actionType" TEXT NOT NULL,
  "requestedByRole" TEXT NOT NULL DEFAULT 'front_desk',
  "targetExtensionId" TEXT,
  "targetNumber" TEXT,
  "targetParkSlot" TEXT,
  "providerStatus" TEXT NOT NULL DEFAULT 'CONNECTOR_REQUIRED',
  "blockedReason" TEXT,
  "resultSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhoneCallControlAction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PhoneCallControlAction_tenantId_actionType_providerStatus_idx" ON "PhoneCallControlAction"("tenantId", "actionType", "providerStatus");
CREATE INDEX IF NOT EXISTS "PhoneCallControlAction_activeCallId_idx" ON "PhoneCallControlAction"("activeCallId");
CREATE INDEX IF NOT EXISTS "PhoneCallControlAction_conversationId_idx" ON "PhoneCallControlAction"("conversationId");

CREATE TABLE IF NOT EXISTS "PhoneVoicemail" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "conversationId" TEXT,
  "extensionId" TEXT,
  "phoneNumberId" TEXT,
  "callerNumber" TEXT,
  "callerName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "durationSeconds" INTEGER,
  "transcription" TEXT,
  "recordingUrl" TEXT,
  "ownerRoleKey" TEXT NOT NULL DEFAULT 'front_desk',
  "dueAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhoneVoicemail_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PhoneVoicemail_tenantId_status_dueAt_idx" ON "PhoneVoicemail"("tenantId", "status", "dueAt");
CREATE INDEX IF NOT EXISTS "PhoneVoicemail_extensionId_status_idx" ON "PhoneVoicemail"("extensionId", "status");
CREATE INDEX IF NOT EXISTS "PhoneVoicemail_conversationId_idx" ON "PhoneVoicemail"("conversationId");

INSERT INTO "PhoneProviderConnection" ("id", "tenantId", "providerType", "name", "trunkDomain", "outboundCallerId", "credentialStatus", "webhookStatus", "e911Status", "status", "capabilityMap", "nextAction")
VALUES
  ('phone_provider_primary_sip', 'tenant_1dentalai_production', 'SIP_TRUNK_OR_VOIP', 'Primary voice carrier', null, '(303) 555-0100', 'MISSING', 'NOT_CONFIGURED', 'NEEDS_VALIDATION', 'SETUP_REQUIRED', '{"inboundCalls":false,"outboundCalls":false,"hold":false,"warmTransfer":false,"blindTransfer":false,"callPark":false,"recording":false,"voicemailTranscription":false,"sms":false,"e911":false,"deskPhoneProvisioning":false,"softphone":false}'::jsonb, 'Select SIP/VoIP carrier, store credentials in the vault, validate E911, configure webhooks, and run smoke tests before live dialing.'),
  ('phone_provider_physical_devices', 'tenant_1dentalai_production', 'DEVICE_PROVISIONING', 'Desk phone and softphone provisioning', null, null, 'MISSING', 'NOT_CONFIGURED', 'NOT_APPLICABLE', 'SETUP_REQUIRED', '{"yealink":true,"poly":true,"grandstream":true,"softphone":true,"mobileApp":true,"zeroTouchProvisioning":false}'::jsonb, 'Choose supported desk phone models, assign extensions, provision SIP credentials, and confirm registrations.')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "PhoneExtension" ("id", "tenantId", "locationId", "extensionNumber", "displayName", "ownerRoleKey", "extensionType", "voicemailEnabled", "status")
VALUES
  ('phone_ext_100_front', 'tenant_1dentalai_production', 'loc_primary', '100', 'Front desk main', 'front_desk', 'USER', true, 'ACTIVE'),
  ('phone_ext_110_billing', 'tenant_1dentalai_production', 'loc_primary', '110', 'Billing and insurance', 'billing_rcm', 'QUEUE', true, 'ACTIVE'),
  ('phone_ext_120_clinical', 'tenant_1dentalai_production', 'loc_primary', '120', 'Clinical triage', 'associate_provider', 'RING_GROUP', true, 'ACTIVE'),
  ('phone_ext_199_ai', 'tenant_1dentalai_production', 'loc_primary', '199', 'AI receptionist fallback', 'front_desk', 'AI_AGENT', false, 'SETUP_REQUIRED')
ON CONFLICT ("tenantId", "extensionNumber") DO NOTHING;

INSERT INTO "PhoneNumber" ("id", "tenantId", "locationId", "phoneNumber", "label", "numberType", "provider", "portStatus", "e911Status", "smsStatus", "voiceStatus", "recordingPolicy", "defaultRouteId", "emergencyRoute", "status")
VALUES
  ('phone_number_main_denver', 'tenant_1dentalai_production', 'loc_primary', '(303) 555-0100', 'Denver main office', 'MAIN', 'Primary voice carrier', 'READY_TO_PORT', 'NEEDS_VALIDATION', 'NOT_CONFIGURED', 'NOT_CONFIGURED', 'CONSENT_REQUIRED', 'phone_route_new_patient', 'phone_route_emergency', 'SETUP_REQUIRED'),
  ('phone_number_marketing_implant', 'tenant_1dentalai_production', 'loc_primary', '(303) 555-0144', 'Implant campaign tracking', 'TRACKING', 'Primary voice carrier', 'NOT_STARTED', 'NEEDS_VALIDATION', 'NOT_CONFIGURED', 'NOT_CONFIGURED', 'CONSENT_REQUIRED', 'phone_route_new_patient', 'phone_route_emergency', 'SETUP_REQUIRED')
ON CONFLICT ("tenantId", "phoneNumber") DO NOTHING;

INSERT INTO "PhoneDevice" ("id", "tenantId", "locationId", "extensionId", "deviceType", "label", "manufacturer", "model", "macAddress", "sipUsername", "provisioningStatus", "registrationStatus", "assignedTo", "deskLocation")
VALUES
  ('phone_device_front_desk_yealink', 'tenant_1dentalai_production', 'loc_primary', 'phone_ext_100_front', 'DESK_PHONE', 'Front desk desk phone', 'Yealink', 'T54W', null, 'sip_100_front', 'NEEDS_MAC_ADDRESS', 'OFFLINE', 'Front desk team', 'Reception desk'),
  ('phone_device_billing_softphone', 'tenant_1dentalai_production', 'loc_primary', 'phone_ext_110_billing', 'SOFTPHONE', 'Billing browser softphone', '1DentalAI', 'WebRTC softphone', null, 'sip_110_billing', 'CREDENTIALS_REQUIRED', 'OFFLINE', 'Billing team', 'Billing office'),
  ('phone_device_clinical_poly', 'tenant_1dentalai_production', 'loc_primary', 'phone_ext_120_clinical', 'DESK_PHONE', 'Clinical triage phone', 'Poly', 'VVX 450', null, 'sip_120_clinical', 'NEEDS_MAC_ADDRESS', 'OFFLINE', 'Clinical team', 'Sterilization hallway')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "PhoneActiveCall" ("id", "tenantId", "conversationId", "phoneNumberId", "fromNumber", "toNumber", "direction", "callState", "currentExtensionId", "parkedSlot", "holdStartedAt", "providerCallId")
VALUES
  ('phone_active_implant_missed_recovery', 'tenant_1dentalai_production', 'phone_conv_missed_implant', 'phone_number_main_denver', '(303) 555-4410', '(303) 555-0100', 'INBOUND', 'NEEDS_CALLBACK', 'phone_ext_100_front', null, null, null),
  ('phone_active_balance_hold', 'tenant_1dentalai_production', 'phone_conv_balance', 'phone_number_main_denver', '(303) 555-1266', '(303) 555-0100', 'INBOUND', 'ON_HOLD_REVIEW', 'phone_ext_110_billing', null, CURRENT_TIMESTAMP - interval '4 minutes', null)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "PhoneCallControlAction" ("id", "tenantId", "activeCallId", "conversationId", "actionType", "requestedByRole", "targetExtensionId", "targetNumber", "targetParkSlot", "providerStatus", "blockedReason", "resultSummary")
VALUES
  ('phone_ctrl_callback_implant', 'tenant_1dentalai_production', 'phone_active_implant_missed_recovery', 'phone_conv_missed_implant', 'OUTBOUND_DIAL', 'front_desk', 'phone_ext_100_front', '(303) 555-4410', null, 'CONNECTOR_REQUIRED', 'Outbound voice requires live SIP/WebRTC provider credentials and caller ID validation.', 'Ready to place callback once provider smoke test passes.'),
  ('phone_ctrl_hold_balance', 'tenant_1dentalai_production', 'phone_active_balance_hold', 'phone_conv_balance', 'HOLD', 'billing_rcm', 'phone_ext_110_billing', null, null, 'CONNECTOR_REQUIRED', 'Hold/remote call control requires provider call-control API or PBX event socket.', 'Internal hold state recorded; provider execution is blocked until carrier is connected.'),
  ('phone_ctrl_transfer_clinical', 'tenant_1dentalai_production', null, null, 'WARM_TRANSFER', 'front_desk', 'phone_ext_120_clinical', null, null, 'CONNECTOR_REQUIRED', 'Warm transfer requires active provider call leg.', 'Transfer path configured to clinical triage extension.'),
  ('phone_ctrl_park_front', 'tenant_1dentalai_production', null, null, 'CALL_PARK', 'front_desk', null, null, '701', 'CONNECTOR_REQUIRED', 'Call park requires PBX parking-lot support and BLF key provisioning.', 'Park slot 701 reserved for front-desk handoffs.')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "PhoneVoicemail" ("id", "tenantId", "conversationId", "extensionId", "phoneNumberId", "callerNumber", "callerName", "status", "durationSeconds", "transcription", "recordingUrl", "ownerRoleKey", "dueAt")
VALUES
  ('phone_vm_implant_lead', 'tenant_1dentalai_production', 'phone_conv_missed_implant', 'phone_ext_100_front', 'phone_number_main_denver', '(303) 555-4410', 'Maya Patel', 'NEW', 46, 'Hi, I am calling about implant consultation pricing and financing. Please call me back today if possible.', null, 'front_desk', CURRENT_TIMESTAMP + interval '20 minutes'),
  ('phone_vm_emergency_after_hours', 'tenant_1dentalai_production', null, 'phone_ext_120_clinical', 'phone_number_main_denver', '(303) 555-2209', 'Unknown caller', 'TRIAGE_REQUIRED', 38, 'Patient reports swelling and pain after hours. Needs emergency routing review before automated advice.', null, 'associate_provider', CURRENT_TIMESTAMP + interval '10 minutes')
ON CONFLICT ("id") DO NOTHING;
