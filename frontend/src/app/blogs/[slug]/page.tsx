"use client";
// src/app/blogs/[slug]/page.tsx
// Public single-post view. Content is admin-authored HTML (same trust model
// as the email templates' html_body) — rendered as-is via dangerouslySetInnerHTML.
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, AlertCircle, Loader2 } from "lucide-react";
import * as blogService from "@/services/blogService";
import type { BlogPost } from "@/types";

function formatDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    blogService
      .getBlogPostBySlug(slug)
      .then((res) => {
        if (!cancelled) setPost(res);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (post) {
      document.title = `${post.meta_title || post.title} — MP Cashews`;
    }
  }, [post]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 min-h-screen pt-24">
        <Loader2 size={28} className="animate-spin text-brand-orange" />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 pt-24">
        <div className="w-20 h-20 bg-brand-orange/10 text-brand-orange rounded-full flex items-center justify-center mb-6">
          <AlertCircle size={40} strokeWidth={2} />
        </div>
        <h2 className="text-3xl font-extrabold text-brand-black mb-4">Post not found</h2>
        <p className="text-brand-brown/60 mb-8">This post might have been unpublished or removed.</p>
        <button
          onClick={() => router.push("/blogs")}
          className="bg-brand-black hover:bg-brand-brown text-white px-8 py-3.5 rounded-xl font-bold transition-all"
        >
          Back to Blog
        </button>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 pt-24 min-h-screen">
      <button
        onClick={() => router.push("/blogs")}
        className="flex items-center gap-1.5 text-sm font-bold text-brand-brown/60 hover:text-brand-orange transition-colors mb-8 w-fit"
      >
        <ChevronLeft size={16} strokeWidth={2.5} /> Back to Blog
      </button>

      <div className="mb-8">
        <span className="text-[11px] font-bold uppercase tracking-wide text-brand-brown/40">
          {formatDate(post.published_at ?? post.created_at)}
          {post.author?.full_name ? ` · ${post.author.full_name}` : ""}
        </span>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-brand-black tracking-tight leading-tight mt-2">
          {post.title}
        </h1>
        {post.excerpt && <p className="text-lg text-brand-brown/70 mt-4 leading-relaxed">{post.excerpt}</p>}
      </div>

      {post.featured_image && (
        <div className="rounded-3xl overflow-hidden mb-10 bg-brand-cream/30 aspect-[16/9]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.featured_image} alt={post.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div
        className="prose max-w-none text-brand-brown/85 leading-loose prose-headings:text-brand-black prose-a:text-brand-orange"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}
