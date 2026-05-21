CREATE TABLE "PmsAppointmentCategory" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "defaultMinutes" INTEGER NOT NULL,
  "productionType" TEXT NOT NULL,
  "defaultProcedureCodes" TEXT[],
  "providerType" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsAppointmentCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsBlockout" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "operatoryId" TEXT,
  "providerId" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "blockType" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsBlockout_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsAppointmentStatusHistory" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsAppointmentStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsAppointmentRequest" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT,
  "requestType" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "preferredWindow" TEXT,
  "urgency" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsAppointmentRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsRecall" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "recallType" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DUE',
  "procedureCodes" TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsRecall_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsLabCase" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "patientId" TEXT,
  "appointmentId" TEXT,
  "labName" TEXT NOT NULL,
  "caseType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ORDERED',
  "dueDate" TIMESTAMP(3),
  "trackingNumber" TEXT,
  "shade" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsLabCase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PmsAppointmentCategory_tenantId_name_key" ON "PmsAppointmentCategory"("tenantId", "name");
CREATE INDEX "PmsAppointmentCategory_tenantId_active_idx" ON "PmsAppointmentCategory"("tenantId", "active");
CREATE INDEX "PmsBlockout_tenantId_startsAt_idx" ON "PmsBlockout"("tenantId", "startsAt");
CREATE INDEX "PmsBlockout_operatoryId_startsAt_idx" ON "PmsBlockout"("operatoryId", "startsAt");
CREATE INDEX "PmsAppointmentStatusHistory_appointmentId_createdAt_idx" ON "PmsAppointmentStatusHistory"("appointmentId", "createdAt");
CREATE INDEX "PmsAppointmentRequest_tenantId_status_urgency_idx" ON "PmsAppointmentRequest"("tenantId", "status", "urgency");
CREATE INDEX "PmsRecall_tenantId_status_dueDate_idx" ON "PmsRecall"("tenantId", "status", "dueDate");
CREATE INDEX "PmsRecall_patientId_recallType_idx" ON "PmsRecall"("patientId", "recallType");
CREATE INDEX "PmsLabCase_tenantId_status_dueDate_idx" ON "PmsLabCase"("tenantId", "status", "dueDate");
CREATE INDEX "PmsLabCase_appointmentId_idx" ON "PmsLabCase"("appointmentId");

INSERT INTO "PmsAppointmentCategory"
  ("id", "tenantId", "name", "color", "defaultMinutes", "productionType", "defaultProcedureCodes", "providerType", "createdAt", "updatedAt")
VALUES
  ('apptcat_new_patient', 'tenant_1dentalai_production', 'New patient exam', '#0f766e', 90, 'DIAGNOSTIC', ARRAY['D0150','D0210'], 'DENTIST', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('apptcat_hygiene_recall', 'tenant_1dentalai_production', 'Hygiene recall', '#2563eb', 60, 'HYGIENE', ARRAY['D0120','D1110'], 'RDH', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('apptcat_perio_maintenance', 'tenant_1dentalai_production', 'Perio maintenance', '#7c3aed', 60, 'HYGIENE', ARRAY['D4910'], 'RDH', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('apptcat_restorative', 'tenant_1dentalai_production', 'Restorative treatment', '#ea580c', 90, 'DOCTOR', ARRAY['D2392'], 'DENTIST', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('apptcat_emergency', 'tenant_1dentalai_production', 'Emergency exam', '#dc2626', 40, 'DOCTOR', ARRAY['D0140'], 'DENTIST', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('apptcat_crown_seat', 'tenant_1dentalai_production', 'Crown seat', '#ca8a04', 45, 'DOCTOR', ARRAY['D2740'], 'DENTIST', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("tenantId", "name") DO UPDATE SET
  "color" = excluded."color",
  "defaultMinutes" = excluded."defaultMinutes",
  "productionType" = excluded."productionType",
  "defaultProcedureCodes" = excluded."defaultProcedureCodes",
  "providerType" = excluded."providerType",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "PmsBlockout"
  ("id", "tenantId", "operatoryId", "providerId", "startsAt", "endsAt", "reason", "blockType", "createdAt", "updatedAt")
VALUES
  ('block_lunch_op1', 'tenant_1dentalai_production', 'op_1', null, date_trunc('day', CURRENT_TIMESTAMP) + interval '12 hours', date_trunc('day', CURRENT_TIMESTAMP) + interval '13 hours', 'Lunch', 'CLOSED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('block_lunch_op2', 'tenant_1dentalai_production', 'op_2', null, date_trunc('day', CURRENT_TIMESTAMP) + interval '12 hours', date_trunc('day', CURRENT_TIMESTAMP) + interval '13 hours', 'Lunch', 'CLOSED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('block_lunch_hyg', 'tenant_1dentalai_production', 'op_hygiene', null, date_trunc('day', CURRENT_TIMESTAMP) + interval '12 hours', date_trunc('day', CURRENT_TIMESTAMP) + interval '13 hours', 'Lunch', 'CLOSED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
