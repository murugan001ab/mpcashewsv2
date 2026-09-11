import type { MetadataRoute } from "next";
import { API_BASE_URL } from "@/config/env";

// Served automatically at /sitemap.xml. Combines the static marketing pages
// with every active product and published blog post fetched from the API,
// so new products/posts show up here (and get crawled) without anyone
// having to remember to update a sitemap by hand.
const SITE_URL = "https://mpcashews.in";

interface SitemapProduct {
  id: string;
  updated_at?: string;
}

interface SitemapBlogPost {
  slug: string;
  created_at?: string;
  published_at?: string;
}

async function getProductEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const entries: MetadataRoute.Sitemap = [];
    let page = 1;
    let totalPages = 1;
    do {
      // page_size capped at 100 — many FastAPI backends reject anything
      // above their configured max (commonly le=100) with a 422, which
      // would otherwise fail this whole fetch silently.
      const url = `${API_BASE_URL}products?page=${page}&page_size=100`;
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) {
        console.error(`[sitemap] products fetch failed: ${res.status} ${res.statusText} — ${url}`);
        break;
      }
      const data = (await res.json()) as { items?: SitemapProduct[]; pages?: number; total?: number };
      totalPages = data.pages ?? 1;
      for (const p of data.items ?? []) {
        entries.push({
          url: `${SITE_URL}/products/${p.id}`,
          lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
          changeFrequency: "weekly" as const,
          priority: 0.8,
        });
      }
      page += 1;
    } while (page <= totalPages && page <= 10);
    console.log(`[sitemap] products: ${entries.length} entries`);
    return entries;
  } catch (err) {
    console.error("[sitemap] products fetch threw:", err);
    return [];
  }
}

async function getBlogEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const entries: MetadataRoute.Sitemap = [];
    let page = 1;
    let totalPages = 1;
    // Public blog list only ever returns published posts, so nothing extra
    // to filter here. Capped at 10 pages (~1000 posts) as a sane ceiling.
    do {
      const url = `${API_BASE_URL}blog?page=${page}&page_size=100`;
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) {
        console.error(`[sitemap] blog fetch failed: ${res.status} ${res.statusText} — ${url}`);
        break;
      }
      const data = (await res.json()) as { items?: SitemapBlogPost[]; pages?: number };
      totalPages = data.pages ?? 1;
      for (const post of data.items ?? []) {
        entries.push({
          url: `${SITE_URL}/blogs/${post.slug}`,
          lastModified: post.published_at ? new Date(post.published_at) : post.created_at ? new Date(post.created_at) : undefined,
          changeFrequency: "monthly" as const,
          priority: 0.6,
        });
      }
      page += 1;
    } while (page <= totalPages && page <= 10);
    console.log(`[sitemap] blog posts: ${entries.length} entries`);
    return entries;
  } catch (err) {
    console.error("[sitemap] blog fetch threw:", err);
    return [];
  }
}

async function getAboutLastModified(): Promise<Date | undefined> {
  try {
    const url = `${API_BASE_URL}about`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      console.error(`[sitemap] about fetch failed: ${res.status} ${res.statusText} — ${url}`);
      return undefined;
    }
    const data = (await res.json()) as { updated_at?: string };
    return data.updated_at ? new Date(data.updated_at) : undefined;
  } catch (err) {
    console.error("[sitemap] about fetch threw:", err);
    return undefined;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: await getAboutLastModified(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/become-partner`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/blogs`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  const [productEntries, blogEntries] = await Promise.all([getProductEntries(), getBlogEntries()]);

  return [...staticEntries, ...productEntries, ...blogEntries];
}
