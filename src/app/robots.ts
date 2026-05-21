import type { MetadataRoute } from "next";
import { blogPosts } from "@/lib/blog-data";
import { siteUrl } from "@/lib/seo";
import { solutionPages } from "@/lib/solution-data";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/product",
          "/solutions",
          ...solutionPages.map((solution) => `/solutions/${solution.slug}`),
          "/features",
          "/use-cases",
          "/demos",
          "/resources",
          "/blog",
          "/about",
          "/partners",
          "/readiness-score",
          "/contact",
          ...blogPosts.map((post) => `/blog/${post.slug}`),
        ],
        disallow: ["/app", "/app/", "/app/*", "/admin", "/admin/*", "/api", "/api/*", "/login", "/logout", "/signup"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
