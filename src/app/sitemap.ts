import type { MetadataRoute } from "next";
import { blogPosts } from "@/lib/blog-data";
import { publicRoutes, siteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = publicRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "weekly" as const : "monthly" as const,
    priority: route === "" ? 1 : route === "/contact" ? 0.9 : 0.8,
  }));

  const blogRoutes = blogPosts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  return [...staticRoutes, ...blogRoutes];
}
