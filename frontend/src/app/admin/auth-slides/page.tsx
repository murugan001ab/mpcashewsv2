"use client";
// src/app/admin/auth-slides/page.tsx
// Manages the image + quote slides shown on the /login and /register pages'
// left-hand panel (src/components/AuthLayout.tsx). Drag-to-reorder is the
// same optimistic pattern as product image reordering in
// src/app/admin/products/page.tsx (Saving order… indicator, rollback on
// failure) — kept consistent on purpose.
import { useEffect, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, GripVertical, Star, Trash2, Pencil, Eye, EyeOff, Images } from "lucide-react";
import * as authSlideService from "@/services/authSlideService";
import { assetUrl } from "@/config/env";
import { getErrorMessage } from "@/utils/apiError";
import type { AuthSlideAdmin } from "@/types";
import ImageCropModal from "@/components/admin/ImageCropModal";
import {
  PageHeader, Button, IconButton, Field, inputClass, Modal,
  ErrorNotice, LoadingBlock, EmptyState, Badge,
} from "@/components/admin/ui";

// Left panel on /login and /register is a full-height portrait background
// (see src/components/AuthLayout.tsx) — 4:5 matches that shape at a size
// large enough to stay sharp on big screens without the admin's original
// photo (often much larger) getting uploaded as-is.
const SLIDE_ASPECT = 4 / 5;
const SLIDE_OUTPUT_WIDTH = 1200;
const SLIDE_OUTPUT_HEIGHT = 1500;

