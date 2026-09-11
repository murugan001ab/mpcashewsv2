"use client";
// src/app/admin/blog/page.tsx
// Full admin control over the blog: create/edit/delete posts, and toggle
// is_published — the storefront's /blogs pages only ever show what's
// published here, at whatever content the admin last saved.
import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Plus,
  Pencil,
  Trash2,
  Newspaper,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import * as blogService from "@/services/blogService";
import * as adminService from "@/services/adminService";
import { getErrorMessage } from "@/utils/apiError";
import type { BlogPost, BlogPostPayload } from "@/types";
import {
  PageHeader,
  Button,
  IconButton,
  Field,
  inputClass,
  Modal,
  ErrorNotice,
  LoadingBlock,
  EmptyState,
  Badge,
} from "@/components/admin/ui";

const EMPTY_FORM: BlogPostPayload = {
  title: "",
  excerpt: "",
  content: "",
  featured_image: "",
  is_published: false,
  meta_title: "",
  meta_description: "",
};

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<BlogPostPayload>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const res = await blogService.listAdminBlogPosts({ page: p, page_size: 20 });
      setPosts(res.items);
      setPage(res.page);
      setPages(res.pages);
      setTotal(res.total);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load blog posts."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setCreateOpen(true);
    setModalError("");
  };

  const openEdit = (post: BlogPost) => {
    setForm({
      title: post.title,
      excerpt: post.excerpt ?? "",
      content: post.content,
      featured_image: post.featured_image ?? "",
      is_published: post.is_published,
      meta_title: post.meta_title ?? "",
      meta_description: post.meta_description ?? "",
    });
    setEditing(post);
    setCreateOpen(true);
    setModalError("");
  };

  const closeModal = () => {
    setCreateOpen(false);
    setEditing(null);
  };

  const handleUploadFeaturedImage = async (file: File) => {
    setUploading(true);
    try {
      const res = await adminService.uploadImage(file, "blog");
      setForm((f) => ({ ...f, featured_image: res.url }));
    } catch (err) {
      setModalError(getErrorMessage(err, "Failed to upload image."));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setModalError("Title and content are required.");
      return;
    }
    setSaving(true);
    setModalError("");
    try {
      const payload: BlogPostPayload = {
        ...form,
        excerpt: form.excerpt?.trim() || null,
        featured_image: form.featured_image?.trim() || null,
        meta_title: form.meta_title?.trim() || null,
        meta_description: form.meta_description?.trim() || null,
      };
      if (editing) {
        await blogService.updateBlogPost(editing.id, payload);
      } else {
        await blogService.createBlogPost(payload);
      }
      closeModal();
      load(editing ? page : 1);
    } catch (err) {
      setModalError(getErrorMessage(err, "Failed to save post."));
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (post: BlogPost) => {
    try {
      await blogService.updateBlogPost(post.id, { is_published: !post.is_published });
      load(page);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update post."));
    }
  };

  const handleDelete = async (post: BlogPost) => {
    if (!window.confirm(`Delete "${post.title}"? This can't be undone.`)) return;
    try {
      await blogService.deleteBlogPost(post.id);
      load(posts.length === 1 && page > 1 ? page - 1 : page);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete post."));
    }
  };

  return (
    <div>
      <PageHeader
        title="Blog"
        subtitle="Write and publish posts — only published posts show up on the storefront"
        action={
          <Button onClick={openCreate}>
            <Plus size={16} /> New post
          </Button>
        }
      />

      {error && <ErrorNotice>{error}</ErrorNotice>}

      <div className="bg-white rounded-2xl border border-brand-brown/10 overflow-hidden">
        {loading ? (
          <LoadingBlock />
        ) : posts.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title="No blog posts yet"
            description="Write your first post to get the blog started."
            action={
              <Button onClick={openCreate}>
                <Plus size={16} /> New post
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-brand-brown/45 uppercase tracking-wide border-b border-brand-brown/10">
                    <th className="px-5 py-3 font-semibold">Post</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Views</th>
                    <th className="px-3 py-3 font-semibold">Updated</th>
                    <th className="px-3 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-brown/8">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-brand-brown/[0.03] transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-brand-brown/5 overflow-hidden shrink-0 relative">
                            {post.featured_image ? (
                              <Image src={post.featured_image} alt={post.title} fill className="object-cover" unoptimized />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-brand-brown/30">
                                <Newspaper size={16} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-brand-black truncate max-w-[280px]">{post.title}</p>
                            <p className="text-xs text-brand-brown/40 truncate max-w-[280px]">/{post.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={post.is_published ? "green" : "neutral"}>
                          {post.is_published ? "Published" : "Draft"}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-brand-brown/70 tabular-nums">{post.view_count}</td>
                      <td className="px-3 py-3 text-brand-brown/50 text-xs">
                        {new Date(post.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <IconButton onClick={() => togglePublish(post)} title={post.is_published ? "Unpublish" : "Publish"}>
                            {post.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                          </IconButton>
                          <IconButton onClick={() => openEdit(post)} title="Edit">
                            <Pencil size={14} />
                          </IconButton>
                          <IconButton onClick={() => handleDelete(post)} title="Delete" className="hover:text-red-600 hover:bg-red-50">
                            <Trash2 size={14} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-brand-brown/10">
                <p className="text-xs text-brand-brown/45">
                  {total} post{total === 1 ? "" : "s"} · page {page} of {pages}
                </p>
                <div className="flex items-center gap-1">
                  <IconButton onClick={() => load(page - 1)} title="Previous page" disabled={page <= 1}>
                    <ChevronLeft size={14} />
                  </IconButton>
                  <IconButton onClick={() => load(page + 1)} title="Next page" disabled={page >= pages}>
                    <ChevronRight size={14} />
                  </IconButton>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        open={createOpen}
        onClose={closeModal}
        title={editing ? "Edit post" : "New post"}
        width="max-w-2xl"
      >
        {modalError && <ErrorNotice>{modalError}</ErrorNotice>}
        <form onSubmit={handleSave} className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
          <Field label="Title">
            <input
              className={inputClass}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. 5 ways to enjoy roasted cashews"
              required
            />
          </Field>

          <Field label="Featured image">
            <div className="flex items-center gap-3">
              {form.featured_image ? (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-brand-brown/10 shrink-0">
                  <Image src={form.featured_image} alt="" fill className="object-cover" unoptimized />
                </div>
              ) : null}
              <label className="w-20 h-20 rounded-xl border-2 border-dashed border-brand-brown/20 flex items-center justify-center text-brand-brown/40 hover:text-brand-orange hover:border-brand-orange/40 cursor-pointer transition-colors shrink-0">
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadFeaturedImage(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </Field>

          <Field label="Excerpt" hint="Short teaser shown on the blog list page">
            <textarea
              className={inputClass}
              rows={2}
              value={form.excerpt ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
            />
          </Field>

          <Field label="Content" hint="HTML — this is rendered as-is on the post page">
            <textarea
              className={`${inputClass} font-mono text-xs`}
              rows={12}
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              required
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="SEO title" hint="Falls back to the post title if left blank">
              <input
                className={inputClass}
                value={form.meta_title ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, meta_title: e.target.value }))}
              />
            </Field>
            <Field label="SEO description">
              <input
                className={inputClass}
                value={form.meta_description ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, meta_description: e.target.value }))}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold text-brand-black">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
            />
            Published — visible on the storefront
          </label>

          <div className="flex items-center gap-2 pt-1 sticky bottom-0 bg-white">
            <Button type="button" variant="secondary" className="flex-1" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Saving…" : "Save post"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
