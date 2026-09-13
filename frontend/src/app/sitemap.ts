
import type { MetadataRoute } from "next";
import { API_BASE_URL } from "@/config/env";

// Served automatically at /sitemap.xml.
// Combines static marketing pages with active products,
// published blog posts, and product categories.
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

interface SitemapCategory {
  id: string;
  name: string;
  updated_at?: string;
}

/**
 * Get all product URLs
 */
async function getProductEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const entries: MetadataRoute.Sitemap = [];

    let page = 1;
    let totalPages = 1;

    do {
      // FastAPI commonly limits page_size to 100.
      const url = `${API_BASE_URL}products?page=${page}&page_size=100`;

      const res = await fetch(url, {
        next: { revalidate: 3600 },
      });

      if (!res.ok) {
        console.error(
          `[sitemap] products fetch failed: ${res.status} ${res.statusText} — ${url}`
        );
        break;
      }

      const data = (await res.json()) as {
        items?: SitemapProduct[];
        pages?: number;
        total?: number;
      };

      totalPages = data.pages ?? 1;

      for (const product of data.items ?? []) {
        entries.push({
          url: `${SITE_URL}/products/${encodeURIComponent(product.id)}`,

          lastModified: product.updated_at
            ? new Date(product.updated_at)
            : undefined,

          changeFrequency: "weekly",

          priority: 0.8,
        });
      }

      page += 1;
    } while (page <= totalPages && page <= 10);

    console.log(
      `[sitemap] products: ${entries.length} entries`
    );

    return entries;
  } catch (err) {
    console.error(
      "[sitemap] products fetch threw:",
      err
    );

    return [];
  }
}

/**
 * Get all published blog URLs
 */
async function getBlogEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const entries: MetadataRoute.Sitemap = [];

    let page = 1;
    let totalPages = 1;

    do {
      const url = `${API_BASE_URL}blog?page=${page}&page_size=100`;

      const res = await fetch(url, {
        next: { revalidate: 3600 },
      });

      if (!res.ok) {
        console.error(
          `[sitemap] blog fetch failed: ${res.status} ${res.statusText} — ${url}`
        );
        break;
      }

      const data = (await res.json()) as {
        items?: SitemapBlogPost[];
        pages?: number;
      };

      totalPages = data.pages ?? 1;

      for (const post of data.items ?? []) {
        entries.push({
          url: `${SITE_URL}/blogs/${encodeURIComponent(post.slug)}`,

          lastModified: post.published_at
            ? new Date(post.published_at)
            : post.created_at
              ? new Date(post.created_at)
              : undefined,

          changeFrequency: "monthly",

          priority: 0.6,
        });
      }

      page += 1;
    } while (page <= totalPages && page <= 10);

    console.log(
      `[sitemap] blog posts: ${entries.length} entries`
    );

    return entries;
  } catch (err) {
    console.error(
      "[sitemap] blog fetch threw:",
      err
    );

    return [];
  }
}

/**
 * Get all category URLs
 */
async function getCategoryEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const url = `${API_BASE_URL}categories`;

    const res = await fetch(url, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.error(
        `[sitemap] categories fetch failed: ${res.status} ${res.statusText} — ${url}`
      );

      return [];
    }

    const data = (await res.json()) as SitemapCategory[];

    const entries: MetadataRoute.Sitemap = (data ?? []).map(
      (category) => {
        /**
         * IMPORTANT:
         * Use URL + URLSearchParams instead of manually
         * concatenating "&".
         *
         * Example generated URL:
         *
         * https://mpcashews.in/products?category_id=123&category=Whole%20Cashews
         *
         * Next.js will correctly XML-escape "&" as "&amp;"
         * when generating sitemap.xml.
         */
        const categoryUrl = new URL(
          "/products",
          SITE_URL
        );

        categoryUrl.searchParams.set(
          "category_id",
          category.id
        );

        categoryUrl.searchParams.set(
          "category",
          category.name
        );

        return {
          url: categoryUrl.toString(),

          lastModified: category.updated_at
            ? new Date(category.updated_at)
            : undefined,

          changeFrequency: "weekly",

          priority: 0.7,
        };
      }
    );

    console.log(
      `[sitemap] categories: ${entries.length} entries`
    );

    return entries;
  } catch (err) {
    console.error(
      "[sitemap] categories fetch threw:",
      err
    );

    return [];
  }
}

/**
 * Get About page last modified date
 */
async function getAboutLastModified(): Promise<
  Date | undefined
> {
  try {
    const url = `${API_BASE_URL}about`;

    const res = await fetch(url, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.error(
        `[sitemap] about fetch failed: ${res.status} ${res.statusText} — ${url}`
      );

      return undefined;
    }

    const data = (await res.json()) as {
      updated_at?: string;
    };

    return data.updated_at
      ? new Date(data.updated_at)
      : undefined;
  } catch (err) {
    console.error(
      "[sitemap] about fetch threw:",
      err
    );

    return undefined;
  }
}

/**
 * Main sitemap
 */
export default async function sitemap(): Promise<
  MetadataRoute.Sitemap
> {
  /**
   * Static pages
   */
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
      // Main shop page
      url: `${SITE_URL}/products`,

      lastModified: new Date(),

      changeFrequency: "daily",

      priority: 0.9,
    },

    {
      // Partner page
      url: `${SITE_URL}/become-partner`,

      lastModified: new Date(),

      changeFrequency: "monthly",

      priority: 0.7,
    },

    {
      // Blog listing page
      url: `${SITE_URL}/blogs`,

      lastModified: new Date(),

      changeFrequency: "weekly",

      priority: 0.7,
    },
  ];

  /**
   * Fetch dynamic sitemap entries in parallel
   */
  const [
    productEntries,
    blogEntries,
    categoryEntries,
  ] = await Promise.all([
    getProductEntries(),
    getBlogEntries(),
    getCategoryEntries(),
  ]);

  /**
   * Combine everything
   */
  return [
    ...staticEntries,
    ...categoryEntries,
    ...productEntries,
    ...blogEntries,
  ];
}

