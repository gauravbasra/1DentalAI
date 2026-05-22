import Link from "next/link";
import { ProductAppShell, ProductPageTitle, StateBadge, WorkSurface } from "@/components/products/product-app-shell";

const nav = [
  { href: "/wrapper", label: "App switcher", description: "Separate products, one future wrapper" },
];

export const dynamic = "force-dynamic";

const products = [
  {
    href: "/pms",
    label: "PMS",
    status: "Separate product",
    body: "Patients, appointments, schedule, charting, perio, imaging, treatment plans, ledger, insurance, labs, reports, and practice intelligence.",
  },
  {
    href: "/patient-engagement",
    label: "Patient Engagement",
    status: "First rebuild",
    body: "Phone, SMS, AI voice, missed calls, webchat, appointment handoff, reminders, forms handoff, and patient communication settings.",
  },
  {
    href: "/reputation-management",
    label: "Reputation Management",
    status: "Separate product",
    body: "Review eligibility, private surveys, service recovery, listings, review responses, referrals, testimonials, and reputation reporting.",
  },
  {
    href: "/digital-marketing",
    label: "Digital Marketing",
    status: "Separate product",
    body: "Local SEO, AI SEO, AI Studio, websites, landing pages, campaigns, attribution, and growth work.",
  },
];

export default async function WrapperPage() {
  return (
    <ProductAppShell
      active="/wrapper"
      productName="Product Wrapper"
      productLabel="Future operating layer"
      productSummary="This is only the app switcher until each product is rebuilt as its own real workflow."
      nav={nav}
    >
      <ProductPageTitle
        eyebrow="Rebuild architecture"
        title="Separate products first. Wrapper later."
        body="The old approach collapsed everything into one dense app. This reset keeps each product independently usable, with shared dental objects and handoffs underneath."
      />

      <section className="mt-7 grid gap-4 md:grid-cols-2">
        {products.map((product) => (
          <Link key={product.href} href={product.href} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-semibold tracking-tight text-neutral-950">{product.label}</h2>
              <StateBadge tone={product.status === "First rebuild" ? "cyan" : "neutral"}>{product.status}</StateBadge>
            </div>
            <p className="mt-4 text-sm leading-6 text-neutral-600">{product.body}</p>
            <p className="mt-5 text-sm font-semibold text-cyan-700">Open product</p>
          </Link>
        ))}
      </section>

      <div className="mt-6">
        <WorkSurface title="Cross-product rule" eyebrow="No more giant dashboard">
          <p className="max-w-4xl text-sm leading-6 text-neutral-700">
            The wrapper can summarize work after the products are rebuilt, but phones, PMS, reputation, and marketing each need their own onboarding, settings, daily queue, object context, and action flow.
          </p>
        </WorkSurface>
      </div>
    </ProductAppShell>
  );
}
