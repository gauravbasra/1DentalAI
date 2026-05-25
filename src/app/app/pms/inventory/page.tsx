import Link from "next/link";
import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { PrintLabelButton } from "@/components/inventory/print-label-button";
import { EmptyPmsState, Money, PmsCard, PmsSectionNav, StatusFor } from "@/components/pms-ui";
import { requireAuth } from "@/lib/auth";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import {
  consumeInventoryStock,
  awardInventoryBidToPurchaseOrder,
  createInventoryAsset,
  createInventoryItem,
  createInventoryItemFromCommonItem,
  createInventoryRfp,
  createInventoryVendor,
  getInventoryWorkbench,
  receiveInventoryStock,
  receiveInventoryPurchaseOrder,
  recordInventoryCycleCount,
} from "@/lib/pms-inventory-repository";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, string | number | boolean | null>;

function cents(value: FormDataEntryValue | null) {
  return Math.round(Number(value || 0) * 100);
}

function number(value: FormDataEntryValue | null) {
  return Number(value || 0);
}

async function createVendorAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await createInventoryVendor({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    vendorName: String(formData.get("vendorName") ?? ""),
    vendorType: String(formData.get("vendorType") ?? "SUPPLIES"),
    marketplaceStatus: String(formData.get("marketplaceStatus") ?? "PRIVATE_VENDOR"),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    website: String(formData.get("website") ?? ""),
    paymentTerms: String(formData.get("paymentTerms") ?? ""),
  });
  revalidatePath("/app/pms/inventory");
}

async function createItemAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await createInventoryItem({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    vendorId: String(formData.get("vendorId") ?? "") || undefined,
    sku: String(formData.get("sku") ?? ""),
    itemName: String(formData.get("itemName") ?? ""),
    category: String(formData.get("category") ?? "SUPPLIES"),
    clinicalUse: String(formData.get("clinicalUse") ?? ""),
    itemType: String(formData.get("itemType") ?? "CONSUMABLE"),
    unitOfMeasure: String(formData.get("unitOfMeasure") ?? "each"),
    reorderPoint: number(formData.get("reorderPoint")),
    parLevel: number(formData.get("parLevel")),
    lastUnitCostCents: cents(formData.get("lastUnitCost")),
    benchmarkCostCents: cents(formData.get("benchmarkCost")),
    taxable: formData.get("taxable") === "on",
    requiresLotTracking: formData.get("requiresLotTracking") === "on",
    requiresExpiry: formData.get("requiresExpiry") === "on",
    controlledSubstance: formData.get("controlledSubstance") === "on",
  });
  revalidatePath("/app/pms/inventory");
}

async function addCommonItemAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await createInventoryItemFromCommonItem({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    commonItemId: String(formData.get("commonItemId") ?? ""),
    vendorId: String(formData.get("vendorId") ?? "") || undefined,
  });
  revalidatePath("/app/pms/inventory");
}

async function receiveStockAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await receiveInventoryStock({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    itemId: String(formData.get("itemId") ?? ""),
    vendorId: String(formData.get("vendorId") ?? "") || undefined,
    locationId: String(formData.get("locationId") ?? ""),
    lotNumber: String(formData.get("lotNumber") ?? ""),
    serialNumber: String(formData.get("serialNumber") ?? ""),
    expirationDate: String(formData.get("expirationDate") ?? ""),
    quantity: number(formData.get("quantity")),
    unitCostCents: cents(formData.get("unitCost")),
    reason: String(formData.get("reason") ?? "Inventory receipt"),
  });
  revalidatePath("/app/pms/inventory");
}

async function consumeStockAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await consumeInventoryStock({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    itemId: String(formData.get("itemId") ?? ""),
    lotId: String(formData.get("lotId") ?? "") || undefined,
    quantity: number(formData.get("quantity")),
    patientId: String(formData.get("patientId") ?? "") || undefined,
    appointmentId: String(formData.get("appointmentId") ?? "") || undefined,
    procedureCode: String(formData.get("procedureCode") ?? ""),
    reason: String(formData.get("reason") ?? "Clinical use"),
  });
  revalidatePath("/app/pms/inventory");
}

async function createRfpAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await createInventoryRfp({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    title: String(formData.get("title") ?? ""),
    category: String(formData.get("category") ?? "SUPPLIES"),
    releaseMode: String(formData.get("releaseMode") ?? "PRIVATE"),
    responseDueAt: String(formData.get("responseDueAt") ?? ""),
    projectedSpendCents: cents(formData.get("projectedSpend")),
    itemId: String(formData.get("itemId") ?? "") || undefined,
    itemName: String(formData.get("itemName") ?? ""),
    quantity: number(formData.get("quantity")),
    requirements: String(formData.get("requirements") ?? ""),
  });
  revalidatePath("/app/pms/inventory");
}

async function createAssetAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await createInventoryAsset({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    vendorId: String(formData.get("vendorId") ?? "") || undefined,
    locationId: String(formData.get("locationId") ?? "") || undefined,
    assetTag: String(formData.get("assetTag") ?? ""),
    assetName: String(formData.get("assetName") ?? ""),
    assetType: String(formData.get("assetType") ?? "EQUIPMENT"),
    manufacturer: String(formData.get("manufacturer") ?? ""),
    modelNumber: String(formData.get("modelNumber") ?? ""),
    serialNumber: String(formData.get("serialNumber") ?? ""),
    purchaseCostCents: cents(formData.get("purchaseCost")),
    nextMaintenanceAt: String(formData.get("nextMaintenanceAt") ?? ""),
    downtimeRisk: String(formData.get("downtimeRisk") ?? "LOW"),
    notes: String(formData.get("notes") ?? ""),
  });
  revalidatePath("/app/pms/inventory");
}

