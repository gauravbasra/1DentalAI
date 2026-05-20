import { MarketingShell, PageHero } from "@/components/marketing-shell";
import { resources } from "@/lib/site-data";

export default function ResourcesPage() {
  return (
    <MarketingShell>
      <main>
        <PageHero
          eyebrow="Resources"
          title="Field notes for building better dental operations."
          body="Resources for practices evaluating AI, phone automation, payer workflows, PMS connectivity, clinical AI, and RCM modernization."
        />
        <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-24 sm:px-8 md:grid-cols-2">
          {resources.map((resource) => (
            <article key={resource.title} className="rounded-[2rem] bg-white p-8 shadow-sm">
              <p className="text-sm font-semibold text-cyan-700">{resource.type}</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-950">
                {resource.title}
              </h2>
              <p className="mt-5 text-base leading-8 text-neutral-600">{resource.body}</p>
            </article>
          ))}
        </section>
        <section className="bg-white px-6 py-24 sm:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <p className="text-sm font-semibold text-cyan-700">Research areas</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950 sm:text-6xl">
              What we are studying before each build phase.
            </h2>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              {["AI receptionist", "phone workflows", "payer routing", "PMS connectivity", "RCM automation", "AI governance", "clinical AI", "DSO workflows", "patient growth"].map((topic) => (
                <span key={topic} className="rounded-full bg-[#f5f5f7] px-5 py-3 text-sm font-semibold text-neutral-700">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
