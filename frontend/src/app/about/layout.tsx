import type { Metadata } from "next";
import { API_BASE_URL } from "@/config/env";

interface AboutMetaShape {
  hero_title?: string;
  hero_subtitle?: string;
  meta_title?: string;
  meta_description?: string;
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const res = await fetch(`${API_BASE_URL}about`, {
      // Content changes rarely once set; still pick up admin edits within
      // a minute instead of caching forever.
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const about = (await res.json()) as AboutMetaShape;

    const title = about.meta_title || about.hero_title || "About Us";
    const description =
      about.meta_description ||
      about.hero_subtitle ||
      "MP Cashews is a Panruti-native cashew seller \u2014 premium, natural, farm-to-customer cashews, retail and wholesale.";

    return {
      title,
      description,
      alternates: { canonical: "/about" },
      openGraph: {
        title,
        description,
        url: "https://mpcashews.in/about",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    };
  } catch {
    return { title: "About Us" };
  }
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
