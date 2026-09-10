"use client";
// src/app/blogs/page.tsx
// Public blog list — only ever shows posts the admin has published
// (GET /blog already filters to is_published=true server-side).
import { useEffect, useState } from "react";
import Link from "next/link";
import { Newspaper, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import * as blogService from "@/services/blogService";
import type { BlogPostListItem } from "@/types";

function formatDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export default function BlogsPage() {
  const [posts, setPosts] = useState<BlogPostListItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const res = await blogService.listBlogPosts(p, 9);
      setPosts(res.items);
      setPage(res.page);
      setPages(res.pages);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 pt-24 min-h-screen">
      <div className="mb-10 flex flex-col gap-1">
        <span className="text-brand-orange text-xs font-black uppercase tracking-[0.2em]">From the journal</span>
        <h1 className="text-3xl md:text-4xl font-black text-brand-black uppercase leading-tight">Blog</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-brand-orange" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-24 px-6 border-2 border-dashed border-brand-brown/10 rounded-3xl bg-gray-50">
          <Newspaper size={32} className="text-brand-brown/20 mb-3" />
          <p className="text-brand-black font-bold mb-1">No posts yet</p>
          <p className="text-sm text-brand-brown/50">Check back soon.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blogs/${post.slug}`}
                className="group bg-white border border-brand-brown/5 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
              >
                <div className="aspect-[16/10] bg-brand-cream/30 overflow-hidden">
                  {post.featured_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.featured_image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-brand-brown/20">
                      <Newspaper size={32} />
                    </div>
                  )}
                </div>
                <div className="p-5 flex flex-col gap-2 flex-1">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-brand-brown/40">
                    {formatDate(post.published_at ?? post.created_at)}
                  </span>
                  <h2 className="font-extrabold text-brand-black text-lg leading-snug line-clamp-2 group-hover:text-brand-orange transition-colors">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-sm text-brand-brown/60 line-clamp-2">{post.excerpt}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-12">
              <button
                onClick={() => load(page - 1)}
                disabled={page <= 1}
                className="w-10 h-10 rounded-full flex items-center justify-center border border-brand-brown/15 text-brand-black hover:border-brand-orange hover:text-brand-orange disabled:opacity-30 disabled:hover:border-brand-brown/15 disabled:hover:text-brand-black transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-semibold text-brand-brown/60">
                Page {page} of {pages}
              </span>
              <button
                onClick={() => load(page + 1)}
                disabled={page >= pages}
                className="w-10 h-10 rounded-full flex items-center justify-center border border-brand-brown/15 text-brand-black hover:border-brand-orange hover:text-brand-orange disabled:opacity-30 disabled:hover:border-brand-brown/15 disabled:hover:text-brand-black transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
