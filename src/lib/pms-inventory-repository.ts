import { newId, query, withTransaction } from "@/lib/db";
import { defaultTenantId } from "@/lib/pms-repository";

type InventorySummaryRow = {
  activeItems: string;
  lowStockItems: string;
  expiringLots: string;
  maintenanceDue: string;
  openRfps: string;
  marketplaceVendors: string;
  inventoryValueCents: string;
  last30UsageCents: string;
  periodUsageCents: string;
  periodReceivedCents: string;
  periodMovementCount: string;
  periodRfpCount: string;
};

export type InventoryReportingFilters = {
  period?: string;
  startDate?: string;
  endDate?: string;
};

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function resolveInventoryReportingWindow(filters: InventoryReportingFilters = {}) {
  const today = new Date();
  const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const period = filters.period === "custom" || filters.period === "weekly" || filters.period === "monthly" ? filters.period : "daily";
  let start = utcToday;
  let end = addDays(utcToday, 1);

  if (period === "weekly") {
    const day = utcToday.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    start = addDays(utcToday, mondayOffset);
    end = addDays(start, 7);
  } else if (period === "monthly") {
    start = new Date(Date.UTC(utcToday.getUTCFullYear(), utcToday.getUTCMonth(), 1));
    end = new Date(Date.UTC(utcToday.getUTCFullYear(), utcToday.getUTCMonth() + 1, 1));
  } else if (period === "custom") {
    const parsedStart = filters.startDate ? new Date(`${filters.startDate}T00:00:00.000Z`) : null;
    const parsedEnd = filters.endDate ? new Date(`${filters.endDate}T00:00:00.000Z`) : null;
    if (parsedStart && !Number.isNaN(parsedStart.getTime())) start = parsedStart;
    if (parsedEnd && !Number.isNaN(parsedEnd.getTime())) end = addDays(parsedEnd, 1);
    if (end <= start) end = addDays(start, 1);
  }

  return {
    period,
    startDate: formatDate(start),
    endDate: formatDate(addDays(end, -1)),
    startTimestamp: start.toISOString(),
    endTimestamp: end.toISOString(),
  };
}

async function addInventoryAudit(tenantId: string, actorRole: string, eventType: string, targetType: string, targetId: string, metadata: Record<string, unknown> = {}) {
  await query(
    `insert into "PmsAuditEvent" ("id", "tenantId", "actorRole", "eventType", "targetType", "targetId", "outcome", "metadata")
     values ($1, $2, $3, $4, $5, $6, 'ALLOWED', $7::jsonb)`,
    [newId("audit"), tenantId, actorRole, eventType, targetType, targetId, JSON.stringify(metadata)],
  );
}

export async function getInventoryWorkbench(tenantId = defaultTenantId, filters: InventoryReportingFilters = {}) {
  const reportingWindow = resolveInventoryReportingWindow(filters);
  const [summary, items, lots, vendors, assets, movements, rfps, bids, benchmarks, locations, reportBuckets] = await Promise.all([
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
  ]);

  return {
    summary: summary.rows[0] ?? {
      activeItems: "0",
      lowStockItems: "0",
      expiringLots: "0",
      maintenanceDue: "0",
      openRfps: "0",
      marketplaceVendors: "0",
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
  const result = await query(
    `insert into "PmsInventoryVendor"
       ("id", "tenantId", "vendorName", "vendorType", "marketplaceStatus", "email", "phone", "website", "paymentTerms", "complianceStatus", "updatedAt")
     values ($1, $2, $3, $4, coalesce($5, 'PRIVATE_VENDOR'), $6, $7, $8, $9, 'NEEDS_REVIEW', current_timestamp)
     on conflict ("tenantId", "vendorName") do update set
       "vendorType" = excluded."vendorType",
       "marketplaceStatus" = excluded."marketplaceStatus",
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
  const result = await query(
    `insert into "PmsInventoryCatalogItem"
       ("id", "tenantId", "vendorId", "sku", "itemName", "category", "clinicalUse", "itemType", "unitOfMeasure", "reorderPoint", "parLevel", "lastUnitCostCents", "benchmarkCostCents", "taxable", "requiresLotTracking", "requiresExpiry", "controlledSubstance", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, coalesce($8, 'CONSUMABLE'), coalesce($9, 'each'), $10, $11, $12, $13, $14, $15, $16, $17, current_timestamp)
     on conflict ("tenantId", "sku") do update set
       "vendorId" = excluded."vendorId",
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
    const lot = await client.query(
      `insert into "PmsInventoryLot"
         ("id", "tenantId", "itemId", "vendorId", "locationId", "lotNumber", "serialNumber", "expirationDate", "quantityOnHand", "unitCostCents", "updatedAt")
       values ($1, $2, $3, $4, $5, $6, $7, $8::timestamp, $9, $10, current_timestamp)
       returning *`,
      [
        lotId,
        tenantId,
        input.itemId,
        input.vendorId || null,
        input.locationId,
        input.lotNumber?.trim() || null,
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
  const result = await query(
    `insert into "PmsInventoryAsset"
       ("id", "tenantId", "vendorId", "locationId", "assetTag", "assetName", "assetType", "manufacturer", "modelNumber", "serialNumber", "purchaseCostCents", "nextMaintenanceAt", "downtimeRisk", "notes", "updatedAt")
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::timestamp, coalesce($13, 'LOW'), $14, current_timestamp)
     on conflict ("tenantId", "assetTag") do update set
       "vendorId" = excluded."vendorId",
       "locationId" = excluded."locationId",
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
