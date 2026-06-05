import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing-shell";
import { JsonLd, pageMetadata, siteName, siteUrl } from "@/lib/seo";
import { getSolutionPage, solutionPages } from "@/lib/solution-data";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return solutionPages.map((solution) => ({ slug: solution.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const solution = getSolutionPage(slug);

  if (!solution) {
    return {};
  }

  return pageMetadata({
    title: solution.metaTitle,
    description: solution.description,
    path: `/solutions/${solution.slug}`,
    keywords: solution.keywords,
  });
}

export default async function SolutionPage({ params }: Props) {
  const { slug } = await params;
  const solution = getSolutionPage(slug);

  if (!solution) {
    notFound();
  }

  const pageUrl = `${siteUrl}/solutions/${solution.slug}`;
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: solution.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: solution.title,
    serviceType: solution.title,
    provider: {
      "@type": "Organization",
      name: siteName,
      url: siteUrl,
    },
    areaServed: "United States",
    audience: {
      "@type": "Audience",
      audienceType: solution.audience,
    },
    description: solution.description,
    url: pageUrl,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Solutions", item: `${siteUrl}/solutions` },
      { "@type": "ListItem", position: 3, name: solution.title, item: pageUrl },
    ],
  };

  return (
    <MarketingShell>
      <main>
        <JsonLd data={[serviceSchema, faqSchema, breadcrumbSchema]} />
        <section className="bg-white">
          <div className="mx-auto grid min-h-[calc(100vh-3.5rem)] max-w-7xl items-center gap-12 px-6 py-16 sm:px-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className="text-sm font-semibold text-cyan-700">{solution.eyebrow}</p>
              <h1 className="mt-5 text-5xl font-semibold tracking-tight text-neutral-950 sm:text-7xl">
                {solution.title}
              </h1>
              <p className="mt-6 max-w-2xl text-2xl font-semibold leading-8 text-neutral-800">
                {solution.hero}
              </p>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-600 sm:text-xl">
                {solution.description}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="rounded-full bg-neutral-950 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-cyan-700">
                  Sign up for onboarding
                </Link>
                <Link href="/solutions" className="rounded-full border border-neutral-300 bg-white px-6 py-3 text-center text-sm font-semibold text-neutral-900 transition hover:border-cyan-600 hover:text-cyan-700">
                  View all solutions
                </Link>
              </div>
            </div>
            <aside className="rounded-[2rem] bg-neutral-950 p-8 text-white">
              <p className="text-sm font-semibold text-cyan-300">Built for</p>
              <p className="mt-4 text-3xl font-semibold tracking-tight">{solution.audience}</p>
              <div className="mt-8 grid gap-3">
                {solution.keywords.map((keyword) => (
                  <p key={keyword} className="rounded-full bg-white/10 px-4 py-3 text-sm font-medium text-neutral-100">
                    {keyword}
                  </p>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="bg-[#f5f5f7] px-6 py-24 sm:px-8">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold text-cyan-700">Outcomes</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950 sm:text-6xl">
                What the practice gets.
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {solution.outcomes.map((outcome) => (
                <article key={outcome} className="rounded-[2rem] bg-white p-6 shadow-sm">
                  <p className="text-base leading-7 text-neutral-700">{outcome}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-6 py-24 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm font-semibold text-cyan-700">Workflow</p>
            <h2 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-neutral-950 sm:text-6xl">
              How the work moves from signal to action.
            </h2>
            <div className="mt-12 grid gap-4 md:grid-cols-5">
              {solution.workflow.map((step, index) => (
                <article key={step} className="rounded-[2rem] bg-[#f5f5f7] p-6">
                  <p className="text-sm font-semibold text-cyan-700">{String(index + 1).padStart(2, "0")}</p>
                  <h3 className="mt-5 text-xl font-semibold text-neutral-950">{step}</h3>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f5f5f7] px-6 py-24 sm:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="text-sm font-semibold text-cyan-700">FAQ</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950 sm:text-6xl">
              Questions dental teams ask.
            </h2>
            <div className="mt-10 grid gap-5">
              {solution.faqs.map((faq) => (
                <article key={faq.question} className="rounded-[2rem] bg-white p-7 shadow-sm">
                  <h3 className="text-2xl font-semibold text-neutral-950">{faq.question}</h3>
                  <p className="mt-4 text-base leading-8 text-neutral-600">{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-neutral-950 px-6 py-20 text-center text-white sm:px-8">
          <h2 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight sm:text-6xl">
            See where {solution.title} fits in your practice.
          </h2>
          <Link href="/signup" className="mt-8 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition hover:bg-cyan-100">
            Sign up
          </Link>
        </section>
      </main>
    </MarketingShell>
  );
}
