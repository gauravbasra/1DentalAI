create table if not exists "ConnectorDefinition" (
  "id" text primary key,
  "tenantId" text not null,
  "slug" text not null,
  "name" text not null,
  "category" text not null,
  "vendorType" text not null default 'DIRECT_OR_VENDOR',
  "status" text not null default 'AVAILABLE',
  "summary" text not null,
  "dataClasses" text[] not null default '{}',
  "supportedScopes" text[] not null default '{}',
  "setupChecklist" jsonb,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create unique index if not exists "ConnectorDefinition_tenantId_slug_key" on "ConnectorDefinition" ("tenantId", "slug");
create index if not exists "ConnectorDefinition_tenantId_category_status_idx" on "ConnectorDefinition" ("tenantId", "category", "status");

create table if not exists "ConnectorInstallation" (
  "id" text primary key,
  "tenantId" text not null,
  "definitionId" text not null references "ConnectorDefinition"("id") on delete cascade,
  "locationId" text,
  "status" text not null default 'SETUP_REQUIRED',
  "credentialStatus" text not null default 'MISSING',
  "webhookStatus" text not null default 'NOT_CONFIGURED',
  "approvalStatus" text not null default 'NEEDS_APPROVAL',
  "healthStatus" text not null default 'NOT_TESTED',
  "fallbackMode" text not null default 'MANUAL_QUEUE',
  "costPolicy" jsonb,
  "nextAction" text not null,
  "lastHealthyAt" timestamp(3),
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create index if not exists "ConnectorInstallation_tenantId_status_healthStatus_idx" on "ConnectorInstallation" ("tenantId", "status", "healthStatus");
create index if not exists "ConnectorInstallation_definitionId_locationId_idx" on "ConnectorInstallation" ("definitionId", "locationId");

create table if not exists "ConnectorCapability" (
  "id" text primary key,
  "tenantId" text not null,
  "definitionId" text not null references "ConnectorDefinition"("id") on delete cascade,
  "installationId" text references "ConnectorInstallation"("id") on delete set null,
  "capabilityKey" text not null,
  "workflowArea" text not null,
  "direction" text not null,
  "status" text not null default 'NOT_CONFIGURED',
  "supportedTransactions" text[] not null default '{}',
  "requiredFields" text[] not null default '{}',
  "missingFields" text[] not null default '{}',
  "approvalPolicy" jsonb,
  "fallbackPolicy" jsonb,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create index if not exists "ConnectorCapability_tenantId_workflowArea_status_idx" on "ConnectorCapability" ("tenantId", "workflowArea", "status");
create index if not exists "ConnectorCapability_definitionId_capabilityKey_idx" on "ConnectorCapability" ("definitionId", "capabilityKey");

create table if not exists "ConnectorRouteDecision" (
  "id" text primary key,
  "tenantId" text not null,
  "definitionId" text references "ConnectorDefinition"("id") on delete set null,
  "installationId" text references "ConnectorInstallation"("id") on delete set null,
  "workflowArea" text not null,
  "sourceObjectType" text not null,
  "sourceObjectId" text,
  "requestedCapability" text not null,
  "routeStatus" text not null default 'BLOCKED_CONNECTOR_REQUIRED',
  "selectedRoute" text,
  "fallbackRoute" text not null default 'MANUAL_QUEUE',
  "estimatedCostCents" integer not null default 0,
  "blockedReason" text,
  "decisionContext" jsonb,
  "actorRole" text not null default 'system',
  "createdAt" timestamp(3) not null default current_timestamp
);

create index if not exists "ConnectorRouteDecision_tenantId_workflowArea_createdAt_idx" on "ConnectorRouteDecision" ("tenantId", "workflowArea", "createdAt");
create index if not exists "ConnectorRouteDecision_sourceObjectType_sourceObjectId_idx" on "ConnectorRouteDecision" ("sourceObjectType", "sourceObjectId");

create table if not exists "ConnectorHealthCheck" (
  "id" text primary key,
  "tenantId" text not null,
  "definitionId" text not null references "ConnectorDefinition"("id") on delete cascade,
  "installationId" text references "ConnectorInstallation"("id") on delete set null,
  "checkType" text not null,
  "status" text not null,
  "resultSummary" text not null,
  "latencyMs" integer,
  "checkedAt" timestamp(3) not null default current_timestamp
);

create index if not exists "ConnectorHealthCheck_tenantId_status_checkedAt_idx" on "ConnectorHealthCheck" ("tenantId", "status", "checkedAt");
create index if not exists "ConnectorHealthCheck_definitionId_checkType_idx" on "ConnectorHealthCheck" ("definitionId", "checkType");

create table if not exists "ConnectorCostEvent" (
  "id" text primary key,
  "tenantId" text not null,
  "definitionId" text references "ConnectorDefinition"("id") on delete set null,
  "installationId" text references "ConnectorInstallation"("id") on delete set null,
  "workflowArea" text not null,
  "capabilityKey" text not null,
  "sourceObjectType" text,
  "sourceObjectId" text,
  "costCents" integer not null default 0,
  "pricingUnit" text not null,
  "status" text not null default 'ESTIMATED',
  "metadata" jsonb,
  "createdAt" timestamp(3) not null default current_timestamp
);

create index if not exists "ConnectorCostEvent_tenantId_workflowArea_createdAt_idx" on "ConnectorCostEvent" ("tenantId", "workflowArea", "createdAt");
create index if not exists "ConnectorCostEvent_definitionId_capabilityKey_idx" on "ConnectorCostEvent" ("definitionId", "capabilityKey");

insert into "ConnectorDefinition" ("id", "tenantId", "slug", "name", "category", "vendorType", "status", "summary", "dataClasses", "supportedScopes", "setupChecklist")
values
  ('conn_def_pms_open_dental', 'tenant_1dentalai_production', 'pms-open-dental-direct', 'Open Dental direct connector', 'PMS', 'DIRECT', 'AVAILABLE', 'Patients, appointments, providers, operatories, procedure logs, ledger, claims, documents, and writeback jobs through an approved PMS capability map.', array['PHI','CLINICAL','FINANCIAL'], array['patients','appointments','chart','ledger','claims','writeback'], '{"credentialVault":true,"capabilityMap":true,"fieldMapping":true,"writebackApproval":true}'::jsonb),
  ('conn_def_payer_x12', 'tenant_1dentalai_production', 'payer-x12-router', 'Payer X12 router', 'PAYER_CLEARINGHOUSE', 'DIRECT_OR_VENDOR', 'AVAILABLE', 'Eligibility, benefits, 837 claims, 276/277 claim status, 277CA acknowledgements, 835 ERA, attachments, and prior authorization routing.', array['PHI','FINANCIAL','PAYER'], array['270_271','837','276_277','277CA','835','attachments','prior_auth'], '{"tradingPartnerRegistry":true,"payerPolicy":true,"ediEnvelope":true,"manualFallback":true}'::jsonb),
  ('conn_def_phone_carrier', 'tenant_1dentalai_production', 'phone-carrier-control', 'Phone carrier control plane', 'COMMUNICATIONS', 'DIRECT_OR_VENDOR', 'AVAILABLE', 'SIP/WebRTC, call control, phone numbers, SMS registration, voicemail, E911, call recordings, and webhooks.', array['PHI','COMMUNICATIONS'], array['voice','sms','webphone','deskphone','voicemail','call_recording'], '{"numberInventory":true,"e911":true,"smsRegistration":true,"webhookVerification":true}'::jsonb),
  ('conn_def_review_listings', 'tenant_1dentalai_production', 'review-listings-network', 'Review and listings network', 'REPUTATION', 'DIRECT_OR_VENDOR', 'AVAILABLE', 'Review monitoring, response approvals, listing sync, survey routing, referrals, testimonials, and local SEO issue detection.', array['PATIENT_EXPERIENCE','MARKETING'], array['reviews','listings','surveys','referrals','local_seo'], '{"sourceIdentity":true,"hipaaResponseGuardrails":true,"locationOwnership":true,"publicationApproval":true}'::jsonb)
on conflict ("tenantId", "slug") do update set
  "summary" = excluded."summary",
  "setupChecklist" = excluded."setupChecklist",
  "updatedAt" = current_timestamp;

insert into "ConnectorInstallation" ("id", "tenantId", "definitionId", "locationId", "status", "credentialStatus", "webhookStatus", "approvalStatus", "healthStatus", "fallbackMode", "costPolicy", "nextAction")
values
  ('conn_inst_pms_denver', 'tenant_1dentalai_production', 'conn_def_pms_open_dental', 'loc_denver', 'SETUP_REQUIRED', 'MISSING', 'NOT_CONFIGURED', 'NEEDS_APPROVAL', 'NOT_TESTED', 'MANUAL_EXPORT_IMPORT', '{"monthlyBaseCents":0,"perTransactionCents":0,"avoidPerConnectionVendorFees":true}'::jsonb, 'Collect PMS credentials, approve field map, and run read-only patient/schedule smoke test.'),
  ('conn_inst_payer_router', 'tenant_1dentalai_production', 'conn_def_payer_x12', null, 'SETUP_REQUIRED', 'MISSING', 'NOT_CONFIGURED', 'NEEDS_APPROVAL', 'NOT_TESTED', 'MANUAL_PAYER_PORTAL', '{"monthlyBaseCents":0,"perEligibilityCents":15,"perClaimCents":35,"routeByPayerCost":true}'::jsonb, 'Load payer registry, trading partner support, and manual fallback rules before any eligibility or claim route executes.'),
  ('conn_inst_phone_denver', 'tenant_1dentalai_production', 'conn_def_phone_carrier', 'loc_denver', 'SETUP_REQUIRED', 'MISSING', 'NOT_CONFIGURED', 'NEEDS_APPROVAL', 'NOT_TESTED', 'MANUAL_CALL_LOG', '{"monthlyBaseCents":0,"perMinuteCents":2,"perSmsCents":1}'::jsonb, 'Configure trunk, number inventory, E911, SMS registration, recording policy, and call-control webhooks.'),
  ('conn_inst_review_denver', 'tenant_1dentalai_production', 'conn_def_review_listings', 'loc_denver', 'SETUP_REQUIRED', 'MISSING', 'NOT_CONFIGURED', 'NEEDS_APPROVAL', 'NOT_TESTED', 'MANUAL_REVIEW_QUEUE', '{"monthlyBaseCents":0,"perReviewRequestCents":1,"perListingSyncCents":0}'::jsonb, 'Verify listing ownership, review source identity, response approval policy, and HIPAA guardrails.')
on conflict ("id") do update set
  "nextAction" = excluded."nextAction",
  "costPolicy" = excluded."costPolicy",
  "updatedAt" = current_timestamp;

insert into "ConnectorCapability" ("id", "tenantId", "definitionId", "installationId", "capabilityKey", "workflowArea", "direction", "status", "supportedTransactions", "requiredFields", "missingFields", "approvalPolicy", "fallbackPolicy")
values
  ('conn_cap_pms_schedule_read', 'tenant_1dentalai_production', 'conn_def_pms_open_dental', 'conn_inst_pms_denver', 'pms.schedule.read', 'PMS', 'READ', 'NOT_CONFIGURED', array['patients','providers','operatories','appointments'], array['credentialVaultRef','capabilityMap','fieldMap'], array['credentialVaultRef','capabilityMap'], '{"humanApprovalRequired":false,"phiAccessAudit":true}'::jsonb, '{"fallback":"manual schedule import","blocksExternalSuccess":true}'::jsonb),
  ('conn_cap_pms_writeback', 'tenant_1dentalai_production', 'conn_def_pms_open_dental', 'conn_inst_pms_denver', 'pms.writeback.appointment_note', 'PMS', 'WRITE', 'APPROVAL_REQUIRED', array['appointment_note','communication_note','task'], array['credentialVaultRef','writebackApproval','fieldMap','smokeTest'], array['credentialVaultRef','writebackApproval','smokeTest'], '{"humanApprovalRequired":true,"roleScopes":["front_desk","practice_manager"],"phiAccessAudit":true}'::jsonb, '{"fallback":"staged PMS task","blocksExternalSuccess":true}'::jsonb),
  ('conn_cap_payer_eligibility', 'tenant_1dentalai_production', 'conn_def_payer_x12', 'conn_inst_payer_router', 'payer.270_271.eligibility', 'RCM', 'BIDIRECTIONAL', 'NOT_CONFIGURED', array['270','271'], array['payerRegistry','tradingPartnerId','ediSubmitterId','credentialVaultRef'], array['payerRegistry','ediSubmitterId','credentialVaultRef'], '{"humanApprovalRequired":false,"storesRawPayload":true,"phiAccessAudit":true}'::jsonb, '{"fallback":"manual payer portal verification","blocksVerifiedStatus":true}'::jsonb),
  ('conn_cap_claim_submit', 'tenant_1dentalai_production', 'conn_def_payer_x12', 'conn_inst_payer_router', 'payer.837.claim_submit', 'RCM', 'WRITE', 'APPROVAL_REQUIRED', array['837P','277CA'], array['payerRegistry','submitterId','attachmentPolicy','claimScrubber','approvalPolicy'], array['payerRegistry','submitterId','approvalPolicy'], '{"humanApprovalRequired":true,"blocksWithout277CA":true,"phiAccessAudit":true}'::jsonb, '{"fallback":"paper/manual portal claim package","blocksSubmittedStatus":true}'::jsonb),
  ('conn_cap_phone_call_control', 'tenant_1dentalai_production', 'conn_def_phone_carrier', 'conn_inst_phone_denver', 'phone.call_control', 'PHONE', 'WRITE', 'NOT_CONFIGURED', array['answer','hold','resume','transfer','park','dial','voicemail'], array['trunkDomain','credentialVaultRef','webhookVerification','e911'], array['credentialVaultRef','webhookVerification','e911'], '{"humanApprovalRequired":false,"callRecordingPolicyRequired":true}'::jsonb, '{"fallback":"internal call task only","blocksCallCompletedStatus":true}'::jsonb),
  ('conn_cap_reviews_publish', 'tenant_1dentalai_production', 'conn_def_review_listings', 'conn_inst_review_denver', 'reviews.response_publish', 'REPUTATION', 'WRITE', 'APPROVAL_REQUIRED', array['review_monitor','response_publish','listing_sync'], array['sourceIdentity','listingOwnership','hipaaGuardrails','approvalPolicy'], array['sourceIdentity','listingOwnership','approvalPolicy'], '{"humanApprovalRequired":true,"hipaaGuardrails":true,"blocksPhi":true}'::jsonb, '{"fallback":"approved response draft only","blocksPublishedStatus":true}'::jsonb)
on conflict ("id") do update set
  "status" = excluded."status",
  "missingFields" = excluded."missingFields",
  "approvalPolicy" = excluded."approvalPolicy",
  "fallbackPolicy" = excluded."fallbackPolicy",
  "updatedAt" = current_timestamp;

insert into "ConnectorRouteDecision" ("id", "tenantId", "definitionId", "installationId", "workflowArea", "sourceObjectType", "sourceObjectId", "requestedCapability", "routeStatus", "selectedRoute", "fallbackRoute", "estimatedCostCents", "blockedReason", "decisionContext", "actorRole")
values
  ('conn_route_eligibility_sample', 'tenant_1dentalai_production', 'conn_def_payer_x12', 'conn_inst_payer_router', 'RCM', 'PmsAppointment', 'appt_sample_001', 'payer.270_271.eligibility', 'BLOCKED_CONNECTOR_REQUIRED', null, 'MANUAL_PAYER_PORTAL', 15, 'Payer registry, submitter ID, and credential vault reference are missing; eligibility cannot be called verified.', '{"payer":"Delta Dental","appointmentReadiness":"NEEDS_REVIEW"}'::jsonb, 'billing_rcm'),
  ('conn_route_call_control_sample', 'tenant_1dentalai_production', 'conn_def_phone_carrier', 'conn_inst_phone_denver', 'PHONE', 'PhoneActiveCall', 'phone_active_inbound_1', 'phone.call_control', 'BLOCKED_CONNECTOR_REQUIRED', null, 'INTERNAL_CALL_TASK', 0, 'Call-control webhook and carrier credentials are not verified; hold/transfer/dial are staged only.', '{"action":"WARM_TRANSFER","target":"Front desk queue"}'::jsonb, 'front_desk'),
  ('conn_route_review_publish_sample', 'tenant_1dentalai_production', 'conn_def_review_listings', 'conn_inst_review_denver', 'REPUTATION', 'ReputationReviewResponse', 'review_response_001', 'reviews.response_publish', 'BLOCKED_CONNECTOR_REQUIRED', null, 'APPROVED_DRAFT_ONLY', 1, 'Review source identity and listing ownership are not verified; response cannot be posted externally.', '{"hipaaGuardrails":true,"humanApprovalRequired":true}'::jsonb, 'marketing_growth')
on conflict ("id") do nothing;

insert into "ConnectorHealthCheck" ("id", "tenantId", "definitionId", "installationId", "checkType", "status", "resultSummary", "latencyMs")
values
  ('conn_health_pms_schedule', 'tenant_1dentalai_production', 'conn_def_pms_open_dental', 'conn_inst_pms_denver', 'READ_ONLY_SMOKE_TEST', 'NOT_RUN', 'Waiting on PMS credential vault reference and approved capability map.', null),
  ('conn_health_payer_eligibility', 'tenant_1dentalai_production', 'conn_def_payer_x12', 'conn_inst_payer_router', '270_271_SMOKE_TEST', 'NOT_RUN', 'Waiting on payer registry, submitter ID, and credential vault reference.', null),
  ('conn_health_phone_webhooks', 'tenant_1dentalai_production', 'conn_def_phone_carrier', 'conn_inst_phone_denver', 'CALL_CONTROL_WEBHOOK', 'NOT_RUN', 'Waiting on carrier webhook secret and callback URL verification.', null),
  ('conn_health_reviews', 'tenant_1dentalai_production', 'conn_def_review_listings', 'conn_inst_review_denver', 'LISTING_SYNC_SMOKE_TEST', 'NOT_RUN', 'Waiting on listing ownership and source identity.', null)
on conflict ("id") do nothing;

insert into "ConnectorCostEvent" ("id", "tenantId", "definitionId", "installationId", "workflowArea", "capabilityKey", "sourceObjectType", "sourceObjectId", "costCents", "pricingUnit", "status", "metadata")
values
  ('conn_cost_eligibility_sample', 'tenant_1dentalai_production', 'conn_def_payer_x12', 'conn_inst_payer_router', 'RCM', 'payer.270_271.eligibility', 'PmsAppointment', 'appt_sample_001', 15, 'TRANSACTION', 'ESTIMATED', '{"alternative":"manual payer portal","reason":"route cost telemetry before live execution"}'::jsonb),
  ('conn_cost_claim_sample', 'tenant_1dentalai_production', 'conn_def_payer_x12', 'conn_inst_payer_router', 'RCM', 'payer.837.claim_submit', 'PmsClaim', 'claim_sample_001', 35, 'TRANSACTION', 'ESTIMATED', '{"requires277CA":true,"blocksSubmittedStatusWithoutAck":true}'::jsonb),
  ('conn_cost_review_sample', 'tenant_1dentalai_production', 'conn_def_review_listings', 'conn_inst_review_denver', 'REPUTATION', 'reviews.response_publish', 'ReputationReviewResponse', 'review_response_001', 1, 'API_CALL', 'ESTIMATED', '{"requiresHumanApproval":true,"hipaaGuardrails":true}'::jsonb)
on conflict ("id") do nothing;
