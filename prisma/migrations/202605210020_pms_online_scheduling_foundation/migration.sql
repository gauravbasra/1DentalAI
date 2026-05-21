CREATE TABLE IF NOT EXISTS "PmsOnlineSchedulingLink" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "audience" TEXT NOT NULL DEFAULT 'ALL_PATIENTS',
  "sourceChannel" TEXT NOT NULL DEFAULT 'WEBSITE',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "appointmentCategoryId" TEXT,
  "providerId" TEXT,
  "locationId" TEXT,
  "earliestBookingDays" INTEGER NOT NULL DEFAULT 1,
  "maxBookingDays" INTEGER NOT NULL DEFAULT 21,
  "slotIntervalMinutes" INTEGER NOT NULL DEFAULT 30,
  "reservationFeeCents" INTEGER NOT NULL DEFAULT 0,
  "requiresInsurance" BOOLEAN NOT NULL DEFAULT false,
  "acceptedPayerNames" JSONB,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "PmsOnlineSchedulingLink_tenantId_slug_key"
  ON "PmsOnlineSchedulingLink" ("tenantId", "slug");
CREATE INDEX IF NOT EXISTS "PmsOnlineSchedulingLink_tenantId_status_sourceChannel_idx"
  ON "PmsOnlineSchedulingLink" ("tenantId", "status", "sourceChannel");
CREATE INDEX IF NOT EXISTS "PmsOnlineSchedulingLink_appointmentCategoryId_providerId_idx"
  ON "PmsOnlineSchedulingLink" ("appointmentCategoryId", "providerId");

CREATE TABLE IF NOT EXISTS "PmsOnlineBooking" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "linkId" TEXT NOT NULL,
  "appointmentId" TEXT,
  "patientId" TEXT,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "dateOfBirth" TIMESTAMP(3),
  "phone" TEXT,
  "email" TEXT,
  "isReturningPatient" BOOLEAN NOT NULL DEFAULT false,
  "appointmentCategoryId" TEXT,
  "providerId" TEXT,
  "operatoryId" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'BOOKED',
  "patientNote" TEXT,
  "insurancePayerName" TEXT,
  "subscriberId" TEXT,
  "eligibilityStatus" TEXT NOT NULL DEFAULT 'NOT_CHECKED',
  "reservationFeeCents" INTEGER NOT NULL DEFAULT 0,
  "reservationPaymentStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
  "sourceChannel" TEXT NOT NULL DEFAULT 'WEBSITE',
  "utmSource" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PmsOnlineBooking_tenantId_createdAt_idx"
  ON "PmsOnlineBooking" ("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "PmsOnlineBooking_linkId_status_idx"
  ON "PmsOnlineBooking" ("linkId", "status");
CREATE INDEX IF NOT EXISTS "PmsOnlineBooking_patientId_startsAt_idx"
  ON "PmsOnlineBooking" ("patientId", "startsAt");
CREATE INDEX IF NOT EXISTS "PmsOnlineBooking_appointmentId_idx"
  ON "PmsOnlineBooking" ("appointmentId");

CREATE TABLE IF NOT EXISTS "PmsSchedulingInviteCampaign" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "linkId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "audienceFilter" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "earliestBookingDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PmsSchedulingInviteCampaign_tenantId_status_channel_idx"
  ON "PmsSchedulingInviteCampaign" ("tenantId", "status", "channel");
CREATE INDEX IF NOT EXISTS "PmsSchedulingInviteCampaign_linkId_idx"
  ON "PmsSchedulingInviteCampaign" ("linkId");

CREATE TABLE IF NOT EXISTS "PmsSchedulingInviteRecipient" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'STAGED',
  "clickedAt" TIMESTAMP(3),
  "bookedAt" TIMESTAMP(3),
  "appointmentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PmsSchedulingInviteRecipient_campaignId_status_idx"
  ON "PmsSchedulingInviteRecipient" ("campaignId", "status");
CREATE INDEX IF NOT EXISTS "PmsSchedulingInviteRecipient_patientId_status_idx"
  ON "PmsSchedulingInviteRecipient" ("patientId", "status");

INSERT INTO "PmsOnlineSchedulingLink"
  ("id", "tenantId", "slug", "title", "audience", "sourceChannel", "status", "appointmentCategoryId", "providerId", "locationId", "earliestBookingDays", "maxBookingDays", "slotIntervalMinutes", "reservationFeeCents", "requiresInsurance", "acceptedPayerNames", "notes", "createdAt", "updatedAt")
VALUES
  ('oslink_new_patient_exam', 'tenant_1dentalai_production', 'new-patient-exam', 'New patient exam', 'NEW_PATIENTS', 'WEBSITE', 'ACTIVE', 'cat_new_patient', null, 'loc_primary', 1, 21, 30, 0, true, '["Delta Dental","Aetna Dental","Cigna Dental"]'::jsonb, 'Website, Google Business Profile, and social booking link for new-patient exams.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('oslink_hygiene_recare', 'tenant_1dentalai_production', 'hygiene-recare', 'Hygiene recare', 'EXISTING_PATIENTS', 'RECALL', 'ACTIVE', 'cat_hygiene', 'provider_sample_hyg_santos', 'loc_primary', 1, 45, 30, 0, false, null, 'Specific link used in recall reminders and unscheduled hygiene outreach.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('oslink_emergency_exam', 'tenant_1dentalai_production', 'emergency-exam', 'Emergency exam', 'ALL_PATIENTS', 'GOOGLE', 'ACTIVE', 'cat_emergency', null, 'loc_primary', 0, 7, 30, 2500, false, null, 'Reserve-with-search style link for high-intent emergency appointments with a reservation fee policy.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("tenantId", "slug") DO UPDATE SET
  "title" = excluded."title",
  "audience" = excluded."audience",
  "sourceChannel" = excluded."sourceChannel",
  "status" = excluded."status",
  "appointmentCategoryId" = excluded."appointmentCategoryId",
  "providerId" = excluded."providerId",
  "locationId" = excluded."locationId",
  "earliestBookingDays" = excluded."earliestBookingDays",
  "maxBookingDays" = excluded."maxBookingDays",
  "slotIntervalMinutes" = excluded."slotIntervalMinutes",
  "reservationFeeCents" = excluded."reservationFeeCents",
  "requiresInsurance" = excluded."requiresInsurance",
  "acceptedPayerNames" = excluded."acceptedPayerNames",
  "notes" = excluded."notes",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "PmsSchedulingInviteCampaign"
  ("id", "tenantId", "linkId", "name", "audienceFilter", "channel", "status", "earliestBookingDate", "createdAt", "updatedAt")
VALUES
  ('oscamp_unscheduled_hygiene', 'tenant_1dentalai_production', 'oslink_hygiene_recare', 'Unscheduled hygiene recare list', 'ACTIVE_PATIENT_NO_FUTURE_APPOINTMENT_WITH_HYGIENE_RECALL', 'STAGED_SMS_EMAIL', 'DRAFT', CURRENT_DATE + interval '7 days', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
