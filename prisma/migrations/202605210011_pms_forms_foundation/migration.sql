CREATE TABLE IF NOT EXISTS "PmsFormTemplate" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "formType" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "PmsFormTemplate_tenantId_name_version_key"
  ON "PmsFormTemplate" ("tenantId", "name", "version");
CREATE INDEX IF NOT EXISTS "PmsFormTemplate_tenantId_formType_status_idx"
  ON "PmsFormTemplate" ("tenantId", "formType", "status");

CREATE TABLE IF NOT EXISTS "PmsFormField" (
  "id" TEXT PRIMARY KEY,
  "templateId" TEXT NOT NULL,
  "fieldKey" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "fieldType" TEXT NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "options" JSONB,
  "displayOrder" INTEGER NOT NULL,
  "helpText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "PmsFormField_templateId_fieldKey_key"
  ON "PmsFormField" ("templateId", "fieldKey");
CREATE INDEX IF NOT EXISTS "PmsFormField_templateId_displayOrder_idx"
  ON "PmsFormField" ("templateId", "displayOrder");

CREATE TABLE IF NOT EXISTS "PmsFormFieldMapping" (
  "id" TEXT PRIMARY KEY,
  "fieldId" TEXT NOT NULL,
  "targetModel" TEXT NOT NULL,
  "targetField" TEXT NOT NULL,
  "transformRule" TEXT,
  "reviewRequired" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "PmsFormFieldMapping_fieldId_targetModel_targetField_key"
  ON "PmsFormFieldMapping" ("fieldId", "targetModel", "targetField");

CREATE TABLE IF NOT EXISTS "PmsFormAssignment" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "appointmentId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
  "assignedByRole" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PmsFormAssignment_tenantId_status_dueAt_idx"
  ON "PmsFormAssignment" ("tenantId", "status", "dueAt");
CREATE INDEX IF NOT EXISTS "PmsFormAssignment_patientId_status_idx"
  ON "PmsFormAssignment" ("patientId", "status");

CREATE TABLE IF NOT EXISTS "PmsFormResponse" (
  "id" TEXT PRIMARY KEY,
  "assignmentId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "submittedByName" TEXT,
  "submittedByType" TEXT NOT NULL DEFAULT 'STAFF_KIOSK',
  "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
  "signatureName" TEXT,
  "signatureAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PmsFormResponse_assignmentId_status_idx"
  ON "PmsFormResponse" ("assignmentId", "status");
CREATE INDEX IF NOT EXISTS "PmsFormResponse_patientId_createdAt_idx"
  ON "PmsFormResponse" ("patientId", "createdAt");

CREATE TABLE IF NOT EXISTS "PmsFormResponseAnswer" (
  "id" TEXT PRIMARY KEY,
  "responseId" TEXT NOT NULL,
  "fieldId" TEXT NOT NULL,
  "fieldKey" TEXT NOT NULL,
  "answerValue" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "PmsFormResponseAnswer_responseId_fieldId_key"
  ON "PmsFormResponseAnswer" ("responseId", "fieldId");
CREATE INDEX IF NOT EXISTS "PmsFormResponseAnswer_fieldKey_idx"
  ON "PmsFormResponseAnswer" ("fieldKey");

CREATE TABLE IF NOT EXISTS "PmsProfileChangeRequest" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "responseId" TEXT,
  "fieldId" TEXT,
  "targetModel" TEXT NOT NULL,
  "targetField" TEXT NOT NULL,
  "currentValue" TEXT,
  "proposedValue" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewNote" TEXT,
  "reviewedByRole" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PmsProfileChangeRequest_tenantId_status_createdAt_idx"
  ON "PmsProfileChangeRequest" ("tenantId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "PmsProfileChangeRequest_patientId_status_idx"
  ON "PmsProfileChangeRequest" ("patientId", "status");

INSERT INTO "PmsFormTemplate" ("id", "tenantId", "name", "formType", "version", "status", "description", "createdAt", "updatedAt")
VALUES
  ('formtmpl_new_patient_intake_v1', 'tenant_1dentalai_production', 'New patient intake', 'INTAKE', 1, 'ACTIVE', 'Captures contact, emergency contact, communication consent, and patient note updates.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formtmpl_medical_history_v1', 'tenant_1dentalai_production', 'Medical history update', 'MEDICAL_HISTORY', 1, 'ACTIVE', 'Captures patient-reported medical conditions and allergies for provider review.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formtmpl_financial_consent_v1', 'tenant_1dentalai_production', 'Financial and treatment consent', 'CONSENT', 1, 'ACTIVE', 'Captures financial policy acknowledgement and signer identity.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsFormField" ("id", "templateId", "fieldKey", "label", "fieldType", "required", "options", "displayOrder", "helpText", "createdAt", "updatedAt")
VALUES
  ('formfield_intake_phone', 'formtmpl_new_patient_intake_v1', 'phone', 'Mobile phone', 'PHONE', true, null, 10, 'Primary number for appointment communication.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formfield_intake_email', 'formtmpl_new_patient_intake_v1', 'email', 'Email address', 'EMAIL', true, null, 20, 'Primary email for statements and forms.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formfield_intake_emergency_name', 'formtmpl_new_patient_intake_v1', 'emergencyContactName', 'Emergency contact name', 'TEXT', true, null, 30, null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formfield_intake_emergency_phone', 'formtmpl_new_patient_intake_v1', 'emergencyContactPhone', 'Emergency contact phone', 'PHONE', true, null, 40, null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formfield_intake_sms_consent', 'formtmpl_new_patient_intake_v1', 'smsConsent', 'Text message consent', 'SELECT', true, '["OPTED_IN","OPTED_OUT"]'::jsonb, 50, 'Consent controls whether automated SMS may be sent later by a configured channel.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formfield_intake_patient_note', 'formtmpl_new_patient_intake_v1', 'patientNote', 'Anything the care team should know?', 'TEXTAREA', false, null, 60, null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formfield_med_condition', 'formtmpl_medical_history_v1', 'medicalCondition', 'Medical condition', 'TEXT', true, null, 10, 'Example: hypertension, diabetes, pregnancy, heart condition.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formfield_med_severity', 'formtmpl_medical_history_v1', 'severity', 'Severity', 'SELECT', true, '["LOW","MODERATE","HIGH","CRITICAL"]'::jsonb, 20, null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formfield_med_allergy', 'formtmpl_medical_history_v1', 'allergy', 'Allergy', 'TEXT', false, null, 30, 'Medication or material allergy.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formfield_med_reaction', 'formtmpl_medical_history_v1', 'reaction', 'Allergy reaction', 'TEXTAREA', false, null, 40, null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formfield_consent_type', 'formtmpl_financial_consent_v1', 'consentType', 'Consent type', 'SELECT', true, '["FINANCIAL_POLICY","GENERAL_TREATMENT","RELEASE_OF_INFORMATION"]'::jsonb, 10, null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formfield_consent_signer', 'formtmpl_financial_consent_v1', 'signedByName', 'Signer name', 'TEXT', true, null, 20, null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsFormFieldMapping" ("id", "fieldId", "targetModel", "targetField", "transformRule", "reviewRequired", "createdAt", "updatedAt")
VALUES
  ('formmap_intake_phone', 'formfield_intake_phone', 'PmsPatient', 'phone', null, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formmap_intake_email', 'formfield_intake_email', 'PmsPatient', 'email', null, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formmap_intake_emergency_name', 'formfield_intake_emergency_name', 'PmsPatient', 'emergencyContactName', null, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formmap_intake_emergency_phone', 'formfield_intake_emergency_phone', 'PmsPatient', 'emergencyContactPhone', null, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formmap_intake_sms_consent', 'formfield_intake_sms_consent', 'PmsPatientCommunicationPreference', 'SMS.consentStatus', null, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formmap_intake_patient_note', 'formfield_intake_patient_note', 'PmsPatient', 'patientNote', null, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formmap_med_condition', 'formfield_med_condition', 'PmsMedicalHistoryEntry', 'condition', null, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formmap_med_allergy', 'formfield_med_allergy', 'PmsAllergy', 'allergen', null, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formmap_consent_type', 'formfield_consent_type', 'PmsPatientConsent', 'consentType', null, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsFormAssignment" ("id", "tenantId", "patientId", "templateId", "status", "assignedByRole", "dueAt", "createdAt", "updatedAt")
VALUES
  ('formassign_sample_001_intake', 'tenant_1dentalai_production', 'pat_sample_001', 'formtmpl_new_patient_intake_v1', 'ASSIGNED', 'front_desk', CURRENT_TIMESTAMP + interval '2 days', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('formassign_sample_010_medical', 'tenant_1dentalai_production', 'pat_sample_010', 'formtmpl_medical_history_v1', 'ASSIGNED', 'front_desk', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
