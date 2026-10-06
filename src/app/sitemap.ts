import type { MetadataRoute } from "next";
import { PRODUCTS } from "@/lib/catalog";
import { ARTICLES } from "@/lib/journal";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const pages = ["", "/shop", "/ingredients", "/ritual", "/journal", "/our-story"].map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p ? 0.8 : 1 }));
  const products = PRODUCTS.map((p) => ({ url: `${base}/products/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.9 }));
  const articles = ARTICLES.map((a) => ({ url: `${base}/journal/${a.slug}`, changeFrequency: "monthly" as const, priority: 0.6 }));
  return [...pages, ...products, ...articles];
}
