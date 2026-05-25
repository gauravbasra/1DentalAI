alter table "PhoneConversation"
  add column if not exists "voiceAgentId" text,
  add column if not exists "voiceAgentRunId" text;

alter table "PhoneActiveCall"
  add column if not exists "voiceAgentId" text,
  add column if not exists "voiceAgentRunId" text;

create table if not exists "PhoneVoiceAgent" (
  "id" text primary key,
  "tenantId" text not null,
  "locationId" text,
  "name" text not null,
  "roleKey" text not null,
  "scenario" text not null,
  "status" text not null default 'ACTIVE',
  "description" text,
  "primaryGoal" text not null,
  "allowedActions" text[] not null default '{}',
  "pmsContext" jsonb not null default '{}'::jsonb,
  "triggerPolicy" jsonb not null default '{}'::jsonb,
  "voiceSettings" jsonb not null default '{}'::jsonb,
  "systemPrompt" text not null,
  "voicePrompt" text not null,
  "pricingPolicy" text not null default 'NO_PUBLIC_PRICING_HUMAN_ONLY',
  "bookingPolicy" text not null default 'DIRECT_BOOKING_WITH_SCHEDULING_GATES',
  "billingPolicy" text not null default 'VERIFY_IDENTITY_BEFORE_BILLING_DETAIL',
  "handoffPolicy" jsonb not null default '{}'::jsonb,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create table if not exists "PhoneVoiceAgentRun" (
  "id" text primary key,
  "tenantId" text not null,
  "agentId" text not null,
  "campaignId" text,
  "conversationId" text,
  "patientId" text,
  "appointmentId" text,
  "scenario" text not null,
  "runType" text not null,
  "status" text not null default 'QUEUED',
  "targetNumber" text,
  "scheduledFor" timestamp(3),
  "startedAt" timestamp(3),
  "completedAt" timestamp(3),
  "goal" text not null,
  "contextSnapshot" jsonb not null default '{}'::jsonb,
  "actionSummary" jsonb not null default '{}'::jsonb,
  "providerStatus" text not null default 'NOT_REQUESTED',
  "providerCallId" text,
  "blockedReason" text,
  "createdByRole" text not null default 'front_desk',
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create table if not exists "PhoneVoiceAgentAction" (
  "id" text primary key,
  "tenantId" text not null,
  "agentId" text,
  "agentRunId" text,
  "conversationId" text,
  "patientId" text,
  "appointmentId" text,
  "actionType" text not null,
  "status" text not null default 'RECORDED',
  "inputJson" jsonb not null default '{}'::jsonb,
  "resultJson" jsonb not null default '{}'::jsonb,
  "blockedReason" text,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp
);

create unique index if not exists "PhoneVoiceAgent_tenantId_roleKey_key" on "PhoneVoiceAgent" ("tenantId", "roleKey");
create index if not exists "PhoneVoiceAgent_tenantId_status_scenario_idx" on "PhoneVoiceAgent" ("tenantId", "status", "scenario");
create index if not exists "PhoneVoiceAgent_tenantId_roleKey_status_idx" on "PhoneVoiceAgent" ("tenantId", "roleKey", "status");
create index if not exists "PhoneVoiceAgentRun_tenantId_status_scheduledFor_idx" on "PhoneVoiceAgentRun" ("tenantId", "status", "scheduledFor");
create index if not exists "PhoneVoiceAgentRun_agentId_status_createdAt_idx" on "PhoneVoiceAgentRun" ("agentId", "status", "createdAt");
create index if not exists "PhoneVoiceAgentRun_conversationId_idx" on "PhoneVoiceAgentRun" ("conversationId");
create index if not exists "PhoneVoiceAgentRun_patientId_status_idx" on "PhoneVoiceAgentRun" ("patientId", "status");
create index if not exists "PhoneVoiceAgentRun_campaignId_status_idx" on "PhoneVoiceAgentRun" ("campaignId", "status");
create index if not exists "PhoneVoiceAgentAction_tenantId_actionType_status_idx" on "PhoneVoiceAgentAction" ("tenantId", "actionType", "status");
create index if not exists "PhoneVoiceAgentAction_agentRunId_createdAt_idx" on "PhoneVoiceAgentAction" ("agentRunId", "createdAt");
create index if not exists "PhoneVoiceAgentAction_conversationId_createdAt_idx" on "PhoneVoiceAgentAction" ("conversationId", "createdAt");
create index if not exists "PhoneVoiceAgentAction_patientId_createdAt_idx" on "PhoneVoiceAgentAction" ("patientId", "createdAt");
create index if not exists "PhoneConversation_voiceAgentId_startedAt_idx" on "PhoneConversation" ("voiceAgentId", "startedAt");
create index if not exists "PhoneConversation_voiceAgentRunId_idx" on "PhoneConversation" ("voiceAgentRunId");
create index if not exists "PhoneActiveCall_voiceAgentId_startedAt_idx" on "PhoneActiveCall" ("voiceAgentId", "startedAt");
create index if not exists "PhoneActiveCall_voiceAgentRunId_idx" on "PhoneActiveCall" ("voiceAgentRunId");

insert into "PhoneVoiceAgent"
  ("id", "tenantId", "name", "roleKey", "scenario", "status", "description", "primaryGoal", "allowedActions", "pmsContext", "triggerPolicy", "voiceSettings", "systemPrompt", "voicePrompt", "pricingPolicy", "bookingPolicy", "billingPolicy", "handoffPolicy", "updatedAt")
values
  ('agent_inbound_receptionist', 'tenant_1dentalai_production', 'Inbound AI receptionist', 'inbound_receptionist', 'inbound_takeover', 'ACTIVE', 'Answers when front desk is busy, qualifies the call, books appointments, and routes sensitive work.', 'Resolve inbound calls without losing patient context.', array['BOOK_APPOINTMENT','RESCHEDULE_APPOINTMENT','CREATE_TASK','STAGE_SMS_CONFIRMATION','ROUTE_TO_STAFF'], '{"patients":true,"appointments":true,"recalls":true,"balances":true,"insurance":true,"forms":true}'::jsonb, '{"answerAfterRings":3,"afterHours":true,"busyFallback":true}'::jsonb, '{"realtimeModel":"gpt-realtime-mini","transcriptionModel":"gpt-4o-transcribe","voice":"alloy","temperature":0.35}'::jsonb, 'You are the dental practice inbound receptionist. Sound warm, calm, and human. Remember details already provided during the call. Use PMS context before asking questions.', 'Ask one question at a time. Book directly when name, service, date, and time are known. For pricing, diagnosis, prescriptions, or guaranteed insurance answers, route to staff.', 'NO_PUBLIC_PRICING_HUMAN_ONLY', 'DIRECT_BOOKING_WITH_SCHEDULING_GATES', 'VERIFY_IDENTITY_BEFORE_BILLING_DETAIL', '{"fallbackOwner":"front_desk","warmTransfer":true}'::jsonb, current_timestamp),
  ('agent_hygiene_recall', 'tenant_1dentalai_production', 'Hygiene recall coordinator', 'hygiene_recall', 'recall', 'ACTIVE', 'Calls overdue hygiene or perio-maintenance patients and books available recall slots.', 'Recover due and overdue recall production from PMS recall queues.', array['BOOK_APPOINTMENT','RESCHEDULE_APPOINTMENT','CREATE_TASK','STAGE_SMS_CONFIRMATION'], '{"patients":true,"recalls":true,"appointments":true,"providers":true,"operatories":true}'::jsonb, '{"source":"PmsRecall","statuses":["DUE","OVERDUE"],"quietHours":true}'::jsonb, '{"realtimeModel":"gpt-realtime-mini","transcriptionModel":"gpt-4o-transcribe","voice":"alloy","temperature":0.32}'::jsonb, 'You are the hygiene recall coordinator. You are calling because the patient is due for continuing care. Be helpful, brief, and never pressure the patient.', 'Confirm the patient, explain they are due for recall, offer specific times from the schedule, and book if they agree.', 'NO_PUBLIC_PRICING_HUMAN_ONLY', 'BOOK_RECALL_WITH_PROVIDER_AVAILABILITY', 'ROUTE_BILLING_TO_STAFF', '{"fallbackOwner":"front_desk"}'::jsonb, current_timestamp),
  ('agent_patient_reactivation', 'tenant_1dentalai_production', 'Patient reactivation coordinator', 'patient_reactivation', 'reactivation', 'ACTIVE', 'Reactivates inactive patients, broken appointments, unscheduled treatment, and service-line opportunities.', 'Bring inactive or unscheduled patients back into care.', array['BOOK_APPOINTMENT','CREATE_TASK','STAGE_SMS_CONFIRMATION','ROUTE_TO_STAFF'], '{"patients":true,"appointments":true,"treatmentPlans":true,"recalls":true,"balances":false}'::jsonb, '{"source":"PmsPatient","inactiveMonths":12,"includeBrokenAppointments":true,"includeUnscheduledTreatment":true}'::jsonb, '{"realtimeModel":"gpt-realtime-mini","transcriptionModel":"gpt-4o-transcribe","voice":"verse","temperature":0.38}'::jsonb, 'You are the patient reactivation coordinator. Be respectful and warm. The goal is to make returning to care easy.', 'Ask what the patient would like help with, offer appointment options, and create a staff task if the patient needs pricing, clinical advice, or special accommodation.', 'NO_PUBLIC_PRICING_HUMAN_ONLY', 'DIRECT_BOOKING_WITH_SCHEDULING_GATES', 'ROUTE_BILLING_TO_STAFF', '{"fallbackOwner":"front_desk"}'::jsonb, current_timestamp),
  ('agent_appointment_reminder', 'tenant_1dentalai_production', 'Appointment reminder agent', 'appointment_reminder', 'appointment_reminder', 'ACTIVE', 'Confirms upcoming visits, handles reschedule intent, forms reminders, and same-day escalation.', 'Protect scheduled production by confirming or routing appointment changes.', array['RESCHEDULE_APPOINTMENT','CREATE_TASK','STAGE_SMS_CONFIRMATION','ROUTE_TO_STAFF'], '{"patients":true,"appointments":true,"forms":true,"insurance":true}'::jsonb, '{"source":"PmsAppointment","windowDays":[1,7],"sameDayRescheduleRequiresStaff":true}'::jsonb, '{"realtimeModel":"gpt-realtime-mini","transcriptionModel":"gpt-4o-transcribe","voice":"sage","temperature":0.28}'::jsonb, 'You are the appointment reminder agent. You help patients confirm, complete forms, and request changes without losing schedule safety.', 'If the appointment is same-day or the caller asks to cancel, route to staff. Otherwise offer safe reschedule options and record the request.', 'NO_PUBLIC_PRICING_HUMAN_ONLY', 'RESCHEDULE_WITH_SAME_DAY_STAFF_GATE', 'ROUTE_BILLING_TO_STAFF', '{"fallbackOwner":"front_desk","sameDayEscalation":true}'::jsonb, current_timestamp),
  ('agent_billing_information', 'tenant_1dentalai_production', 'Billing information assistant', 'billing_information', 'event_greeting', 'ACTIVE', 'Answers verified billing workflow questions and routes sensitive balance/payment disputes to billing staff.', 'Reduce billing call volume while protecting sensitive financial detail.', array['CREATE_TASK','STAGE_SMS_CONFIRMATION','ROUTE_TO_STAFF','PROVIDE_BILLING_SUMMARY'], '{"patients":true,"balances":true,"payments":true,"claims":true,"insurance":true}'::jsonb, '{"identityVerificationRequired":true,"paymentDisputesRouteToStaff":true}'::jsonb, '{"realtimeModel":"gpt-realtime-mini","transcriptionModel":"gpt-4o-transcribe","voice":"ash","temperature":0.25}'::jsonb, 'You are the billing information assistant. Be careful with identity verification and never expose sensitive billing details before verification.', 'Give high-level next steps. If the patient needs exact balances, payment disputes, insurance claim details, or refunds, create a billing task or warm transfer.', 'NO_PUBLIC_PRICING_HUMAN_ONLY', 'BOOKING_ALLOWED_AFTER_BILLING_CONTEXT', 'VERIFY_IDENTITY_BEFORE_BILLING_DETAIL', '{"fallbackOwner":"billing_rcm","warmTransfer":true}'::jsonb, current_timestamp),
  ('agent_membership_reactivation', 'tenant_1dentalai_production', 'Membership reactivation coordinator', 'membership_reactivation', 'reactivation', 'ACTIVE', 'Follows up with lapsed or likely practice-plan patients and routes membership enrollment to staff approval.', 'Recover membership and practice-plan opportunities without quoting unsupported pricing.', array['BOOK_APPOINTMENT','CREATE_TASK','STAGE_SMS_CONFIRMATION','ROUTE_TO_STAFF'], '{"patients":true,"appointments":true,"membershipSignals":true,"balances":false}'::jsonb, '{"source":"membershipSignals","pricingRequiresStaff":true}'::jsonb, '{"realtimeModel":"gpt-realtime-mini","transcriptionModel":"gpt-4o-transcribe","voice":"coral","temperature":0.34}'::jsonb, 'You are the membership reactivation coordinator. You can explain that the office has membership options but cannot quote pricing.', 'Offer to schedule a visit or connect the patient with the team to review membership options. Never give membership prices.', 'NO_PUBLIC_PRICING_HUMAN_ONLY', 'DIRECT_BOOKING_WITH_SCHEDULING_GATES', 'ROUTE_BILLING_TO_STAFF', '{"fallbackOwner":"treatment_coordinator"}'::jsonb, current_timestamp)
on conflict ("tenantId", "roleKey") do update set
  "name" = excluded."name",
  "scenario" = excluded."scenario",
  "status" = excluded."status",
  "description" = excluded."description",
  "primaryGoal" = excluded."primaryGoal",
  "allowedActions" = excluded."allowedActions",
  "pmsContext" = excluded."pmsContext",
  "triggerPolicy" = excluded."triggerPolicy",
  "updatedAt" = current_timestamp;
