create table if not exists "PatientEngagementChannelSetting" (
  "id" text primary key,
  "tenantId" text not null,
  "channel" text not null,
  "displayName" text not null,
  "status" text not null default 'SETUP_REQUIRED',
  "theme" jsonb,
  "nlpMode" text not null default 'RULES_AND_AI_DRAFT',
  "knowledgeBaseStatus" text not null default 'NEEDS_REVIEW',
  "schedulingStatus" text not null default 'PMS_CONNECTOR_REQUIRED',
  "formsStatus" text not null default 'PMS_FORMS_REQUIRED',
  "connectorStatus" text not null default 'CONNECTOR_REQUIRED',
  "approvalPolicy" jsonb,
  "nextAction" text not null,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);
create unique index if not exists "PatientEngagementChannelSetting_tenantId_channel_key" on "PatientEngagementChannelSetting" ("tenantId", "channel");
create index if not exists "PatientEngagementChannelSetting_tenantId_status_channel_idx" on "PatientEngagementChannelSetting" ("tenantId", "status", "channel");

create table if not exists "PatientEngagementKnowledgeSource" (
  "id" text primary key,
  "tenantId" text not null,
  "title" text not null,
  "sourceType" text not null,
  "sourceModule" text not null,
  "serviceLine" text,
  "status" text not null default 'NEEDS_REVIEW',
  "ownerRoleKey" text not null default 'practice_manager',
  "contentSummary" text not null,
  "sourceUrl" text,
  "lastReviewedAt" timestamp(3),
  "nextAction" text not null,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);
create index if not exists "PatientEngagementKnowledgeSource_tenantId_status_sourceModule_idx" on "PatientEngagementKnowledgeSource" ("tenantId", "status", "sourceModule");
create index if not exists "PatientEngagementKnowledgeSource_tenantId_serviceLine_idx" on "PatientEngagementKnowledgeSource" ("tenantId", "serviceLine");

create table if not exists "PatientWebChatConversation" (
  "id" text primary key,
  "tenantId" text not null,
  "patientId" text,
  "appointmentId" text,
  "visitorName" text,
  "visitorPhone" text,
  "visitorEmail" text,
  "sourcePage" text,
  "nlpIntent" text,
  "nlpConfidence" integer not null default 0,
  "status" text not null default 'OPEN',
  "transcriptSummary" text,
  "schedulingOutcome" text not null default 'NOT_ATTEMPTED',
  "pmsWritebackStatus" text not null default 'PMS_CONNECTOR_REQUIRED',
  "leadFormId" text,
  "ownerRoleKey" text not null default 'front_desk',
  "blockedReason" text,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);
create index if not exists "PatientWebChatConversation_tenantId_status_createdAt_idx" on "PatientWebChatConversation" ("tenantId", "status", "createdAt");
create index if not exists "PatientWebChatConversation_patientId_createdAt_idx" on "PatientWebChatConversation" ("patientId", "createdAt");
create index if not exists "PatientWebChatConversation_tenantId_nlpIntent_idx" on "PatientWebChatConversation" ("tenantId", "nlpIntent");

create table if not exists "PatientEngagementLeadForm" (
  "id" text primary key,
  "tenantId" text not null,
  "name" text not null,
  "serviceLine" text not null,
  "sourceChannel" text not null default 'WEB_CHAT',
  "status" text not null default 'DRAFT',
  "fieldSchema" jsonb,
  "pmsMapping" jsonb,
  "routingRule" text,
  "connectorStatus" text not null default 'PMS_CONNECTOR_REQUIRED',
  "conversionStatus" text not null default 'NOT_ATTRIBUTED',
  "nextAction" text not null,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);
create index if not exists "PatientEngagementLeadForm_tenantId_status_serviceLine_idx" on "PatientEngagementLeadForm" ("tenantId", "status", "serviceLine");

