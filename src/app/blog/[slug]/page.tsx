import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing-shell";
import { blogPosts, getBlogPost } from "@/lib/blog-data";
import { JsonLd, pageMetadata, siteUrl } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return pageMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    keywords: post.keywords,
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  return (
    <MarketingShell>
      <main>
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.description,
            datePublished: post.publishedAt,
            dateModified: post.publishedAt,
            url: `${siteUrl}/blog/${post.slug}`,
            author: {
              "@type": "Organization",
              name: "1DentalAI",
            },
            publisher: {
              "@type": "Organization",
              name: "1DentalAI",
              logo: `${siteUrl}/brand-profile.png`,
            },
            mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
          }}
        />
        <article className="mx-auto max-w-4xl px-6 py-20 sm:px-8 lg:py-28">
          <Link href="/blog" className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-900">
            Blog
          </Link>
          <p className="mt-8 text-sm font-semibold text-cyan-700">{post.category}</p>
          <h1 className="mt-5 text-5xl font-semibold tracking-tight text-neutral-950 sm:text-7xl">
            {post.title}
          </h1>
          <p className="mt-6 text-lg leading-8 text-neutral-600 sm:text-xl">{post.description}</p>
          <p className="mt-6 text-sm text-neutral-500">
            {new Date(post.publishedAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC",
            })}{" "}
            · {post.readTime}
          </p>

          <div className="mt-14 space-y-12">
            {post.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-3xl font-semibold tracking-tight text-neutral-950">
                  {section.heading}
                </h2>
                <div className="mt-5 space-y-5">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-lg leading-8 text-neutral-600">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <aside className="mt-16 rounded-[2rem] bg-neutral-950 p-8 text-white">
            <h2 className="text-3xl font-semibold tracking-tight">Want to map this to your practice?</h2>
            <p className="mt-4 text-base leading-7 text-neutral-300">
              Share your PMS, phone system, payer mix, and biggest workflow bottleneck. The 1DentalAI team can walk through what an operating layer would look like for your practice.
            </p>
            <Link href="/contact" className="mt-7 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-950">
              Request access
            </Link>
          </aside>
        </article>
      </main>
    </MarketingShell>
  );
}
