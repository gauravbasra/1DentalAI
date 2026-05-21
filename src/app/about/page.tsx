import { MarketingShell, PageHero } from "@/components/marketing-shell";
import { imageUrls } from "@/lib/site-data";
import type { Metadata } from "next";
import { JsonLd, pageMetadata, siteUrl } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "About 1DentalAI and CEO Gaurav Basra",
  description:
    "Learn about 1DentalAI, the dental AI operating system founded by CEO Gaurav Basra for practices that need cleaner phone, insurance, RCM, clinical AI, and analytics workflows.",
  path: "/about",
  keywords: ["Gaurav Basra", "1DentalAI CEO", "about 1DentalAI", "dental AI founder"],
});

const principles = [
  "Keep every workflow grounded in source evidence.",
  "Give teams clear ownership, review, and audit history.",
  "Connect the systems practices already depend on.",
  "Use AI to reduce handoffs without removing clinical judgment.",
  "Design for daily dental teams first: front desk, billing, providers, and managers.",
];

export default function AboutPage() {
  return (
    <MarketingShell>
      <main>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "AboutPage",
            name: "About 1DentalAI",
            url: `${siteUrl}/about`,
            mainEntity: {
              "@type": "Person",
              name: "Gaurav Basra",
              jobTitle: "Founder and CEO",
              worksFor: {
                "@type": "Organization",
                name: "1DentalAI",
                url: siteUrl,
              },
            },
          }}
        />
        <PageHero
          eyebrow="About"
          title="Built for the dental practice that refuses fragmented software."
          body="1DentalAI started from a simple belief: dental practices should not need separate disconnected tools to answer phones, verify insurance, manage RCM, follow up with patients, collect reviews, and document care."
        />
        <section className="grid bg-white lg:grid-cols-2">
          <div className="min-h-[520px] bg-cover bg-center" style={{ backgroundImage: `url(${imageUrls.team})` }} />
          <div className="flex items-center px-6 py-20 sm:px-12 lg:px-16">
            <div>
              <p className="text-sm font-semibold text-cyan-700">Our focus</p>
              <h2 className="mt-5 text-4xl font-semibold tracking-tight text-neutral-950 sm:text-6xl">
                Reliable workflows for real dental teams.
              </h2>
              <p className="mt-6 text-lg leading-8 text-neutral-600">
                1DentalAI is designed around source evidence, human review,
                and accountable work queues for the daily operations of a
                dental practice.
              </p>
            </div>
          </div>
        </section>
        <section className="bg-neutral-950 px-6 py-24 text-white sm:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div className="rounded-[2rem] bg-white p-8 text-neutral-950">
              <p className="text-sm font-semibold text-cyan-700">Founder and CEO</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight">Gaurav Basra</h2>
              <p className="mt-5 text-base leading-8 text-neutral-600">
                Gaurav Basra leads 1DentalAI with a focus on practical dental operations:
                patient access, insurance readiness, RCM, clinical AI workflows,
                reputation, and analytics that dental teams can use every day.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-cyan-300">CEO profile</p>
              <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">
                Building AI around the real work inside dental practices.
              </h2>
              <p className="mt-6 text-lg leading-8 text-neutral-300">
                1DentalAI is shaped around a simple operating principle: AI should
                make dental work clearer, faster, and more accountable. That means
                source evidence, role ownership, provider review, audit history,
                and workflows that connect the front desk, billing team, clinical
                team, and practice leadership.
              </p>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-5xl px-6 py-24 sm:px-8">
          <h2 className="text-4xl font-semibold tracking-tight text-neutral-950 sm:text-6xl">
            Principles
          </h2>
          <div className="mt-10 grid gap-4">
            {principles.map((principle) => (
              <p key={principle} className="rounded-[2rem] bg-white p-6 text-lg font-medium text-neutral-800 shadow-sm">
                {principle}
              </p>
            ))}
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
