import Link from "next/link";
import type { Metadata } from "next";
import { MarketingShell, ProductVisual, SectionIntro } from "@/components/marketing-shell";
import { blogPosts } from "@/lib/blog-data";
import { imageUrls, productPillars, stats, useCases } from "@/lib/site-data";
import { pageMetadata } from "@/lib/seo";
import { solutionPages } from "@/lib/solution-data";

export const metadata: Metadata = pageMetadata({
  title: "Dental AI Operating System for Practices and DSOs",
  description:
    "1DentalAI connects AI phone, scheduling, patient messaging, insurance verification, RCM, clinical AI, reputation, and analytics into one dental operating system.",
  keywords: ["dental AI operating system", "AI receptionist for dentists", "dental RCM automation"],
});

export default function Home() {
  return (
    <MarketingShell>
      <main>
        <section className="relative overflow-hidden bg-white">
          <div className="mx-auto grid min-h-[calc(100vh-3.5rem)] max-w-7xl items-center gap-10 px-6 py-14 sm:px-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="relative z-10">
              <p className="text-sm font-semibold text-cyan-700">
                AI operating system for modern dentistry
              </p>
              <h1 className="mt-5 text-5xl font-semibold tracking-tight text-neutral-950 sm:text-7xl lg:text-8xl">
                One platform for every dental workflow.
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-neutral-600 sm:text-xl">
                1DentalAI connects phones, scheduling, patient messaging,
                insurance, RCM, reputation, clinical AI, and practice
                intelligence into one governed system.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/demos"
                  className="rounded-full bg-neutral-950 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-cyan-700"
                >
                  Explore workflows
                </Link>
                <Link
                  href="/product"
                  className="rounded-full border border-neutral-300 bg-white px-6 py-3 text-center text-sm font-semibold text-neutral-900 transition hover:border-cyan-600 hover:text-cyan-700"
                >
                  See product
                </Link>
              </div>
            </div>
            <ProductVisual />
          </div>
        </section>

        <section className="bg-[#f5f5f7] px-6 py-20 sm:px-8">
          <div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-[2rem] bg-white p-7 text-center shadow-sm">
                <p className="text-4xl font-semibold text-neutral-950">{stat.value}</p>
                <p className="mt-3 text-sm leading-6 text-neutral-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white px-6 py-24 sm:px-8">
          <SectionIntro
            eyebrow="Product suites"
            title="Every major practice function, connected."
            body="The goal is not another dashboard. It is an operating layer that turns calls, claims, treatment plans, reviews, and clinical notes into tracked work."
          />
          <div className="mx-auto mt-14 grid max-w-7xl gap-5 md:grid-cols-2 lg:grid-cols-3">
            {productPillars.map((pillar) => (
              <article key={pillar.title} className="rounded-[2rem] bg-[#f5f5f7] p-7">
                <p className="text-sm font-semibold text-cyan-700">{pillar.eyebrow}</p>
                <h2 className="mt-4 text-2xl font-semibold text-neutral-950">{pillar.title}</h2>
                <p className="mt-4 text-sm leading-7 text-neutral-600">{pillar.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid bg-neutral-950 text-white lg:grid-cols-2">
          <div className="min-h-[520px] bg-cover bg-center" style={{ backgroundImage: `url(${imageUrls.practice})` }} />
          <div className="flex items-center px-6 py-20 sm:px-12 lg:px-16">
            <div>
              <p className="text-sm font-semibold text-cyan-300">Productivity</p>
              <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">
                Less chasing. More dentistry.
              </h2>
              <p className="mt-6 text-lg leading-8 text-neutral-300">
                Practices lose time to disconnected phones, manual insurance
                checks, claim rework, follow-up gaps, review requests, and
                repeated patient context hunting. 1DentalAI is designed to put
                that work into one queue with AI assistance and human approval.
              </p>
              <Link
                href="/use-cases"
                className="mt-8 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-100"
              >
                View use cases
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-[#f5f5f7] px-6 py-24 sm:px-8">
          <SectionIntro
            eyebrow="Role-based workflows"
            title="Built around the way dental teams actually work."
            body="Each workflow is designed for a specific handoff: front desk to billing, treatment coordinator to patient, provider to chart, practice manager to DSO leadership."
          />
          <div className="mx-auto mt-14 grid max-w-7xl gap-5 md:grid-cols-2 lg:grid-cols-3">
            {useCases.slice(0, 6).map((item) => (
              <article key={item.title} className="rounded-[2rem] bg-white p-7 shadow-sm">
                <p className="text-sm font-semibold text-emerald-700">{item.role}</p>
                <h2 className="mt-4 text-2xl font-semibold text-neutral-950">{item.title}</h2>
                <p className="mt-4 text-sm leading-7 text-neutral-600">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-white px-6 py-24 sm:px-8">
          <SectionIntro
            eyebrow="Solutions"
            title="High-intent dental AI workflows."
            body="Dedicated solution pages help practices find the exact problem they are trying to solve: phones, insurance, RCM, clinical notes, reputation, analytics, and multi-location operations."
          />
          <div className="mx-auto mt-14 grid max-w-7xl gap-5 md:grid-cols-2 lg:grid-cols-3">
            {solutionPages.slice(0, 6).map((solution) => (
              <article key={solution.slug} className="rounded-[2rem] bg-[#f5f5f7] p-7">
                <p className="text-sm font-semibold text-cyan-700">{solution.eyebrow}</p>
                <h2 className="mt-4 text-2xl font-semibold text-neutral-950">
                  <Link href={`/solutions/${solution.slug}`} className="transition hover:text-cyan-700">
                    {solution.title}
                  </Link>
                </h2>
                <p className="mt-4 text-sm leading-7 text-neutral-600">{solution.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-neutral-950 px-6 py-20 text-center text-white sm:px-8">
          <p className="text-sm font-semibold text-cyan-300">Organic growth offer</p>
          <h2 className="mx-auto mt-4 max-w-4xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Score your dental AI readiness before you buy another tool.
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-neutral-300">
            The scorecard identifies the workflow gaps across patient access, insurance, RCM, clinical AI, reputation, analytics, and connectors.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/readiness-score" className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-100">
              Take the readiness score
            </Link>
            <Link href="/partners" className="rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition hover:border-cyan-300 hover:text-cyan-100">
              Partner with 1DentalAI
            </Link>
          </div>
        </section>

        <section className="bg-[#f5f5f7] px-6 py-24 sm:px-8">
          <SectionIntro
            eyebrow="Dental AI education"
            title="Guides for practices comparing AI platforms."
            body="SEO-friendly resources help practices understand what dental AI should do before they request a walkthrough."
          />
          <div className="mx-auto mt-14 grid max-w-7xl gap-5 md:grid-cols-2 lg:grid-cols-4">
            {blogPosts.map((post) => (
              <article key={post.slug} className="rounded-[2rem] bg-[#f5f5f7] p-7">
                <p className="text-sm font-semibold text-cyan-700">{post.category}</p>
                <h2 className="mt-4 text-2xl font-semibold text-neutral-950">
                  <Link href={`/blog/${post.slug}`} className="transition hover:text-cyan-700">
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-4 text-sm leading-7 text-neutral-600">{post.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
