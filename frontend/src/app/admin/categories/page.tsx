"use client";
// src/app/admin/categories/page.tsx
import { useEffect, useState } from "react";
import Image from "next/image";
import { Plus, Pencil, Trash2, Tag, EyeOff, ImagePlus, Loader2, GripVertical } from "lucide-react";
import * as adminService from "@/services/adminService";
import * as productService from "@/services/productService";
import type { Category } from "@/types";
import { getErrorMessage } from "@/utils/apiError";
import ImageCropModal from "@/components/admin/ImageCropModal";
import {
  PageHeader,
  Button,
  Field,
  inputClass,
  Modal,
  ErrorNotice,
  LoadingBlock,
  EmptyState,
  Badge,
} from "@/components/admin/ui";

// Category tiles render as small squares everywhere (the picker preview
// here, the storefront category grid, the admin list thumbnail) — 1:1 is
// what actually gets shown, and 600px is plenty for how small these render.
const CATEGORY_ASPECT = 1;
const CATEGORY_OUTPUT_SIZE = 600;

// Shared file-picker tile: shows the current image (or a placeholder), and
// swaps to a spinner while the file is uploading to ImageKit.
function ImagePickerTile({
  imageUrl,
  uploading,
  onPick,
}: {
  imageUrl: string;
  uploading: boolean;
  onPick: (file: File) => void;
}) {
  return (
    <label className="relative block w-20 h-20 rounded-xl border-2 border-dashed border-brand-brown/20 overflow-hidden cursor-pointer hover:border-brand-orange/40 transition-colors shrink-0">
      {imageUrl ? (
        <Image src={imageUrl} alt="" fill className="object-cover" unoptimized />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-brand-brown/40">
          <ImagePlus size={18} />
        </div>
      )}
      {uploading && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
          <Loader2 size={18} className="animate-spin" />
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingAdd, setUploadingAdd] = useState(false);
  const [adding, setAdding] = useState(false);

  const [editing, setEditing] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [uploadingEdit, setUploadingEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // Drag-to-reorder state for the category grid below.
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  // Shared crop step for both the add-form and edit-modal pickers —
  // `cropTarget` records which one triggered it so onCropped uploads to the
  // right place.
  const [pendingRawFile, setPendingRawFile] = useState<File | null>(null);
  const [cropTarget, setCropTarget] = useState<"add" | "edit" | null>(null);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAdminCategories();
      setCategories(data);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load categories."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handlePickAddImage = (file: File) => {
    setCropTarget("add");
    setPendingRawFile(file);
  };

  const handlePickEditImage = (file: File) => {
    setCropTarget("edit");
    setPendingRawFile(file);
  };

  const uploadCroppedCategoryImage = async (cropped: File) => {
    const target = cropTarget;
    setPendingRawFile(null);
    setCropTarget(null);
    if (target === "add") {
      setUploadingAdd(true);
      setError("");
      try {
        const { url } = await adminService.uploadImage(cropped, "categories");
        setImageUrl(url);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to upload image."));
      } finally {
        setUploadingAdd(false);
      }
    } else if (target === "edit") {
      setUploadingEdit(true);
      setModalError("");
      try {
        const { url } = await adminService.uploadImage(cropped, "categories");
        setEditImageUrl(url);
      } catch (err) {
        setModalError(getErrorMessage(err, "Failed to upload image."));
      } finally {
        setUploadingEdit(false);
      }
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    setError("");
    try {
      await productService.createCategory({
        name: name.trim(),
        ...(imageUrl.trim() ? { image_url: imageUrl.trim() } : {}),
      });
      setName("");
      setImageUrl("");
      fetchCategories();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to add category."));
    } finally {
      setAdding(false);
    }
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setEditName(c.name);
    setEditImageUrl(c.image_url ?? "");
    setModalError("");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !editName.trim()) return;
    setSaving(true);
    setModalError("");
    try {
      await productService.updateCategory(editing.id, {
        name: editName.trim(),
        image_url: editImageUrl.trim() || undefined,
      });
      setEditing(null);
      fetchCategories();
    } catch (err) {
      setModalError(getErrorMessage(err, "Failed to update category."));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: Category) => {
    try {
      await productService.updateCategory(c.id, { is_active: !c.is_active });
      fetchCategories();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update category."));
    }
  };

  const handleDelete = async (c: Category) => {
    if (!window.confirm(`Delete "${c.name}"? This can't be undone.`)) return;
    try {
      await productService.deleteCategory(c.id);
      fetchCategories();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete category."));
    }
  };

  // Drag-to-reorder: dropping a tile moves it to that position in the grid,
  // and that becomes the display order shown on the storefront.
  const handleDrop = async (targetId: string) => {
    setDragOverId(null);
    const sourceId = draggedId;
    setDraggedId(null);
    if (!sourceId || sourceId === targetId) return;

    const reordered = [...categories];
    const fromIdx = reordered.findIndex((c) => c.id === sourceId);
    const toIdx = reordered.findIndex((c) => c.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    const prevCategories = categories;
    setCategories(reordered); // optimistic
    setReordering(true);
    try {
      const updated = await productService.reorderCategories(reordered.map((c) => c.id));
      setCategories(updated);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save the new order."));
      setCategories(prevCategories); // roll back
    } finally {
      setReordering(false);
    }
  };

  return (
    <div>
      <PageHeader title="Categories" subtitle="Organize products into browsable groups" />

      {error && <ErrorNotice>{error}</ErrorNotice>}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
        {/* Add form */}
        <div className="bg-white rounded-2xl border border-brand-brown/10 p-5 h-fit">
          <h3 className="flex items-center gap-2 font-bold text-brand-black text-sm mb-4">
            <Plus size={16} className="text-brand-orange" /> Add category
          </h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <Field label="Name">
              <input
                className={inputClass}
                placeholder="e.g. Roasted Cashews"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>
            <Field label="Image" hint="Optional — shown on the storefront category tile">
              <div className="flex items-center gap-3">
                <ImagePickerTile imageUrl={imageUrl} uploading={uploadingAdd} onPick={handlePickAddImage} />
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="text-xs font-semibold text-brand-brown/50 hover:text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
            </Field>
            <Button type="submit" disabled={adding || uploadingAdd} className="w-full">
              {adding ? "Adding…" : "Add category"}
            </Button>
          </form>
        </div>

        {/* Grid */}
        <div className="bg-white rounded-2xl border border-brand-brown/10 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-brand-brown/10">
            <div className="flex items-center gap-2">
              <Tag size={15} className="text-brand-brown/50" />
              <h3 className="font-bold text-brand-black text-sm">All categories</h3>
              <span className="text-xs text-brand-brown/40 font-semibold">({categories.length})</span>
            </div>
            {reordering && (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-brand-brown/45">
                <Loader2 size={11} className="animate-spin" /> Saving order…
              </span>
            )}
          </div>

          {loading ? (
            <LoadingBlock />
          ) : categories.length === 0 ? (
            <EmptyState icon={Tag} title="No categories yet" description="Add your first one using the form on the left." />
          ) : (
            <div className="p-5">
              <p className="text-[11px] text-brand-brown/40 mb-3">
                Drag a card to reorder — this is the order shown on the storefront.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {categories.map((c, idx) => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={() => setDraggedId(c.id)}
                    onDragEnter={() => setDragOverId(c.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnd={() => {
                      setDraggedId(null);
                      setDragOverId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDrop(c.id);
                    }}
                    className={`group relative rounded-2xl border overflow-hidden cursor-grab active:cursor-grabbing transition-all ${
                      c.is_active ? "border-brand-brown/10" : "border-brand-brown/10 opacity-60"
                    } ${draggedId === c.id ? "opacity-40" : ""} ${
                      dragOverId === c.id && draggedId && draggedId !== c.id
                        ? "ring-2 ring-brand-orange ring-offset-2"
                        : ""
                    }`}
                  >
                    <div className="relative w-full aspect-square bg-brand-brown/5">
                      {c.image_url ? (
                        <Image src={c.image_url} alt={c.name} fill className="object-cover pointer-events-none" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-brand-brown/30">
                          <Tag size={22} />
                        </div>
                      )}

                      <span className="absolute top-2 left-2 bg-black/55 text-white text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center">
                        {idx + 1}
                      </span>

                      <span className="absolute bottom-2 left-2 bg-black/45 text-white rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <GripVertical size={14} />
                      </span>

                      {!c.is_active && (
                        <span className="absolute top-2 right-2">
                          <Badge tone="neutral">
                            <EyeOff size={11} /> Hidden
                          </Badge>
                        </span>
                      )}

                      {/* Edit / delete overlay — visible on hover, like the storefront tile the admin is used to seeing */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          title="Edit"
                          className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-brand-black flex items-center justify-center transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          title="Delete"
                          className="w-8 h-8 rounded-full bg-white/90 hover:bg-red-600 hover:text-white text-red-600 flex items-center justify-center transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="px-3 py-2.5">
                      <p className="text-sm font-semibold text-brand-black truncate">{c.name}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-[11px] text-brand-brown/40 truncate">/{c.slug}</p>
                        <button
                          onClick={() => toggleActive(c)}
                          className="text-[11px] font-semibold text-brand-brown/50 hover:text-brand-black transition-colors shrink-0"
                        >
                          {c.is_active ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit category">
        {modalError && <ErrorNotice>{modalError}</ErrorNotice>}
        <form onSubmit={handleEdit} className="space-y-4">
          <Field label="Name">
            <input className={inputClass} value={editName} onChange={(e) => setEditName(e.target.value)} required />
          </Field>
          <Field label="Image">
            <div className="flex items-center gap-3">
              <ImagePickerTile imageUrl={editImageUrl} uploading={uploadingEdit} onPick={handlePickEditImage} />
              {editImageUrl && (
                <button
                  type="button"
                  onClick={() => setEditImageUrl("")}
                  className="text-xs font-semibold text-brand-brown/50 hover:text-red-600"
                >
                  Remove
                </button>
              )}
            </div>
          </Field>
          <div className="flex items-center gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || uploadingEdit} className="flex-1">
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Modal>

      <ImageCropModal
        open={!!pendingRawFile}
        file={pendingRawFile}
        aspect={CATEGORY_ASPECT}
        outputWidth={CATEGORY_OUTPUT_SIZE}
        outputHeight={CATEGORY_OUTPUT_SIZE}
        title="Crop category image"
        onCancel={() => {
          setPendingRawFile(null);
          setCropTarget(null);
        }}
        onCropped={uploadCroppedCategoryImage}
      />
    </div>
  );
}

