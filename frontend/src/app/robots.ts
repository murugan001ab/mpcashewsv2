import type { MetadataRoute } from "next";

// Served automatically at /robots.txt. Keeps crawlers out of account/cart/
// admin areas (no SEO value, and no reason to spend crawl budget there)
// while allowing everything a customer would actually search for.
export default function robots(): MetadataRoute.Robots {
  const SITE_URL = "https://mpcashews.in";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/cart",
        "/checkout",
        "/profile",
        "/wishlist",
        "/login",
        "/register",
        "/auth",
        "/verify-email",
        "/google",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
