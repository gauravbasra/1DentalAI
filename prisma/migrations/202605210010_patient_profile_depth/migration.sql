CREATE TABLE IF NOT EXISTS "PmsPatientCommunicationPreference" (
  "id" TEXT PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "consentStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "priority" INTEGER NOT NULL DEFAULT 1,
  "quietHoursStart" TEXT,
  "quietHoursEnd" TEXT,
  "source" TEXT,
  "lastConfirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "PmsPatientCommunicationPreference_patientId_channel_destination_key"
  ON "PmsPatientCommunicationPreference" ("patientId", "channel", "destination");
CREATE INDEX IF NOT EXISTS "PmsPatientCommunicationPreference_patientId_channel_idx"
  ON "PmsPatientCommunicationPreference" ("patientId", "channel");

CREATE TABLE IF NOT EXISTS "PmsPatientConsent" (
  "id" TEXT PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "consentType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'NEEDS_SIGNATURE',
  "sourceDocumentId" TEXT,
  "signedByName" TEXT,
  "signedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PmsPatientConsent_patientId_consentType_status_idx"
  ON "PmsPatientConsent" ("patientId", "consentType", "status");

CREATE TABLE IF NOT EXISTS "PmsMedicalHistoryEntry" (
  "id" TEXT PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "condition" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "severity" TEXT,
  "onsetDate" TIMESTAMP(3),
  "resolvedDate" TIMESTAMP(3),
  "notes" TEXT,
  "source" TEXT NOT NULL DEFAULT 'STAFF_ENTERED',
  "reviewedByRole" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PmsMedicalHistoryEntry_patientId_category_status_idx"
  ON "PmsMedicalHistoryEntry" ("patientId", "category", "status");

CREATE TABLE IF NOT EXISTS "PmsPatientPharmacy" (
  "id" TEXT PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "pharmacyName" TEXT NOT NULL,
  "phone" TEXT,
  "fax" TEXT,
  "addressLine1" TEXT,
  "city" TEXT,
  "state" TEXT,
  "postalCode" TEXT,
  "isPreferred" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PmsPatientPharmacy_patientId_isPreferred_idx"
  ON "PmsPatientPharmacy" ("patientId", "isPreferred");

INSERT INTO "PmsPatientCommunicationPreference"
  ("id", "patientId", "channel", "destination", "consentStatus", "priority", "quietHoursStart", "quietHoursEnd", "source", "lastConfirmedAt", "createdAt", "updatedAt")
VALUES
  ('comm_sample_001_sms', 'pat_sample_001', 'SMS', '(303) 555-0101', 'OPTED_IN', 1, '20:00', '08:00', 'INTAKE_FORM', CURRENT_TIMESTAMP - interval '14 days', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('comm_sample_001_email', 'pat_sample_001', 'EMAIL', 'maria.rivera@example.test', 'OPTED_IN', 2, null, null, 'INTAKE_FORM', CURRENT_TIMESTAMP - interval '14 days', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('comm_sample_002_sms', 'pat_sample_002', 'SMS', '(303) 555-0102', 'OPTED_IN', 1, '20:00', '08:00', 'STAFF_VERIFIED', CURRENT_TIMESTAMP - interval '2 days', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('comm_sample_009_sms', 'pat_sample_009', 'SMS', '(303) 555-0109', 'OPTED_IN', 1, '19:00', '08:00', 'INTAKE_FORM', CURRENT_TIMESTAMP - interval '30 days', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsPatientConsent"
  ("id", "patientId", "consentType", "status", "sourceDocumentId", "signedByName", "signedAt", "expiresAt", "createdAt", "updatedAt")
VALUES
  ('consent_sample_001_hipaa', 'pat_sample_001', 'HIPAA_ACKNOWLEDGEMENT', 'SIGNED', null, 'Maria Rivera', CURRENT_TIMESTAMP - interval '14 days', CURRENT_DATE + interval '3 years', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('consent_sample_001_treatment', 'pat_sample_001', 'CROWN_TREATMENT_CONSENT', 'SIGNED', 'doc_sample_001', 'Maria Rivera', CURRENT_TIMESTAMP - interval '1 day', null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('consent_sample_010_emergency', 'pat_sample_010', 'EMERGENCY_TREATMENT_CONSENT', 'NEEDS_SIGNATURE', null, null, null, null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsMedicalHistoryEntry"
  ("id", "patientId", "category", "condition", "status", "severity", "onsetDate", "notes", "source", "reviewedByRole", "reviewedAt", "createdAt", "updatedAt")
VALUES
  ('mh_sample_001_htn', 'pat_sample_001', 'CARDIOVASCULAR', 'Hypertension', 'ACTIVE', 'MODERATE', '2019-01-01', 'Patient reports controlled with medication; check BP before restorative care.', 'INTAKE_FORM', 'associate_provider', CURRENT_TIMESTAMP - interval '1 day', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mh_sample_002_perio', 'pat_sample_002', 'DENTAL_HISTORY', 'Periodontal maintenance', 'ACTIVE', 'MODERATE', '2024-01-01', 'Three month maintenance interval.', 'PROVIDER_REVIEW', 'rdh', CURRENT_TIMESTAMP - interval '2 days', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('mh_sample_010_pain', 'pat_sample_010', 'CURRENT_COMPLAINT', 'Upper-left intermittent pain', 'ACTIVE', 'HIGH', CURRENT_DATE, 'Emergency exam scheduled; radiographs ordered.', 'PHONE_INTAKE', 'front_desk', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsPatientPharmacy"
  ("id", "patientId", "pharmacyName", "phone", "fax", "addressLine1", "city", "state", "postalCode", "isPreferred", "notes", "createdAt", "updatedAt")
VALUES
  ('pharm_sample_001', 'pat_sample_001', 'Pearl Street Pharmacy', '(303) 555-3201', '(303) 555-3202', '1301 Pearl Street', 'Denver', 'CO', '80203', true, 'Prefers electronic prescriptions.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pharm_sample_010', 'pat_sample_010', 'Downtown Pharmacy', '(303) 555-3300', '(303) 555-3301', '1500 Blake Street', 'Denver', 'CO', '80202', true, 'Emergency prescriptions after 5 PM accepted.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
