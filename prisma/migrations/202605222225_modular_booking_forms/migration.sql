alter table "PmsOnlineSchedulingLink"
  add column if not exists "workflowKey" text default 'standard_booking',
  add column if not exists "workflowName" text default 'Standard booking',
  add column if not exists "workflowScreenSchema" jsonb,
  add column if not exists "requiredFormTemplateIds" text[] default '{}',
  add column if not exists "customFormDefinitionIds" text[] default '{}',
  add column if not exists "bookingMode" text default 'DIRECT_BOOKING',
  add column if not exists "patientIdentityPolicy" text default 'PHONE_EMAIL_DOB',
  add column if not exists "screenTheme" jsonb;

create table if not exists "CustomFormDefinition" (
  "id" text primary key,
  "tenantId" text not null,
  "formKey" text not null,
  "name" text not null,
  "formType" text not null default 'CUSTOM',
  "status" text not null default 'DRAFT',
  "version" integer not null default 1,
  "description" text,
  "storageTableName" text not null,
  "workflowUse" text not null default 'GENERAL',
  "visibility" text not null default 'STAFF_AND_PUBLIC_LINK',
  "requiresSignature" boolean not null default false,
  "allowAnonymous" boolean not null default true,
  "successMessage" text,
  "createdByRole" text not null default 'practice_manager',
  "createdAt" timestamp not null default current_timestamp,
  "updatedAt" timestamp not null default current_timestamp,
  unique ("tenantId", "formKey", "version")
);

create index if not exists "CustomFormDefinition_tenant_status_idx" on "CustomFormDefinition" ("tenantId", "status", "formType");
create index if not exists "CustomFormDefinition_workflow_idx" on "CustomFormDefinition" ("tenantId", "workflowUse");

create table if not exists "CustomFormField" (
  "id" text primary key,
  "tenantId" text not null,
  "formDefinitionId" text not null references "CustomFormDefinition"("id") on delete cascade,
  "fieldKey" text not null,
  "label" text not null,
  "fieldType" text not null,
  "required" boolean not null default false,
  "placeholder" text,
  "helpText" text,
  "options" jsonb,
  "validation" jsonb,
  "displayOrder" integer not null default 0,
  "conditionalLogic" jsonb,
  "pmsTargetModel" text,
  "pmsTargetField" text,
  "phiCategory" text not null default 'ADMINISTRATIVE',
  "createdAt" timestamp not null default current_timestamp,
  "updatedAt" timestamp not null default current_timestamp,
  unique ("formDefinitionId", "fieldKey")
);

create index if not exists "CustomFormField_form_order_idx" on "CustomFormField" ("formDefinitionId", "displayOrder");

create table if not exists "CustomFormSubmission" (
  "id" text primary key,
  "tenantId" text not null,
  "formDefinitionId" text not null references "CustomFormDefinition"("id"),
  "storageTableName" text not null,
  "patientId" text,
  "appointmentId" text,
  "conversationId" text,
  "sourceChannel" text not null default 'STAFF',
  "submittedByName" text,
  "submittedByEmail" text,
  "submittedByPhone" text,
  "status" text not null default 'SUBMITTED',
  "signatureName" text,
  "signatureAt" timestamp,
  "ipAddress" text,
  "userAgent" text,
  "rawPayload" jsonb,
  "createdAt" timestamp not null default current_timestamp,
  "updatedAt" timestamp not null default current_timestamp
);

create index if not exists "CustomFormSubmission_form_created_idx" on "CustomFormSubmission" ("formDefinitionId", "createdAt");
create index if not exists "CustomFormSubmission_patient_idx" on "CustomFormSubmission" ("patientId", "createdAt");
create index if not exists "CustomFormSubmission_status_idx" on "CustomFormSubmission" ("tenantId", "status", "createdAt");

create table if not exists "CustomFormSubmissionValue" (
  "id" text primary key,
  "tenantId" text not null,
  "submissionId" text not null references "CustomFormSubmission"("id") on delete cascade,
  "formDefinitionId" text not null,
  "fieldId" text,
  "fieldKey" text not null,
  "fieldType" text not null,
  "answerText" text,
  "answerJson" jsonb,
  "createdAt" timestamp not null default current_timestamp,
  unique ("submissionId", "fieldKey")
);

create index if not exists "CustomFormSubmissionValue_field_idx" on "CustomFormSubmissionValue" ("formDefinitionId", "fieldKey");

insert into "CustomFormDefinition"
  ("id", "tenantId", "formKey", "name", "formType", "status", "version", "description", "storageTableName", "workflowUse", "requiresSignature", "successMessage")
