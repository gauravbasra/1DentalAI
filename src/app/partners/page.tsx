import Link from "next/link";
import type { Metadata } from "next";
import { MarketingShell, PageHero } from "@/components/marketing-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "1DentalAI Partner Program",
  description:
    "Partner with 1DentalAI to bring dental AI workflow reviews to practices, DSOs, consultants, RCM advisors, PMS trainers, and dental growth teams.",
  path: "/partners",
  keywords: ["dental AI partner program", "dental consultant referral", "DSO AI partner", "dental software partnership"],
});

const partnerTypes = [
  ["Referral partners", "Introduce qualified practices and DSOs that need help with phones, insurance, RCM, clinical AI, reputation, or analytics."],
  ["Education partners", "Host webinars, office hours, newsletter content, and workflow teardown sessions for dental operators."],
  ["Implementation partners", "Help teams adopt the workflow changes identified during the Dental AI Readiness Review."],
  ["Strategic partners", "Connect PMS, phone, RCM, marketing, analytics, payer, or consulting ecosystems to a shared operating workflow."],
];

const bestFit = [
  "Dental consultants",
  "RCM advisors",
  "Dental CPAs and advisory firms",
  "PMS trainers and implementation teams",
  "Dental marketing agencies",
  "Phone and call center vendors",
  "DSO advisors",
  "Dental podcast, newsletter, and community operators",
];

export default function PartnersPage() {
  return (
    <MarketingShell>
      <main>
        <PageHero
          eyebrow="Partners"
          title="Bring dental AI workflow reviews to the teams that trust you."
          body="1DentalAI partners with dental operators, consultants, vendors, and educators who already see where practices lose time across phones, insurance, RCM, clinical documentation, reputation, and analytics."
        />
        <section className="mx-auto grid max-w-7xl gap-8 px-6 pb-24 sm:px-8 lg:grid-cols-[0.85fr_1.15fr]">
          <aside className="rounded-[2rem] bg-neutral-950 p-8 text-white">
            <p className="text-sm font-semibold text-cyan-300">Partner offer</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight">Dental AI Readiness Review</h2>
            <p className="mt-5 text-base leading-8 text-neutral-300">
              You bring the relationship. 1DentalAI brings the workflow map, readiness score, and implementation roadmap.
            </p>
            <Link
              href="/contact?utm_source=partner&utm_medium=site&utm_campaign=partner_program"
              className="mt-8 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-100"
            >
              Start a partner conversation
            </Link>
          </aside>
          <div className="grid gap-5 md:grid-cols-2">
            {partnerTypes.map(([title, body]) => (
              <article key={title} className="rounded-[2rem] bg-white p-7 shadow-sm">
                <h2 className="text-2xl font-semibold text-neutral-950">{title}</h2>
                <p className="mt-4 text-sm leading-7 text-neutral-600">{body}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="bg-white px-6 py-24 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm font-semibold text-cyan-700">Best fit</p>
            <h2 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-neutral-950 sm:text-6xl">
              Partners already close to dental operations.
            </h2>
            <div className="mt-10 flex flex-wrap gap-3">
              {bestFit.map((item) => (
                <span key={item} className="rounded-full bg-[#f5f5f7] px-5 py-3 text-sm font-semibold text-neutral-700">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
