import Link from "next/link";
import type { Metadata } from "next";
import { MarketingShell, PageHero } from "@/components/marketing-shell";
import { blogPosts } from "@/lib/blog-data";
import { JsonLd, pageMetadata, siteUrl } from "@/lib/seo";

const blogDescription =
  "Dental AI guides for practices evaluating AI receptionist workflows, insurance verification, RCM automation, clinical AI scribe, and practice intelligence.";

export const metadata: Metadata = pageMetadata({
  title: "Dental AI Blog",
  description: blogDescription,
  path: "/blog",
  keywords: ["dental AI blog", "dental automation guides", "dental software SEO"],
});

export default function BlogPage() {
  return (
    <MarketingShell>
      <main>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "1DentalAI Blog",
            url: `${siteUrl}/blog`,
            description: blogDescription,
            publisher: {
              "@type": "Organization",
              name: "1DentalAI",
              logo: `${siteUrl}/logo.svg`,
            },
          }}
        />
        <PageHero
          eyebrow="Blog"
          title="Dental AI guides for practices ready to operate cleaner."
          body="Practical articles on AI receptionist workflows, insurance readiness, RCM automation, clinical AI, and the operating model behind modern dental practices."
        />
        <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-24 sm:px-8 md:grid-cols-2">
          {blogPosts.map((post) => (
            <article key={post.slug} className="rounded-[2rem] bg-white p-8 shadow-sm">
              <p className="text-sm font-semibold text-cyan-700">{post.category}</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-950">
                <Link href={`/blog/${post.slug}`} className="transition hover:text-cyan-700">
                  {post.title}
                </Link>
              </h2>
              <p className="mt-4 text-sm text-neutral-500">
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC",
                })}{" "}
                · {post.readTime}
              </p>
              <p className="mt-5 text-base leading-8 text-neutral-600">{post.description}</p>
              <Link href={`/blog/${post.slug}`} className="mt-6 inline-flex rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700">
                Read article
              </Link>
            </article>
          ))}
        </section>
      </main>
    </MarketingShell>
  );
}
