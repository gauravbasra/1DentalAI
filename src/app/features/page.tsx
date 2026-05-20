import { MarketingShell, PageHero } from "@/components/marketing-shell";
import { productPillars } from "@/lib/site-data";

const featureGroups: Array<{ title: string; items: string[] }> = [
  { title: "AI phone", items: ["AI receptionist", "Call pop", "Missed-call text", "Call transcription", "Call summaries", "Follow-up tasks"] },
  { title: "Patient messaging", items: ["Two-way text", "Website chat", "Templates", "Consent tracking", "Assignments", "Timeline history"] },
  { title: "Scheduling and forms", items: ["Appointment requests", "Reminders", "Recalls", "Digital forms", "Insurance capture", "Writeback requests"] },
  { title: "Insurance and RCM", items: ["Eligibility", "Benefit evidence", "Claim readiness", "Prior auth risk", "Attachments", "ERA visibility"] },
  { title: "Reputation and growth", items: ["Review requests", "AI response drafts", "Service recovery", "Reactivation", "Treatment follow-up", "Campaign attribution"] },
  { title: "Clinical AI", items: ["Scribing drafts", "Chart note review", "Perio workflows", "Treatment context", "Provider approval", "Audit history"] },
  { title: "Payments", items: ["Payment links", "Statements", "Card-on-file policy", "Financing handoff", "Posting requests", "Reconciliation"] },
  { title: "Analytics", items: ["Morning huddle", "Call conversion", "Payer delay", "Treatment acceptance", "Collections", "Location scorecards"] },
  { title: "Enterprise", items: ["DSO hierarchy", "Central inbox", "Role controls", "Template governance", "Audit exports", "Rollout dashboard"] },
];

export default function FeaturesPage() {
  return (
    <MarketingShell>
      <main>
        <PageHero
          eyebrow="Features"
          title="Everything a dental team repeats, made trackable."
          body="1DentalAI organizes repetitive, revenue-critical practice work into governed workflows with AI assistance, source evidence, and approval controls."
        />
        <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-24 sm:px-8 md:grid-cols-2 lg:grid-cols-3">
          {productPillars.map((pillar) => (
            <article key={pillar.title} className="rounded-[2rem] bg-white p-7 shadow-sm">
              <p className="text-sm font-semibold text-cyan-700">{pillar.eyebrow}</p>
              <h2 className="mt-4 text-2xl font-semibold text-neutral-950">{pillar.title}</h2>
              <p className="mt-4 text-sm leading-7 text-neutral-600">{pillar.body}</p>
            </article>
          ))}
        </section>
        <section className="bg-white px-6 py-24 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <h2 className="max-w-4xl text-4xl font-semibold tracking-tight text-neutral-950 sm:text-6xl">
              Module map
            </h2>
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {featureGroups.map(({ title, items }) => (
                <article key={title} className="rounded-[2rem] bg-[#f5f5f7] p-7">
                  <h3 className="text-2xl font-semibold text-neutral-950">{title}</h3>
                  <div className="mt-5 grid gap-3">
                    {items.map((item) => (
                      <p key={item} className="rounded-full bg-white px-4 py-3 text-sm font-medium text-neutral-700">
                        {item}
                      </p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
