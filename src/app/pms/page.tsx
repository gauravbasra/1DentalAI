import Link from "next/link";
import { ProductAppShell, ProductPageTitle, StateBadge, WorkSurface } from "@/components/products/product-app-shell";

const nav = [
  { href: "/pms", label: "PMS Home", description: "Practice system of record" },
  { href: "/app/pms/schedule", label: "Legacy schedule", description: "Temporary salvage route" },
  { href: "/app/pms/patients", label: "Legacy patients", description: "Temporary salvage route" },
  { href: "/app/pms/reports", label: "Legacy reports", description: "Temporary salvage route" },
];

export const dynamic = "force-dynamic";

export default async function PmsProductPage() {
  return (
    <ProductAppShell
      active="/pms"
      productName="PMS"
      productLabel="Separate product"
      productSummary="Practice system of record for patients, scheduling, charting, treatment, insurance, ledger, and practice intelligence."
      nav={nav}
    >
      <ProductPageTitle
        eyebrow="PMS boundary"
        title="PMS owns the dental record. Other products hand work back to it."
        body="This product will be rebuilt separately from phone, reputation, marketing, and RCM. The legacy PMS routes remain available only as salvage until the new PMS workbench replaces them."
      />

      <section className="mt-7 grid gap-4 lg:grid-cols-3">
        {[
          ["Patient record", "Demographics, family, guarantor, insurance, forms, medical history, allergies, documents."],
          ["Schedule and rooms", "Providers, operatories, chair utilization, appointment lifecycle, emergency slots, waitlist."],
          ["Clinical work", "Charting, perio, imaging, clinical notes, treatment plans, labs, referrals."],
          ["Financial work", "Ledger, payments, estimates, claims handoff, eligibility handoff, patient balances."],
          ["Practice intelligence", "Production, collections, provider productivity, services, chair time, payer mix, case acceptance."],
          ["Connector handoffs", "Patient engagement, RCM, reputation, and marketing write back through audited PMS objects."],
        ].map(([title, body]) => (
          <WorkSurface key={title} title={title}>
            <p className="text-sm leading-6 text-neutral-600">{body}</p>
          </WorkSurface>
        ))}
      </section>

      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-amber-950">Rebuild status</h3>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-amber-900">
              PMS is separate, but it is not being rebuilt first in this slice. Patient Engagement is first. PMS keeps its system-of-record boundary and will be rebuilt after the engagement app stops depending on the old cramped surfaces.
            </p>
          </div>
          <StateBadge tone="amber">queued</StateBadge>
        </div>
        <Link href="/patient-engagement" className="mt-4 inline-flex rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">
          Go to first rebuild
        </Link>
      </div>
    </ProductAppShell>
  );
}
