CREATE TABLE IF NOT EXISTS "PmsPatientMapSavedSegment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "segmentName" TEXT NOT NULL,
  "filters" JSONB NOT NULL,
  "description" TEXT,
  "createdByRole" TEXT NOT NULL,
  "lastRunAt" TIMESTAMP(3),
  "lastPatientCount" INTEGER NOT NULL DEFAULT 0,
  "lastValueCents" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsPatientMapSavedSegment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PmsPatientMapReportSnapshot" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "segmentId" TEXT,
  "reportName" TEXT NOT NULL,
  "filters" JSONB NOT NULL,
  "mappedFamilies" INTEGER NOT NULL DEFAULT 0,
  "mappedPatients" INTEGER NOT NULL DEFAULT 0,
  "productionCents" INTEGER NOT NULL DEFAULT 0,
  "treatmentCents" INTEGER NOT NULL DEFAULT 0,
  "payload" JSONB NOT NULL,
  "createdByRole" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsPatientMapReportSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PmsPatientMapSavedSegment_tenantId_status_idx"
  ON "PmsPatientMapSavedSegment"("tenantId", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "PmsPatientMapSavedSegment_tenantId_segmentName_key"
  ON "PmsPatientMapSavedSegment"("tenantId", "segmentName");

CREATE INDEX IF NOT EXISTS "PmsPatientMapReportSnapshot_tenantId_createdAt_idx"
  ON "PmsPatientMapReportSnapshot"("tenantId", "createdAt");

CREATE INDEX IF NOT EXISTS "PmsPatientMapReportSnapshot_segmentId_idx"
  ON "PmsPatientMapReportSnapshot"("segmentId");
