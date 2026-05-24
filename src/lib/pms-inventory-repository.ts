import { newId, query, withTransaction } from "@/lib/db";
import { defaultTenantId } from "@/lib/pms-repository";
import { resolveReportingWindow, type ReportingWindowFilters } from "@/lib/reporting-window";

type InventorySummaryRow = {
  activeItems: string;
  lowStockItems: string;
  expiringLots: string;
  maintenanceDue: string;
  openRfps: string;
  marketplaceVendors: string;
  activeVendorPortals: string;
  activeMarketplaceSubscriptions: string;
  openPurchaseOrders: string;
  openCycleCounts: string;
  inventoryValueCents: string;
  last30UsageCents: string;
  periodUsageCents: string;
  periodReceivedCents: string;
  periodMovementCount: string;
  periodRfpCount: string;
};

export const resolveInventoryReportingWindow = resolveReportingWindow;

function barcode(kind: string, id: string) {
  return `1DAI-${kind}-${id.replace(/[^a-z0-9]/gi, "").slice(-10).toUpperCase()}`;
}

function portalToken(id: string) {
  return `vendor_${id.replace(/[^a-z0-9]/gi, "").slice(-24).toLowerCase()}`;
}

async function addInventoryAudit(tenantId: string, actorRole: string, eventType: string, targetType: string, targetId: string, metadata: Record<string, unknown> = {}) {
  await query(
    `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
     values ($1, $2, $3, $4, $5, $6, 'ALLOWED', $7::jsonb)`,
    [newId("audit"), tenantId, actorRole, eventType, targetType, targetId, JSON.stringify(metadata)],
  );
}

