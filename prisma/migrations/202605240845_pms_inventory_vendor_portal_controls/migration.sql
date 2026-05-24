ALTER TABLE "PmsInventoryVendor"
  ADD COLUMN IF NOT EXISTS "portalStatus" TEXT NOT NULL DEFAULT 'INVITED',
  ADD COLUMN IF NOT EXISTS "portalToken" TEXT,
  ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT NOT NULL DEFAULT 'NOT_SUBSCRIBED',
  ADD COLUMN IF NOT EXISTS "subscriptionPlan" TEXT,
  ADD COLUMN IF NOT EXISTS "marketplaceFeeBps" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);

ALTER TABLE "PmsInventoryCatalogItem"
  ADD COLUMN IF NOT EXISTS "barcodeValue" TEXT;

ALTER TABLE "PmsInventoryLot"
  ADD COLUMN IF NOT EXISTS "barcodeValue" TEXT;

ALTER TABLE "PmsInventoryAsset"
  ADD COLUMN IF NOT EXISTS "barcodeValue" TEXT;

ALTER TABLE "PmsInventoryPurchaseOrder"
  ADD COLUMN IF NOT EXISTS "approvedByRole" TEXT,
  ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "receivedByRole" TEXT;

ALTER TABLE "PmsInventoryVendorBid"
  ADD COLUMN IF NOT EXISTS "lineItems" JSONB,
  ADD COLUMN IF NOT EXISTS "submittedByName" TEXT,
  ADD COLUMN IF NOT EXISTS "submittedByEmail" TEXT;

CREATE TABLE IF NOT EXISTS "PmsInventoryCycleCount" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "countNumber" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "locationId" TEXT,
  "startedByRole" TEXT NOT NULL,
  "completedByRole" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "varianceCents" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsInventoryCycleCount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PmsInventoryCycleCountLine" (
  "id" TEXT NOT NULL,
  "cycleCountId" TEXT NOT NULL,
  "lotId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "expectedQty" DECIMAL(10,2) NOT NULL,
  "countedQty" DECIMAL(10,2) NOT NULL,
  "varianceQty" DECIMAL(10,2) NOT NULL,
  "unitCostCents" INTEGER NOT NULL DEFAULT 0,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsInventoryCycleCountLine_pkey" PRIMARY KEY ("id")
);

UPDATE "PmsInventoryVendor"
SET "portalToken" = concat('vendor_', lower(replace(substr(md5("id"), 1, 24), '-', ''))),
    "portalStatus" = CASE WHEN "marketplaceStatus" = 'MARKETPLACE_VENDOR' THEN 'ACTIVE' ELSE "portalStatus" END,
    "subscriptionStatus" = CASE WHEN "marketplaceStatus" = 'MARKETPLACE_VENDOR' THEN 'ACTIVE' ELSE "subscriptionStatus" END,
    "subscriptionPlan" = CASE WHEN "marketplaceStatus" = 'MARKETPLACE_VENDOR' THEN coalesce("subscriptionPlan", 'MARKETPLACE_SELLER') ELSE "subscriptionPlan" END,
    "marketplaceFeeBps" = CASE WHEN "marketplaceStatus" = 'MARKETPLACE_VENDOR' THEN greatest("marketplaceFeeBps", 250) ELSE "marketplaceFeeBps" END,
    "verifiedAt" = CASE WHEN "marketplaceStatus" = 'MARKETPLACE_VENDOR' THEN coalesce("verifiedAt", CURRENT_TIMESTAMP) ELSE "verifiedAt" END
WHERE "portalToken" IS NULL;

UPDATE "PmsInventoryCatalogItem"
SET "barcodeValue" = concat('1DAI-ITEM-', upper(substr(md5("id"), 1, 10)))
WHERE "barcodeValue" IS NULL;

UPDATE "PmsInventoryLot"
SET "barcodeValue" = concat('1DAI-LOT-', upper(substr(md5("id"), 1, 10)))
WHERE "barcodeValue" IS NULL;

UPDATE "PmsInventoryAsset"
SET "barcodeValue" = concat('1DAI-ASSET-', upper(substr(md5("id"), 1, 10)))
WHERE "barcodeValue" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "PmsInventoryVendor_portalToken_key" ON "PmsInventoryVendor"("portalToken");
CREATE INDEX IF NOT EXISTS "PmsInventoryVendor_tenantId_portalStatus_idx" ON "PmsInventoryVendor"("tenantId", "portalStatus");
CREATE INDEX IF NOT EXISTS "PmsInventoryVendor_subscriptionStatus_idx" ON "PmsInventoryVendor"("subscriptionStatus");
CREATE UNIQUE INDEX IF NOT EXISTS "PmsInventoryCatalogItem_tenantId_barcodeValue_key" ON "PmsInventoryCatalogItem"("tenantId", "barcodeValue");
CREATE UNIQUE INDEX IF NOT EXISTS "PmsInventoryLot_tenantId_barcodeValue_key" ON "PmsInventoryLot"("tenantId", "barcodeValue");
CREATE UNIQUE INDEX IF NOT EXISTS "PmsInventoryAsset_tenantId_barcodeValue_key" ON "PmsInventoryAsset"("tenantId", "barcodeValue");
CREATE INDEX IF NOT EXISTS "PmsInventoryCycleCount_tenantId_status_idx" ON "PmsInventoryCycleCount"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "PmsInventoryCycleCount_tenantId_startedAt_idx" ON "PmsInventoryCycleCount"("tenantId", "startedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "PmsInventoryCycleCount_tenantId_countNumber_key" ON "PmsInventoryCycleCount"("tenantId", "countNumber");
CREATE INDEX IF NOT EXISTS "PmsInventoryCycleCountLine_cycleCountId_idx" ON "PmsInventoryCycleCountLine"("cycleCountId");
CREATE INDEX IF NOT EXISTS "PmsInventoryCycleCountLine_lotId_idx" ON "PmsInventoryCycleCountLine"("lotId");
CREATE INDEX IF NOT EXISTS "PmsInventoryCycleCountLine_itemId_idx" ON "PmsInventoryCycleCountLine"("itemId");

INSERT INTO "PmsInventoryCycleCount"
  ("id", "tenantId", "countNumber", "status", "locationId", "startedByRole", "completedByRole", "completedAt", "varianceCents", "notes", "createdAt", "updatedAt")
SELECT 'inv_count_seed_main', 'tenant_1dentalai_production', 'COUNT-2026-0001', 'COMPLETED',
       (SELECT "id" FROM "PmsInventoryStockLocation" WHERE "tenantId" = 'tenant_1dentalai_production' ORDER BY "createdAt" LIMIT 1),
       'practice_manager', 'practice_manager', CURRENT_TIMESTAMP, 0,
       'Seed cycle count validates barcode-controlled inventory workflow.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "PmsInventoryCycleCount" WHERE "id" = 'inv_count_seed_main');