create table if not exists "PatientEngagementFormPacket" (
  "id" text primary key,
  "tenantId" text not null,
  "patientId" text,
  "appointmentId" text,
  "packetType" text not null,
  "status" text not null default 'DRAFT',
  "formTemplateIds" text[] not null default '{}',
  "deliveryChannel" text not null default 'PORTAL',
  "pmsWritebackStatus" text not null default 'PMS_FORMS_REQUIRED',
  "consentStatus" text not null default 'UNKNOWN',
  "dueAt" timestamp(3),
  "nextAction" text not null,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);
create index if not exists "PatientEngagementFormPacket_tenantId_status_dueAt_idx" on "PatientEngagementFormPacket" ("tenantId", "status", "dueAt");
create index if not exists "PatientEngagementFormPacket_patientId_status_idx" on "PatientEngagementFormPacket" ("patientId", "status");
create index if not exists "PatientEngagementFormPacket_appointmentId_idx" on "PatientEngagementFormPacket" ("appointmentId");

create table if not exists "PatientEngagementSchedulingRule" (
  "id" text primary key,
  "tenantId" text not null,
  "name" text not null,
  "sourceChannel" text not null,
  "appointmentCategoryId" text,
  "providerId" text,
  "locationId" text,
  "status" text not null default 'SETUP_REQUIRED',
  "bookingWindowDays" integer not null default 30,
  "allowReschedule" boolean not null default true,
  "requireHumanApproval" boolean not null default true,
  "pmsWritebackStatus" text not null default 'PMS_CONNECTOR_REQUIRED',
  "conflictPolicy" jsonb,
  "nextAction" text not null,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);
create index if not exists "PatientEngagementSchedulingRule_tenantId_status_sourceChannel_idx" on "PatientEngagementSchedulingRule" ("tenantId", "status", "sourceChannel");
create index if not exists "PatientEngagementSchedulingRule_appointmentCategoryId_idx" on "PatientEngagementSchedulingRule" ("appointmentCategoryId");

insert into "PatientEngagementChannelSetting" ("id", "tenantId", "channel", "displayName", "status", "theme", "nlpMode", "knowledgeBaseStatus", "schedulingStatus", "formsStatus", "connectorStatus", "approvalPolicy", "nextAction")
values
  ('eng_channel_phone', 'tenant_1dentalai_production', 'PHONE', 'Phone and SMS', 'SETUP_REQUIRED', '{"primaryColor":"#0891b2","buttonStyle":"rounded","launcher":"none"}'::jsonb, 'CALL_SUMMARY_AND_INTENT', 'READY_FOR_REVIEW', 'PMS_CONNECTOR_REQUIRED', 'PMS_FORMS_REQUIRED', 'CONNECTOR_REQUIRED', '{"humanApprovalRequiredForOutbound":true,"quietHoursRequired":true}'::jsonb, 'Finish carrier credentials, E911, SMS registration, and PMS writeback smoke tests.'),
  ('eng_channel_ai_voice', 'tenant_1dentalai_production', 'AI_VOICE', 'AI voice receptionist', 'SETUP_REQUIRED', '{"voice":"professional-warm","handoffColor":"#0f172a","afterHoursMode":"triage"}'::jsonb, 'VOICE_AGENT_WITH_HUMAN_APPROVAL', 'NEEDS_REVIEW', 'PMS_CONNECTOR_REQUIRED', 'PMS_FORMS_REQUIRED', 'CONNECTOR_REQUIRED', '{"humanApprovalRequiredForBooking":true,"recordingDisclosureRequired":true}'::jsonb, 'Approve voice scripts, emergency handoff rules, recording disclosure, and scheduling writeback policy.'),
  ('eng_channel_webchat', 'tenant_1dentalai_production', 'WEB_CHAT', 'Website webchat', 'SETUP_REQUIRED', '{"primaryColor":"#0891b2","backgroundColor":"#ffffff","launcherLabel":"Ask us","position":"bottom-right","font":"system"}'::jsonb, 'NLP_TRIAGE_WITH_APPROVAL', 'NEEDS_REVIEW', 'PMS_CONNECTOR_REQUIRED', 'PMS_FORMS_REQUIRED', 'CONNECTOR_REQUIRED', '{"humanApprovalRequiredForBooking":true,"phiGuardrails":true,"leadCaptureConsent":true}'::jsonb, 'Review knowledge base, theme, lead form mapping, scheduling rule, and PMS writeback before webchat is embedded.'),
  ('eng_channel_forms', 'tenant_1dentalai_production', 'PATIENT_FORMS', 'Patient forms', 'SETUP_REQUIRED', '{"primaryColor":"#0f172a","progressStyle":"steps"}'::jsonb, 'NO_AI_UNLESS_REVIEWED', 'READY_FOR_REVIEW', 'PMS_CONNECTOR_REQUIRED', 'PMS_FORMS_REQUIRED', 'PMS_CONNECTOR_REQUIRED', '{"staffReviewRequiredForProfileChanges":true}'::jsonb, 'Map form packets to PMS fields and require staff review before writeback.')
