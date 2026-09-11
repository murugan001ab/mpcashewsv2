"use client";
// src/app/admin/about/page.tsx
// Admin editor for the public /about page: hero copy + company story + SEO
// fields, plus a categorized image gallery (farm / factory / product /
// sales). Gallery drag-to-reorder and upload/crop follow the same pattern
// as src/app/admin/auth-slides/page.tsx, just scoped per-category since
// each category has its own independent sort order on the backend.
import { useEffect, useState } from "react";
import {
  ImagePlus, Loader2, GripVertical, Trash2, Pencil, Eye, EyeOff, Images, Save,
} from "lucide-react";
import * as aboutService from "@/services/aboutService";
import { assetUrl } from "@/config/env";
import { getErrorMessage } from "@/utils/apiError";
import type { AboutPage, AboutImageAdmin, AboutImageCategory } from "@/types";
import ImageCropModal from "@/components/admin/ImageCropModal";
import {
  PageHeader, Button, IconButton, Field, inputClass, Modal,
  ErrorNotice, LoadingBlock, EmptyState, Badge,
} from "@/components/admin/ui";

// Gallery photos render in a square grid card, unlike the portrait auth
// slides — 1:1 keeps every category's grid visually even regardless of
// what the admin uploads.
const IMAGE_ASPECT = 1;
const IMAGE_OUTPUT_SIZE = 1000;

const CATEGORIES: { value: AboutImageCategory; label: string }[] = [
  { value: "farm", label: "Farm" },
  { value: "factory", label: "Factory" },
  { value: "product", label: "Product" },
  { value: "sales", label: "Sales" },
];

export default function AdminAboutPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="About page"
        subtitle="Edit the public About Us page — hero copy, company story, SEO, and gallery images"
      />
      <AboutContentEditor />
      <AboutGalleryEditor />
    </div>
  );
}

