import Link from "next/link";
import type { Metadata } from "next";
import { MarketingShell, PageHero } from "@/components/marketing-shell";
import { pageMetadata } from "@/lib/seo";
import { solutionPages } from "@/lib/solution-data";

export const metadata: Metadata = pageMetadata({
  title: "Dental AI Solutions",
  description:
    "Explore 1DentalAI solutions for AI receptionist, insurance verification, clinical AI scribe, RCM automation, reputation, analytics, and DSO dental operations.",
  path: "/solutions",
  keywords: ["dental AI solutions", "AI receptionist dentists", "dental RCM automation", "DSO dental AI"],
});

export default function SolutionsPage() {
  return (
    <MarketingShell>
      <main>
        <PageHero
          eyebrow="Solutions"
          title="Dental AI pages built around the work buyers actually search for."
          body="Each 1DentalAI solution connects a high-intent practice problem to the workflow, team owner, evidence, and approval path needed to operate it."
        />
        <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-24 sm:px-8 md:grid-cols-2 lg:grid-cols-3">
          {solutionPages.map((solution) => (
            <article key={solution.slug} className="rounded-[2rem] bg-white p-7 shadow-sm">
              <p className="text-sm font-semibold text-cyan-700">{solution.eyebrow}</p>
              <h2 className="mt-4 text-2xl font-semibold text-neutral-950">
                <Link href={`/solutions/${solution.slug}`} className="transition hover:text-cyan-700">
                  {solution.title}
                </Link>
              </h2>
              <p className="mt-4 text-sm leading-7 text-neutral-600">{solution.description}</p>
              <Link href={`/solutions/${solution.slug}`} className="mt-6 inline-flex text-sm font-semibold text-cyan-700">
                Read solution
              </Link>
            </article>
          ))}
        </section>
      </main>
    </MarketingShell>
  );
}