on conflict ("tenantId", "channel") do update set
  "displayName" = excluded."displayName",
  "theme" = excluded."theme",
  "nextAction" = excluded."nextAction",
  "updatedAt" = current_timestamp;

insert into "PatientEngagementKnowledgeSource" ("id", "tenantId", "title", "sourceType", "sourceModule", "serviceLine", "status", "contentSummary", "sourceUrl", "nextAction")
values
  ('eng_kb_services', 'tenant_1dentalai_production', 'Services, pricing guidance, and financing guardrails', 'PRACTICE_POLICY', 'MARKETING', 'General dentistry', 'NEEDS_REVIEW', 'Used by webchat and AI voice to answer service questions without quoting unsupported clinical or insurance promises.', null, 'Provider and office manager must approve service language and financing disclaimers.'),
  ('eng_kb_scheduling', 'tenant_1dentalai_production', 'Scheduling, cancellation, emergency, and reschedule policy', 'SOP', 'PMS', 'Scheduling', 'NEEDS_REVIEW', 'Defines when AI can offer appointment windows, when staff approval is required, and how emergency requests are escalated.', null, 'Map appointment categories, provider preferences, operatories, and emergency handoff rules.'),
  ('eng_kb_forms', 'tenant_1dentalai_production', 'Patient forms and intake requirements', 'FORM_POLICY', 'PMS_FORMS', 'Intake', 'NEEDS_REVIEW', 'Controls which forms are sent before new patient, hygiene, emergency, implant, and sedation visits.', null, 'Map each form packet to PMS fields and approval policy.')
on conflict ("id") do update set "nextAction" = excluded."nextAction", "updatedAt" = current_timestamp;

insert into "PatientEngagementLeadForm" ("id", "tenantId", "name", "serviceLine", "sourceChannel", "status", "fieldSchema", "pmsMapping", "routingRule", "connectorStatus", "conversionStatus", "nextAction")
values
  ('eng_lead_implant', 'tenant_1dentalai_production', 'Implant consult lead form', 'Implants', 'WEB_CHAT', 'READY_FOR_REVIEW', '{"fields":["name","phone","email","preferredTime","insurance","question","consent"]}'::jsonb, '{"patient":"create_or_match","appointmentRequest":"implant_consult","source":"webchat"}'::jsonb, 'Route to treatment coordinator and create PMS appointment request after staff approval.', 'PMS_CONNECTOR_REQUIRED', 'NOT_ATTRIBUTED', 'Approve PMS mapping and consent text before embedding.'),
  ('eng_lead_emergency', 'tenant_1dentalai_production', 'Emergency visit triage form', 'Emergency', 'WEB_CHAT', 'READY_FOR_REVIEW', '{"fields":["name","phone","painLevel","swelling","trauma","preferredTime","consent"]}'::jsonb, '{"appointmentRequest":"emergency_exam","priority":"urgent","source":"webchat"}'::jsonb, 'Route to front desk, show earliest emergency slots, and block AI diagnosis.', 'PMS_CONNECTOR_REQUIRED', 'NOT_ATTRIBUTED', 'Approve emergency escalation rules and provider handoff.')
