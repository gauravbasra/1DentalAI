import Link from "next/link";
import { revalidatePath } from "next/cache";
import { FoundationShell, PageHeader, RoleSwitcher } from "@/components/foundation-shell";
import { EmptyPmsState, Money, PmsCard, PmsSectionNav, StatusFor } from "@/components/pms-ui";
import { requireAuth } from "@/lib/auth";
import { getRole, type RoleKey } from "@/lib/foundation-data";
import {
  consumeInventoryStock,
  createInventoryAsset,
  createInventoryItem,
  createInventoryRfp,
  createInventoryVendor,
  getInventoryWorkbench,
  receiveInventoryStock,
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

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ role?: string; period?: string; startDate?: string; endDate?: string }> }) {
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
  const roleParam = `role=${role.key}`;

  return (
    <FoundationShell active="/app/pms" roleKey={role.key}>
      <PageHeader eyebrow="PMS inventory" title="Practice inventory and vendor marketplace" body="Track equipment, chairs, consumables, medicines, injections, lots, expiry, clinical usage, vendors, purchase orders, tenders, RFPs, bids, and peer benchmarks in the PMS operating graph." />
      <RoleSwitcher activeRole={role.key as RoleKey} basePath="/app/pms/inventory" />
      <PmsSectionNav active="/app/pms/inventory" roleKey={role.key} />

      <section className="mb-6 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700">Reporting filters</p>
            <h2 className="mt-1 text-lg font-semibold text-neutral-950">Inventory reporting window</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Showing {reportingWindow.period} reporting from {new Date(`${reportingWindow.startDate}T00:00:00`).toLocaleDateString()} to {new Date(`${reportingWindow.endDate}T00:00:00`).toLocaleDateString()}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["daily", "Daily"],
              ["weekly", "Weekly"],
              ["monthly", "Monthly"],
            ].map(([period, label]) => (
              <Link
                key={period}
                href={`/app/pms/inventory?${roleParam}&period=${period}`}
                className={`rounded-md border px-3 py-2 text-sm font-semibold ${reportingWindow.period === period ? "border-neutral-950 bg-neutral-950 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"}`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        <form className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]" action="/app/pms/inventory">
          <input type="hidden" name="role" value={role.key} />
          <input type="hidden" name="period" value="custom" />
          <Input name="startDate" label="Start date" type="date" defaultValue={reportingWindow.startDate} />
          <Input name="endDate" label="End date" type="date" defaultValue={reportingWindow.endDate} />
          <button className="self-end rounded-md bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800">Apply calendar range</button>
        </form>
      </section>

      <section className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Metric label="Items" value={summary.activeItems} />
        <Metric label="Low stock" value={summary.lowStockItems} tone="amber" />
        <Metric label="Expiring" value={summary.expiringLots} tone="amber" />
        <Metric label="Maintenance" value={summary.maintenanceDue} tone="red" />
        <Metric label="Open RFPs" value={summary.openRfps} />
        <Metric label="Vendors" value={summary.marketplaceVendors} />
        <Metric label="Stock value" value={<Money cents={Number(summary.inventoryValueCents)} />} />
        <Metric label="Period used" value={<Money cents={Number(summary.periodUsageCents)} />} />
        <Metric label="Period received" value={<Money cents={Number(summary.periodReceivedCents)} />} />
      </section>

      <section className="mt-6 grid gap-6 2xl:grid-cols-[1.4fr_0.95fr]">
        <PmsCard title="Inventory command center" eyebrow="Stock, lots, expiry, and usage">
          <div className="grid gap-3">
            {items.length ? items.map((item) => {
              const qty = Number(item.quantityOnHand ?? 0);
              const reorder = Number(item.reorderPoint ?? 0);
              const par = Number(item.parLevel ?? 0);
              const lowStock = qty <= reorder;
              return (
                <div key={String(item.id)} className="rounded-lg border border-neutral-200 bg-white p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-neutral-950">{item.itemName}</p>
                        <StatusFor value={lowStock ? "LOW_STOCK" : String(item.status ?? "ACTIVE")} />
                        {item.controlledSubstance ? <StatusFor value="CONTROLLED" /> : null}
                      </div>
                      <p className="mt-1 text-sm text-neutral-600">{item.sku} · {item.category} · {item.vendorName ?? "No preferred vendor"} · {item.clinicalUse ?? "General practice use"}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <Mini label="On hand" value={qty.toLocaleString()} />
                      <Mini label="Reorder" value={reorder.toLocaleString()} />
                      <Mini label="Par" value={par.toLocaleString()} />
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-neutral-700 md:grid-cols-3">
                    <p>Last cost <strong><Money cents={Number(item.lastUnitCostCents ?? 0)} /></strong></p>
                    <p>Benchmark <strong>{item.benchmarkCostCents ? <Money cents={Number(item.benchmarkCostCents)} /> : "not set"}</strong></p>
                    <p>Stock value <strong><Money cents={Number(item.stockValueCents ?? 0)} /></strong></p>
                  </div>
                </div>
              );
            }) : <EmptyPmsState title="No catalog items yet" body="Create items for clinical supplies, medicines, injections, equipment parts, and office products. Stock movements and benchmarks start from the catalog." />}
          </div>
        </PmsCard>

        <PmsCard title="Write inventory transactions" eyebrow="Operational controls">
          <div className="grid gap-5">
            <details open className="rounded-lg border border-neutral-200 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-neutral-950">Receive stock</summary>
              <form action={receiveStockAction} className="mt-3 grid gap-3">
                <Select name="itemId" label="Item" options={items.map((item) => [String(item.id), `${item.itemName} · ${item.sku}`])} />
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
            </details>

            <details className="rounded-lg border border-neutral-200 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-neutral-950">Record clinical use</summary>
              <form action={consumeStockAction} className="mt-3 grid gap-3">
                <Select name="itemId" label="Item" options={items.map((item) => [String(item.id), `${item.itemName} · ${item.sku}`])} />
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
            </details>
          </div>
        </PmsCard>
      </section>

      <section className="mt-6 grid gap-6 2xl:grid-cols-3">
        <PmsCard title="Vendor marketplace" eyebrow="Vendors, pricing, reliability">
          <form action={createVendorAction} className="mb-4 grid gap-3 rounded-lg border border-neutral-200 p-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Input name="vendorName" label="Vendor name" required />
              <Select name="vendorType" label="Vendor type" options={["SUPPLIES", "EQUIPMENT", "LAB", "PHARMACY", "SERVICE"].map((v) => [v, v])} />
              <Select name="marketplaceStatus" label="Marketplace" options={["PRIVATE_VENDOR", "MARKETPLACE_VENDOR", "PREFERRED_VENDOR"].map((v) => [v, v.replaceAll("_", " ")])} />
              <Input name="paymentTerms" label="Payment terms" placeholder="NET_30" />
              <Input name="email" label="Email" type="email" />
              <Input name="phone" label="Phone" />
            </div>
            <Input name="website" label="Website" />
            <button className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Save vendor</button>
          </form>
          <div className="grid gap-3">
            {vendors.map((vendor) => (
              <div key={String(vendor.id)} className="rounded-lg bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-950">{vendor.vendorName}</p>
                    <p className="text-sm text-neutral-600">{vendor.vendorType} · lead {vendor.averageLeadDays} days · bids {vendor.bidCount}</p>
                  </div>
                  <StatusFor value={String(vendor.marketplaceStatus)} />
                </div>
                <p className="mt-2 text-xs text-neutral-500">Reliability {vendor.reliabilityScore}/100 · {vendor.complianceStatus}</p>
              </div>
            ))}
          </div>
        </PmsCard>

        <PmsCard title="Equipment and chairs" eyebrow="Assets and maintenance">
          <form action={createAssetAction} className="mb-4 grid gap-3 rounded-lg border border-neutral-200 p-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Input name="assetTag" label="Asset tag" required />
              <Input name="assetName" label="Asset name" required />
              <Select name="assetType" label="Type" options={["CHAIR", "IMAGING", "STERILIZATION", "HANDPIECE", "COMPRESSOR", "IT", "EQUIPMENT"].map((v) => [v, v])} />
              <Select name="downtimeRisk" label="Risk" options={["LOW", "MEDIUM", "HIGH"].map((v) => [v, v])} />
              <Select name="vendorId" label="Vendor" options={vendors.map((vendor) => [String(vendor.id), String(vendor.vendorName)])} optional />
              <Select name="locationId" label="Location" options={locations.map((location) => [String(location.id), String(location.locationName)])} optional />
              <Input name="manufacturer" label="Manufacturer" />
              <Input name="nextMaintenanceAt" label="Next maintenance" type="date" />
            </div>
            <Input name="notes" label="Notes" />
            <button className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Save asset</button>
          </form>
          <div className="grid gap-3">
            {assets.map((asset) => (
              <div key={String(asset.id)} className="rounded-lg bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-950">{asset.assetName}</p>
                    <p className="text-sm text-neutral-600">{asset.assetTag} · {asset.assetType} · {asset.locationName ?? "No location"}</p>
                  </div>
                  <StatusFor value={String(asset.downtimeRisk)} />
                </div>
                <p className="mt-2 text-xs text-neutral-500">Maintenance {asset.nextMaintenanceAt ? new Date(String(asset.nextMaintenanceAt)).toLocaleDateString() : "not scheduled"} · {asset.vendorName ?? "no vendor"}</p>
              </div>
            ))}
          </div>
        </PmsCard>

        <PmsCard title="RFPs and tenders" eyebrow="Paid marketplace rail">
          <form action={createRfpAction} className="mb-4 grid gap-3 rounded-lg border border-neutral-200 p-3">
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
          <div className="grid gap-3">
            {rfps.map((rfp) => (
              <div key={String(rfp.id)} className="rounded-lg bg-neutral-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-950">{rfp.title}</p>
                    <p className="text-sm text-neutral-600">{rfp.rfpNumber} · {rfp.category} · bids {rfp.bidCount}</p>
                  </div>
                  <StatusFor value={String(rfp.status)} />
                </div>
                <p className="mt-2 text-xs text-neutral-500">Projected <Money cents={Number(rfp.projectedSpendCents ?? 0)} /> · {rfp.releaseMode}</p>
              </div>
            ))}
          </div>
        </PmsCard>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        <PmsCard title="Lots and expiry" eyebrow="Medicine and product traceability">
          <div className="grid gap-3">
            {lots.map((lot) => (
              <div key={String(lot.id)} className="rounded-lg bg-neutral-50 p-3 text-sm">
                <p className="font-semibold text-neutral-950">{lot.itemName}</p>
                <p className="text-neutral-600">{lot.locationName} · qty {String(lot.quantityOnHand)} · lot {lot.lotNumber ?? "not tracked"}</p>
                <p className="mt-1 text-xs text-neutral-500">Expires {lot.expirationDate ? new Date(String(lot.expirationDate)).toLocaleDateString() : "not applicable"} · cost <Money cents={Number(lot.unitCostCents ?? 0)} /></p>
              </div>
            ))}
          </div>
        </PmsCard>

        <PmsCard title="Usage ledger" eyebrow="Chairside consumption and patient trace">
          <div className="mb-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-3">
            <Mini label="Movements" value={summary.periodMovementCount} />
            <Mini label="RFPs" value={summary.periodRfpCount} />
            <Mini label="30d usage" value={<Money cents={Number(summary.last30UsageCents)} />} />
          </div>
          <div className="grid gap-3">
            {movements.map((movement) => (
              <div key={String(movement.id)} className="rounded-lg bg-neutral-50 p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-neutral-950">{movement.itemName}</p>
                  <StatusFor value={String(movement.movementType)} />
                </div>
                <p className="mt-1 text-neutral-600">Qty {String(movement.quantity)} · {movement.reason}</p>
                <p className="mt-1 text-xs text-neutral-500">{movement.procedureCode ?? "no CDT"} · {movement.lastName ? `${movement.lastName}, ${movement.firstName}` : "practice use"} · {new Date(String(movement.createdAt)).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </PmsCard>

        <PmsCard title="Benchmarks and bid analytics" eyebrow="Peer comparison">
          <div className="grid gap-3">
            {reportBuckets.map((bucket) => (
              <div key={`${bucket.bucketDate}-${bucket.movementType}`} className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
                <p className="font-semibold text-neutral-950">{new Date(`${bucket.bucketDate}T00:00:00`).toLocaleDateString()} · {String(bucket.movementType).replaceAll("_", " ")}</p>
                <p className="mt-1 text-neutral-600">{bucket.movementCount} movements · <Money cents={Number(bucket.valueCents ?? 0)} /></p>
              </div>
            ))}
            {benchmarks.map((benchmark) => (
              <div key={String(benchmark.id)} className="rounded-lg bg-neutral-50 p-3 text-sm">
                <p className="font-semibold text-neutral-950">{String(benchmark.itemCategory).replaceAll("_", " ")} · {String(benchmark.metricName).replaceAll("_", " ")}</p>
                <p className="mt-1 text-neutral-600">Practice {String(benchmark.practiceValue)} vs median {String(benchmark.benchmarkMedianValue)}</p>
                <p className="mt-1 text-xs text-neutral-500">Percentile {benchmark.percentile} · {benchmark.peerGroup}</p>
              </div>
            ))}
            {bids.slice(0, 4).map((bid) => (
              <div key={String(bid.id)} className="rounded-lg border border-cyan-100 bg-cyan-50 p-3 text-sm">
                <p className="font-semibold text-neutral-950">{bid.vendorName} bid · <Money cents={Number(bid.bidTotalCents ?? 0)} /></p>
                <p className="text-neutral-600">{bid.rfpNumber} · lead {bid.leadDays} days · reliability {bid.reliabilityScore}</p>
              </div>
            ))}
          </div>
        </PmsCard>
      </section>

      <section className="mt-6">
        <PmsCard title="Create catalog item" eyebrow="Products, medicines, injections, consumables">
          <form action={createItemAction} className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-3">
              <Input name="sku" label="SKU" required />
              <Input name="itemName" label="Item name" required />
              <Select name="category" label="Category" options={["ANESTHETIC", "PPE", "SURGICAL", "RESTORATIVE", "MEDICATION", "EQUIPMENT_PARTS", "OFFICE"].map((v) => [v, v])} />
              <Select name="vendorId" label="Preferred vendor" options={vendors.map((vendor) => [String(vendor.id), String(vendor.vendorName)])} optional />
              <Select name="itemType" label="Type" options={["CONSUMABLE", "MEDICATION", "INJECTION", "ASSET_PART", "OFFICE_SUPPLY"].map((v) => [v, v.replaceAll("_", " ")])} />
              <Input name="unitOfMeasure" label="Unit" defaultValue="each" />
              <Input name="reorderPoint" label="Reorder point" type="number" step="0.01" />
              <Input name="parLevel" label="Par level" type="number" step="0.01" />
              <Input name="lastUnitCost" label="Last unit cost" type="number" step="0.01" />
              <Input name="benchmarkCost" label="Benchmark cost" type="number" step="0.01" />
            </div>
            <Input name="clinicalUse" label="Clinical use" />
            <div className="flex flex-wrap gap-4 text-sm font-semibold text-neutral-700">
              <Checkbox name="taxable" label="Taxable" />
              <Checkbox name="requiresLotTracking" label="Lot tracking" />
              <Checkbox name="requiresExpiry" label="Expiry tracking" />
              <Checkbox name="controlledSubstance" label="Controlled substance" />
            </div>
            <button className="w-fit rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Save catalog item</button>
          </form>
        </PmsCard>
      </section>
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

function Mini({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md bg-neutral-50 px-3 py-2">
      <p className="font-black text-neutral-950">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p>
    </div>
  );
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

function Select({ label, name, options, optional = false }: { label: string; name: string; options: Array<[string, string]>; optional?: boolean }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-neutral-700">
      {label}
      <select name={name} className="rounded-md border border-neutral-300 px-3 py-2">
        {optional ? <option value="">Not selected</option> : null}
        {options.map(([value, display]) => <option key={value} value={value}>{display}</option>)}
      </select>
    </label>
  );
}

function Checkbox({ label, name }: { label: string; name: string }) {
  return <label className="inline-flex items-center gap-2"><input name={name} type="checkbox" className="h-4 w-4 rounded border-neutral-300" />{label}</label>;
}