// ── Hero / story / SEO content editor ───────────────────────────────────
function AboutContentEditor() {
  const [page, setPage] = useState<AboutPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [content, setContent] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await aboutService.getAdminAboutPage();
        setPage(data);
        setHeroTitle(data.hero_title ?? "");
        setHeroSubtitle(data.hero_subtitle ?? "");
        setContent(data.content ?? "");
        setMetaTitle(data.meta_title ?? "");
        setMetaDescription(data.meta_description ?? "");
      } catch (err) {
        setError(getErrorMessage(err, "Couldn't load the About page content."));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const updated = await aboutService.updateAboutPage({
        hero_title: heroTitle.trim(),
        hero_subtitle: heroSubtitle.trim(),
        content,
        meta_title: metaTitle.trim(),
        meta_description: metaDescription.trim(),
      });
      setPage(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save changes."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-brand-brown/10 p-5">
        <LoadingBlock />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-brand-brown/10 p-5">
      {error && <ErrorNotice>{error}</ErrorNotice>}
      <form onSubmit={handleSave} className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Hero title" hint="Big heading at the top of the page">
            <input
              className={inputClass}
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              placeholder="About MP Cashews"
            />
          </Field>
          <Field label="Hero subtitle" hint="One-line tagline under the title">
            <input
              className={inputClass}
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              placeholder="Panruti-native cashews, hand-picked with care."
            />
          </Field>
        </div>

        <Field label="Company story" hint="Main content — HTML is supported (paragraphs, bold, links)">
          <textarea
            className={`${inputClass} font-mono text-xs`}
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="<p>MP Cashews is rooted in Panruti, Tamil Nadu...</p>"
          />
        </Field>

        <div className="pt-2 border-t border-brand-brown/10">
          <p className="text-xs font-semibold text-brand-brown/70 mb-3 uppercase tracking-wide">SEO</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Meta title" hint="Falls back to hero title if left blank">
              <input
                className={inputClass}
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="About Us | MP Cashews"
              />
            </Field>
            <Field label="Meta description" hint="Falls back to hero subtitle if left blank">
              <input
                className={inputClass}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Learn about MP Cashews — premium, natural, farm-to-customer cashews."
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Saving…" : "Save changes"}
          </Button>
          {saved && <span className="text-xs font-medium text-green-600">Saved.</span>}
          {page?.updated_at && !saved && (
            <span className="text-[11px] text-brand-brown/40">
              Last updated {new Date(page.updated_at).toLocaleString()}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

// ── Categorized image gallery editor ────────────────────────────────────
function AboutGalleryEditor() {
  const [images, setImages] = useState<AboutImageAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState<AboutImageCategory>("farm");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [pendingRawFile, setPendingRawFile] = useState<File | null>(null);
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [modalError, setModalError] = useState("");

  const [editing, setEditing] = useState<AboutImageAdmin | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editCategory, setEditCategory] = useState<AboutImageCategory>("farm");
  const [savingEdit, setSavingEdit] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setImages(await aboutService.getAdminAboutImages());
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load gallery images."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetUploadForm = () => {
    setUploadFile(null);
    setPendingRawFile(null);
    setUploadCaption("");
    setModalError("");
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setModalError("Please choose an image.");
      return;
    }
    setUploading(true);
    setModalError("");
    try {
      await aboutService.createAboutImage(uploadFile, activeCategory, uploadCaption.trim() || undefined);
      setUploadOpen(false);
      resetUploadForm();
      await load();
    } catch (err) {
      setModalError(getErrorMessage(err, "Failed to upload image."));
    } finally {
      setUploading(false);
    }
  };

  const openEdit = (img: AboutImageAdmin) => {
    setEditing(img);
    setEditCaption(img.caption ?? "");
    setEditCategory(img.category);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSavingEdit(true);
    try {
      await aboutService.updateAboutImage(editing.id, {
        caption: editCaption.trim() || undefined,
        category: editCategory,
      });
      setEditing(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save image."));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleActive = async (img: AboutImageAdmin) => {
    setTogglingId(img.id);
    const prev = images;
    setImages((s) => s.map((x) => (x.id === img.id ? { ...x, is_active: !x.is_active } : x)));
    try {
      await aboutService.updateAboutImage(img.id, { is_active: !img.is_active });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update image."));
      setImages(prev);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (img: AboutImageAdmin) => {
    if (deletingId) return;
    if (!window.confirm("Delete this image? This can't be undone.")) return;
    setDeletingId(img.id);
    const prev = images;
    setImages((s) => s.filter((x) => x.id !== img.id));
    try {
      await aboutService.deleteAboutImage(img.id);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete image."));
      setImages(prev);
    } finally {
      setDeletingId(null);
    }
  };

  // Drag-to-reorder is scoped to the active category — only images within
  // it move, and only their IDs are sent to reorderAboutImages.
  const handleDrop = async (targetId: string) => {
    setDragOverId(null);
    const sourceId = draggedId;
    setDraggedId(null);
    if (!sourceId || sourceId === targetId) return;

    const categoryImages = images.filter((i) => i.category === activeCategory);
    const otherImages = images.filter((i) => i.category !== activeCategory);

    const reordered = [...categoryImages];
    const fromIdx = reordered.findIndex((i) => i.id === sourceId);
    const toIdx = reordered.findIndex((i) => i.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    const prev = images;
    setImages([...otherImages, ...reordered]); // optimistic
    setReordering(true);
    try {
      const updated = await aboutService.reorderAboutImages(activeCategory, reordered.map((i) => i.id));
      setImages([...otherImages, ...updated]);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save the new order."));
      setImages(prev);
    } finally {
      setReordering(false);
    }
  };

  const visibleImages = images.filter((i) => i.category === activeCategory);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-brand-black">Gallery images</h2>
          <p className="text-sm text-brand-brown/60 mt-0.5">
            Shown in sections on the About page, grouped by category
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <ImagePlus size={16} /> Add image
        </Button>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {CATEGORIES.map((c) => {
          const count = images.filter((i) => i.category === c.value).length;
          const active = activeCategory === c.value;
          return (
            <button
              key={c.value}
              onClick={() => setActiveCategory(c.value)}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                active
                  ? "bg-brand-orange text-white"
                  : "bg-white text-brand-brown/60 border border-brand-brown/15 hover:border-brand-brown/30"
              }`}
            >
              {c.label} {count > 0 && <span className="opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {error && <ErrorNotice>{error}</ErrorNotice>}

      <div className="bg-white rounded-2xl border border-brand-brown/10 p-5">
        {loading ? (
          <LoadingBlock />
        ) : visibleImages.length === 0 ? (
          <EmptyState
            icon={Images}
            title={`No ${activeCategory} images yet`}
            description="Add a few images to populate this section of the About page."
            action={
              <Button onClick={() => setUploadOpen(true)}>
                <ImagePlus size={16} /> Add image
              </Button>
            }
          />
        ) : (
          <>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] text-brand-brown/40">
                Drag to reorder within this category. Only active images appear on the site.
              </p>
              {reordering && (
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-brand-brown/45 shrink-0">
                  <Loader2 size={11} className="animate-spin" /> Saving order…
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 mt-3">
              {visibleImages.map((img, idx) => (
                <div
                  key={img.id}
                  draggable
                  onDragStart={() => setDraggedId(img.id)}
                  onDragEnter={() => setDragOverId(img.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnd={() => {
                    setDraggedId(null);
                    setDragOverId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(img.id);
                  }}
                  className={`relative w-40 sm:w-44 rounded-2xl overflow-hidden border-2 group cursor-grab active:cursor-grabbing transition-all border-brand-brown/10 ${
                    draggedId === img.id ? "opacity-40" : ""
                  } ${
                    dragOverId === img.id && draggedId && draggedId !== img.id
                      ? "ring-2 ring-brand-orange ring-offset-2"
                      : ""
                  } ${!img.is_active ? "grayscale" : ""}`}
                >
                  <div className="relative w-full h-40 sm:h-44 bg-brand-cream/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={assetUrl(img.url) ?? ""}
                      alt={img.caption || ""}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                    <span className="absolute top-2 left-2 bg-black/55 text-white text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center">
                      {idx + 1}
                    </span>

                    {!img.is_active && (
                      <span className="absolute top-2 right-2">
                        <Badge tone="neutral">Hidden</Badge>
                      </span>
                    )}

                    <span className="absolute bottom-2 left-2 bg-black/45 text-white rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <GripVertical size={14} />
                    </span>

                    {img.caption && (
                      <p className="absolute bottom-2 right-2 left-8 text-white text-[11px] leading-snug line-clamp-2 text-right drop-shadow">
                        {img.caption}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between px-2 py-1.5 bg-white">
                    <div className="flex items-center gap-0.5">
                      <IconButton
                        onClick={() => handleToggleActive(img)}
                        disabled={togglingId === img.id}
                        title={img.is_active ? "Hide from site" : "Show on site"}
                      >
                        {togglingId === img.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : img.is_active ? (
                          <Eye size={13} />
                        ) : (
                          <EyeOff size={13} />
                        )}
                      </IconButton>
                      <IconButton onClick={() => openEdit(img)} title="Edit">
                        <Pencil size={13} />
                      </IconButton>
                    </div>
                    <IconButton
                      onClick={() => handleDelete(img)}
                      disabled={deletingId === img.id}
                      title="Delete"
                      className="hover:text-red-600 hover:bg-red-50"
                    >
                      {deletingId === img.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Add image ───────────────────────────────────────────────────── */}
      <Modal
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
          resetUploadForm();
        }}
        title={`Add ${CATEGORIES.find((c) => c.value === activeCategory)?.label.toLowerCase()} image`}
      >
        {modalError && <ErrorNotice>{modalError}</ErrorNotice>}
        <form onSubmit={handleUpload} className="space-y-4">
          <Field label="Image">
            <label className="flex items-center justify-center gap-2 w-full h-32 rounded-xl border-2 border-dashed border-brand-brown/20 text-brand-brown/50 hover:text-brand-orange hover:border-brand-orange/40 cursor-pointer transition-colors overflow-hidden">
              {uploadFile ? (
                <span className="text-xs font-medium px-3 text-center truncate">{uploadFile.name}</span>
              ) : (
                <span className="flex flex-col items-center gap-1.5 text-xs font-medium">
                  <ImagePlus size={22} />
                  Choose an image
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setPendingRawFile(file);
                  e.target.value = "";
                }}
              />
            </label>
          </Field>
          <Field label="Caption" hint="Optional — shown under the image">
            <input
              className={inputClass}
              value={uploadCaption}
              onChange={(e) => setUploadCaption(e.target.value)}
              placeholder="e.g. Our cashew orchard in Panruti"
            />
          </Field>
          <div className="flex items-center gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading} className="flex-1">
              {uploading ? "Uploading…" : "Add image"}
            </Button>
          </div>
        </form>
      </Modal>

      <ImageCropModal
        open={!!pendingRawFile}
        file={pendingRawFile}
        aspect={IMAGE_ASPECT}
        outputWidth={IMAGE_OUTPUT_SIZE}
        outputHeight={IMAGE_OUTPUT_SIZE}
        title="Crop image"
        onCancel={() => setPendingRawFile(null)}
        onCropped={(cropped) => {
          setUploadFile(cropped);
          setPendingRawFile(null);
        }}
      />

      {/* ── Edit image ──────────────────────────────────────────────────── */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit image">
        {editing && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <Field label="Category">
              <select
                className={inputClass}
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as AboutImageCategory)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Caption" hint="Optional — shown under the image">
              <input className={inputClass} value={editCaption} onChange={(e) => setEditCaption(e.target.value)} />
            </Field>
            <div className="flex items-center gap-2 pt-1">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingEdit} className="flex-1">
                {savingEdit ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
