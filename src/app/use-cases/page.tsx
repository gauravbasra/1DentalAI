import { MarketingShell, PageHero } from "@/components/marketing-shell";
import { imageUrls, useCases } from "@/lib/site-data";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Dental AI Use Cases",
  description:
    "Practical 1DentalAI use cases for front desk, insurance coordinators, treatment coordinators, billing teams, providers, owners, and DSOs.",
  path: "/use-cases",
  keywords: ["dental AI use cases", "AI for dental front desk", "dental billing AI"],
});

export default function UseCasesPage() {
  return (
    <MarketingShell>
      <main>
        <PageHero
          eyebrow="Use cases"
          title="Practical AI for the work that slows practices down."
          body="The product is designed around specific dental handoffs: call to booking, appointment to clearance, treatment to acceptance, encounter to chart, claim to cash."
        />
        <section className="grid bg-neutral-950 text-white lg:grid-cols-2">
          <div className="flex items-center px-6 py-20 sm:px-12 lg:px-16">
            <div>
              <p className="text-sm font-semibold text-cyan-300">Daily operations</p>
              <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">
                One queue for the day, not ten disconnected systems.
              </h2>
              <p className="mt-6 text-lg leading-8 text-neutral-300">
                Dental teams need fewer surprises: fewer missed calls, fewer
                incomplete insurance checks, fewer unworked treatment plans,
                fewer claim delays, and fewer unclear patient handoffs.
              </p>
            </div>
          </div>
          <div className="min-h-[520px] bg-cover bg-center" style={{ backgroundImage: `url(${imageUrls.patient})` }} />
        </section>
        <section className="mx-auto grid max-w-7xl gap-5 px-6 py-24 sm:px-8 md:grid-cols-2 lg:grid-cols-3">
          {useCases.map((item) => (
            <article key={item.title} className="rounded-[2rem] bg-white p-7 shadow-sm">
              <p className="text-sm font-semibold text-emerald-700">{item.role}</p>
              <h2 className="mt-4 text-2xl font-semibold text-neutral-950">{item.title}</h2>
              <p className="mt-4 text-sm leading-7 text-neutral-600">{item.body}</p>
            </article>
          ))}
        </section>
      </main>
    </MarketingShell>
  );
}
