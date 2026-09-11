import type { Metadata } from "next";
import { API_BASE_URL } from "@/config/env";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

interface BlogMetaShape {
  title?: string;
  excerpt?: string;
  meta_title?: string;
  meta_description?: string;
  featured_image?: string;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_BASE_URL}blog/${slug}`, {
      // Posts don't change often once published; still pick up edits
      // within a minute instead of caching forever.
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const post = (await res.json()) as BlogMetaShape;

    const title = post.meta_title || post.title || "Blog";
    const description = post.meta_description || post.excerpt;

    return {
      title,
      description,
      alternates: { canonical: `/blogs/${slug}` },
      openGraph: {
        title,
        description,
        url: `https://mpcashews.in/blogs/${slug}`,
        type: "article",
        images: post.featured_image ? [{ url: post.featured_image }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: post.featured_image ? [post.featured_image] : undefined,
      },
    };
  } catch {
    return { title: "Blog" };
  }
}

export default function BlogPostLayout({ children }: Props) {
  return children;
}
