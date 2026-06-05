import Link from "next/link";
import type { Metadata } from "next";
import { MarketingShell, PageHero } from "@/components/marketing-shell";
import { demoWorkflows } from "@/lib/site-data";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Dental AI Workflows",
  description:
    "See 1DentalAI workflows for AI receptionist, insurance clearance, missed-call recovery, and clinical encounter documentation.",
  path: "/demos",
  keywords: ["dental AI workflows", "AI receptionist workflow", "clinical AI dental workflow"],
});

export default function DemosPage() {
  return (
    <MarketingShell>
      <main>
        <PageHero
          eyebrow="Workflows"
          title="See how dental work moves from intake to action."
          body="1DentalAI connects intake, eligibility, clinical documentation, treatment follow-up, RCM, and analytics with source evidence and human review."
        />
        <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-24 sm:px-8 md:grid-cols-2">
          {demoWorkflows.map((demo) => (
            <article key={demo.title} className="rounded-[2rem] bg-white p-8 shadow-sm">
              <h2 className="text-3xl font-semibold tracking-tight text-neutral-950">{demo.title}</h2>
              <div className="mt-7 grid gap-3">
                {demo.steps.map((step, index) => (
                  <div key={step} className="flex items-center gap-4 rounded-2xl bg-[#f5f5f7] p-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-sm font-semibold text-white">
                      {index + 1}
                    </span>
                    <p className="text-sm font-medium text-neutral-700">{step}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
        <section className="bg-neutral-950 px-6 py-24 text-center text-white sm:px-8">
          <h2 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Ready to see the platform workflow?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-neutral-300">
            A walkthrough can be matched to your PMS, payer mix, phone setup,
            and practice size.
          </p>
          <Link href="/signup" className="mt-8 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950">
            Sign up for onboarding
          </Link>
        </section>
      </main>
    </MarketingShell>
  );
}
