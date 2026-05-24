CREATE TABLE "PmsPatientGeoCoordinate" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "familyAccountId" TEXT NOT NULL,
  "addressHash" TEXT NOT NULL,
  "formattedAddress" TEXT,
  "latitude" DECIMAL(10,7),
  "longitude" DECIMAL(10,7),
  "precision" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "source" TEXT NOT NULL DEFAULT 'GOOGLE_GEOCODING',
  "failureReason" TEXT,
  "geocodedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsPatientGeoCoordinate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PmsPatientGeoCoordinate_tenantId_familyAccountId_key"
  ON "PmsPatientGeoCoordinate"("tenantId", "familyAccountId");

CREATE INDEX "PmsPatientGeoCoordinate_tenantId_status_idx"
  ON "PmsPatientGeoCoordinate"("tenantId", "status");

CREATE INDEX "PmsPatientGeoCoordinate_latitude_longitude_idx"
  ON "PmsPatientGeoCoordinate"("latitude", "longitude");
