import Link from "next/link";
import { MarketingShell, PageHero, ProductVisual, SectionIntro } from "@/components/marketing-shell";

const layers = [
  ["Patient timeline", "Calls, texts, appointments, forms, benefits, treatment, claims, payments, reviews, and clinical notes share one patient context."],
  ["Connector routers", "PMS, EHR, CRM, payer, phone, payment, reputation, and clinical connectors sit behind 1DentalAI-owned contracts."],
  ["Approval workbench", "AI drafts and external side effects are reviewed, approved, audited, and tied to the source record."],
  ["Operating queues", "Front desk, billing, provider, growth, and DSO teams get work queues instead of disconnected dashboards."],
];

export default function ProductPage() {
  return (
    <MarketingShell>
      <main>
        <PageHero
          eyebrow="Product"
          title="A dental operating system, not another tab."
          body="1DentalAI is designed to connect the front office, billing office, clinical team, growth workflows, and DSO leadership through one governed patient-centered platform."
        />
        <section className="mx-auto max-w-7xl px-6 pb-24 sm:px-8">
          <ProductVisual compact />
        </section>
        <section className="bg-white px-6 py-24 sm:px-8">
          <SectionIntro
            eyebrow="Architecture"
            title="One patient context. Many connected systems."
            body="The product is structured around durable workflow layers, so dental teams can operate with source-backed information and controlled automation."
          />
          <div className="mx-auto mt-14 grid max-w-7xl gap-5 md:grid-cols-2">
            {layers.map(([title, body]) => (
              <article key={title} className="rounded-[2rem] bg-[#f5f5f7] p-8">
                <h2 className="text-2xl font-semibold text-neutral-950">{title}</h2>
                <p className="mt-4 text-base leading-8 text-neutral-600">{body}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="bg-neutral-950 px-6 py-24 text-center text-white sm:px-8">
          <h2 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight sm:text-6xl">
            NexHealth and Stedi help launch faster. 1DentalAI owns the workflow.
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-neutral-300">
            Vendor APIs are accelerators, not the product model. The long-term
            architecture is an owned connector network with capability maps,
            cost telemetry, approval gates, and fallback workflows.
          </p>
          <Link href="/features" className="mt-8 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950">
            Explore features
          </Link>
        </section>
      </main>
    </MarketingShell>
  );
}