export async function getInventoryWorkbench(tenantId = defaultTenantId, filters: ReportingWindowFilters = {}) {
  const reportingWindow = resolveInventoryReportingWindow(filters);
  const [summary, items, lots, vendors, assets, movements, rfps, bids, benchmarks, locations, reportBuckets, purchaseOrders, cycleCounts, labelQueue] = await Promise.all([
    query<InventorySummaryRow>(
      `with stock as (
         select i."id", i."parLevel", i."reorderPoint", coalesce(sum(l."quantityOnHand"), 0) as qty,
                coalesce(sum(l."quantityOnHand" * l."unitCostCents"), 0) as value_cents
         from "PmsInventoryCatalogItem" i
         left join "PmsInventoryLot" l on l."itemId" = i."id" and l."tenantId" = i."tenantId" and l."status" = 'ACTIVE'
         where i."tenantId" = $1 and i."status" = 'ACTIVE'
         group by i."id", i."parLevel", i."reorderPoint"
       )
       select
        (select count(*) from "PmsInventoryCatalogItem" where "tenantId" = $1 and "status" = 'ACTIVE')::text as "activeItems",
        (select count(*) from stock where qty <= "reorderPoint")::text as "lowStockItems",
        (select count(*) from "PmsInventoryLot" where "tenantId" = $1 and "status" = 'ACTIVE' and "expirationDate" is not null and "expirationDate" <= current_date + interval '45 days')::text as "expiringLots",
        (select count(*) from "PmsInventoryAsset" where "tenantId" = $1 and "status" = 'ACTIVE' and "nextMaintenanceAt" <= current_date + interval '30 days')::text as "maintenanceDue",
        (select count(*) from "PmsInventoryRfp" where "tenantId" = $1 and "status" in ('DRAFT', 'RELEASED', 'EVALUATING'))::text as "openRfps",
        (select count(*) from "PmsInventoryVendor" where "tenantId" = $1 and "marketplaceStatus" = 'MARKETPLACE_VENDOR')::text as "marketplaceVendors",
        (select count(*) from "PmsInventoryVendor" where "tenantId" = $1 and "portalStatus" = 'ACTIVE')::text as "activeVendorPortals",
        (select count(*) from "PmsInventoryVendor" where "tenantId" = $1 and "subscriptionStatus" = 'ACTIVE')::text as "activeMarketplaceSubscriptions",
        (select count(*) from "PmsInventoryPurchaseOrder" where "tenantId" = $1 and "status" in ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_RECEIVED'))::text as "openPurchaseOrders",
        (select count(*) from "PmsInventoryCycleCount" where "tenantId" = $1 and "status" in ('OPEN', 'COUNTING'))::text as "openCycleCounts",
        coalesce((select sum(value_cents)::bigint from stock), 0)::text as "inventoryValueCents",
        coalesce((select sum(abs("quantity") * "unitCostCents")::bigint from "PmsInventoryMovement" where "tenantId" = $1 and "movementType" = 'CONSUMED' and "createdAt" >= current_date - interval '30 days'), 0)::text as "last30UsageCents",
        coalesce((select sum(abs("quantity") * "unitCostCents")::bigint from "PmsInventoryMovement" where "tenantId" = $1 and "movementType" = 'CONSUMED' and "createdAt" >= $2::timestamp and "createdAt" < $3::timestamp), 0)::text as "periodUsageCents",
        coalesce((select sum(abs("quantity") * "unitCostCents")::bigint from "PmsInventoryMovement" where "tenantId" = $1 and "movementType" = 'RECEIVED' and "createdAt" >= $2::timestamp and "createdAt" < $3::timestamp), 0)::text as "periodReceivedCents",
        (select count(*) from "PmsInventoryMovement" where "tenantId" = $1 and "createdAt" >= $2::timestamp and "createdAt" < $3::timestamp)::text as "periodMovementCount",
        (select count(*) from "PmsInventoryRfp" where "tenantId" = $1 and "createdAt" >= $2::timestamp and "createdAt" < $3::timestamp)::text as "periodRfpCount"`,
      [tenantId, reportingWindow.startTimestamp, reportingWindow.endTimestamp],
    ),
    query(
      `select i.*, v."vendorName",
              coalesce(sum(l."quantityOnHand"), 0)::text as "quantityOnHand",
              coalesce(sum(l."quantityOnHand" * l."unitCostCents"), 0)::bigint::text as "stockValueCents",
              min(l."expirationDate")::text as "nextExpirationDate"
       from "PmsInventoryCatalogItem" i
       left join "PmsInventoryVendor" v on v."id" = i."vendorId"
       left join "PmsInventoryLot" l on l."itemId" = i."id" and l."tenantId" = i."tenantId" and l."status" = 'ACTIVE'
       where i."tenantId" = $1
       group by i."id", v."vendorName"
       order by case when coalesce(sum(l."quantityOnHand"), 0) <= i."reorderPoint" then 0 else 1 end, i."category", i."itemName"`,
      [tenantId],
    ),
    query(
      `select l.*, i."itemName", i."sku", i."category", loc."locationName", v."vendorName"
       from "PmsInventoryLot" l
       join "PmsInventoryCatalogItem" i on i."id" = l."itemId"
       join "PmsInventoryStockLocation" loc on loc."id" = l."locationId"
       left join "PmsInventoryVendor" v on v."id" = l."vendorId"
       where l."tenantId" = $1 and l."status" = 'ACTIVE'
       order by l."expirationDate" asc nulls last, l."quantityOnHand" asc`,
      [tenantId],
    ),
    query(
      `select v.*,
              coalesce(count(distinct po."id"), 0)::int as "purchaseOrderCount",
              coalesce(count(distinct bid."id"), 0)::int as "bidCount"
       from "PmsInventoryVendor" v
       left join "PmsInventoryPurchaseOrder" po on po."vendorId" = v."id"
       left join "PmsInventoryVendorBid" bid on bid."vendorId" = v."id"
       where v."tenantId" = $1
       group by v."id"
       order by case v."marketplaceStatus" when 'MARKETPLACE_VENDOR' then 0 else 1 end, v."reliabilityScore" desc`,
      [tenantId],
    ),
    query(
      `select a.*, v."vendorName", loc."locationName"
       from "PmsInventoryAsset" a
       left join "PmsInventoryVendor" v on v."id" = a."vendorId"
       left join "PmsInventoryStockLocation" loc on loc."id" = a."locationId"
       where a."tenantId" = $1
       order by a."nextMaintenanceAt" asc nulls last, a."downtimeRisk" desc`,
      [tenantId],
    ),
    query(
      `select m.*, i."itemName", i."sku", p."firstName", p."lastName"
       from "PmsInventoryMovement" m
       join "PmsInventoryCatalogItem" i on i."id" = m."itemId"
       left join "PmsPatient" p on p."id" = m."patientId"
       where m."tenantId" = $1 and m."createdAt" >= $2::timestamp and m."createdAt" < $3::timestamp
       order by m."createdAt" desc
       limit 100`,
      [tenantId, reportingWindow.startTimestamp, reportingWindow.endTimestamp],
    ),
    query(
      `select r.*, v."vendorName" as "awardedVendorName", coalesce(count(b."id"), 0)::int as "bidCount"
       from "PmsInventoryRfp" r
       left join "PmsInventoryVendor" v on v."id" = r."awardedVendorId"
       left join "PmsInventoryVendorBid" b on b."rfpId" = r."id"
       where r."tenantId" = $1 and ($2::text = 'all' or (r."createdAt" >= $3::timestamp and r."createdAt" < $4::timestamp))
       group by r."id", v."vendorName"
       order by r."createdAt" desc`,
      [tenantId, filters.period === "all" ? "all" : "filtered", reportingWindow.startTimestamp, reportingWindow.endTimestamp],
    ),
    query(
      `select b.*, r."rfpNumber", r."title", v."vendorName", v."reliabilityScore"
       from "PmsInventoryVendorBid" b
       join "PmsInventoryRfp" r on r."id" = b."rfpId"
       join "PmsInventoryVendor" v on v."id" = b."vendorId"
       where b."tenantId" = $1 and ($2::text = 'all' or (b."submittedAt" >= $3::timestamp and b."submittedAt" < $4::timestamp))
       order by b."bidTotalCents" asc, b."leadDays" asc`,
      [tenantId, filters.period === "all" ? "all" : "filtered", reportingWindow.startTimestamp, reportingWindow.endTimestamp],
    ),
    query(
      `select * from "PmsInventoryBenchmarkSnapshot"
       where "tenantId" = $1
       order by "snapshotDate" desc, "itemCategory", "metricName"`,
      [tenantId],
    ),
    query(`select * from "PmsInventoryStockLocation" where "tenantId" = $1 and "status" = 'ACTIVE' order by "locationName"`, [tenantId]),
    query(
      `select date_trunc('day', "createdAt")::date::text as "bucketDate",
              "movementType",
              count(*)::int as "movementCount",
              coalesce(sum(abs("quantity") * "unitCostCents")::bigint, 0)::text as "valueCents"
       from "PmsInventoryMovement"
       where "tenantId" = $1 and "createdAt" >= $2::timestamp and "createdAt" < $3::timestamp
       group by date_trunc('day', "createdAt")::date, "movementType"
       order by "bucketDate" asc, "movementType"`,
      [tenantId, reportingWindow.startTimestamp, reportingWindow.endTimestamp],
    ),
    query(
      `select po.*, v."vendorName",
              coalesce(sum(line."lineTotalCents"), 0)::bigint::text as "lineSubtotalCents",
              coalesce(count(line."id"), 0)::int as "lineCount"
       from "PmsInventoryPurchaseOrder" po
       join "PmsInventoryVendor" v on v."id" = po."vendorId"
       left join "PmsInventoryPurchaseOrderLine" line on line."purchaseOrderId" = po."id"
       where po."tenantId" = $1
       group by po."id", v."vendorName"
       order by po."createdAt" desc
       limit 50`,
      [tenantId],
    ),
    query(
      `select cc.*, loc."locationName", coalesce(count(line."id"), 0)::int as "lineCount"
       from "PmsInventoryCycleCount" cc
       left join "PmsInventoryStockLocation" loc on loc."id" = cc."locationId"
       left join "PmsInventoryCycleCountLine" line on line."cycleCountId" = cc."id"
       where cc."tenantId" = $1
       group by cc."id", loc."locationName"
       order by cc."startedAt" desc
       limit 25`,
      [tenantId],
    ),
    query(
      `select 'ITEM' as "labelType", "id", "itemName" as "labelName", "sku" as "labelCode", "barcodeValue"
       from "PmsInventoryCatalogItem"
       where "tenantId" = $1 and "status" = 'ACTIVE'
       union all
       select 'LOT' as "labelType", l."id", i."itemName" as "labelName", coalesce(l."lotNumber", l."serialNumber", l."id") as "labelCode", l."barcodeValue"
       from "PmsInventoryLot" l
       join "PmsInventoryCatalogItem" i on i."id" = l."itemId"
       where l."tenantId" = $1 and l."status" = 'ACTIVE'
       union all
       select 'ASSET' as "labelType", "id", "assetName" as "labelName", "assetTag" as "labelCode", "barcodeValue"
       from "PmsInventoryAsset"
       where "tenantId" = $1 and "status" = 'ACTIVE'
       order by "labelType", "labelName"
       limit 120`,
      [tenantId],
    ),
  ]);

  return {
    summary: summary.rows[0] ?? {
      activeItems: "0",
      lowStockItems: "0",
      expiringLots: "0",
      maintenanceDue: "0",
      openRfps: "0",
      marketplaceVendors: "0",
      activeVendorPortals: "0",
      activeMarketplaceSubscriptions: "0",
      openPurchaseOrders: "0",
      openCycleCounts: "0",
      inventoryValueCents: "0",
      last30UsageCents: "0",
      periodUsageCents: "0",
      periodReceivedCents: "0",
      periodMovementCount: "0",
      periodRfpCount: "0",
    },
    reportingWindow,
    items: items.rows,
    lots: lots.rows,
    vendors: vendors.rows,
    assets: assets.rows,
    movements: movements.rows,
    rfps: rfps.rows,
    bids: bids.rows,
    benchmarks: benchmarks.rows,
    locations: locations.rows,
    reportBuckets: reportBuckets.rows,
    purchaseOrders: purchaseOrders.rows,
    cycleCounts: cycleCounts.rows,
    labelQueue: labelQueue.rows,
  };
}

