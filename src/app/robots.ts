import type { MetadataRoute } from "next";
import { blogPosts } from "@/lib/blog-data";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/product",
          "/features",
          "/use-cases",
          "/demos",
          "/resources",
          "/blog",
          "/about",
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
