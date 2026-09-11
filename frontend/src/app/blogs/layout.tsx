import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Guides, tips and stories on premium Panruti cashews \u2014 from farm to your table. Learn about cashew grades like W240, storage, and what makes ours different.",
  alternates: { canonical: "/blogs" },
  openGraph: {
    title: "Blog \u2014 MP Cashews",
    description: "Guides, tips and stories on premium Panruti cashews \u2014 from farm to your table.",
    url: "https://mpcashews.in/blogs",
  },
};

export default function BlogsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
