import Link from "next/link";
import { ProductAppShell, ProductPageTitle, StateBadge, WorkSurface } from "@/components/products/product-app-shell";

const nav = [
  { href: "/digital-marketing", label: "Marketing Home", description: "SEO, AI Studio, campaigns" },
  { href: "/app/marketing", label: "Legacy marketing", description: "Temporary salvage route" },
];

export const dynamic = "force-dynamic";

export default async function DigitalMarketingProductPage() {
  return (
    <ProductAppShell
      active="/digital-marketing"
      productName="Digital Marketing"
      productLabel="Separate product"
      productSummary="Local SEO, AI SEO, AI Studio, websites, landing pages, campaigns, attribution, and growth workflows."
      nav={nav}
    >
      <ProductPageTitle
        eyebrow="Marketing boundary"
        title="Marketing gets its own app, not leftover cards."
        body="This product owns audiences, campaign briefs, landing pages, Local SEO, AI SEO, AI Studio, attribution, and conversion workflows. It can use PMS audiences and engagement channels, but it is not the phone app."
      />

      <section className="mt-7 grid gap-4 lg:grid-cols-3">
        {[
          ["AI Studio", "Briefs, service-line copy, compliance notes, approvals, revisions, and publish targets."],
          ["Local SEO", "Listings, services, location pages, citations, GBP-style posts, issue queue, and ranking tasks."],
          ["Landing pages", "Slug, offer, provider/location, form mapping, booking route, source attribution, and conversion reporting."],
          ["Campaigns", "PMS audiences, channel plan, consent checks, templates, delivery status, and production attribution."],
          ["Website", "Content operations, pages, forms, chat install, conversion tracking, and SEO health."],
          ["Attribution", "Leads to appointments, appointments to accepted treatment, accepted treatment to production and collections."],
        ].map(([title, body]) => (
          <WorkSurface key={title} title={title}>
            <p className="text-sm leading-6 text-neutral-600">{body}</p>
          </WorkSurface>
        ))}
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <StateBadge tone="amber">queued after reputation</StateBadge>
        <Link href="/patient-engagement" className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">
          Continue Patient Engagement first
        </Link>
      </div>
    </ProductAppShell>
  );
}