values
  ('cform_new_patient_intake_v1', 'tenant_1dentalai_production', 'new-patient-intake', 'New patient intake', 'INTAKE', 'ACTIVE', 1, 'Public new-patient intake packet for online booking and portal forms.', 'form_tenant_1dentalai_production_new_patient_intake_v1', 'BOOKING_INTAKE', true, 'Thank you. Your intake form has been received.'),
  ('cform_insurance_capture_v1', 'tenant_1dentalai_production', 'insurance-capture', 'Insurance information', 'INSURANCE', 'ACTIVE', 1, 'Insurance details collected before verification and appointment handoff.', 'form_tenant_1dentalai_production_insurance_capture_v1', 'INSURANCE_CAPTURE', true, 'Thank you. Your insurance information has been received.')
on conflict ("tenantId", "formKey", "version") do nothing;

insert into "CustomFormField"
  ("id", "tenantId", "formDefinitionId", "fieldKey", "label", "fieldType", "required", "placeholder", "helpText", "options", "displayOrder", "pmsTargetModel", "pmsTargetField", "phiCategory")
values
  ('cff_intake_first_name', 'tenant_1dentalai_production', 'cform_new_patient_intake_v1', 'first_name', 'First name', 'short_text', true, 'Jane', null, null, 10, 'PmsPatient', 'firstName', 'DEMOGRAPHIC'),
  ('cff_intake_last_name', 'tenant_1dentalai_production', 'cform_new_patient_intake_v1', 'last_name', 'Last name', 'short_text', true, 'Smith', null, null, 20, 'PmsPatient', 'lastName', 'DEMOGRAPHIC'),
  ('cff_intake_phone', 'tenant_1dentalai_production', 'cform_new_patient_intake_v1', 'mobile_phone', 'Mobile phone', 'phone', true, '(555) 555-1212', null, null, 30, 'PmsPatient', 'phone', 'CONTACT'),
  ('cff_intake_email', 'tenant_1dentalai_production', 'cform_new_patient_intake_v1', 'email', 'Email', 'email', true, 'jane@example.com', null, null, 40, 'PmsPatient', 'email', 'CONTACT'),
  ('cff_intake_reason', 'tenant_1dentalai_production', 'cform_new_patient_intake_v1', 'visit_reason', 'What brings you in?', 'long_text', true, 'Cleaning, tooth pain, implant consult, whitening...', null, null, 50, null, null, 'CLINICAL_ADMIN'),
  ('cff_intake_anxiety', 'tenant_1dentalai_production', 'cform_new_patient_intake_v1', 'dental_anxiety', 'Dental anxiety level', 'single_select', false, null, 'Helps the team prepare the visit.', '["None","Mild","Moderate","High"]'::jsonb, 60, null, null, 'CLINICAL_ADMIN'),
  ('cff_ins_payer', 'tenant_1dentalai_production', 'cform_insurance_capture_v1', 'payer_name', 'Insurance company', 'short_text', true, 'Delta Dental, Aetna, Cigna...', null, null, 10, 'PmsPatientInsurance', 'payerName', 'INSURANCE'),
  ('cff_ins_subscriber', 'tenant_1dentalai_production', 'cform_insurance_capture_v1', 'subscriber_id', 'Subscriber ID', 'short_text', true, null, null, null, 20, 'PmsPatientInsurance', 'subscriberId', 'INSURANCE'),
  ('cff_ins_holder', 'tenant_1dentalai_production', 'cform_insurance_capture_v1', 'policy_holder_name', 'Policy holder name', 'short_text', true, null, null, null, 30, 'PmsPatientInsurance', 'subscriberName', 'INSURANCE'),
  ('cff_ins_dob', 'tenant_1dentalai_production', 'cform_insurance_capture_v1', 'policy_holder_dob', 'Policy holder date of birth', 'date', false, null, null, null, 40, 'PmsPatientInsurance', 'subscriberDob', 'INSURANCE')
on conflict ("formDefinitionId", "fieldKey") do nothing;

create table if not exists "form_tenant_1dentalai_production_new_patient_intake_v1" (
  "submissionId" text primary key,
  "tenantId" text not null,
  "patientId" text,
  "appointmentId" text,
  "sourceChannel" text,
  "submittedAt" timestamp not null default current_timestamp,
  "payload" jsonb not null
);

create table if not exists "form_tenant_1dentalai_production_insurance_capture_v1" (
  "submissionId" text primary key,
  "tenantId" text not null,
  "patientId" text,
  "appointmentId" text,
  "sourceChannel" text,
  "submittedAt" timestamp not null default current_timestamp,
  "payload" jsonb not null
);