async function awardBidAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await awardInventoryBidToPurchaseOrder({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    bidId: String(formData.get("bidId") ?? ""),
  });
  revalidatePath("/app/pms/inventory");
}

async function receivePurchaseOrderAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await receiveInventoryPurchaseOrder({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    purchaseOrderId: String(formData.get("purchaseOrderId") ?? ""),
    locationId: String(formData.get("locationId") ?? ""),
  });
  revalidatePath("/app/pms/inventory");
}

async function recordCycleCountAction(formData: FormData) {
  "use server";
  const session = await requireAuth();
  await recordInventoryCycleCount({
    tenantId: session.tenantId,
    actorRole: session.roleKey,
    lotId: String(formData.get("lotId") ?? ""),
    countedQuantity: number(formData.get("countedQuantity")),
    reason: String(formData.get("reason") ?? "Physical cycle count"),
  });
  revalidatePath("/app/pms/inventory");
}

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ role?: string; period?: string; startDate?: string; endDate?: string; modal?: string; id?: string; q?: string; category?: string; status?: string; scan?: string }> }) {
  const params = await searchParams;
  const session = await requireAuth();
  const role = getRole(params.role);
  const workbench = await getInventoryWorkbench(session.tenantId, {
    period: params.period,
    startDate: params.startDate,
    endDate: params.endDate,
  });
  const summary = workbench.summary;
  const reportingWindow = workbench.reportingWindow;
  const items = workbench.items as AnyRow[];
  const vendors = workbench.vendors as AnyRow[];
  const lots = workbench.lots as AnyRow[];
  const assets = workbench.assets as AnyRow[];
  const movements = workbench.movements as AnyRow[];
  const rfps = workbench.rfps as AnyRow[];
  const bids = workbench.bids as AnyRow[];
  const benchmarks = workbench.benchmarks as AnyRow[];
  const locations = workbench.locations as AnyRow[];
  const reportBuckets = workbench.reportBuckets as AnyRow[];
  const purchaseOrders = workbench.purchaseOrders as AnyRow[];
  const cycleCounts = workbench.cycleCounts as AnyRow[];
  const labelQueue = workbench.labelQueue as AnyRow[];
  const commonItems = workbench.commonItems as AnyRow[];
  const usageAnalytics = workbench.usageAnalytics as AnyRow[];
  const categoryAnalytics = workbench.categoryAnalytics as AnyRow[];
  const reorderRecommendations = workbench.reorderRecommendations as AnyRow[];
  const assetRoiAnalytics = workbench.assetRoiAnalytics as AnyRow[];
  const roleParam = `role=${role.key}`;
  const modal = params.modal ?? "";
  const search = (params.q ?? "").trim().toLowerCase();
  const category = params.category ?? "all";
  const status = params.status ?? "all";
  const selectedItem = items.find((item) => String(item.id) === params.id) ?? null;
  const selectedVendor = vendors.find((vendor) => String(vendor.id) === params.id) ?? null;
  const selectedAsset = assets.find((asset) => String(asset.id) === params.id) ?? null;
  const selectedPo = purchaseOrders.find((po) => String(po.id) === params.id) ?? null;
  const scanned = params.scan ? labelQueue.find((label) => String(label.barcodeValue).toLowerCase() === String(params.scan).trim().toLowerCase()) : null;
  const itemCategories = Array.from(new Set(items.map((item) => String(item.category ?? "SUPPLIES")))).sort();
  const filteredItems = items.filter((item) => {
    const haystack = `${item.itemName ?? ""} ${item.sku ?? ""} ${item.category ?? ""} ${item.vendorName ?? ""} ${item.barcodeValue ?? ""}`.toLowerCase();
    const qty = Number(item.quantityOnHand ?? 0);
    const reorder = Number(item.reorderPoint ?? 0);
    const matchesStatus = status === "all" || (status === "low" ? qty <= reorder : String(item.status ?? "ACTIVE").toLowerCase() === status);
    return (!search || haystack.includes(search)) && (category === "all" || String(item.category) === category) && matchesStatus;
  });
  const closeHref = `/app/pms/inventory?${roleParam}&period=${reportingWindow.period}`;
  const hrefFor = (nextModal: string, id?: string) => `/app/pms/inventory?${roleParam}&period=${reportingWindow.period}&modal=${nextModal}${id ? `&id=${id}` : ""}`;

  return (
    <FoundationShell active="/app/pms/inventory" roleKey={role.key}>
      <PageHeader eyebrow="PMS inventory" title="Practice inventory and vendor marketplace" body="Track equipment, chairs, consumables, medicines, injections, lots, expiry, clinical usage, vendors, purchase orders, tenders, RFPs, bids, and peer benchmarks in the PMS operating graph." />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/pms/inventory" />
      <PmsSectionNav active="/app/pms/inventory" roleKey={role.key} />

      <section className="mb-4 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700">Inventory ops</p>
            <p className="mt-1 text-sm text-neutral-600">
              {reportingWindow.period} window · {new Date(`${reportingWindow.startDate}T00:00:00`).toLocaleDateString()} to {new Date(`${reportingWindow.endDate}T00:00:00`).toLocaleDateString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionLink href={hrefFor("scan")}>Scan now</ActionLink>
            <ActionLink href={hrefFor("labels")}>Print labels</ActionLink>
            <ActionLink href={hrefFor("filters")}>Filters</ActionLink>
            <ActionLink href={hrefFor("common-library")}>Common items</ActionLink>
            <ActionLink href={hrefFor("receive")}>Receive</ActionLink>
            <ActionLink href={hrefFor("consume")}>Use stock</ActionLink>
            <ActionLink href={hrefFor("cycle")}>Count</ActionLink>
            <ActionLink href={hrefFor("item")}>New item</ActionLink>
            <ActionLink href={hrefFor("vendor")}>Vendor</ActionLink>
            <ActionLink href={hrefFor("rfp")}>RFP</ActionLink>
            <ActionLink href={hrefFor("asset")}>Asset</ActionLink>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Metric label="Items" value={summary.activeItems} />
        <Metric label="Low stock" value={summary.lowStockItems} tone="amber" />
        <Metric label="Expiring" value={summary.expiringLots} tone="amber" />
        <Metric label="Maintenance" value={summary.maintenanceDue} tone="red" />
        <Metric label="Open RFPs" value={summary.openRfps} />
        <Metric label="Vendors" value={summary.marketplaceVendors} />
        <Metric label="Portal subs" value={summary.activeMarketplaceSubscriptions} />
        <Metric label="Open POs" value={summary.openPurchaseOrders} />
        <Metric label="Cycle counts" value={summary.openCycleCounts} />
        <Metric label="Stock value" value={<Money cents={Number(summary.inventoryValueCents)} />} />
        <Metric label="Period used" value={<Money cents={Number(summary.periodUsageCents)} />} />
        <Metric label="Received" value={<Money cents={Number(summary.periodReceivedCents)} />} />
        <Metric label="Use events" value={summary.periodUseEvents} />
        <Metric label="CDT linked" value={summary.periodProcedureLinkedUse} />
        <Metric label="ROI" value={<Money cents={Number(summary.periodRoiCents)} />} tone={Number(summary.periodRoiCents) < 0 ? "red" : "neutral"} />
      </section>

      <section className="mt-5 grid gap-5 2xl:grid-cols-[1.2fr_0.8fr]">
        <PmsCard title="Usage analytics" eyebrow="Product use, CDT mapping, and ROI">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-neutral-200 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                <tr>
                  <th className="py-2 pr-3">Product</th>
                  <th className="px-3 py-2">Uses</th>
                  <th className="px-3 py-2">Cost/use</th>
                  <th className="px-3 py-2">Spend</th>
                  <th className="px-3 py-2">Revenue</th>
                  <th className="py-2 pl-3">ROI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {usageAnalytics.slice(0, 12).map((row) => (
                  <tr key={String(row.id)}>
                    <td className="py-3 pr-3">
                      <p className="font-semibold text-neutral-950">{row.itemName}</p>
                      <p className="mt-1 text-xs text-neutral-500">{row.category} · CDT {formatCodeList(row.mappedCdtCodes)}</p>
                    </td>
                    <td className="px-3 py-3 text-neutral-700">{String(row.useEvents)} events · {String(row.quantityUsed)} {row.unitOfMeasure}</td>
                    <td className="px-3 py-3 text-neutral-700"><Money cents={Number(row.avgCostPerUseCents ?? 0)} /></td>
                    <td className="px-3 py-3 text-neutral-700"><Money cents={Number(row.usageCostCents ?? 0)} /></td>
                    <td className="px-3 py-3 text-neutral-700"><Money cents={Number(row.estimatedRevenueCents ?? 0)} /></td>
                    <td className="py-3 pl-3 font-semibold text-neutral-950"><Money cents={Number(row.roiCents ?? 0)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!usageAnalytics.length ? <EmptyPmsState title="No inventory usage in this window" body="Use stock from the scan or Use stock action to populate product utilization and ROI." /> : null}
          </div>
        </PmsCard>

        <div className="grid gap-5">
          <PmsCard title="Reorder intelligence" eyebrow="Velocity and days on hand">
            <div className="grid gap-2">
              {reorderRecommendations.slice(0, 6).map((row) => (
                <div key={String(row.id)} className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-neutral-950">{row.itemName}</p>
                      <p className="mt-1 text-neutral-600">On hand {row.quantityOnHand} · daily use {row.avgDailyUse} · days {row.daysOnHand ?? "n/a"}</p>
                    </div>
                    <p className="text-right text-xs font-semibold text-neutral-700">Order {row.suggestedOrderQuantity}<br /><Money cents={Number(row.estimatedOrderCents ?? 0)} /></p>
                  </div>
                </div>
              ))}
            </div>
          </PmsCard>
          <PmsCard title="Category spend" eyebrow="Daily, weekly, monthly, custom filters">
            <CompactRows rows={categoryAnalytics.slice(0, 6)} primary="category" secondary="usageCostCents" status="useEvents" />
          </PmsCard>
        </div>
      </section>

      <section className="mt-5 grid gap-5 2xl:grid-cols-[1.25fr_0.85fr]">
        <PmsCard title="Inventory command center" eyebrow={`${filteredItems.length} of ${items.length} products shown`}>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            {search ? <FilterChip label={`Search: ${search}`} /> : null}
            {category !== "all" ? <FilterChip label={`Category: ${category}`} /> : null}
            {status !== "all" ? <FilterChip label={`Status: ${status}`} /> : null}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-neutral-200 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                <tr>
                  <th className="py-2 pr-3">Item</th>
                  <th className="px-3 py-2">Stock</th>
                  <th className="px-3 py-2">Cost</th>
                  <th className="px-3 py-2">Barcode</th>
                  <th className="py-2 pl-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredItems.map((item) => {
                  const qty = Number(item.quantityOnHand ?? 0);
                  const reorder = Number(item.reorderPoint ?? 0);
                  const lowStock = qty <= reorder;
                  return (
                    <tr key={String(item.id)}>
                      <td className="py-3 pr-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-neutral-950">{String(item.itemName)}</p>
                          <StatusFor value={lowStock ? "LOW_STOCK" : String(item.status ?? "ACTIVE")} />
                        </div>
                        <p className="mt-1 text-xs text-neutral-500">{String(item.sku)} · {String(item.category)} · {String(item.vendorName ?? "No vendor")}</p>
                      </td>
                      <td className="px-3 py-3 text-neutral-700">{qty.toLocaleString()} on hand · reorder {reorder.toLocaleString()}</td>
                      <td className="px-3 py-3 text-neutral-700"><Money cents={Number(item.lastUnitCostCents ?? 0)} /></td>
                      <td className="px-3 py-3 font-mono text-xs text-neutral-500">{String(item.barcodeValue ?? "")}</td>
                      <td className="py-3 pl-3">
                        <div className="flex justify-end gap-2">
                          <ActionLink href={hrefFor("item", String(item.id))}>Edit</ActionLink>
                          <ActionLink href={hrefFor("receive", String(item.id))}>Receive</ActionLink>
                          <ActionLink href={hrefFor("consume", String(item.id))}>Use</ActionLink>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!filteredItems.length ? <EmptyPmsState title="No inventory rows match the filters" body="Open filters and change search, category, or status." /> : null}
          </div>
        </PmsCard>

        <div className="grid gap-5">
          <PmsCard title="Purchase orders" eyebrow="Awards and receiving">
            <div className="grid gap-2">
              {purchaseOrders.slice(0, 8).map((po) => (
                <div key={String(po.id)} className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-neutral-950">{po.poNumber} · {po.vendorName}</p>
                      <p className="mt-1 text-neutral-600"><Money cents={Number(po.totalCents ?? 0)} /> · {po.lineCount} lines</p>
                    </div>
                    <StatusFor value={String(po.status)} />
                  </div>
                  {String(po.status) !== "RECEIVED" ? <div className="mt-2"><ActionLink href={hrefFor("receive-po", String(po.id))}>Receive PO</ActionLink></div> : null}
                </div>
              ))}
            </div>
          </PmsCard>

          <PmsCard title="Vendor marketplace" eyebrow="Portal, bids, subscription">
            <div className="grid gap-2">
              {vendors.slice(0, 6).map((vendor) => (
                <div key={String(vendor.id)} className="rounded-lg bg-neutral-50 p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-neutral-950">{vendor.vendorName}</p>
                      <p className="mt-1 text-neutral-600">{vendor.vendorType} · {vendor.subscriptionStatus} · bids {vendor.bidCount}</p>
                    </div>
                    <ActionLink href={hrefFor("vendor", String(vendor.id))}>Edit</ActionLink>
                  </div>
                  {vendor.portalToken ? <Link className="mt-2 inline-flex text-xs font-semibold text-cyan-700" href={`/vendor/inventory?token=${vendor.portalToken}`}>Open vendor portal</Link> : null}
                </div>
              ))}
            </div>
          </PmsCard>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-3">
        <PmsCard title="Lots and expiry" eyebrow="Traceability">
          <CompactRows rows={lots.slice(0, 8)} primary="itemName" secondary="locationName" status="expirationDate" />
        </PmsCard>
        <PmsCard title="Usage ledger" eyebrow="Selected window">
          <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
            <Mini label="Moves" value={summary.periodMovementCount} />
            <Mini label="RFPs" value={summary.periodRfpCount} />
            <Mini label="30d" value={<Money cents={Number(summary.last30UsageCents)} />} />
          </div>
          <CompactRows rows={movements.slice(0, 8)} primary="itemName" secondary="reason" status="movementType" />
        </PmsCard>
        <PmsCard title="Assets and counts" eyebrow="Equipment control">
          <div className="grid gap-2">
            {assets.slice(0, 4).map((asset) => (
              <div key={String(asset.id)} className="rounded-lg bg-neutral-50 p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-950">{asset.assetName}</p>
                    <p className="mt-1 text-xs text-neutral-500">{asset.assetTag} · {asset.locationName ?? "No location"}</p>
                  </div>
                  <ActionLink href={hrefFor("asset", String(asset.id))}>Edit</ActionLink>
                </div>
              </div>
            ))}
            {cycleCounts.slice(0, 3).map((count) => (
              <div key={String(count.id)} className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
                <p className="font-semibold text-neutral-950">{count.countNumber}</p>
                <p className="mt-1 text-xs text-neutral-500">Variance <Money cents={Number(count.varianceCents ?? 0)} /> · {count.status}</p>
              </div>
            ))}
          </div>
        </PmsCard>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <PmsCard title="RFPs and bids" eyebrow="Marketplace workflow">
          <div className="grid gap-2">
            {rfps.slice(0, 5).map((rfp) => (
              <div key={String(rfp.id)} className="rounded-lg bg-neutral-50 p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-950">{rfp.title}</p>
                    <p className="text-neutral-600">{rfp.rfpNumber} · {rfp.category} · bids {rfp.bidCount}</p>
                  </div>
                  <StatusFor value={String(rfp.status)} />
                </div>
              </div>
            ))}
            {bids.slice(0, 4).map((bid) => (
              <div key={String(bid.id)} className="rounded-lg border border-cyan-100 bg-cyan-50 p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-950">{bid.vendorName} bid · <Money cents={Number(bid.bidTotalCents ?? 0)} /></p>
                    <p className="text-neutral-600">{bid.rfpNumber} · lead {bid.leadDays} days</p>
                  </div>
                  <form action={awardBidAction}>
                    <input type="hidden" name="bidId" value={String(bid.id)} />
                    <button className="rounded-md bg-cyan-700 px-3 py-2 text-xs font-semibold text-white">Award PO</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </PmsCard>
        <PmsCard title="Benchmarks" eyebrow="Peer comparison">
          <CompactRows rows={[...reportBuckets.slice(0, 4), ...benchmarks.slice(0, 4)]} primary="itemCategory" secondary="metricName" status="percentile" />
        </PmsCard>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <PmsCard title="Asset ROI and utilization" eyebrow="Equipment investment vs chair-side usage">
          <div className="grid gap-2">
            {assetRoiAnalytics.slice(0, 6).map((asset) => (
              <div key={String(asset.id)} className="rounded-lg bg-neutral-50 p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-950">{asset.assetName}</p>
                    <p className="mt-1 text-xs text-neutral-500">{asset.assetTag} · {asset.locationName ?? "No location"} · {asset.locationUseEvents} uses nearby</p>
                  </div>
                  <div className="text-right text-xs font-semibold text-neutral-700">
                    <Money cents={Number(asset.locationUsageCents ?? 0)} />
                    <p className="mt-1">{asset.usageToAssetCostPct ?? "0"}% of asset cost</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </PmsCard>
        <PmsCard title="Common dental item library" eyebrow={`${commonItems.length} mapped templates`}>
          <div className="grid gap-2">
            {commonItems.slice(0, 6).map((item) => (
              <div key={String(item.id)} className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-950">{item.itemName}</p>
                    <p className="mt-1 text-xs text-neutral-500">{item.category} · CDT {formatCodeList(item.cdtCodes)}</p>
                  </div>
                  <form action={addCommonItemAction}>
                    <input type="hidden" name="commonItemId" value={String(item.id)} />
                    <button className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:border-neutral-950">Add</button>
                  </form>
                </div>
              </div>
            ))}
            <ActionLink href={hrefFor("common-library")}>Open full library</ActionLink>
          </div>
        </PmsCard>
      </section>

      {modal ? (
        <Modal title={modalTitle(modal)} closeHref={closeHref}>
          {modal === "filters" ? (
            <form className="grid gap-3" action="/app/pms/inventory">
              <input type="hidden" name="role" value={role.key} />
              <Input name="q" label="Search inventory" defaultValue={params.q ?? ""} />
              <Select name="category" label="Category" options={[["all", "All categories"], ...itemCategories.map((value) => [value, value] as [string, string])]} />
              <Select name="status" label="Status" options={[["all", "All statuses"], ["low", "Low stock"], ["active", "Active"]]} />
              <Select name="period" label="Reporting period" options={[["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"], ["custom", "Custom calendar"]]} />
              <div className="grid gap-3 md:grid-cols-2">
                <Input name="startDate" label="Start date" type="date" defaultValue={reportingWindow.startDate} />
                <Input name="endDate" label="End date" type="date" defaultValue={reportingWindow.endDate} />
              </div>
              <button className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Apply filters</button>
            </form>
          ) : null}
          {modal === "scan" ? (
            <div className="grid gap-4">
              <form className="grid gap-3" action="/app/pms/inventory">
                <input type="hidden" name="role" value={role.key} />
                <input type="hidden" name="period" value={reportingWindow.period} />
                <input type="hidden" name="modal" value="scan" />
                <Input name="scan" label="Scan or type barcode" defaultValue={params.scan ?? ""} placeholder="1DAI-ITEM-..." />
                <button className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Lookup barcode</button>
              </form>
              {params.scan ? (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                  {scanned ? (
                    <>
                      <p className="font-semibold text-neutral-950">{scanned.labelName}</p>
                      <p className="mt-1 text-sm text-neutral-600">{scanned.labelType} · {scanned.labelCode}</p>
                      <p className="mt-1 font-mono text-xs text-neutral-500">{scanned.barcodeValue}</p>
                    </>
                  ) : <p className="text-sm text-neutral-600">No inventory record found for {params.scan}.</p>}
                </div>
              ) : null}
            </div>
          ) : null}
          {modal === "labels" ? (
            <div className="grid gap-4">
              <div className="flex justify-end"><PrintLabelButton /></div>
              <div className="grid gap-2 print:grid-cols-2">
                {labelQueue.slice(0, 48).map((label) => <BarcodeLabel key={`${label.labelType}-${label.id}`} label={label} />)}
              </div>
            </div>
          ) : null}
          {modal === "common-library" ? <CommonLibraryForm action={addCommonItemAction} commonItems={commonItems} vendors={vendors} /> : null}
          {modal === "receive" ? <ReceiveForm action={receiveStockAction} items={items} vendors={vendors} locations={locations} selectedItem={selectedItem} /> : null}
          {modal === "consume" ? <ConsumeForm action={consumeStockAction} items={items} lots={lots} selectedItem={selectedItem} /> : null}
          {modal === "cycle" ? <CycleForm action={recordCycleCountAction} lots={lots} /> : null}
          {modal === "item" ? <ItemForm action={createItemAction} item={selectedItem} vendors={vendors} /> : null}
          {modal === "vendor" ? <VendorForm action={createVendorAction} vendor={selectedVendor} /> : null}
          {modal === "asset" ? <AssetForm action={createAssetAction} asset={selectedAsset} vendors={vendors} locations={locations} /> : null}
          {modal === "rfp" ? <RfpForm action={createRfpAction} items={items} /> : null}
          {modal === "receive-po" ? <ReceivePoForm action={receivePurchaseOrderAction} po={selectedPo} locations={locations} /> : null}
        </Modal>
      ) : null}
    </FoundationShell>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: React.ReactNode; tone?: "neutral" | "amber" | "red" }) {
  const toneClass = tone === "red" ? "border-red-200 bg-red-50 text-red-900" : tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-neutral-200 bg-white text-neutral-950";
  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function ActionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-9 items-center rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:border-neutral-950 hover:text-neutral-950">
      {children}
    </Link>
  );
}

function FilterChip({ label }: { label: string }) {
  return <span className="rounded-full bg-cyan-50 px-3 py-1 font-semibold text-cyan-800 ring-1 ring-cyan-100">{label}</span>;
}

function Modal({ title, closeHref, children }: { title: string; closeHref: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-neutral-950/55 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-lg border border-neutral-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-neutral-950">{title}</h2>
          <Link href={closeHref} className="rounded-md border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">Close</Link>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function modalTitle(modal: string) {
  const titles: Record<string, string> = {
    filters: "Filter inventory and reporting window",
    scan: "Scan inventory barcode",
    labels: "Print inventory barcode labels",
    "common-library": "Common dental item library",
    receive: "Receive stock",
    consume: "Record clinical use",
    cycle: "Post physical cycle count",
    item: "Catalog item",
    vendor: "Vendor marketplace profile",
    asset: "Equipment or chair asset",
    rfp: "Release RFP or tender",
    "receive-po": "Receive purchase order",
  };
  return titles[modal] ?? "Inventory action";
}

function CompactRows({ rows, primary, secondary, status }: { rows: AnyRow[]; primary: string; secondary: string; status: string }) {
  return (
    <div className="grid gap-2">
      {rows.map((row, index) => (
        <div key={String(row.id ?? `${primary}-${index}`)} className="rounded-lg bg-neutral-50 p-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-neutral-950">{String(row[primary] ?? row.bucketDate ?? "Inventory row")}</p>
              <p className="mt-1 text-xs text-neutral-500">{String(row[secondary] ?? row.valueCents ?? row.reason ?? "")}</p>
            </div>
            {row[status] ? <StatusFor value={String(row[status])} /> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function BarcodeLabel({ label }: { label: AnyRow }) {
  return (
    <div className="rounded-md border border-neutral-300 bg-white p-3 text-sm">
      <p className="font-semibold text-neutral-950">{String(label.labelName)}</p>
      <p className="text-xs text-neutral-500">{String(label.labelType)} · {String(label.labelCode)}</p>
      <div className="mt-2 h-10 rounded bg-[repeating-linear-gradient(90deg,#111_0,#111_2px,#fff_2px,#fff_5px,#111_5px,#111_8px,#fff_8px,#fff_11px)]" />
      <p className="mt-1 font-mono text-xs">{String(label.barcodeValue)}</p>
    </div>
  );
}

type InventoryAction = (formData: FormData) => Promise<void>;

function CommonLibraryForm({ action, commonItems, vendors }: { action: InventoryAction; commonItems: AnyRow[]; vendors: AnyRow[] }) {
  const categories = Array.from(new Set(commonItems.map((item) => String(item.category ?? "SUPPLIES")))).sort();
  return (
    <div className="grid gap-4">
      {categories.map((category) => (
        <div key={category} className="grid gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700">{category}</p>
          {commonItems.filter((item) => String(item.category) === category).map((item) => (
            <form key={String(item.id)} action={action} className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
              <input type="hidden" name="commonItemId" value={String(item.id)} />
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-semibold text-neutral-950">{item.itemName}</p>
                  <p className="mt-1 text-neutral-600">{item.clinicalUse}</p>
                  <p className="mt-1 text-xs text-neutral-500">CDT {formatCodeList(item.cdtCodes)} · benchmark <Money cents={Number(item.benchmarkCostCents ?? 0)} /> · {item.estimatedUsesPerUnit} uses/{item.unitOfMeasure}</p>
                </div>
                <div className="grid min-w-48 gap-2">
                  <Select name="vendorId" label="Preferred vendor" options={vendors.map((vendor) => [String(vendor.id), String(vendor.vendorName)])} optional />
                  <button className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Add to catalog</button>
                </div>
              </div>
            </form>
          ))}
        </div>
      ))}
    </div>
  );
}

function ReceiveForm({ action, items, vendors, locations, selectedItem }: { action: InventoryAction; items: AnyRow[]; vendors: AnyRow[]; locations: AnyRow[]; selectedItem: AnyRow | null }) {
  return (
    <form action={action} className="grid gap-3">
      <Select name="itemId" label="Item" defaultValue={String(selectedItem?.id ?? "")} options={items.map((item) => [String(item.id), `${item.itemName} · ${item.sku}`])} />
      <Select name="vendorId" label="Vendor" options={vendors.map((vendor) => [String(vendor.id), String(vendor.vendorName)])} optional />
      <Select name="locationId" label="Location" options={locations.map((location) => [String(location.id), String(location.locationName)])} />
      <div className="grid gap-3 md:grid-cols-2">
        <Input name="quantity" label="Quantity" type="number" step="0.01" required />
        <Input name="unitCost" label="Unit cost" type="number" step="0.01" required />
        <Input name="lotNumber" label="Lot number" />
        <Input name="expirationDate" label="Expiration" type="date" />
      </div>
      <Input name="reason" label="Reason" defaultValue="Vendor receipt" />
      <button className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Receive stock</button>
    </form>
  );
}

function ConsumeForm({ action, items, lots, selectedItem }: { action: InventoryAction; items: AnyRow[]; lots: AnyRow[]; selectedItem: AnyRow | null }) {
  return (
    <form action={action} className="grid gap-3">
      <Select name="itemId" label="Item" defaultValue={String(selectedItem?.id ?? "")} options={items.map((item) => [String(item.id), `${item.itemName} · ${item.sku}`])} />
      <Select name="lotId" label="Specific lot" options={lots.map((lot) => [String(lot.id), `${lot.itemName} · ${lot.lotNumber ?? "no lot"} · qty ${lot.quantityOnHand}`])} optional />
      <div className="grid gap-3 md:grid-cols-2">
        <Input name="quantity" label="Quantity used" type="number" step="0.01" required />
        <Input name="procedureCode" label="CDT/procedure" placeholder="D2740" />
        <Input name="patientId" label="Patient ID" />
        <Input name="appointmentId" label="Appointment ID" />
      </div>
      <Input name="reason" label="Use reason" defaultValue="Clinical procedure use" required />
      <button className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Consume stock</button>
    </form>
  );
}

function CycleForm({ action, lots }: { action: InventoryAction; lots: AnyRow[] }) {
  return (
    <form action={action} className="grid gap-3">
      <Select name="lotId" label="Lot to count" options={lots.map((lot) => [String(lot.id), `${lot.itemName} · ${lot.lotNumber ?? lot.barcodeValue} · expected ${lot.quantityOnHand}`])} />
      <Input name="countedQuantity" label="Counted quantity" type="number" step="0.01" required />
      <Input name="reason" label="Reason" defaultValue="Physical cycle count" />
      <button className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Post count and variance</button>
    </form>
  );
}

function ItemForm({ action, item, vendors }: { action: InventoryAction; item: AnyRow | null; vendors: AnyRow[] }) {
  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-3">
        <Input name="sku" label="SKU" defaultValue={String(item?.sku ?? "")} required />
        <Input name="itemName" label="Item name" defaultValue={String(item?.itemName ?? "")} required />
        <Select name="category" label="Category" defaultValue={String(item?.category ?? "SUPPLIES")} options={["ANESTHETIC", "PPE", "SURGICAL", "RESTORATIVE", "MEDICATION", "EQUIPMENT_PARTS", "OFFICE"].map((v) => [v, v])} />
        <Select name="vendorId" label="Preferred vendor" defaultValue={String(item?.vendorId ?? "")} options={vendors.map((vendor) => [String(vendor.id), String(vendor.vendorName)])} optional />
        <Select name="itemType" label="Type" defaultValue={String(item?.itemType ?? "CONSUMABLE")} options={["CONSUMABLE", "MEDICATION", "INJECTION", "ASSET_PART", "OFFICE_SUPPLY"].map((v) => [v, v.replaceAll("_", " ")])} />
        <Input name="unitOfMeasure" label="Unit" defaultValue={String(item?.unitOfMeasure ?? "each")} />
        <Input name="reorderPoint" label="Reorder point" type="number" step="0.01" defaultValue={String(item?.reorderPoint ?? "")} />
        <Input name="parLevel" label="Par level" type="number" step="0.01" defaultValue={String(item?.parLevel ?? "")} />
        <Input name="lastUnitCost" label="Last unit cost" type="number" step="0.01" defaultValue={item?.lastUnitCostCents ? String(Number(item.lastUnitCostCents) / 100) : ""} />
        <Input name="benchmarkCost" label="Benchmark cost" type="number" step="0.01" defaultValue={item?.benchmarkCostCents ? String(Number(item.benchmarkCostCents) / 100) : ""} />
      </div>
      <Input name="clinicalUse" label="Clinical use" defaultValue={String(item?.clinicalUse ?? "")} />
      <div className="flex flex-wrap gap-4 text-sm font-semibold text-neutral-700">
        <Checkbox name="taxable" label="Taxable" />
        <Checkbox name="requiresLotTracking" label="Lot tracking" />
        <Checkbox name="requiresExpiry" label="Expiry tracking" />
        <Checkbox name="controlledSubstance" label="Controlled substance" />
      </div>
      <button className="w-fit rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Save catalog item</button>
    </form>
  );
}

function VendorForm({ action, vendor }: { action: InventoryAction; vendor: AnyRow | null }) {
  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        <Input name="vendorName" label="Vendor name" defaultValue={String(vendor?.vendorName ?? "")} required />
        <Select name="vendorType" label="Vendor type" defaultValue={String(vendor?.vendorType ?? "SUPPLIES")} options={["SUPPLIES", "EQUIPMENT", "LAB", "PHARMACY", "SERVICE"].map((v) => [v, v])} />
        <Select name="marketplaceStatus" label="Marketplace" defaultValue={String(vendor?.marketplaceStatus ?? "PRIVATE_VENDOR")} options={["PRIVATE_VENDOR", "MARKETPLACE_VENDOR", "PREFERRED_VENDOR"].map((v) => [v, v.replaceAll("_", " ")])} />
        <Input name="paymentTerms" label="Payment terms" defaultValue={String(vendor?.paymentTerms ?? "")} placeholder="NET_30" />
        <Input name="email" label="Email" type="email" defaultValue={String(vendor?.email ?? "")} />
        <Input name="phone" label="Phone" defaultValue={String(vendor?.phone ?? "")} />
      </div>
      <Input name="website" label="Website" defaultValue={String(vendor?.website ?? "")} />
      <button className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Save vendor</button>
    </form>
  );
}

function AssetForm({ action, asset, vendors, locations }: { action: InventoryAction; asset: AnyRow | null; vendors: AnyRow[]; locations: AnyRow[] }) {
  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        <Input name="assetTag" label="Asset tag" defaultValue={String(asset?.assetTag ?? "")} required />
        <Input name="assetName" label="Asset name" defaultValue={String(asset?.assetName ?? "")} required />
        <Select name="assetType" label="Type" defaultValue={String(asset?.assetType ?? "EQUIPMENT")} options={["CHAIR", "IMAGING", "STERILIZATION", "HANDPIECE", "COMPRESSOR", "IT", "EQUIPMENT"].map((v) => [v, v])} />
        <Select name="downtimeRisk" label="Risk" defaultValue={String(asset?.downtimeRisk ?? "LOW")} options={["LOW", "MEDIUM", "HIGH"].map((v) => [v, v])} />
        <Select name="vendorId" label="Vendor" defaultValue={String(asset?.vendorId ?? "")} options={vendors.map((vendor) => [String(vendor.id), String(vendor.vendorName)])} optional />
        <Select name="locationId" label="Location" defaultValue={String(asset?.locationId ?? "")} options={locations.map((location) => [String(location.id), String(location.locationName)])} optional />
        <Input name="manufacturer" label="Manufacturer" defaultValue={String(asset?.manufacturer ?? "")} />
        <Input name="nextMaintenanceAt" label="Next maintenance" type="date" defaultValue={String(asset?.nextMaintenanceAt ?? "").slice(0, 10)} />
      </div>
      <Input name="notes" label="Notes" defaultValue={String(asset?.notes ?? "")} />
      <button className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Save asset</button>
    </form>
  );
}

function RfpForm({ action, items }: { action: InventoryAction; items: AnyRow[] }) {
  return (
    <form action={action} className="grid gap-3">
      <Input name="title" label="RFP title" required />
      <div className="grid gap-3 md:grid-cols-2">
        <Select name="category" label="Category" options={["ANESTHETIC", "PPE", "SURGICAL", "RESTORATIVE", "EQUIPMENT", "MEDICATION"].map((v) => [v, v])} />
        <Select name="releaseMode" label="Release" options={["PRIVATE", "PREFERRED_VENDORS", "MARKETPLACE"].map((v) => [v, v.replaceAll("_", " ")])} />
        <Input name="responseDueAt" label="Due date" type="date" />
        <Input name="projectedSpend" label="Projected spend" type="number" step="0.01" />
      </div>
      <Select name="itemId" label="Known item" options={items.map((item) => [String(item.id), `${item.itemName} · ${item.sku}`])} optional />
      <div className="grid gap-3 md:grid-cols-[1fr_120px]">
        <Input name="itemName" label="Requested product/service" required />
        <Input name="quantity" label="Qty" type="number" step="0.01" required />
      </div>
      <label className="grid gap-1 text-sm font-semibold text-neutral-700">Requirements<textarea name="requirements" rows={3} className="rounded-md border border-neutral-300 px-3 py-2" /></label>
      <button className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Release RFP</button>
    </form>
  );
}

function ReceivePoForm({ action, po, locations }: { action: InventoryAction; po: AnyRow | null; locations: AnyRow[] }) {
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="purchaseOrderId" value={String(po?.id ?? "")} />
      <p className="rounded-lg bg-neutral-50 p-3 text-sm font-semibold text-neutral-950">{po ? `${po.poNumber} · ${po.vendorName}` : "Purchase order not selected"}</p>
      <Select name="locationId" label="Receive to" options={locations.map((location) => [String(location.id), String(location.locationName)])} />
      <button className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Receive purchase order</button>
    </form>
  );
}

function Mini({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md bg-neutral-50 px-3 py-2">
      <p className="font-black text-neutral-950">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p>
    </div>
  );
}

function formatCodeList(value: unknown) {
  if (Array.isArray(value)) return value.slice(0, 6).join(", ") || "unmapped";
  if (typeof value === "string") return value || "unmapped";
  return "unmapped";
}

function Input({
  label,
  name,
  type = "text",
  required = false,
  step,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  step?: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-neutral-700">
      {label}
      <input name={name} type={type} required={required} step={step} placeholder={placeholder} defaultValue={defaultValue} className="rounded-md border border-neutral-300 px-3 py-2" />
    </label>
  );
}

function Select({ label, name, options, optional = false, defaultValue }: { label: string; name: string; options: Array<[string, string]>; optional?: boolean; defaultValue?: string }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-neutral-700">
      {label}
      <select name={name} defaultValue={defaultValue} className="rounded-md border border-neutral-300 px-3 py-2">
        {optional ? <option value="">Not selected</option> : null}
        {options.map(([value, display]) => <option key={value} value={value}>{display}</option>)}
      </select>
    </label>
  );
}

function Checkbox({ label, name }: { label: string; name: string }) {
  return <label className="inline-flex items-center gap-2"><input name={name} type="checkbox" className="h-4 w-4 rounded border-neutral-300" />{label}</label>;
}
