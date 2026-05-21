import { MarketingShell, PageHero } from "@/components/marketing-shell";
import { imageUrls } from "@/lib/site-data";

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
