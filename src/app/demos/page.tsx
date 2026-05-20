import Link from "next/link";
import { MarketingShell, PageHero } from "@/components/marketing-shell";
import { demoWorkflows } from "@/lib/site-data";

export default function DemosPage() {
  return (
    <MarketingShell>
      <main>
        <PageHero
          eyebrow="Demos"
          title="See the workflows before the software gets noisy."
          body="These demo tracks show how 1DentalAI is planned to move real dental work from intake to action with source evidence and human approval."
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
            Want the first guided walkthrough?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-neutral-300">
            Early demos are guided so the workflow can be matched to your PMS,
            payer mix, phone setup, and practice size.
          </p>
          <Link href="/contact" className="mt-8 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950">
            Request a demo
          </Link>
        </section>
      </main>
    </MarketingShell>
  );
}
