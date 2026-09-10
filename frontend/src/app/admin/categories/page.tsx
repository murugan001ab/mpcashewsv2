"use client";
// src/app/admin/categories/page.tsx
import { useEffect, useState } from "react";
import Image from "next/image";
import { Plus, Pencil, Trash2, Tag, EyeOff, ImagePlus, Loader2 } from "lucide-react";
import * as adminService from "@/services/adminService";
import * as productService from "@/services/productService";
import type { Category } from "@/types";
import { getErrorMessage } from "@/utils/apiError";
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

  const handlePickAddImage = async (file: File) => {
    setUploadingAdd(true);
    setError("");
    try {
      const { url } = await adminService.uploadImage(file, "categories");
      setImageUrl(url);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to upload image."));
    } finally {
      setUploadingAdd(false);
    }
  };

  const handlePickEditImage = async (file: File) => {
    setUploadingEdit(true);
    setModalError("");
    try {
      const { url } = await adminService.uploadImage(file, "categories");
      setEditImageUrl(url);
    } catch (err) {
      setModalError(getErrorMessage(err, "Failed to upload image."));
    } finally {
      setUploadingEdit(false);
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

        {/* List */}
        <div className="bg-white rounded-2xl border border-brand-brown/10 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-brand-brown/10">
            <Tag size={15} className="text-brand-brown/50" />
            <h3 className="font-bold text-brand-black text-sm">All categories</h3>
            <span className="text-xs text-brand-brown/40 font-semibold">({categories.length})</span>
          </div>

          {loading ? (
            <LoadingBlock />
          ) : categories.length === 0 ? (
            <EmptyState icon={Tag} title="No categories yet" description="Add your first one using the form on the left." />
          ) : (
            <ul className="divide-y divide-brand-brown/8">
              {categories.map((c) => (
                <li key={c.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-11 h-11 rounded-xl bg-brand-brown/5 overflow-hidden shrink-0 relative">
                    {c.image_url ? (
                      <Image src={c.image_url} alt={c.name} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-brand-brown/30">
                        <Tag size={16} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-brand-black truncate">{c.name}</p>
                    <p className="text-xs text-brand-brown/40">/{c.slug}</p>
                  </div>
                  {!c.is_active && (
                    <Badge tone="neutral">
                      <EyeOff size={11} /> Hidden
                    </Badge>
                  )}
                  <button
                    onClick={() => toggleActive(c)}
                    className="text-xs font-semibold text-brand-brown/50 hover:text-brand-black transition-colors shrink-0"
                  >
                    {c.is_active ? "Hide" : "Show"}
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <IconButton onClick={() => openEdit(c)} title="Edit">
                      <Pencil size={14} />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(c)} title="Delete" className="hover:text-red-600 hover:bg-red-50">
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>
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
    </div>
  );
}