on conflict ("id") do update set "nextAction" = excluded."nextAction", "updatedAt" = current_timestamp;

insert into "PatientEngagementSchedulingRule" ("id", "tenantId", "name", "sourceChannel", "appointmentCategoryId", "providerId", "locationId", "status", "bookingWindowDays", "allowReschedule", "requireHumanApproval", "pmsWritebackStatus", "conflictPolicy", "nextAction")
values
  ('eng_sched_webchat_new_patient', 'tenant_1dentalai_production', 'Webchat new patient booking', 'WEB_CHAT', null, null, 'loc_denver', 'SETUP_REQUIRED', 30, true, true, 'PMS_CONNECTOR_REQUIRED', '{"preventDoubleBook":true,"respectProviderType":true,"requireOperatory":true,"rescheduleRequiresIdentityCheck":true}'::jsonb, 'Attach appointment categories and run PMS slot/writeback smoke test.'),
  ('eng_sched_ai_voice_after_hours', 'tenant_1dentalai_production', 'AI voice after-hours scheduling', 'AI_VOICE', null, null, 'loc_denver', 'SETUP_REQUIRED', 14, false, true, 'PMS_CONNECTOR_REQUIRED', '{"emergencyEscalation":true,"bookingRequiresStaffApproval":true}'::jsonb, 'Approve after-hours booking policy and emergency escalation workflow.')
on conflict ("id") do update set "nextAction" = excluded."nextAction", "updatedAt" = current_timestamp;

insert into "PatientWebChatConversation" ("id", "tenantId", "visitorName", "visitorPhone", "visitorEmail", "sourcePage", "nlpIntent", "nlpConfidence", "status", "transcriptSummary", "schedulingOutcome", "pmsWritebackStatus", "leadFormId", "ownerRoleKey", "blockedReason")
values
  ('eng_chat_sample_implant', 'tenant_1dentalai_production', 'Avery Chen', '+17205550119', 'avery@example.com', '/services/dental-implants', 'IMPLANT_CONSULT', 86, 'OPEN', 'Visitor asked about implant consultation, financing, insurance, and earliest appointment availability.', 'STAFF_APPROVAL_REQUIRED', 'PMS_CONNECTOR_REQUIRED', 'eng_lead_implant', 'treatment_coordinator', 'PMS scheduling connector is not approved; conversation can create an internal follow-up only.'),
  ('eng_chat_sample_reschedule', 'tenant_1dentalai_production', 'Maria Rivera', '+17205550101', null, '/book', 'RESCHEDULE_APPOINTMENT', 78, 'OPEN', 'Existing patient wants to reschedule a crown prep and asked for morning availability.', 'IDENTITY_CHECK_REQUIRED', 'PMS_CONNECTOR_REQUIRED', null, 'front_desk', 'Identity and PMS writeback must be verified before rescheduling.')
on conflict ("id") do update set "transcriptSummary" = excluded."transcriptSummary", "updatedAt" = current_timestamp;

insert into "PatientEngagementFormPacket" ("id", "tenantId", "patientId", "appointmentId", "packetType", "status", "formTemplateIds", "deliveryChannel", "pmsWritebackStatus", "consentStatus", "dueAt", "nextAction")
values
  ('eng_form_new_patient_packet', 'tenant_1dentalai_production', null, null, 'NEW_PATIENT_INTAKE', 'READY_FOR_REVIEW', array[]::text[], 'WEB_CHAT', 'PMS_FORMS_REQUIRED', 'UNKNOWN', current_timestamp + interval '2 days', 'Attach PMS form templates and require staff review before writeback.'),
  ('eng_form_emergency_packet', 'tenant_1dentalai_production', null, null, 'EMERGENCY_TRIAGE', 'READY_FOR_REVIEW', array[]::text[], 'WEB_CHAT', 'PMS_FORMS_REQUIRED', 'UNKNOWN', current_timestamp + interval '1 day', 'Map emergency triage questions to appointment request and provider handoff.')
on conflict ("id") do update set "nextAction" = excluded."nextAction", "updatedAt" = current_timestamp;
