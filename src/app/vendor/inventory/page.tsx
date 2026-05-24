import { revalidatePath } from "next/cache";
import { Money, StatusFor } from "@/components/pms-ui";
import { getInventoryVendorPortal, submitInventoryVendorBid } from "@/lib/pms-inventory-repository";

export const dynamic = "force-dynamic";

type AnyRow = Record<string, unknown>;

function cents(value: FormDataEntryValue | null) {
  return Math.round(Number(value || 0) * 100);
}

async function submitBidAction(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  await submitInventoryVendorBid({
    portalToken: token,
    rfpId: String(formData.get("rfpId") ?? ""),
    bidTotalCents: cents(formData.get("bidTotal")),
    leadDays: Number(formData.get("leadDays") || 5),
    warrantyTerms: String(formData.get("warrantyTerms") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    submittedByName: String(formData.get("submittedByName") ?? ""),
    submittedByEmail: String(formData.get("submittedByEmail") ?? ""),
  });
  revalidatePath(`/vendor/inventory?token=${token}`);
}

export default async function VendorInventoryPortal({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  const token = params.token ?? "";
  const portal = token ? await getInventoryVendorPortal(token) : null;

  if (!portal) {
    return (
      <main className="min-h-screen bg-neutral-950 px-6 py-16 text-white">
        <div className="mx-auto max-w-2xl rounded-lg border border-white/10 bg-white/5 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">1DentalAI vendor portal</p>
          <h1 className="mt-3 text-3xl font-black">Portal link required</h1>
          <p className="mt-3 text-neutral-300">Use the active vendor portal link from the practice inventory marketplace. Inactive, expired, or missing links cannot view tenders or submit bids.</p>
        </div>
      </main>
    );
  }

  const vendor = portal.vendor as AnyRow;
  const rfps = portal.rfps as AnyRow[];
  const bids = portal.bids as AnyRow[];
  const purchaseOrders = portal.purchaseOrders as AnyRow[];

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-950">
      <section className="border-b border-neutral-200 bg-white px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-700">1DentalAI vendor marketplace</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-black">{String(vendor.vendorName)}</h1>
              <p className="mt-2 max-w-3xl text-neutral-600">Submit bids, track awarded purchase orders, and keep the practice marketplace relationship current.</p>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <Mini label="Portal" value={String(vendor.portalStatus)} />
              <Mini label="Plan" value={String(vendor.subscriptionPlan ?? "not subscribed")} />
              <Mini label="Fee" value={`${Number(vendor.marketplaceFeeBps ?? 0) / 100}%`} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="grid gap-4">
          {rfps.map((rfp) => (
            <article key={String(rfp.id)} className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black">{String(rfp.title)}</h2>
                    <StatusFor value={String(rfp.status)} />
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">{String(rfp.rfpNumber)} · {String(rfp.category)} · {String(rfp.releaseMode)}</p>
                </div>
                <p className="rounded-md bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-900">Projected <Money cents={Number(rfp.projectedSpendCents ?? 0)} /></p>
              </div>
              <div className="mt-4 grid gap-2">
                {(Array.isArray(rfp.lines) ? rfp.lines : []).map((line, index) => (
                  <div key={index} className="rounded-md bg-neutral-50 p-3 text-sm">
                    <p className="font-semibold">{String(line.itemName ?? "Requested item")} · qty {String(line.quantity ?? "")}</p>
                    <p className="mt-1 text-neutral-600">{String(line.requirements ?? "Standard practice requirements")}</p>
                  </div>
                ))}
              </div>
              <form action={submitBidAction} className="mt-4 grid gap-3 rounded-lg border border-neutral-200 p-3">
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="rfpId" value={String(rfp.id)} />
                <div className="grid gap-3 md:grid-cols-4">
                  <Input name="bidTotal" label="Bid total" type="number" step="0.01" required />
                  <Input name="leadDays" label="Lead days" type="number" defaultValue={String(vendor.averageLeadDays ?? 5)} required />
                  <Input name="submittedByName" label="Submitted by" />
                  <Input name="submittedByEmail" label="Email" type="email" />
                </div>
                <Input name="warrantyTerms" label="Warranty / service terms" />
                <label className="grid gap-1 text-sm font-semibold text-neutral-700">Bid notes<textarea name="notes" rows={3} className="rounded-md border border-neutral-300 px-3 py-2" /></label>
                <button className="w-fit rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Submit bid</button>
              </form>
            </article>
          ))}
          {!rfps.length ? <div className="rounded-lg border border-neutral-200 bg-white p-8 text-neutral-600">No open tenders match this vendor portal right now.</div> : null}
        </div>

        <aside className="grid content-start gap-4">
          <Panel title="Submitted bids">
            {bids.map((bid) => (
              <div key={String(bid.id)} className="rounded-md bg-neutral-50 p-3 text-sm">
                <p className="font-semibold">{String(bid.title)}</p>
                <p className="mt-1 text-neutral-600"><Money cents={Number(bid.bidTotalCents ?? 0)} /> · lead {String(bid.leadDays)} days</p>
                <StatusFor value={String(bid.status)} />
              </div>
            ))}
          </Panel>
          <Panel title="Awarded purchase orders">
            {purchaseOrders.map((po) => (
              <div key={String(po.id)} className="rounded-md bg-neutral-50 p-3 text-sm">
                <p className="font-semibold">{String(po.poNumber)}</p>
                <p className="mt-1 text-neutral-600"><Money cents={Number(po.totalCents ?? 0)} /> · {String(po.lineCount)} lines</p>
                <StatusFor value={String(po.status)} />
              </div>
            ))}
          </Panel>
        </aside>
      </section>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-3 grid gap-3">{children}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md bg-neutral-100 px-3 py-2">
      <p className="font-black">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p>
    </div>
  );
}

function Input({ label, name, type = "text", required = false, step, defaultValue }: { label: string; name: string; type?: string; required?: boolean; step?: string; defaultValue?: string }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-neutral-700">
      {label}
      <input name={name} type={type} required={required} step={step} defaultValue={defaultValue} className="rounded-md border border-neutral-300 px-3 py-2" />
    </label>
  );
}
