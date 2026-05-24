CREATE TABLE "PmsInventoryVendor" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "vendorName" TEXT NOT NULL,
  "vendorType" TEXT NOT NULL,
  "marketplaceStatus" TEXT NOT NULL DEFAULT 'PRIVATE_VENDOR',
  "contactName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "website" TEXT,
  "paymentTerms" TEXT,
  "reliabilityScore" INTEGER NOT NULL DEFAULT 80,
  "averageLeadDays" INTEGER NOT NULL DEFAULT 5,
  "contractExpiresAt" TIMESTAMP(3),
  "complianceStatus" TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsInventoryVendor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsInventoryCatalogItem" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "vendorId" TEXT,
  "sku" TEXT NOT NULL,
  "itemName" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "clinicalUse" TEXT,
  "itemType" TEXT NOT NULL DEFAULT 'CONSUMABLE',
  "unitOfMeasure" TEXT NOT NULL DEFAULT 'each',
  "reorderPoint" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "parLevel" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "lastUnitCostCents" INTEGER NOT NULL DEFAULT 0,
  "benchmarkCostCents" INTEGER,
  "taxable" BOOLEAN NOT NULL DEFAULT false,
  "requiresLotTracking" BOOLEAN NOT NULL DEFAULT false,
  "requiresExpiry" BOOLEAN NOT NULL DEFAULT false,
  "controlledSubstance" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsInventoryCatalogItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsInventoryStockLocation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "locationName" TEXT NOT NULL,
  "locationType" TEXT NOT NULL DEFAULT 'STORAGE',
  "operatoryId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsInventoryStockLocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsInventoryLot" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "vendorId" TEXT,
  "locationId" TEXT NOT NULL,
  "lotNumber" TEXT,
  "serialNumber" TEXT,
  "expirationDate" TIMESTAMP(3),
  "quantityOnHand" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "unitCostCents" INTEGER NOT NULL DEFAULT 0,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsInventoryLot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsInventoryMovement" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "lotId" TEXT,
  "fromLocationId" TEXT,
  "toLocationId" TEXT,
  "patientId" TEXT,
  "appointmentId" TEXT,
  "procedureCode" TEXT,
  "movementType" TEXT NOT NULL,
  "quantity" DECIMAL(12, 2) NOT NULL,
  "unitCostCents" INTEGER NOT NULL DEFAULT 0,
  "reason" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsInventoryMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsInventoryAsset" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "vendorId" TEXT,
  "locationId" TEXT,
  "assetTag" TEXT NOT NULL,
  "assetName" TEXT NOT NULL,
  "assetType" TEXT NOT NULL,
  "manufacturer" TEXT,
  "modelNumber" TEXT,
  "serialNumber" TEXT,
  "purchaseDate" TIMESTAMP(3),
  "purchaseCostCents" INTEGER NOT NULL DEFAULT 0,
  "warrantyExpiresAt" TIMESTAMP(3),
  "maintenanceIntervalDays" INTEGER NOT NULL DEFAULT 180,
  "nextMaintenanceAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "downtimeRisk" TEXT NOT NULL DEFAULT 'LOW',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsInventoryAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsInventoryPurchaseOrder" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "poNumber" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "requestedByRole" TEXT NOT NULL,
  "subtotalCents" INTEGER NOT NULL DEFAULT 0,
  "taxCents" INTEGER NOT NULL DEFAULT 0,
  "shippingCents" INTEGER NOT NULL DEFAULT 0,
  "totalCents" INTEGER NOT NULL DEFAULT 0,
  "expectedDeliveryAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsInventoryPurchaseOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsInventoryPurchaseOrderLine" (
  "id" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "quantity" DECIMAL(12, 2) NOT NULL,
  "unitCostCents" INTEGER NOT NULL,
  "receivedQuantity" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "lineTotalCents" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsInventoryPurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsInventoryRfp" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "rfpNumber" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "category" TEXT NOT NULL,
  "releaseMode" TEXT NOT NULL DEFAULT 'PRIVATE',
  "responseDueAt" TIMESTAMP(3),
  "evaluationCriteria" JSONB,
  "awardedVendorId" TEXT,
  "projectedSpendCents" INTEGER NOT NULL DEFAULT 0,
  "createdByRole" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsInventoryRfp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsInventoryRfpLine" (
  "id" TEXT NOT NULL,
  "rfpId" TEXT NOT NULL,
  "itemId" TEXT,
  "itemName" TEXT NOT NULL,
  "quantity" DECIMAL(12, 2) NOT NULL,
  "requirements" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsInventoryRfpLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsInventoryVendorBid" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "rfpId" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
  "bidTotalCents" INTEGER NOT NULL DEFAULT 0,
  "leadDays" INTEGER NOT NULL DEFAULT 5,
  "warrantyTerms" TEXT,
  "notes" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsInventoryVendorBid_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PmsInventoryBenchmarkSnapshot" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "itemCategory" TEXT NOT NULL,
  "metricName" TEXT NOT NULL,
  "practiceValue" DECIMAL(12, 2) NOT NULL,
  "benchmarkMedianValue" DECIMAL(12, 2) NOT NULL,
  "percentile" INTEGER NOT NULL DEFAULT 50,
  "peerGroup" TEXT NOT NULL DEFAULT 'GENERAL_DENTAL',
  "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" TEXT NOT NULL DEFAULT '1DENTALAI_NETWORK',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsInventoryBenchmarkSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PmsInventoryVendor_tenantId_marketplaceStatus_idx" ON "PmsInventoryVendor"("tenantId", "marketplaceStatus");
CREATE INDEX "PmsInventoryVendor_tenantId_vendorType_idx" ON "PmsInventoryVendor"("tenantId", "vendorType");
CREATE UNIQUE INDEX "PmsInventoryVendor_tenantId_vendorName_key" ON "PmsInventoryVendor"("tenantId", "vendorName");

CREATE INDEX "PmsInventoryCatalogItem_tenantId_category_idx" ON "PmsInventoryCatalogItem"("tenantId", "category");
CREATE INDEX "PmsInventoryCatalogItem_tenantId_status_idx" ON "PmsInventoryCatalogItem"("tenantId", "status");
CREATE UNIQUE INDEX "PmsInventoryCatalogItem_tenantId_sku_key" ON "PmsInventoryCatalogItem"("tenantId", "sku");

CREATE INDEX "PmsInventoryStockLocation_tenantId_status_idx" ON "PmsInventoryStockLocation"("tenantId", "status");
CREATE UNIQUE INDEX "PmsInventoryStockLocation_tenantId_locationName_key" ON "PmsInventoryStockLocation"("tenantId", "locationName");

CREATE INDEX "PmsInventoryLot_tenantId_itemId_status_idx" ON "PmsInventoryLot"("tenantId", "itemId", "status");
CREATE INDEX "PmsInventoryLot_tenantId_expirationDate_idx" ON "PmsInventoryLot"("tenantId", "expirationDate");
CREATE INDEX "PmsInventoryLot_tenantId_locationId_idx" ON "PmsInventoryLot"("tenantId", "locationId");

CREATE INDEX "PmsInventoryMovement_tenantId_itemId_createdAt_idx" ON "PmsInventoryMovement"("tenantId", "itemId", "createdAt");
CREATE INDEX "PmsInventoryMovement_tenantId_movementType_createdAt_idx" ON "PmsInventoryMovement"("tenantId", "movementType", "createdAt");
CREATE INDEX "PmsInventoryMovement_patientId_createdAt_idx" ON "PmsInventoryMovement"("patientId", "createdAt");

CREATE INDEX "PmsInventoryAsset_tenantId_status_idx" ON "PmsInventoryAsset"("tenantId", "status");
CREATE INDEX "PmsInventoryAsset_tenantId_nextMaintenanceAt_idx" ON "PmsInventoryAsset"("tenantId", "nextMaintenanceAt");
CREATE UNIQUE INDEX "PmsInventoryAsset_tenantId_assetTag_key" ON "PmsInventoryAsset"("tenantId", "assetTag");

CREATE INDEX "PmsInventoryPurchaseOrder_tenantId_status_idx" ON "PmsInventoryPurchaseOrder"("tenantId", "status");
CREATE INDEX "PmsInventoryPurchaseOrder_tenantId_expectedDeliveryAt_idx" ON "PmsInventoryPurchaseOrder"("tenantId", "expectedDeliveryAt");
CREATE UNIQUE INDEX "PmsInventoryPurchaseOrder_tenantId_poNumber_key" ON "PmsInventoryPurchaseOrder"("tenantId", "poNumber");
CREATE INDEX "PmsInventoryPurchaseOrderLine_purchaseOrderId_idx" ON "PmsInventoryPurchaseOrderLine"("purchaseOrderId");
CREATE INDEX "PmsInventoryPurchaseOrderLine_itemId_idx" ON "PmsInventoryPurchaseOrderLine"("itemId");

CREATE INDEX "PmsInventoryRfp_tenantId_status_idx" ON "PmsInventoryRfp"("tenantId", "status");
CREATE INDEX "PmsInventoryRfp_tenantId_category_idx" ON "PmsInventoryRfp"("tenantId", "category");
CREATE UNIQUE INDEX "PmsInventoryRfp_tenantId_rfpNumber_key" ON "PmsInventoryRfp"("tenantId", "rfpNumber");
CREATE INDEX "PmsInventoryRfpLine_rfpId_idx" ON "PmsInventoryRfpLine"("rfpId");
CREATE INDEX "PmsInventoryVendorBid_tenantId_status_idx" ON "PmsInventoryVendorBid"("tenantId", "status");
CREATE INDEX "PmsInventoryVendorBid_rfpId_idx" ON "PmsInventoryVendorBid"("rfpId");
CREATE UNIQUE INDEX "PmsInventoryVendorBid_rfpId_vendorId_key" ON "PmsInventoryVendorBid"("rfpId", "vendorId");
CREATE INDEX "PmsInventoryBenchmarkSnapshot_tenantId_itemCategory_metricName_idx" ON "PmsInventoryBenchmarkSnapshot"("tenantId", "itemCategory", "metricName");
CREATE INDEX "PmsInventoryBenchmarkSnapshot_snapshotDate_idx" ON "PmsInventoryBenchmarkSnapshot"("snapshotDate");

INSERT INTO "PmsInventoryVendor"
  ("id", "tenantId", "vendorName", "vendorType", "marketplaceStatus", "contactName", "email", "phone", "website", "paymentTerms", "reliabilityScore", "averageLeadDays", "complianceStatus", "notes", "createdAt", "updatedAt")
VALUES
  ('inv_vendor_henry_schein', 'tenant_1dentalai_production', 'Henry Schein Dental', 'SUPPLIES', 'MARKETPLACE_VENDOR', 'Marketplace Desk', 'dental@example.test', '(800) 555-1100', 'https://www.henryschein.com', 'NET_30', 92, 3, 'APPROVED', 'Primary supplier for restorative, hygiene, and injectable materials.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inv_vendor_patterson', 'tenant_1dentalai_production', 'Patterson Dental', 'EQUIPMENT', 'MARKETPLACE_VENDOR', 'Equipment Desk', 'equipment@example.test', '(800) 555-1200', 'https://www.pattersondental.com', 'NET_30', 88, 5, 'APPROVED', 'Equipment service, chairs, imaging, handpieces.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inv_vendor_benco', 'tenant_1dentalai_production', 'Benco Dental', 'SUPPLIES', 'MARKETPLACE_VENDOR', 'RFP Desk', 'rfp@example.test', '(800) 555-1300', 'https://www.benco.com', 'NET_15', 84, 4, 'APPROVED', 'Marketplace bidder for tenders and bulk supply bundles.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("tenantId", "vendorName") DO NOTHING;

INSERT INTO "PmsInventoryStockLocation"
  ("id", "tenantId", "locationName", "locationType", "operatoryId", "createdAt", "updatedAt")
VALUES
  ('inv_loc_central', 'tenant_1dentalai_production', 'Central sterilization supply', 'STORAGE', null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inv_loc_op1', 'tenant_1dentalai_production', 'Operatory 1 chairside', 'OPERATORY', 'op_1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inv_loc_med', 'tenant_1dentalai_production', 'Medication lockbox', 'CONTROLLED', null, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("tenantId", "locationName") DO NOTHING;

INSERT INTO "PmsInventoryCatalogItem"
  ("id", "tenantId", "vendorId", "sku", "itemName", "category", "clinicalUse", "itemType", "unitOfMeasure", "reorderPoint", "parLevel", "lastUnitCostCents", "benchmarkCostCents", "taxable", "requiresLotTracking", "requiresExpiry", "controlledSubstance", "createdAt", "updatedAt")
VALUES
  ('inv_item_articaine', 'tenant_1dentalai_production', 'inv_vendor_henry_schein', 'MED-ART-4-EP', 'Articaine 4% with epi carpules', 'ANESTHETIC', 'Injections and local anesthesia', 'MEDICATION', 'box', 4, 12, 6899, 6499, false, true, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inv_item_gloves', 'tenant_1dentalai_production', 'inv_vendor_benco', 'PPE-NIT-M', 'Nitrile gloves medium', 'PPE', 'Clinical PPE', 'CONSUMABLE', 'case', 6, 20, 1199, 1099, true, false, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inv_item_implant_kit', 'tenant_1dentalai_production', 'inv_vendor_henry_schein', 'SURG-IMPL-KIT', 'Implant surgical irrigation kit', 'SURGICAL', 'Implant placement and surgical guide procedures', 'CONSUMABLE', 'kit', 2, 8, 4250, 3995, true, true, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inv_item_crown_block', 'tenant_1dentalai_production', 'inv_vendor_patterson', 'CAD-CER-A2', 'Ceramic CAD/CAM block A2', 'RESTORATIVE', 'Same-day crown milling', 'CONSUMABLE', 'block', 10, 30, 1795, 1650, true, true, false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("tenantId", "sku") DO NOTHING;

INSERT INTO "PmsInventoryLot"
  ("id", "tenantId", "itemId", "vendorId", "locationId", "lotNumber", "expirationDate", "quantityOnHand", "unitCostCents", "receivedAt", "createdAt", "updatedAt")
VALUES
  ('inv_lot_articaine_01', 'tenant_1dentalai_production', 'inv_item_articaine', 'inv_vendor_henry_schein', 'inv_loc_med', 'ART-2604-A', CURRENT_DATE + interval '10 months', 5, 6899, CURRENT_TIMESTAMP - interval '12 days', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inv_lot_gloves_01', 'tenant_1dentalai_production', 'inv_item_gloves', 'inv_vendor_benco', 'inv_loc_central', 'GLV-2605-M', null, 8, 1199, CURRENT_TIMESTAMP - interval '8 days', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inv_lot_implant_01', 'tenant_1dentalai_production', 'inv_item_implant_kit', 'inv_vendor_henry_schein', 'inv_loc_central', 'IMPL-2605-1', CURRENT_DATE + interval '5 months', 2, 4250, CURRENT_TIMESTAMP - interval '5 days', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inv_lot_cad_01', 'tenant_1dentalai_production', 'inv_item_crown_block', 'inv_vendor_patterson', 'inv_loc_op1', 'CAD-A2-2605', null, 18, 1795, CURRENT_TIMESTAMP - interval '3 days', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsInventoryAsset"
  ("id", "tenantId", "vendorId", "locationId", "assetTag", "assetName", "assetType", "manufacturer", "modelNumber", "serialNumber", "purchaseDate", "purchaseCostCents", "warrantyExpiresAt", "maintenanceIntervalDays", "nextMaintenanceAt", "status", "downtimeRisk", "notes", "createdAt", "updatedAt")
VALUES
  ('inv_asset_chair_01', 'tenant_1dentalai_production', 'inv_vendor_patterson', 'inv_loc_op1', 'CHAIR-OP1', 'Operatory 1 patient chair', 'CHAIR', 'A-dec', '511', 'ADEMO-511-01', CURRENT_DATE - interval '2 years', 2150000, CURRENT_DATE + interval '1 year', 180, CURRENT_DATE + interval '21 days', 'ACTIVE', 'MEDIUM', 'Hydraulic service due this month.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inv_asset_cbct', 'tenant_1dentalai_production', 'inv_vendor_patterson', 'inv_loc_central', 'IMG-CBCT-01', 'CBCT imaging unit', 'IMAGING', 'Carestream', 'CS 8200 3D', 'CBCT-DEMO-01', CURRENT_DATE - interval '1 year', 7850000, CURRENT_DATE + interval '2 years', 90, CURRENT_DATE + interval '12 days', 'ACTIVE', 'HIGH', 'Calibration certificate required for implant workflow.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inv_asset_autoclave', 'tenant_1dentalai_production', 'inv_vendor_benco', 'inv_loc_central', 'STER-01', 'Sterilization autoclave', 'STERILIZATION', 'Tuttnauer', '3870EA', 'AUTO-DEMO-01', CURRENT_DATE - interval '3 years', 980000, CURRENT_DATE + interval '6 months', 60, CURRENT_DATE + interval '7 days', 'ACTIVE', 'HIGH', 'Daily logs imported into compliance binder.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("tenantId", "assetTag") DO NOTHING;

INSERT INTO "PmsInventoryMovement"
  ("id", "tenantId", "itemId", "lotId", "fromLocationId", "toLocationId", "patientId", "appointmentId", "procedureCode", "movementType", "quantity", "unitCostCents", "reason", "actorRole", "metadata", "createdAt")
VALUES
  ('inv_mov_gloves_use', 'tenant_1dentalai_production', 'inv_item_gloves', 'inv_lot_gloves_01', 'inv_loc_central', null, null, 'appt_sample_002', 'D4910', 'CONSUMED', 1, 1199, 'Perio maintenance room setup', 'rdh', '{"surface":"chairside"}'::jsonb, CURRENT_TIMESTAMP - interval '1 day'),
  ('inv_mov_articaine_use', 'tenant_1dentalai_production', 'inv_item_articaine', 'inv_lot_articaine_01', 'inv_loc_med', null, 'pat_sample_001', 'appt_sample_001', 'D2740', 'CONSUMED', 1, 6899, 'Crown prep anesthesia', 'owner_dentist', '{"carpules":2}'::jsonb, CURRENT_TIMESTAMP - interval '1 day')
ON CONFLICT DO NOTHING;

INSERT INTO "PmsInventoryPurchaseOrder"
  ("id", "tenantId", "vendorId", "poNumber", "status", "requestedByRole", "subtotalCents", "taxCents", "shippingCents", "totalCents", "expectedDeliveryAt", "notes", "createdAt", "updatedAt")
VALUES
  ('inv_po_001', 'tenant_1dentalai_production', 'inv_vendor_henry_schein', 'PO-2026-0001', 'SENT', 'practice_manager', 27596, 0, 1200, 28796, CURRENT_DATE + interval '3 days', 'Auto-reorder anesthetic due to low stock.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("tenantId", "poNumber") DO NOTHING;

INSERT INTO "PmsInventoryPurchaseOrderLine"
  ("id", "purchaseOrderId", "itemId", "quantity", "unitCostCents", "lineTotalCents", "createdAt", "updatedAt")
VALUES
  ('inv_pol_001', 'inv_po_001', 'inv_item_articaine', 4, 6899, 27596, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsInventoryRfp"
  ("id", "tenantId", "rfpNumber", "title", "status", "category", "releaseMode", "responseDueAt", "evaluationCriteria", "projectedSpendCents", "createdByRole", "createdAt", "updatedAt")
VALUES
  ('inv_rfp_001', 'tenant_1dentalai_production', 'RFP-2026-0001', 'Quarterly implant and surgical supply bundle', 'RELEASED', 'SURGICAL', 'MARKETPLACE', CURRENT_DATE + interval '10 days', '{"price":40,"leadTime":25,"compliance":20,"service":15}'::jsonb, 180000, 'practice_manager', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("tenantId", "rfpNumber") DO NOTHING;

INSERT INTO "PmsInventoryRfpLine"
  ("id", "rfpId", "itemId", "itemName", "quantity", "requirements", "createdAt")
VALUES
  ('inv_rfpl_001', 'inv_rfp_001', 'inv_item_implant_kit', 'Implant surgical irrigation kit', 24, 'Sterile, lot tracked, expiry minimum 12 months.', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "PmsInventoryVendorBid"
  ("id", "tenantId", "rfpId", "vendorId", "status", "bidTotalCents", "leadDays", "warrantyTerms", "notes", "submittedAt", "updatedAt")
VALUES
  ('inv_bid_001', 'tenant_1dentalai_production', 'inv_rfp_001', 'inv_vendor_henry_schein', 'SUBMITTED', 96900, 3, 'Manufacturer sterile-pack guarantee.', 'Best lead time, higher unit cost.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inv_bid_002', 'tenant_1dentalai_production', 'inv_rfp_001', 'inv_vendor_benco', 'SUBMITTED', 91200, 5, 'Replacement for expired kits within 30 days.', 'Lower cost, acceptable lead time.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("rfpId", "vendorId") DO NOTHING;

INSERT INTO "PmsInventoryBenchmarkSnapshot"
  ("id", "tenantId", "itemCategory", "metricName", "practiceValue", "benchmarkMedianValue", "percentile", "peerGroup", "source", "createdAt")
VALUES
  ('inv_bench_anesthetic_cost', 'tenant_1dentalai_production', 'ANESTHETIC', 'unit_cost_cents', 6899, 6499, 61, 'GENERAL_DENTAL_4_OPS', '1DENTALAI_NETWORK_SYNTHETIC_BASELINE', CURRENT_TIMESTAMP),
  ('inv_bench_ppe_turns', 'tenant_1dentalai_production', 'PPE', 'monthly_inventory_turns', 1.4, 2.1, 32, 'GENERAL_DENTAL_4_OPS', '1DENTALAI_NETWORK_SYNTHETIC_BASELINE', CURRENT_TIMESTAMP),
  ('inv_bench_asset_downtime', 'tenant_1dentalai_production', 'EQUIPMENT', 'maintenance_days_until_due', 7, 21, 18, 'GENERAL_DENTAL_4_OPS', '1DENTALAI_NETWORK_SYNTHETIC_BASELINE', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