export default function AuthSlidesPage() {
  const [slides, setSlides] = useState<AuthSlideAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [pendingRawFile, setPendingRawFile] = useState<File | null>(null);
  const [uploadQuote, setUploadQuote] = useState("");
  const [uploadCite, setUploadCite] = useState("");
  const [uploading, setUploading] = useState(false);
  const [modalError, setModalError] = useState("");

  const [editing, setEditing] = useState<AuthSlideAdmin | null>(null);
  const [editQuote, setEditQuote] = useState("");
  const [editCite, setEditCite] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setSlides(await authSlideService.getAdminAuthSlides());
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load auth slides."));
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
    setUploadQuote("");
    setUploadCite("");
    setModalError("");
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadQuote.trim()) {
      setModalError("An image and a quote are both required.");
      return;
    }
    setUploading(true);
    setModalError("");
    try {
      await authSlideService.createAuthSlide(uploadFile, uploadQuote.trim(), uploadCite.trim() || undefined);
      setUploadOpen(false);
      resetUploadForm();
      await load();
    } catch (err) {
      setModalError(getErrorMessage(err, "Failed to upload slide."));
    } finally {
      setUploading(false);
    }
  };

  const openEdit = (slide: AuthSlideAdmin) => {
    setEditing(slide);
    setEditQuote(slide.quote);
    setEditCite(slide.cite ?? "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSavingEdit(true);
    try {
      await authSlideService.updateAuthSlide(editing.id, {
        quote: editQuote.trim(),
        cite: editCite.trim() || null,
      });
      setEditing(null);
      await load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save slide."));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleActive = async (slide: AuthSlideAdmin) => {
    setTogglingId(slide.id);
    const prev = slides;
    setSlides((s) => s.map((x) => (x.id === slide.id ? { ...x, is_active: !x.is_active } : x)));
    try {
      await authSlideService.updateAuthSlide(slide.id, { is_active: !slide.is_active });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update slide."));
      setSlides(prev); // roll back
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (slide: AuthSlideAdmin) => {
    if (deletingId) return;
    if (!window.confirm("Delete this slide? This can't be undone.")) return;
    setDeletingId(slide.id);
    const prev = slides;
    setSlides((s) => s.filter((x) => x.id !== slide.id)); // optimistic
    try {
      await authSlideService.deleteAuthSlide(slide.id);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete slide."));
      setSlides(prev); // roll back
    } finally {
      setDeletingId(null);
    }
  };

  // Drag-to-reorder: index 0 after a drop becomes the "Default" slide.
  const handleDrop = async (targetId: string) => {
    setDragOverId(null);
    const sourceId = draggedId;
    setDraggedId(null);
    if (!sourceId || sourceId === targetId) return;

    const reordered = [...slides];
    const fromIdx = reordered.findIndex((s) => s.id === sourceId);
    const toIdx = reordered.findIndex((s) => s.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    const prev = slides;
    setSlides(reordered); // optimistic
    setReordering(true);
    try {
      const updated = await authSlideService.reorderAuthSlides(reordered.map((s) => s.id));
      setSlides(updated);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save the new order."));
      setSlides(prev); // roll back
    } finally {
      setReordering(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Auth page slides"
        subtitle="Manage the image + quote carousel shown on the login and register pages"
        action={
          <Button onClick={() => setUploadOpen(true)}>
            <ImagePlus size={16} /> Add slide
          </Button>
        }
      />

      {error && <ErrorNotice>{error}</ErrorNotice>}

      <div className="bg-white rounded-2xl border border-brand-brown/10 p-5">
        {loading ? (
          <LoadingBlock />
        ) : slides.length === 0 ? (
          <EmptyState
            icon={Images}
            title="No slides yet"
            description="Add a few images with quotes to populate the login/register carousel."
            action={
              <Button onClick={() => setUploadOpen(true)}>
                <ImagePlus size={16} /> Add slide
              </Button>
            }
          />
        ) : (
          <>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] text-brand-brown/40">
                Drag to reorder. The first slide is shown first, and only active slides appear on the site.
              </p>
              {reordering && (
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-brand-brown/45 shrink-0">
                  <Loader2 size={11} className="animate-spin" /> Saving order…
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 mt-3">
              {slides.map((slide, idx) => (
                <div
                  key={slide.id}
                  draggable
                  onDragStart={() => setDraggedId(slide.id)}
                  onDragEnter={() => setDragOverId(slide.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnd={() => {
                    setDraggedId(null);
                    setDragOverId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(slide.id);
                  }}
                  className={`relative w-40 sm:w-44 rounded-2xl overflow-hidden border-2 group cursor-grab active:cursor-grabbing transition-all ${
                    idx === 0 ? "border-brand-orange" : "border-brand-brown/10"
                  } ${draggedId === slide.id ? "opacity-40" : ""} ${
                    dragOverId === slide.id && draggedId && draggedId !== slide.id
                      ? "ring-2 ring-brand-orange ring-offset-2"
                      : ""
                  } ${!slide.is_active ? "grayscale" : ""}`}
                >
                  <div className="relative w-full h-44 sm:h-48">
                    <Image
                      src={assetUrl(slide.url) ?? ""}
                      alt=""
                      fill
                      className="object-cover pointer-events-none"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />

                    {idx === 0 ? (
                      <span className="absolute top-2 left-2 bg-brand-orange text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                        <Star size={10} className="fill-white" /> Default
                      </span>
                    ) : (
                      <span className="absolute top-2 left-2 bg-black/55 text-white text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center">
                        {idx + 1}
                      </span>
                    )}

                    {!slide.is_active && (
                      <span className="absolute top-2 right-2">
                        <Badge tone="neutral">Hidden</Badge>
                      </span>
                    )}

                    <span className="absolute bottom-2 left-2 bg-black/45 text-white rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <GripVertical size={14} />
                    </span>

                    <p className="absolute bottom-2 right-2 left-8 text-white text-[11px] leading-snug line-clamp-2 text-right drop-shadow">
                      &ldquo;{slide.quote}&rdquo;
                    </p>
                  </div>

                  <div className="flex items-center justify-between px-2 py-1.5 bg-white">
                    <div className="flex items-center gap-0.5">
                      <IconButton
                        onClick={() => handleToggleActive(slide)}
                        disabled={togglingId === slide.id}
                        title={slide.is_active ? "Hide from site" : "Show on site"}
                      >
                        {togglingId === slide.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : slide.is_active ? (
                          <Eye size={13} />
                        ) : (
                          <EyeOff size={13} />
                        )}
                      </IconButton>
                      <IconButton onClick={() => openEdit(slide)} title="Edit quote">
                        <Pencil size={13} />
                      </IconButton>
                    </div>
                    <IconButton
                      onClick={() => handleDelete(slide)}
                      disabled={deletingId === slide.id}
                      title="Delete"
                      className="hover:text-red-600 hover:bg-red-50"
                    >
                      {deletingId === slide.id ? (
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

      {/* ── Add slide ───────────────────────────────────────────────────── */}
      <Modal
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
          resetUploadForm();
        }}
        title="Add a slide"
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
                  setPendingRawFile(file); // opens the crop modal below, not the raw upload
                  e.target.value = "";
                }}
              />
            </label>
          </Field>
          <Field label="Quote" hint="Shown over the image on the login/register panel">
            <textarea
              className={inputClass}
              rows={2}
              value={uploadQuote}
              onChange={(e) => setUploadQuote(e.target.value)}
              placeholder="e.g. Nature's finest nuts, delivered with love."
              required
            />
          </Field>
          <Field label="Attribution" hint="Optional — shown under the quote">
            <input
              className={inputClass}
              value={uploadCite}
              onChange={(e) => setUploadCite(e.target.value)}
              placeholder="e.g. MP Cashews"
            />
          </Field>
          <div className="flex items-center gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading} className="flex-1">
              {uploading ? "Uploading…" : "Add slide"}
            </Button>
          </div>
        </form>
      </Modal>

      <ImageCropModal
        open={!!pendingRawFile}
        file={pendingRawFile}
        aspect={SLIDE_ASPECT}
        outputWidth={SLIDE_OUTPUT_WIDTH}
        outputHeight={SLIDE_OUTPUT_HEIGHT}
        title="Crop slide image"
        onCancel={() => setPendingRawFile(null)}
        onCropped={(cropped) => {
          setUploadFile(cropped);
          setPendingRawFile(null);
        }}
      />

      {/* ── Edit slide ──────────────────────────────────────────────────── */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit slide">
        {editing && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <Field label="Quote">
              <textarea
                className={inputClass}
                rows={2}
                value={editQuote}
                onChange={(e) => setEditQuote(e.target.value)}
                required
              />
            </Field>
            <Field label="Attribution" hint="Optional — shown under the quote">
              <input className={inputClass} value={editCite} onChange={(e) => setEditCite(e.target.value)} />
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
