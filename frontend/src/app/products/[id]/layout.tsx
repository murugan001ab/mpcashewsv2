import type { Metadata } from "next";
import { API_BASE_URL } from "@/config/env";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(`${API_BASE_URL}products/${id}`, {
      // Product names change rarely; avoid hammering the backend on every
      // request while still picking up edits within a minute.
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const product = (await res.json()) as { name?: string; short_description?: string };
    return {
      title: product.name || "Product",
      description: product.short_description,
    };
  } catch {
    return { title: "Product" };
  }
}

export default function ProductDetailsLayout({ children }: Props) {
  return children;
}