export async function createInventoryVendor(input: {
  tenantId?: string;
  actorRole?: string;
  vendorName: string;
  vendorType: string;
  marketplaceStatus?: string;
  email?: string;
  phone?: string;
  website?: string;
  paymentTerms?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("inv_vendor");
  const token = portalToken(id);
  const result = await query(
    `insert into "PmsInventoryVendor"
       ("id", "tenantId", "vendorName", "vendorType", "marketplaceStatus", "portalStatus", "portalToken", "subscriptionStatus", "subscriptionPlan", "marketplaceFeeBps", "email", "phone", "website", "paymentTerms", "complianceStatus", "verifiedAt", "updatedAt")
     values ($1, $2, $3, $4, coalesce($5, 'PRIVATE_VENDOR'), case when coalesce($5, 'PRIVATE_VENDOR') in ('MARKETPLACE_VENDOR', 'PREFERRED_VENDOR') then 'ACTIVE' else 'INVITED' end, $6, case when coalesce($5, 'PRIVATE_VENDOR') = 'MARKETPLACE_VENDOR' then 'TRIALING' else 'NOT_SUBSCRIBED' end, case when coalesce($5, 'PRIVATE_VENDOR') = 'MARKETPLACE_VENDOR' then 'MARKETPLACE_SELLER' else null end, case when coalesce($5, 'PRIVATE_VENDOR') = 'MARKETPLACE_VENDOR' then 250 else 0 end, $7, $8, $9, $10, 'NEEDS_REVIEW', case when coalesce($5, 'PRIVATE_VENDOR') = 'MARKETPLACE_VENDOR' then current_timestamp else null end, current_timestamp)
     on conflict ("tenantId", "vendorName") do update set
       "vendorType" = excluded."vendorType",
       "marketplaceStatus" = excluded."marketplaceStatus",
       "portalStatus" = excluded."portalStatus",
       "subscriptionStatus" = excluded."subscriptionStatus",
       "subscriptionPlan" = excluded."subscriptionPlan",
       "marketplaceFeeBps" = excluded."marketplaceFeeBps",
       "email" = excluded."email",
       "phone" = excluded."phone",
       "website" = excluded."website",
       "paymentTerms" = excluded."paymentTerms",
       "updatedAt" = current_timestamp
     returning *`,
    [
      id,
      tenantId,
      input.vendorName.trim(),
      input.vendorType.trim() || "SUPPLIES",
      input.marketplaceStatus?.trim() || null,
      token,
      input.email?.trim() || null,
      input.phone?.trim() || null,
      input.website?.trim() || null,
      input.paymentTerms?.trim() || null,
    ],
  );
  const row = result.rows[0];
  await addInventoryAudit(tenantId, input.actorRole ?? "practice_manager", "INVENTORY_VENDOR_UPSERTED", "PmsInventoryVendor", row.id, { vendorName: row.vendorName });
  return row;
}

export async function createInventoryItem(input: {
  tenantId?: string;
  actorRole?: string;
  vendorId?: string;
  sku: string;
  itemName: string;
  category: string;
  clinicalUse?: string;
  itemType?: string;
  unitOfMeasure?: string;
  reorderPoint?: number;
  parLevel?: number;
  lastUnitCostCents?: number;
  benchmarkCostCents?: number;
  taxable?: boolean;
  requiresLotTracking?: boolean;
  requiresExpiry?: boolean;
  controlledSubstance?: boolean;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("inv_item");
  const barcodeValue = barcode("ITEM", id);
  const result = await query(
    `insert into "PmsInventoryCatalogItem"
       ("id", "tenantId", "vendorId", "sku", "barcodeValue", "itemName", "category", "clinicalUse", "itemType", "unitOfMeasure", "reorderPoint", "parLevel", "lastUnitCostCents", "benchmarkCostCents", "taxable", "requiresLotTracking", "requiresExpiry", "controlledSubstance", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, coalesce($9, 'CONSUMABLE'), coalesce($10, 'each'), $11, $12, $13, $14, $15, $16, $17, $18, current_timestamp)
     on conflict ("tenantId", "sku") do update set
      "vendorId" = excluded."vendorId",
       "barcodeValue" = coalesce("PmsInventoryCatalogItem"."barcodeValue", excluded."barcodeValue"),
       "itemName" = excluded."itemName",
       "category" = excluded."category",
       "clinicalUse" = excluded."clinicalUse",
       "itemType" = excluded."itemType",
       "unitOfMeasure" = excluded."unitOfMeasure",
       "reorderPoint" = excluded."reorderPoint",
       "parLevel" = excluded."parLevel",
       "lastUnitCostCents" = excluded."lastUnitCostCents",
       "benchmarkCostCents" = excluded."benchmarkCostCents",
       "taxable" = excluded."taxable",
       "requiresLotTracking" = excluded."requiresLotTracking",
       "requiresExpiry" = excluded."requiresExpiry",
       "controlledSubstance" = excluded."controlledSubstance",
       "updatedAt" = current_timestamp
     returning *`,
    [
      id,
      tenantId,
      input.vendorId || null,
      input.sku.trim(),
      barcodeValue,
      input.itemName.trim(),
      input.category.trim() || "SUPPLIES",
      input.clinicalUse?.trim() || null,
      input.itemType?.trim() || null,
      input.unitOfMeasure?.trim() || null,
      input.reorderPoint ?? 0,
      input.parLevel ?? 0,
      input.lastUnitCostCents ?? 0,
      input.benchmarkCostCents ?? null,
      Boolean(input.taxable),
      Boolean(input.requiresLotTracking),
      Boolean(input.requiresExpiry),
      Boolean(input.controlledSubstance),
    ],
  );
  const row = result.rows[0];
  await addInventoryAudit(tenantId, input.actorRole ?? "practice_manager", "INVENTORY_ITEM_UPSERTED", "PmsInventoryCatalogItem", row.id, { sku: row.sku });
  return row;
}

export async function receiveInventoryStock(input: {
  tenantId?: string;
  actorRole?: string;
  itemId: string;
  vendorId?: string;
  locationId: string;
  lotNumber?: string;
  serialNumber?: string;
  expirationDate?: string;
  quantity: number;
  unitCostCents: number;
  reason?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  return withTransaction(async (client) => {
    const lotId = newId("inv_lot");
    const barcodeValue = barcode("LOT", lotId);
    const lot = await client.query(
      `insert into "PmsInventoryLot"
         ("id", "tenantId", "itemId", "vendorId", "locationId", "lotNumber", "barcodeValue", "serialNumber", "expirationDate", "quantityOnHand", "unitCostCents", "updatedAt")
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamp, $10, $11, current_timestamp)
       returning *`,
      [
        lotId,
        tenantId,
        input.itemId,
        input.vendorId || null,
        input.locationId,
        input.lotNumber?.trim() || null,
        barcodeValue,
        input.serialNumber?.trim() || null,
        input.expirationDate || null,
        input.quantity,
        input.unitCostCents,
      ],
    );
    const movementId = newId("inv_mov");
    await client.query(
      `insert into "PmsInventoryMovement"
         ("id", "tenantId", "itemId", "lotId", "toLocationId", "movementType", "quantity", "unitCostCents", "reason", "actorRole", "metadata")
       values ($1, $2, $3, $4, $5, 'RECEIVED', $6, $7, $8, $9, $10::jsonb)`,
      [
        movementId,
        tenantId,
        input.itemId,
        lotId,
        input.locationId,
        input.quantity,
        input.unitCostCents,
        input.reason?.trim() || "Inventory receipt",
        input.actorRole ?? "practice_manager",
        JSON.stringify({ lotNumber: input.lotNumber, serialNumber: input.serialNumber }),
      ],
    );
    await client.query(
      `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
       values ($1, $2, $3, 'INVENTORY_STOCK_RECEIVED', 'PmsInventoryLot', $4, 'ALLOWED', $5::jsonb)`,
      [newId("audit"), tenantId, input.actorRole ?? "practice_manager", lotId, JSON.stringify({ itemId: input.itemId, quantity: input.quantity })],
    );
    return lot.rows[0];
  });
}

export async function consumeInventoryStock(input: {
  tenantId?: string;
  actorRole?: string;
  itemId: string;
  lotId?: string;
  quantity: number;
  patientId?: string;
  appointmentId?: string;
  procedureCode?: string;
  reason: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  return withTransaction(async (client) => {
    const lotResult = await client.query<{ id: string; locationId: string; quantityOnHand: string; unitCostCents: number }>(
      `select "id", "locationId", "quantityOnHand"::text as "quantityOnHand", "unitCostCents"
       from "PmsInventoryLot"
       where "tenantId" = $1 and "itemId" = $2 and "status" = 'ACTIVE' and "quantityOnHand" >= $3
         and ($4::text is null or "id" = $4)
       order by "expirationDate" asc nulls last, "receivedAt" asc
       limit 1
       for update`,
      [tenantId, input.itemId, input.quantity, input.lotId || null],
    );
    const lot = lotResult.rows[0];
    if (!lot) throw new Error("No inventory lot has enough quantity for this usage.");

    await client.query(
      `update "PmsInventoryLot"
       set "quantityOnHand" = "quantityOnHand" - $2, "updatedAt" = current_timestamp
       where "id" = $1`,
      [lot.id, input.quantity],
    );
    const movementId = newId("inv_mov");
    await client.query(
      `insert into "PmsInventoryMovement"
         ("id", "tenantId", "itemId", "lotId", "fromLocationId", "patientId", "appointmentId", "procedureCode", "movementType", "quantity", "unitCostCents", "reason", "actorRole", "metadata")
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'CONSUMED', $9, $10, $11, $12, $13::jsonb)`,
      [
        movementId,
        tenantId,
        input.itemId,
        lot.id,
        lot.locationId,
        input.patientId || null,
        input.appointmentId || null,
        input.procedureCode?.trim() || null,
        input.quantity,
        lot.unitCostCents,
        input.reason.trim(),
        input.actorRole ?? "clinical_assistant",
        JSON.stringify({ quantityBefore: lot.quantityOnHand }),
      ],
    );
    await client.query(
      `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
       values ($1, $2, $3, 'INVENTORY_STOCK_CONSUMED', 'PmsInventoryMovement', $4, 'ALLOWED', $5::jsonb)`,
      [newId("audit"), tenantId, input.actorRole ?? "clinical_assistant", movementId, JSON.stringify({ itemId: input.itemId, lotId: lot.id, quantity: input.quantity, patientId: input.patientId })],
    );
    return { id: movementId, lotId: lot.id };
  });
}

export async function createInventoryRfp(input: {
  tenantId?: string;
  actorRole?: string;
  title: string;
  category: string;
  releaseMode?: string;
  responseDueAt?: string;
  projectedSpendCents?: number;
  itemId?: string;
  itemName: string;
  quantity: number;
  requirements?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  return withTransaction(async (client) => {
    const id = newId("inv_rfp");
    const lineId = newId("inv_rfpl");
    const numberResult = await client.query<{ next: string }>(`select (count(*) + 1)::text as next from "PmsInventoryRfp" where "tenantId" = $1`, [tenantId]);
    const rfpNumber = `RFP-${new Date().getFullYear()}-${String(numberResult.rows[0]?.next ?? "1").padStart(4, "0")}`;
    const rfp = await client.query(
      `insert into "PmsInventoryRfp"
         ("id", "tenantId", "rfpNumber", "title", "status", "category", "releaseMode", "responseDueAt", "evaluationCriteria", "projectedSpendCents", "createdByRole", "updatedAt")
       values ($1, $2, $3, $4, 'RELEASED', $5, coalesce($6, 'PRIVATE'), $7::timestamp, $8::jsonb, $9, $10, current_timestamp)
       returning *`,
      [
        id,
        tenantId,
        rfpNumber,
        input.title.trim(),
        input.category.trim(),
        input.releaseMode?.trim() || null,
        input.responseDueAt || null,
        JSON.stringify({ price: 40, leadTime: 25, compliance: 20, service: 15 }),
        input.projectedSpendCents ?? 0,
        input.actorRole ?? "practice_manager",
      ],
    );
    await client.query(
      `insert into "PmsInventoryRfpLine"
         ("id", "rfpId", "itemId", "itemName", "quantity", "requirements")
       values ($1, $2, $3, $4, $5, $6)`,
      [lineId, id, input.itemId || null, input.itemName.trim(), input.quantity, input.requirements?.trim() || null],
    );
    await client.query(
      `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
       values ($1, $2, $3, 'INVENTORY_RFP_RELEASED', 'PmsInventoryRfp', $4, 'ALLOWED', $5::jsonb)`,
      [newId("audit"), tenantId, input.actorRole ?? "practice_manager", id, JSON.stringify({ rfpNumber, releaseMode: input.releaseMode })],
    );
    return rfp.rows[0];
  });
}

export async function createInventoryAsset(input: {
  tenantId?: string;
  actorRole?: string;
  vendorId?: string;
  locationId?: string;
  assetTag: string;
  assetName: string;
  assetType: string;
  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;
  purchaseCostCents?: number;
  nextMaintenanceAt?: string;
  downtimeRisk?: string;
  notes?: string;
}) {
  const tenantId = input.tenantId ?? defaultTenantId;
  const id = newId("inv_asset");
  const barcodeValue = barcode("ASSET", id);
  const result = await query(
    `insert into "PmsInventoryAsset"
       ("id", "tenantId", "vendorId", "locationId", "assetTag", "barcodeValue", "assetName", "assetType", "manufacturer", "modelNumber", "serialNumber", "purchaseCostCents", "nextMaintenanceAt", "downtimeRisk", "notes", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::timestamp, coalesce($14, 'LOW'), $15, current_timestamp)
     on conflict ("tenantId", "assetTag") do update set
       "vendorId" = excluded."vendorId",
       "locationId" = excluded."locationId",
       "barcodeValue" = coalesce("PmsInventoryAsset"."barcodeValue", excluded."barcodeValue"),
       "assetName" = excluded."assetName",
       "assetType" = excluded."assetType",
       "manufacturer" = excluded."manufacturer",
       "modelNumber" = excluded."modelNumber",
       "serialNumber" = excluded."serialNumber",
       "purchaseCostCents" = excluded."purchaseCostCents",
       "nextMaintenanceAt" = excluded."nextMaintenanceAt",
       "downtimeRisk" = excluded."downtimeRisk",
       "notes" = excluded."notes",
       "updatedAt" = current_timestamp
     returning *`,
    [
      id,
      tenantId,
      input.vendorId || null,
      input.locationId || null,
      input.assetTag.trim(),
      barcodeValue,
      input.assetName.trim(),
      input.assetType.trim(),
      input.manufacturer?.trim() || null,
      input.modelNumber?.trim() || null,
      input.serialNumber?.trim() || null,
      input.purchaseCostCents ?? 0,
      input.nextMaintenanceAt || null,
      input.downtimeRisk?.trim() || null,
      input.notes?.trim() || null,
    ],
  );
  const row = result.rows[0];
  await addInventoryAudit(tenantId, input.actorRole ?? "practice_manager", "INVENTORY_ASSET_UPSERTED", "PmsInventoryAsset", row.id, { assetTag: row.assetTag });
  return row;
}

export async function getInventoryVendorPortal(token: string) {
  const vendor = await query(
    `select * from "PmsInventoryVendor" where "portalToken" = $1 and "portalStatus" = 'ACTIVE' limit 1`,
    [token.trim()],
  );
  const vendorRow = vendor.rows[0];
  if (!vendorRow) return null;
  const tenantId = String(vendorRow.tenantId);
  const marketplaceEntitled = vendorRow.subscriptionStatus === "ACTIVE" || vendorRow.subscriptionStatus === "TRIALING";
  const [rfps, bids, awardedPurchaseOrders] = await Promise.all([
    query(
      `select r.*, coalesce(jsonb_agg(jsonb_build_object('itemName', line."itemName", 'quantity', line."quantity", 'requirements', line."requirements") order by line."createdAt") filter (where line."id" is not null), '[]'::jsonb) as "lines"
       from "PmsInventoryRfp" r
       left join "PmsInventoryRfpLine" line on line."rfpId" = r."id"
       where r."tenantId" = $1 and $3::boolean = true and r."status" in ('RELEASED', 'EVALUATING')
         and (r."releaseMode" = 'MARKETPLACE' or r."releaseMode" = 'PREFERRED_VENDORS' or r."category" = $2)
       group by r."id"
       order by r."responseDueAt" asc nulls last, r."createdAt" desc`,
      [tenantId, vendorRow.vendorType, marketplaceEntitled],
    ),
    query(
      `select b.*, r."rfpNumber", r."title", r."category"
       from "PmsInventoryVendorBid" b
       join "PmsInventoryRfp" r on r."id" = b."rfpId"
       where b."tenantId" = $1 and b."vendorId" = $2
       order by b."submittedAt" desc`,
      [tenantId, vendorRow.id],
    ),
    query(
      `select po.*, coalesce(count(line."id"), 0)::int as "lineCount"
       from "PmsInventoryPurchaseOrder" po
       left join "PmsInventoryPurchaseOrderLine" line on line."purchaseOrderId" = po."id"
       where po."tenantId" = $1 and po."vendorId" = $2
       group by po."id"
       order by po."createdAt" desc`,
      [tenantId, vendorRow.id],
    ),
  ]);
  return { vendor: vendorRow, marketplaceEntitled, rfps: rfps.rows, bids: bids.rows, purchaseOrders: awardedPurchaseOrders.rows };
}

export async function submitInventoryVendorBid(input: {
  portalToken: string;
  rfpId: string;
  bidTotalCents: number;
  leadDays: number;
  warrantyTerms?: string;
  notes?: string;
  submittedByName?: string;
  submittedByEmail?: string;
}) {
  const portal = await getInventoryVendorPortal(input.portalToken);
  if (!portal) throw new Error("Vendor portal is not active.");
  if (!portal.marketplaceEntitled) throw new Error("Vendor marketplace subscription is not active.");
  const vendor = portal.vendor as Record<string, string>;
  const rfp = await query(`select * from "PmsInventoryRfp" where "tenantId" = $1 and "id" = $2 and "status" in ('RELEASED', 'EVALUATING')`, [vendor.tenantId, input.rfpId]);
  if (!rfp.rows[0]) throw new Error("RFP is not open for bidding.");
  const bidId = newId("inv_bid");
  const result = await query(
    `insert into "PmsInventoryVendorBid"
       ("id", "tenantId", "rfpId", "vendorId", "status", "bidTotalCents", "leadDays", "lineItems", "warrantyTerms", "notes", "submittedByName", "submittedByEmail", "updatedAt")
     values ($1, $2, $3, $4, 'SUBMITTED', $5, $6, $7::jsonb, $8, $9, $10, $11, current_timestamp)
     on conflict ("rfpId", "vendorId") do update set
       "status" = 'RESUBMITTED',
       "bidTotalCents" = excluded."bidTotalCents",
       "leadDays" = excluded."leadDays",
       "lineItems" = excluded."lineItems",
       "warrantyTerms" = excluded."warrantyTerms",
       "notes" = excluded."notes",
       "submittedByName" = excluded."submittedByName",
       "submittedByEmail" = excluded."submittedByEmail",
       "submittedAt" = current_timestamp,
       "updatedAt" = current_timestamp
     returning *`,
    [
      bidId,
      vendor.tenantId,
      input.rfpId,
      vendor.id,
      input.bidTotalCents,
      input.leadDays,
      JSON.stringify({ pricingSource: "vendor_portal", submittedAt: new Date().toISOString() }),
      input.warrantyTerms?.trim() || null,
      input.notes?.trim() || null,
      input.submittedByName?.trim() || null,
      input.submittedByEmail?.trim() || null,
    ],
  );
  await addInventoryAudit(vendor.tenantId, "vendor_portal", "INVENTORY_VENDOR_BID_SUBMITTED", "PmsInventoryVendorBid", result.rows[0].id, { vendorId: vendor.id, rfpId: input.rfpId });
  return result.rows[0];
}

export async function awardInventoryBidToPurchaseOrder(input: { tenantId?: string; actorRole?: string; bidId: string }) {
  const tenantId = input.tenantId ?? defaultTenantId;
  return withTransaction(async (client) => {
    const bidResult = await client.query(
      `select b.*, r."rfpNumber", r."title"
       from "PmsInventoryVendorBid" b
       join "PmsInventoryRfp" r on r."id" = b."rfpId"
       where b."tenantId" = $1 and b."id" = $2
       for update`,
      [tenantId, input.bidId],
    );
    const bid = bidResult.rows[0];
    if (!bid) throw new Error("Bid not found.");
    const numberResult = await client.query<{ next: string }>(`select (count(*) + 1)::text as next from "PmsInventoryPurchaseOrder" where "tenantId" = $1`, [tenantId]);
    const poId = newId("inv_po");
    const poNumber = `PO-${new Date().getFullYear()}-${String(numberResult.rows[0]?.next ?? "1").padStart(4, "0")}`;
    const po = await client.query(
      `insert into "PmsInventoryPurchaseOrder"
         ("id", "tenantId", "vendorId", "poNumber", "status", "requestedByRole", "subtotalCents", "taxCents", "shippingCents", "totalCents", "approvedAt", "approvedByRole", "notes", "updatedAt")
       values ($1, $2, $3, $4, 'APPROVED', $5, $6, 0, 0, $6, current_timestamp, $5, $7, current_timestamp)
       returning *`,
      [poId, tenantId, bid.vendorId, poNumber, input.actorRole ?? "practice_manager", Number(bid.bidTotalCents ?? 0), `Awarded from ${bid.rfpNumber}: ${bid.title}`],
    );
    const lines = await client.query(`select * from "PmsInventoryRfpLine" where "rfpId" = $1 order by "createdAt"`, [bid.rfpId]);
    const unitShare = lines.rows.length ? Math.round(Number(bid.bidTotalCents ?? 0) / lines.rows.length) : Number(bid.bidTotalCents ?? 0);
    for (const line of lines.rows) {
      if (!line.itemId) continue;
      const qty = Number(line.quantity || 1) || 1;
      await client.query(
        `insert into "PmsInventoryPurchaseOrderLine"
           ("id", "purchaseOrderId", "itemId", "quantity", "unitCostCents", "lineTotalCents", "updatedAt")
         values ($1, $2, $3, $4, $5, $6, current_timestamp)`,
        [newId("inv_pol"), poId, line.itemId, qty, Math.round(unitShare / qty), unitShare],
      );
    }
    await client.query(`update "PmsInventoryVendorBid" set "status" = 'AWARDED', "updatedAt" = current_timestamp where "id" = $1`, [bid.id]);
    await client.query(`update "PmsInventoryRfp" set "status" = 'AWARDED', "awardedVendorId" = $2, "updatedAt" = current_timestamp where "id" = $1`, [bid.rfpId, bid.vendorId]);
    await client.query(
      `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
       values ($1, $2, $3, 'INVENTORY_BID_AWARDED_PO_CREATED', 'PmsInventoryPurchaseOrder', $4, 'ALLOWED', $5::jsonb)`,
      [newId("audit"), tenantId, input.actorRole ?? "practice_manager", poId, JSON.stringify({ bidId: bid.id, rfpId: bid.rfpId, poNumber })],
    );
    return po.rows[0];
  });
}

export async function receiveInventoryPurchaseOrder(input: { tenantId?: string; actorRole?: string; purchaseOrderId: string; locationId: string }) {
  const tenantId = input.tenantId ?? defaultTenantId;
  return withTransaction(async (client) => {
    const po = await client.query(`select * from "PmsInventoryPurchaseOrder" where "tenantId" = $1 and "id" = $2 for update`, [tenantId, input.purchaseOrderId]);
    const poRow = po.rows[0];
    if (!poRow) throw new Error("Purchase order not found.");
    const lines = await client.query(`select * from "PmsInventoryPurchaseOrderLine" where "purchaseOrderId" = $1 for update`, [input.purchaseOrderId]);
    for (const line of lines.rows) {
      const remaining = Number(line.quantity ?? 0) - Number(line.receivedQuantity ?? 0);
      if (remaining <= 0) continue;
      const lotId = newId("inv_lot");
      await client.query(
        `insert into "PmsInventoryLot"
           ("id", "tenantId", "itemId", "vendorId", "locationId", "lotNumber", "barcodeValue", "quantityOnHand", "unitCostCents", "updatedAt")
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, current_timestamp)`,
        [lotId, tenantId, line.itemId, poRow.vendorId, input.locationId, `${poRow.poNumber}-${line.id.slice(-4)}`, barcode("LOT", lotId), remaining, Number(line.unitCostCents ?? 0)],
      );
      await client.query(
        `insert into "PmsInventoryMovement"
           ("id", "tenantId", "itemId", "lotId", "toLocationId", "movementType", "quantity", "unitCostCents", "reason", "actorRole", "metadata")
         values ($1, $2, $3, $4, $5, 'RECEIVED', $6, $7, 'Purchase order receiving', $8, $9::jsonb)`,
        [newId("inv_mov"), tenantId, line.itemId, lotId, input.locationId, remaining, Number(line.unitCostCents ?? 0), input.actorRole ?? "practice_manager", JSON.stringify({ purchaseOrderId: input.purchaseOrderId, poNumber: poRow.poNumber })],
      );
      await client.query(`update "PmsInventoryPurchaseOrderLine" set "receivedQuantity" = "quantity", "updatedAt" = current_timestamp where "id" = $1`, [line.id]);
    }
    await client.query(
      `update "PmsInventoryPurchaseOrder"
       set "status" = 'RECEIVED', "receivedAt" = current_timestamp, "receivedByRole" = $3, "updatedAt" = current_timestamp
       where "tenantId" = $1 and "id" = $2`,
      [tenantId, input.purchaseOrderId, input.actorRole ?? "practice_manager"],
    );
    await client.query(
      `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
       values ($1, $2, $3, 'INVENTORY_PO_RECEIVED', 'PmsInventoryPurchaseOrder', $4, 'ALLOWED', $5::jsonb)`,
      [newId("audit"), tenantId, input.actorRole ?? "practice_manager", input.purchaseOrderId, JSON.stringify({ locationId: input.locationId })],
    );
    return { id: input.purchaseOrderId };
  });
}

export async function recordInventoryCycleCount(input: { tenantId?: string; actorRole?: string; lotId: string; countedQuantity: number; reason?: string }) {
  const tenantId = input.tenantId ?? defaultTenantId;
  return withTransaction(async (client) => {
    const lotResult = await client.query<{ id: string; itemId: string; locationId: string; quantityOnHand: string; unitCostCents: number }>(
      `select "id", "itemId", "locationId", "quantityOnHand"::text as "quantityOnHand", "unitCostCents"
       from "PmsInventoryLot"
       where "tenantId" = $1 and "id" = $2
       for update`,
      [tenantId, input.lotId],
    );
    const lot = lotResult.rows[0];
    if (!lot) throw new Error("Lot not found.");
    const expected = Number(lot.quantityOnHand ?? 0);
    const variance = input.countedQuantity - expected;
    const countNumberResult = await client.query<{ next: string }>(`select (count(*) + 1)::text as next from "PmsInventoryCycleCount" where "tenantId" = $1`, [tenantId]);
    const countId = newId("inv_count");
    const countNumber = `COUNT-${new Date().getFullYear()}-${String(countNumberResult.rows[0]?.next ?? "1").padStart(4, "0")}`;
    await client.query(
      `insert into "PmsInventoryCycleCount"
         ("id", "tenantId", "countNumber", "status", "locationId", "startedByRole", "completedByRole", "completedAt", "varianceCents", "notes", "updatedAt")
       values ($1, $2, $3, 'COMPLETED', $4, $5, $5, current_timestamp, $6, $7, current_timestamp)`,
      [countId, tenantId, countNumber, lot.locationId, input.actorRole ?? "practice_manager", Math.round(variance * Number(lot.unitCostCents ?? 0)), input.reason?.trim() || null],
    );
    await client.query(
      `insert into "PmsInventoryCycleCountLine"
         ("id", "cycleCountId", "lotId", "itemId", "expectedQty", "countedQty", "varianceQty", "unitCostCents", "reason")
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [newId("inv_count_line"), countId, lot.id, lot.itemId, expected, input.countedQuantity, variance, Number(lot.unitCostCents ?? 0), input.reason?.trim() || null],
    );
    await client.query(`update "PmsInventoryLot" set "quantityOnHand" = $2, "updatedAt" = current_timestamp where "id" = $1`, [lot.id, input.countedQuantity]);
    await client.query(
      `insert into "PmsInventoryMovement"
         ("id", "tenantId", "itemId", "lotId", "fromLocationId", "movementType", "quantity", "unitCostCents", "reason", "actorRole", "metadata")
       values ($1, $2, $3, $4, $5, 'CYCLE_COUNT_ADJUSTMENT', $6, $7, $8, $9, $10::jsonb)`,
      [newId("inv_mov"), tenantId, lot.itemId, lot.id, lot.locationId, variance, Number(lot.unitCostCents ?? 0), input.reason?.trim() || "Cycle count adjustment", input.actorRole ?? "practice_manager", JSON.stringify({ expected, counted: input.countedQuantity, cycleCountId: countId })],
    );
    await client.query(
      `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
       values ($1, $2, $3, 'INVENTORY_CYCLE_COUNT_POSTED', 'PmsInventoryCycleCount', $4, 'ALLOWED', $5::jsonb)`,
      [newId("audit"), tenantId, input.actorRole ?? "practice_manager", countId, JSON.stringify({ lotId: lot.id, expected, counted: input.countedQuantity, variance })],
    );
    return { id: countId, variance };
  });
}

export async function lookupInventoryBarcode(tenantId: string, barcodeValue: string) {
  const code = barcodeValue.trim();
  const result = await query(
    `select 'ITEM' as "kind", "id", "itemName" as "name", "sku" as "code", "barcodeValue" from "PmsInventoryCatalogItem" where "tenantId" = $1 and "barcodeValue" = $2
     union all
     select 'LOT' as "kind", l."id", i."itemName" as "name", coalesce(l."lotNumber", l."serialNumber", l."id") as "code", l."barcodeValue"
       from "PmsInventoryLot" l join "PmsInventoryCatalogItem" i on i."id" = l."itemId"
       where l."tenantId" = $1 and l."barcodeValue" = $2
     union all
     select 'ASSET' as "kind", "id", "assetName" as "name", "assetTag" as "code", "barcodeValue" from "PmsInventoryAsset" where "tenantId" = $1 and "barcodeValue" = $2
     limit 1`,
    [tenantId, code],
  );
  return result.rows[0] ?? null;
}
