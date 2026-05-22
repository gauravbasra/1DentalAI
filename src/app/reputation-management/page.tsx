import Link from "next/link";
import { ProductAppShell, ProductPageTitle, StateBadge, WorkSurface } from "@/components/products/product-app-shell";

const nav = [
  { href: "/reputation-management", label: "Reputation Home", description: "Reviews, surveys, listings" },
  { href: "/app/reputation", label: "Legacy reputation", description: "Temporary salvage route" },
];

export const dynamic = "force-dynamic";

export default async function ReputationProductPage() {
  return (
    <ProductAppShell
      active="/reputation-management"
      productName="Reputation Management"
      productLabel="Separate product"
      productSummary="Review eligibility, private surveys, service recovery, response approvals, listings, referrals, and testimonials."
      nav={nav}
    >
      <ProductPageTitle
        eyebrow="Reputation boundary"
        title="Reputation starts from patient experience, not generic review cards."
        body="This product will read completed visits, patient sentiment, service recovery flags, consent, and location context. It must not send public review requests until the eligibility workflow says it is safe."
      />

      <section className="mt-7 grid gap-4 lg:grid-cols-2">
        <WorkSurface title="Daily queues">
          <div className="grid gap-3 sm:grid-cols-2">
            {["Eligible after visit", "Private survey first", "Service recovery", "Review responses", "Listings issues", "Referral requests"].map((item) => (
              <div key={item} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-sm font-semibold text-neutral-950">{item}</p>
                <p className="mt-2 text-xs leading-5 text-neutral-600">Separate work queue in the rebuild, not a static card.</p>
              </div>
            ))}
          </div>
        </WorkSurface>
        <WorkSurface title="Product dependencies">
          <p className="text-sm leading-6 text-neutral-600">
            Reputation depends on PMS completed visits, Patient Engagement delivery status, service recovery holds, review/listing connectors, and approval policies. It stays separate from the phone inbox.
          </p>
          <StateBadge tone="amber">queued after engagement</StateBadge>
        </WorkSurface>
      </section>

      <Link href="/patient-engagement" className="mt-6 inline-flex rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">
        Continue Patient Engagement first
      </Link>
    </ProductAppShell>
  );
}
