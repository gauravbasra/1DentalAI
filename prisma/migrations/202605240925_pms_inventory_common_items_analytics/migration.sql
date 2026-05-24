CREATE TABLE IF NOT EXISTS "PmsInventoryCommonItem" (
  "id" TEXT NOT NULL,
  "skuSeed" TEXT NOT NULL,
  "itemName" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "clinicalUse" TEXT NOT NULL,
  "itemType" TEXT NOT NULL DEFAULT 'CONSUMABLE',
  "unitOfMeasure" TEXT NOT NULL DEFAULT 'each',
  "cdtCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "defaultReorderPoint" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "defaultParLevel" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "benchmarkCostCents" INTEGER NOT NULL DEFAULT 0,
  "estimatedUsesPerUnit" INTEGER NOT NULL DEFAULT 1,
  "costBehavior" TEXT NOT NULL DEFAULT 'VARIABLE',
  "wasteRisk" TEXT NOT NULL DEFAULT 'MEDIUM',
  "requiresLotTracking" BOOLEAN NOT NULL DEFAULT false,
  "requiresExpiry" BOOLEAN NOT NULL DEFAULT false,
  "controlledSubstance" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PmsInventoryCommonItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PmsInventoryCommonItem_skuSeed_key" ON "PmsInventoryCommonItem"("skuSeed");
CREATE INDEX IF NOT EXISTS "PmsInventoryCommonItem_category_status_idx" ON "PmsInventoryCommonItem"("category", "status");

ALTER TABLE "PmsInventoryCatalogItem" ADD COLUMN IF NOT EXISTS "commonItemId" TEXT;
ALTER TABLE "PmsInventoryCatalogItem" ADD COLUMN IF NOT EXISTS "estimatedUsesPerUnit" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "PmsInventoryCatalogItem" ADD COLUMN IF NOT EXISTS "costBehavior" TEXT NOT NULL DEFAULT 'VARIABLE';
ALTER TABLE "PmsInventoryCatalogItem" ADD COLUMN IF NOT EXISTS "revenueAttributionMode" TEXT NOT NULL DEFAULT 'CDT_LINKED';
CREATE INDEX IF NOT EXISTS "PmsInventoryCatalogItem_tenantId_commonItemId_idx" ON "PmsInventoryCatalogItem"("tenantId", "commonItemId");

INSERT INTO "PmsInventoryCommonItem" (
  "id", "skuSeed", "itemName", "category", "clinicalUse", "itemType", "unitOfMeasure", "cdtCodes",
  "defaultReorderPoint", "defaultParLevel", "benchmarkCostCents", "estimatedUsesPerUnit", "costBehavior", "wasteRisk",
  "requiresLotTracking", "requiresExpiry", "controlledSubstance", "updatedAt"
)
VALUES
  ('common_gloves_nitrile', 'DENT-PPE-GLOVES-NITRILE', 'Nitrile exam gloves', 'PPE', 'Exam, hygiene, restorative, surgical room turnover', 'CONSUMABLE', 'box', ARRAY['D0120','D0140','D0150','D1110','D1120','D2391','D2392','D2740','D4341','D4910']::TEXT[], 4, 12, 1399, 100, 'VARIABLE', 'LOW', false, false, false, CURRENT_TIMESTAMP),
  ('common_masks_level3', 'DENT-PPE-MASK-L3', 'Level 3 surgical masks', 'PPE', 'Provider and assistant PPE for aerosol and surgical procedures', 'CONSUMABLE', 'box', ARRAY['D1110','D1120','D2391','D2392','D4341','D4910','D7140','D7210']::TEXT[], 4, 10, 1299, 50, 'VARIABLE', 'LOW', false, false, false, CURRENT_TIMESTAMP),
  ('common_anesthetic_lidocaine', 'DENT-ANES-LIDO-2EPI', 'Lidocaine 2% with epinephrine carpules', 'ANESTHETIC', 'Local anesthesia for restorative, endodontic, periodontal, and surgical procedures', 'INJECTION', 'box', ARRAY['D2391','D2392','D2393','D2740','D2950','D3310','D4341','D7140','D7210','D7230']::TEXT[], 2, 8, 4999, 50, 'VARIABLE', 'HIGH', true, true, false, CURRENT_TIMESTAMP),
  ('common_short_needles', 'DENT-ANES-NEEDLE-SHORT', 'Short dental needles', 'ANESTHETIC', 'Local anesthetic delivery', 'INJECTION', 'box', ARRAY['D2391','D2392','D2740','D4341','D7140','D7210']::TEXT[], 2, 6, 1899, 100, 'VARIABLE', 'MEDIUM', true, true, false, CURRENT_TIMESTAMP),
  ('common_long_needles', 'DENT-ANES-NEEDLE-LONG', 'Long dental needles', 'ANESTHETIC', 'Mandibular block anesthesia and surgical procedures', 'INJECTION', 'box', ARRAY['D2740','D3310','D7140','D7210','D7220','D7230']::TEXT[], 1, 4, 1899, 100, 'VARIABLE', 'MEDIUM', true, true, false, CURRENT_TIMESTAMP),
  ('common_composite_capsules', 'DENT-REST-COMP-CAPS', 'Universal composite capsules', 'RESTORATIVE', 'Direct composite restorations', 'CONSUMABLE', 'box', ARRAY['D2330','D2331','D2391','D2392','D2393','D2394']::TEXT[], 2, 8, 6999, 20, 'VARIABLE', 'MEDIUM', true, true, false, CURRENT_TIMESTAMP),
  ('common_bonding_agent', 'DENT-REST-BOND', 'Universal bonding agent', 'RESTORATIVE', 'Bonding for direct and indirect restorations', 'CONSUMABLE', 'bottle', ARRAY['D2391','D2392','D2393','D2740','D2950']::TEXT[], 1, 4, 8999, 120, 'VARIABLE', 'HIGH', true, true, false, CURRENT_TIMESTAMP),
  ('common_etch_gel', 'DENT-REST-ETCH', 'Phosphoric acid etch gel syringes', 'RESTORATIVE', 'Etch step for adhesive dentistry', 'CONSUMABLE', 'pack', ARRAY['D2391','D2392','D2393','D2740','D2950']::TEXT[], 1, 5, 2499, 40, 'VARIABLE', 'MEDIUM', true, true, false, CURRENT_TIMESTAMP),
  ('common_microbrushes', 'DENT-REST-MICROBRUSH', 'Disposable microbrush applicators', 'RESTORATIVE', 'Applicator for bond, liner, medicaments, sealants', 'CONSUMABLE', 'tube', ARRAY['D1351','D2391','D2392','D2740','D2950']::TEXT[], 3, 10, 899, 100, 'VARIABLE', 'LOW', false, false, false, CURRENT_TIMESTAMP),
  ('common_hve_tips', 'DENT-PPE-HVE-TIPS', 'HVE suction tips', 'PPE', 'Aerosol evacuation and four-handed dentistry', 'CONSUMABLE', 'bag', ARRAY['D1110','D1120','D2391','D2740','D4341','D7140','D7210']::TEXT[], 3, 12, 999, 100, 'VARIABLE', 'LOW', false, false, false, CURRENT_TIMESTAMP),
  ('common_saliva_ejectors', 'DENT-PPE-SALIVA-EJECT', 'Saliva ejectors', 'PPE', 'Moisture control in hygiene and restorative procedures', 'CONSUMABLE', 'bag', ARRAY['D1110','D1120','D2391','D2392','D4341','D4910']::TEXT[], 3, 12, 799, 100, 'VARIABLE', 'LOW', false, false, false, CURRENT_TIMESTAMP),
  ('common_cotton_rolls', 'DENT-SUP-COTTON-ROLL', 'Cotton rolls', 'SUPPLIES', 'Isolation and moisture control', 'CONSUMABLE', 'bag', ARRAY['D1110','D1120','D1351','D2391','D2392','D4910']::TEXT[], 3, 10, 699, 200, 'VARIABLE', 'LOW', false, false, false, CURRENT_TIMESTAMP),
  ('common_gauze', 'DENT-SURG-GAUZE', 'Sterile gauze 2x2', 'SURGICAL', 'Hemostasis and post-op packs', 'CONSUMABLE', 'box', ARRAY['D7140','D7210','D7220','D7230','D7240','D9110']::TEXT[], 2, 8, 799, 200, 'VARIABLE', 'LOW', true, true, false, CURRENT_TIMESTAMP),
  ('common_sterilization_pouches', 'DENT-STER-POUCH', 'Sterilization pouches', 'STERILIZATION', 'Instrument sterilization packaging by cassette or handpiece', 'CONSUMABLE', 'box', ARRAY['D0120','D0150','D1110','D1120','D2391','D4341','D7140']::TEXT[], 3, 12, 1599, 200, 'VARIABLE', 'LOW', true, true, false, CURRENT_TIMESTAMP),
  ('common_prophy_angles', 'DENT-HYG-PROPHY-ANGLE', 'Disposable prophy angles', 'HYGIENE', 'Adult and child prophylaxis', 'CONSUMABLE', 'box', ARRAY['D1110','D1120','D4910']::TEXT[], 2, 8, 2999, 100, 'VARIABLE', 'LOW', false, false, false, CURRENT_TIMESTAMP),
  ('common_prophy_paste', 'DENT-HYG-PROPHY-PASTE', 'Prophy paste cups', 'HYGIENE', 'Polishing during prophylaxis and periodontal maintenance', 'CONSUMABLE', 'box', ARRAY['D1110','D1120','D4910']::TEXT[], 2, 8, 2499, 200, 'VARIABLE', 'LOW', true, true, false, CURRENT_TIMESTAMP),
  ('common_fluoride_varnish', 'DENT-HYG-FLUORIDE-VARNISH', 'Fluoride varnish unit doses', 'HYGIENE', 'Fluoride treatment and caries prevention', 'MEDICATION', 'box', ARRAY['D1206','D1208']::TEXT[], 2, 8, 7499, 50, 'VARIABLE', 'MEDIUM', true, true, false, CURRENT_TIMESTAMP),
  ('common_scaler_tips', 'DENT-PERIO-SCALER-TIP', 'Ultrasonic scaler tips', 'PERIO', 'Scaling, root planing, and periodontal maintenance', 'ASSET_PART', 'each', ARRAY['D4341','D4342','D4910']::TEXT[], 2, 6, 8999, 500, 'STEP_FIXED', 'MEDIUM', false, false, false, CURRENT_TIMESTAMP),
  ('common_xray_sleeves', 'DENT-IMG-SENSOR-SLEEVE', 'X-ray sensor sleeves', 'IMAGING', 'Barrier sleeve for intraoral imaging', 'CONSUMABLE', 'box', ARRAY['D0210','D0220','D0230','D0272','D0274','D0330']::TEXT[], 3, 10, 1499, 500, 'VARIABLE', 'LOW', false, false, false, CURRENT_TIMESTAMP),
  ('common_phosphor_plate_envelopes', 'DENT-IMG-PSP-ENVELOPE', 'Phosphor plate envelopes', 'IMAGING', 'Barrier envelopes for PSP imaging', 'CONSUMABLE', 'box', ARRAY['D0210','D0220','D0230','D0272','D0274']::TEXT[], 2, 8, 1999, 300, 'VARIABLE', 'LOW', false, false, false, CURRENT_TIMESTAMP),
  ('common_alginates', 'DENT-ORTHO-ALGINATE', 'Alginate impression material', 'ORTHO', 'Study models, appliances, pediatric and orthodontic impressions', 'CONSUMABLE', 'bag', ARRAY['D0470','D8070','D8080','D8090','D8210']::TEXT[], 1, 4, 3999, 25, 'VARIABLE', 'HIGH', true, true, false, CURRENT_TIMESTAMP),
  ('common_bite_registration', 'DENT-REST-BITE-REG', 'Bite registration material', 'RESTORATIVE', 'Crown, bridge, implant, and appliance records', 'CONSUMABLE', 'cartridge', ARRAY['D2740','D2750','D6058','D6065','D9944','D9945']::TEXT[], 1, 5, 3499, 25, 'VARIABLE', 'MEDIUM', true, true, false, CURRENT_TIMESTAMP),
  ('common_sutures', 'DENT-SURG-SUTURE', 'Sutures assorted', 'SURGICAL', 'Surgical closure and extraction follow-up', 'CONSUMABLE', 'box', ARRAY['D7140','D7210','D7220','D7230','D7240','D7953']::TEXT[], 1, 4, 5999, 24, 'VARIABLE', 'HIGH', true, true, false, CURRENT_TIMESTAMP),
  ('common_disinfectant_wipes', 'DENT-STER-WIPES', 'Surface disinfectant wipes', 'STERILIZATION', 'Room turnover, chairs, counters, imaging and equipment surfaces', 'CONSUMABLE', 'canister', ARRAY['D0120','D0150','D1110','D2391','D4341','D7140']::TEXT[], 6, 18, 899, 160, 'VARIABLE', 'LOW', true, true, false, CURRENT_TIMESTAMP)
ON CONFLICT ("skuSeed") DO UPDATE SET
  "itemName" = EXCLUDED."itemName",
  "category" = EXCLUDED."category",
  "clinicalUse" = EXCLUDED."clinicalUse",
  "itemType" = EXCLUDED."itemType",
  "unitOfMeasure" = EXCLUDED."unitOfMeasure",
  "cdtCodes" = EXCLUDED."cdtCodes",
  "defaultReorderPoint" = EXCLUDED."defaultReorderPoint",
  "defaultParLevel" = EXCLUDED."defaultParLevel",
  "benchmarkCostCents" = EXCLUDED."benchmarkCostCents",
  "estimatedUsesPerUnit" = EXCLUDED."estimatedUsesPerUnit",
  "costBehavior" = EXCLUDED."costBehavior",
  "wasteRisk" = EXCLUDED."wasteRisk",
  "requiresLotTracking" = EXCLUDED."requiresLotTracking",
  "requiresExpiry" = EXCLUDED."requiresExpiry",
  "controlledSubstance" = EXCLUDED."controlledSubstance",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "PmsInventoryCatalogItem" (
  "id", "tenantId", "commonItemId", "sku", "barcodeValue", "itemName", "category", "clinicalUse", "itemType", "unitOfMeasure",
  "reorderPoint", "parLevel", "lastUnitCostCents", "benchmarkCostCents", "estimatedUsesPerUnit", "costBehavior",
  "requiresLotTracking", "requiresExpiry", "controlledSubstance", "updatedAt"
)
SELECT
  'seed_catalog_' || c."id",
  'tenant-demo',
  c."id",
  c."skuSeed",
  '1DAI-ITEM-' || upper(right(regexp_replace(c."skuSeed", '[^a-zA-Z0-9]', '', 'g'), 10)),
  c."itemName",
  c."category",
  c."clinicalUse",
  c."itemType",
  c."unitOfMeasure",
  c."defaultReorderPoint",
  c."defaultParLevel",
  c."benchmarkCostCents",
  c."benchmarkCostCents",
  c."estimatedUsesPerUnit",
  c."costBehavior",
  c."requiresLotTracking",
  c."requiresExpiry",
  c."controlledSubstance",
  CURRENT_TIMESTAMP
FROM "PmsInventoryCommonItem" c
WHERE c."status" = 'ACTIVE'
ON CONFLICT ("tenantId", "sku") DO UPDATE SET
  "commonItemId" = EXCLUDED."commonItemId",
  "clinicalUse" = EXCLUDED."clinicalUse",
  "benchmarkCostCents" = EXCLUDED."benchmarkCostCents",
  "estimatedUsesPerUnit" = EXCLUDED."estimatedUsesPerUnit",
  "costBehavior" = EXCLUDED."costBehavior",
  "requiresLotTracking" = EXCLUDED."requiresLotTracking",
  "requiresExpiry" = EXCLUDED."requiresExpiry",
  "controlledSubstance" = EXCLUDED."controlledSubstance",
  "updatedAt" = CURRENT_TIMESTAMP;
