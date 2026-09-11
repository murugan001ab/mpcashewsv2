"use client";
// src/app/admin/products/page.tsx
import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Plus, Pencil, Trash2, X, PackageOpen, Star, ImagePlus, Loader2, GripVertical,
  LayoutGrid, List as ListIcon, Eye, EyeOff,
} from "lucide-react";
import * as adminService from "@/services/adminService";
import * as productService from "@/services/productService";
import { assetUrl } from "@/config/env";
import { getErrorMessage } from "@/utils/apiError";
import type { Product, Category, Variant, ProductVariantPayload } from "@/types";
import ImageCropModal from "@/components/admin/ImageCropModal";
import {
  PageHeader, Button, IconButton, Field, inputClass, Modal,
  ErrorNotice, LoadingBlock, EmptyState, Badge,
} from "@/components/admin/ui";

const inr = (v: string | number) => `₹${Number(v).toLocaleString("en-IN")}`;

// Product images render as square thumbnails everywhere (admin table row,
// this edit modal's gallery, product cards, the gallery on the product
// detail page) — 1:1 is what's actually shown.
const PRODUCT_IMAGE_ASPECT = 1;
const PRODUCT_IMAGE_OUTPUT_SIZE = 1000;

const EMPTY_VARIANT: ProductVariantPayload = { sku: "", weight_grams: 250, price: 0, stock: 0 };

const EMPTY_ADD_FORM = {
  name: "",
  short_description: "",
  description: "",
  category_id: "",
  is_featured: false,
  variants: [{ ...EMPTY_VARIANT }] as ProductVariantPayload[],
};

function priceRange(variants: Variant[]): string {
  if (!variants.length) return "—";
  const prices = variants.map((v) => Number(v.discounted_price ?? v.price));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? inr(min) : `${inr(min)} – ${inr(max)}`;
}

function totalStock(variants: Variant[]): number {
  return variants.reduce((sum, v) => sum + v.stock, 0);
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const [editing, setEditing] = useState<Product | null>(null);

  const [view, setView] = useState<"list" | "grid">("list");

  // Drag-to-reorder state — shared by both the table and grid views below.
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([adminService.getAdminProducts(1, 100), adminService.getAdminCategories()]);
      setProducts(p);
      setCategories(c);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load products."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetAddForm = () => {
    setAddForm(EMPTY_ADD_FORM);
    setModalError("");
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.category_id) {
      setModalError("Name and category are required.");
      return;
    }
    setSaving(true);
    setModalError("");
    try {
      const created = await productService.createProduct({
        name: addForm.name.trim(),
        short_description: addForm.short_description.trim() || undefined,
        description: addForm.description.trim() || undefined,
        category_id: addForm.category_id,
        is_featured: addForm.is_featured,
        variants: addForm.variants.filter((v) => v.sku.trim()),
      });
      setAddOpen(false);
      resetAddForm();
      await load();
      // Jump straight into the edit view so the admin can add images right
      // away — uploads need a product_id, which only exists after this point.
      setEditing(created);
    } catch (err) {
      setModalError(getErrorMessage(err, "Failed to create product."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Product) => {
    if (!window.confirm(`Delete "${p.name}"? This removes all its variants too.`)) return;
    try {
      await productService.deleteProduct(p.id);
      load();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete product."));
    }
  };

  const toggleActive = async (p: Product) => {
    const prevProducts = products;
    setProducts((list) => list.map((row) => (row.id === p.id ? { ...row, is_active: !row.is_active } : row)));
    try {
      await productService.updateProduct(p.id, { is_active: !p.is_active });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update product."));
      setProducts(prevProducts); // roll back
    }
  };

  // Drag-to-reorder: dropping a row/card moves it to that position, and
  // that becomes the display order shown on the storefront.
  const handleDrop = async (targetId: string) => {
    setDragOverId(null);
    const sourceId = draggedId;
    setDraggedId(null);
    if (!sourceId || sourceId === targetId) return;

    const reordered = [...products];
    const fromIdx = reordered.findIndex((p) => p.id === sourceId);
    const toIdx = reordered.findIndex((p) => p.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    const prevProducts = products;
    setProducts(reordered); // optimistic
    setReordering(true);
    try {
      const updated = await productService.reorderProducts(reordered.map((p) => p.id));
      setProducts(updated);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save the new order."));
      setProducts(prevProducts); // roll back
    } finally {
      setReordering(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Manage listings, variants and stock"
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-brand-brown/15 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setView("list")}
                title="List view"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  view === "list" ? "bg-brand-orange text-white" : "text-brand-brown/50 hover:text-brand-black"
                }`}
              >
                <ListIcon size={15} />
              </button>
              <button
                type="button"
                onClick={() => setView("grid")}
                title="Grid view"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  view === "grid" ? "bg-brand-orange text-white" : "text-brand-brown/50 hover:text-brand-black"
                }`}
              >
                <LayoutGrid size={15} />
              </button>
            </div>
            <Button onClick={() => setAddOpen(true)}>
              <Plus size={16} /> Add product
            </Button>
          </div>
        }
      />

      {error && <ErrorNotice>{error}</ErrorNotice>}

      <div className="bg-white rounded-2xl border border-brand-brown/10 overflow-hidden">
        {loading ? (
          <LoadingBlock />
        ) : products.length === 0 ? (
          <EmptyState
            icon={PackageOpen}
            title="No products yet"
            description="Add your first cashew product to get the store started."
            action={
              <Button onClick={() => setAddOpen(true)}>
                <Plus size={16} /> Add product
              </Button>
            }
          />
        ) : view === "grid" ? (
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] text-brand-brown/40">
                Drag a card to reorder — this is the order shown on the storefront.
              </p>
              {reordering && (
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-brand-brown/45">
                  <Loader2 size={11} className="animate-spin" /> Saving order…
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((p, idx) => {
                const stock = totalStock(p.variants);
                const primaryImage = p.images.find((i) => i.is_primary) ?? p.images[0];
                return (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => setDraggedId(p.id)}
                    onDragEnter={() => setDragOverId(p.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnd={() => {
                      setDraggedId(null);
                      setDragOverId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDrop(p.id);
                    }}
                    className={`group relative rounded-2xl border overflow-hidden cursor-grab active:cursor-grabbing transition-all ${
                      p.is_active ? "border-brand-brown/10" : "border-brand-brown/10 opacity-60"
                    } ${draggedId === p.id ? "opacity-40" : ""} ${
                      dragOverId === p.id && draggedId && draggedId !== p.id
                        ? "ring-2 ring-brand-orange ring-offset-2"
                        : ""
                    }`}
                  >
                    <div className="relative w-full aspect-square bg-brand-brown/5">
                      {primaryImage ? (
                        <Image src={assetUrl(primaryImage.url) ?? ""} alt={p.name} fill className="object-cover pointer-events-none" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-brand-brown/30">
                          <PackageOpen size={22} />
                        </div>
                      )}

                      <span className="absolute top-2 left-2 bg-black/55 text-white text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center">
                        {idx + 1}
                      </span>

                      <span className="absolute bottom-2 left-2 bg-black/45 text-white rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <GripVertical size={14} />
                      </span>

                      <span className="absolute top-2 right-2 flex flex-col items-end gap-1">
                        {p.is_featured && (
                          <span className="w-6 h-6 rounded-full bg-brand-orange text-white flex items-center justify-center">
                            <Star size={11} className="fill-white" />
                          </span>
                        )}
                        {!p.is_active && (
                          <Badge tone="neutral">
                            <EyeOff size={11} /> Hidden
                          </Badge>
                        )}
                      </span>

                      {/* Edit / hide / delete overlay — visible on hover, like the
                          storefront card the admin already recognizes */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => setEditing(p)}
                          title="Edit"
                          className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-brand-black flex items-center justify-center transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(p)}
                          title={p.is_active ? "Hide from store" : "Show on store"}
                          className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-brand-black flex items-center justify-center transition-colors"
                        >
                          {p.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p)}
                          title="Delete"
                          className="w-8 h-8 rounded-full bg-white/90 hover:bg-red-600 hover:text-white text-red-600 flex items-center justify-center transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="px-3 py-2.5">
                      <p className="text-sm font-semibold text-brand-black truncate">{p.name}</p>
                      <p className="text-[11px] text-brand-brown/40 truncate">{p.category?.name ?? "—"}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm font-semibold text-brand-black tabular-nums">{priceRange(p.variants)}</span>
                        <Badge tone={stock > 10 ? "green" : stock > 0 ? "amber" : "red"}>{stock}</Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {reordering && (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-brand-brown/45 px-5 pt-3">
                <Loader2 size={11} className="animate-spin" /> Saving order…
              </div>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-brand-brown/45 uppercase tracking-wide border-b border-brand-brown/10">
                  <th className="w-8" />
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-3 py-3 font-semibold">Category</th>
                  <th className="px-3 py-3 font-semibold">Price</th>
                  <th className="px-3 py-3 font-semibold">Stock</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-brown/8">
                {products.map((p) => {
                  const stock = totalStock(p.variants);
                  const primaryImage = p.images.find((i) => i.is_primary) ?? p.images[0];
                  return (
                    <tr
                      key={p.id}
                      draggable
                      onDragStart={() => setDraggedId(p.id)}
                      onDragEnter={() => setDragOverId(p.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDragEnd={() => {
                        setDraggedId(null);
                        setDragOverId(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDrop(p.id);
                      }}
                      className={`hover:bg-brand-brown/[0.03] transition-colors cursor-grab active:cursor-grabbing ${
                        draggedId === p.id ? "opacity-40" : ""
                      } ${
                        dragOverId === p.id && draggedId && draggedId !== p.id
                          ? "ring-2 ring-inset ring-brand-orange"
                          : ""
                      }`}
                    >
                      <td className="pl-3 text-brand-brown/30">
                        <GripVertical size={14} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-brand-brown/5 overflow-hidden shrink-0 relative">
                            {primaryImage ? (
                              <Image src={assetUrl(primaryImage.url) ?? ""} alt={p.name} fill className="object-cover" unoptimized />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-brand-brown/30">
                                <PackageOpen size={16} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-brand-black truncate max-w-[220px] flex items-center gap-1.5">
                              {p.name}
                              {p.is_featured && <Star size={12} className="text-brand-orange fill-brand-orange shrink-0" />}
                            </p>
                            <p className="text-xs text-brand-brown/40">{p.variants.length} variant{p.variants.length === 1 ? "" : "s"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-brand-brown/70">{p.category?.name ?? "—"}</td>
                      <td className="px-3 py-3 font-semibold text-brand-black tabular-nums">{priceRange(p.variants)}</td>
                      <td className="px-3 py-3">
                        <Badge tone={stock > 10 ? "green" : stock > 0 ? "amber" : "red"}>{stock}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={p.is_active ? "green" : "neutral"}>{p.is_active ? "Active" : "Hidden"}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <IconButton onClick={() => toggleActive(p)} title={p.is_active ? "Hide from store" : "Show on store"}>
                            {p.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                          </IconButton>
                          <IconButton onClick={() => setEditing(p)} title="Edit">
                            <Pencil size={14} />
                          </IconButton>
                          <IconButton onClick={() => handleDelete(p)} title="Delete" className="hover:text-red-600 hover:bg-red-50">
                            <Trash2 size={14} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add product ─────────────────────────────────────────────────── */}
      <Modal
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          resetAddForm();
        }}
        title="Add product"
        width="max-w-2xl"
      >
        {modalError && <ErrorNotice>{modalError}</ErrorNotice>}
        <form onSubmit={handleAdd} className="space-y-4 max-h-[78vh] overflow-y-auto pr-1">
          <Field label="Product name">
            <input
              className={inputClass}
              value={addForm.name}
              onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Roasted & Salted Cashews"
              required
            />
          </Field>

          <Field label="Category">
            <select
              className={inputClass}
              value={addForm.category_id}
              onChange={(e) => setAddForm((f) => ({ ...f, category_id: e.target.value }))}
              required
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Short description" hint="Shown on product cards">
            <input
              className={inputClass}
              value={addForm.short_description}
              onChange={(e) => setAddForm((f) => ({ ...f, short_description: e.target.value }))}
            />
          </Field>

          <Field label="Description">
            <textarea
              className={inputClass}
              rows={3}
              value={addForm.description}
              onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>

          <label className="flex items-center gap-2 text-sm font-medium text-brand-black">
            <input
              type="checkbox"
              checked={addForm.is_featured}
              onChange={(e) => setAddForm((f) => ({ ...f, is_featured: e.target.checked }))}
              className="rounded border-brand-brown/30 text-brand-orange focus:ring-brand-orange/40"
            />
            Feature this product on the homepage
          </label>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-brand-brown/70">Variants (weight / price / stock)</label>
              <button
                type="button"
                className="text-xs font-semibold text-brand-orange hover:underline"
                onClick={() =>
                  setAddForm((f) => ({ ...f, variants: [...f.variants, { ...EMPTY_VARIANT }] }))
                }
              >
                + Add variant
              </button>
            </div>
            <div className="space-y-2">
              {addForm.variants.map((v, i) => (
                <div key={i} className="grid grid-cols-[1fr_80px_90px_90px_70px_auto] gap-2 items-center">
                  <input
                    className={inputClass}
                    placeholder="SKU"
                    value={v.sku}
                    onChange={(e) =>
                      setAddForm((f) => ({
                        ...f,
                        variants: f.variants.map((row, idx) => (idx === i ? { ...row, sku: e.target.value } : row)),
                      }))
                    }
                  />
                  <input
                    type="number"
                    className={inputClass}
                    placeholder="Grams"
                    value={v.weight_grams}
                    onChange={(e) =>
                      setAddForm((f) => ({
                        ...f,
                        variants: f.variants.map((row, idx) => (idx === i ? { ...row, weight_grams: Number(e.target.value) } : row)),
                      }))
                    }
                  />
                  <input
                    type="number"
                    className={inputClass}
                    placeholder="Price"
                    value={v.price}
                    onChange={(e) =>
                      setAddForm((f) => ({
                        ...f,
                        variants: f.variants.map((row, idx) => (idx === i ? { ...row, price: Number(e.target.value) } : row)),
                      }))
                    }
                  />
                  <input
                    type="number"
                    className={inputClass}
                    placeholder="Sale ₹"
                    value={v.discounted_price ?? ""}
                    onChange={(e) =>
                      setAddForm((f) => ({
                        ...f,
                        variants: f.variants.map((row, idx) =>
                          idx === i ? { ...row, discounted_price: e.target.value ? Number(e.target.value) : undefined } : row
                        ),
                      }))
                    }
                  />
                  <input
                    type="number"
                    className={inputClass}
                    placeholder="Stock"
                    value={v.stock}
                    onChange={(e) =>
                      setAddForm((f) => ({
                        ...f,
                        variants: f.variants.map((row, idx) => (idx === i ? { ...row, stock: Number(e.target.value) } : row)),
                      }))
                    }
                  />
                  <button
                    type="button"
                    disabled={addForm.variants.length === 1}
                    onClick={() =>
                      setAddForm((f) => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }))
                    }
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-brand-brown/40 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 sticky bottom-0 bg-white">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Creating…" : "Create product"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit product ────────────────────────────────────────────────── */}
      {editing && (
        <EditProductModal
          product={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

// ── Edit modal: core fields + variants + images ──────────────────────────
function EditProductModal({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: Product;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [current, setCurrent] = useState(product);
  const [name, setName] = useState(product.name);
  const [shortDesc, setShortDesc] = useState(product.short_description ?? "");
  const [desc, setDesc] = useState(product.description ?? "");
  const [categoryId, setCategoryId] = useState(product.category.id);
  const [isFeatured, setIsFeatured] = useState(product.is_featured);
  const [isActive, setIsActive] = useState(product.is_active);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [newVariant, setNewVariant] = useState<ProductVariantPayload>({ ...EMPTY_VARIANT });
  const [addingVariant, setAddingVariant] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [dragOverImageId, setDragOverImageId] = useState<string | null>(null);
  const [reorderingImages, setReorderingImages] = useState(false);
  const [pendingRawFile, setPendingRawFile] = useState<File | null>(null);
  const [pendingIsPrimary, setPendingIsPrimary] = useState(false);

  const refresh = async () => {
    const fresh = await productService.getProduct(product.id);
    setCurrent(fresh);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await productService.updateProduct(product.id, {
        name: name.trim(),
        short_description: shortDesc.trim() || undefined,
        description: desc.trim() || undefined,
        category_id: categoryId,
        is_featured: isFeatured,
        is_active: isActive,
      });
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save changes."));
    } finally {
      setSaving(false);
    }
  };

  const handleVariantField = async (variantId: string, patch: Partial<ProductVariantPayload>) => {
    try {
      await productService.updateVariant(variantId, patch);
      refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update variant."));
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!window.confirm("Delete this variant?")) return;
    try {
      await productService.deleteVariant(variantId);
      refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete variant."));
    }
  };

  const handleAddVariant = async () => {
    if (!newVariant.sku.trim()) return;
    setAddingVariant(true);
    try {
      await productService.createVariant(product.id, newVariant);
      setNewVariant({ ...EMPTY_VARIANT });
      refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to add variant."));
    } finally {
      setAddingVariant(false);
    }
  };

  const handleUploadImage = async (file: File, isPrimary: boolean) => {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      await productService.uploadProductImage(product.id, fd, { params: { is_primary: isPrimary } } as never);
      refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to upload image."));
    } finally {
      setUploading(false);
    }
  };

  const handlePickImage = (file: File, isPrimary: boolean) => {
    setPendingIsPrimary(isPrimary);
    setPendingRawFile(file);
  };

  const handleDeleteImage = async (imageId: string) => {
    if (deletingImageId) return;
    if (!window.confirm("Delete this image?")) return;
    setDeletingImageId(imageId);
    // Optimistic: remove the thumbnail immediately instead of waiting on a
    // full product refetch, which is what made this feel unresponsive.
    const prevImages = current.images;
    setCurrent((c) => ({ ...c, images: c.images.filter((i) => i.id !== imageId) }));
    try {
      await productService.deleteProductImage(product.id, imageId);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete image."));
      // Roll back — the delete actually failed.
      setCurrent((c) => ({ ...c, images: prevImages }));
    } finally {
      setDeletingImageId(null);
    }
  };

  // Drag-to-reorder: index 0 after a drop becomes the default/primary image.
  const handleImageDrop = async (targetId: string) => {
    setDragOverImageId(null);
    const sourceId = draggedImageId;
    setDraggedImageId(null);
    if (!sourceId || sourceId === targetId) return;

    const images = [...current.images];
    const fromIdx = images.findIndex((i) => i.id === sourceId);
    const toIdx = images.findIndex((i) => i.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = images.splice(fromIdx, 1);
    images.splice(toIdx, 0, moved);

    const prevImages = current.images;
    setCurrent((c) => ({ ...c, images })); // optimistic reorder
    setReorderingImages(true);
    try {
      const updated = await productService.reorderProductImages(product.id, images.map((i) => i.id));
      setCurrent((c) => ({ ...c, images: updated }));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save the new image order."));
      setCurrent((c) => ({ ...c, images: prevImages })); // roll back
    } finally {
      setReorderingImages(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Edit — ${product.name}`} width="max-w-4xl">
      {error && <ErrorNotice>{error}</ErrorNotice>}

      <div className="max-h-[85vh] overflow-y-auto pr-1 space-y-6">
        {/* Core fields */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Product name">
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Category">
              <select className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Short description">
            <input className={inputClass} value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} />
          </Field>
          <Field label="Description">
            <textarea className={inputClass} rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </Field>
          <div className="flex items-center gap-5">
            <label className="flex items-center gap-2 text-sm font-medium text-brand-black">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="rounded border-brand-brown/30 text-brand-orange" />
              Featured
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-brand-black">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-brand-brown/30 text-brand-orange" />
              Visible on store
            </label>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>

        {/* Variants */}
        <div className="border-t border-brand-brown/10 pt-5">
          <h4 className="text-xs font-semibold text-brand-brown/70 mb-3">Variants</h4>
          <div className="grid grid-cols-[1fr_70px_80px_80px_60px_auto] gap-2 items-center px-0.5 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-brand-brown/40">SKU · Weight</span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-brand-brown/40">Price</span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-brand-brown/40">Sale Price</span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-brand-brown/40">Stock</span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-brand-brown/40">Status</span>
            <span />
          </div>
          <div className="space-y-2">
            {current.variants.map((v) => (
              <div key={v.id} className="grid grid-cols-[1fr_70px_80px_80px_60px_auto] gap-2 items-center text-sm">
                <span className="font-medium text-brand-black truncate">{v.sku} · {v.weight_grams}g</span>
                <input
                  type="number"
                  defaultValue={v.price}
                  placeholder="Price"
                  onBlur={(e) => Number(e.target.value) !== Number(v.price) && handleVariantField(v.id, { price: Number(e.target.value) })}
                  className={inputClass + " py-1.5"}
                />
                <input
                  type="number"
                  defaultValue={v.discounted_price ?? ""}
                  placeholder="None"
                  onBlur={(e) => handleVariantField(v.id, { discounted_price: e.target.value ? Number(e.target.value) : undefined })}
                  className={inputClass + " py-1.5"}
                />
                <input
                  type="number"
                  defaultValue={v.stock}
                  placeholder="Stock"
                  onBlur={(e) => Number(e.target.value) !== v.stock && handleVariantField(v.id, { stock: Number(e.target.value) })}
                  className={inputClass + " py-1.5"}
                />
                <Badge tone={v.is_active ? "green" : "neutral"}>{v.is_active ? "On" : "Off"}</Badge>
                <IconButton onClick={() => handleDeleteVariant(v.id)} className="hover:text-red-600 hover:bg-red-50">
                  <Trash2 size={13} />
                </IconButton>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-brand-brown/40 mt-2 mb-3">Click out of a price/stock field to save it.</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-brand-brown/40 mb-1.5">Add a new variant</p>
          <div className="grid grid-cols-[1fr_90px_90px_90px_auto] gap-2 items-center">
            <input className={inputClass} placeholder="New SKU" value={newVariant.sku} onChange={(e) => setNewVariant((v) => ({ ...v, sku: e.target.value }))} />
            <input type="number" className={inputClass} placeholder="Grams" value={newVariant.weight_grams} onChange={(e) => setNewVariant((v) => ({ ...v, weight_grams: Number(e.target.value) }))} />
            <input type="number" className={inputClass} placeholder="Price" value={newVariant.price} onChange={(e) => setNewVariant((v) => ({ ...v, price: Number(e.target.value) }))} />
            <input type="number" className={inputClass} placeholder="Stock" value={newVariant.stock} onChange={(e) => setNewVariant((v) => ({ ...v, stock: Number(e.target.value) }))} />
            <Button type="button" variant="secondary" onClick={handleAddVariant} disabled={addingVariant}>
              {addingVariant ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            </Button>
          </div>
        </div>

        {/* Images */}
        <div className="border-t border-brand-brown/10 pt-5">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-semibold text-brand-brown/70">Images</h4>
            {reorderingImages && (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-brand-brown/45">
                <Loader2 size={11} className="animate-spin" /> Saving order…
              </span>
            )}
          </div>
          <p className="text-[11px] text-brand-brown/40 mb-3">
            Drag to reorder. The first image is the default shown on the store.
          </p>
          <div className="flex flex-wrap gap-4 mb-3">
            {current.images.map((img, idx) => (
              <div
                key={img.id}
                draggable
                onDragStart={() => setDraggedImageId(img.id)}
                onDragEnter={() => setDragOverImageId(img.id)}
                onDragOver={(e) => e.preventDefault()}
                onDragEnd={() => {
                  setDraggedImageId(null);
                  setDragOverImageId(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleImageDrop(img.id);
                }}
                className={`relative w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border-2 group cursor-grab active:cursor-grabbing transition-all ${
                  idx === 0 ? "border-brand-orange" : "border-brand-brown/10"
                } ${draggedImageId === img.id ? "opacity-40" : ""} ${
                  dragOverImageId === img.id && draggedImageId && draggedImageId !== img.id
                    ? "ring-2 ring-brand-orange ring-offset-2"
                    : ""
                }`}
              >
                <Image
                  src={assetUrl(img.url) ?? ""}
                  alt=""
                  fill
                  className="object-cover pointer-events-none"
                  unoptimized
                />

                {idx === 0 ? (
                  <span className="absolute top-2 left-2 bg-brand-orange text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                    <Star size={10} className="fill-white" /> Default
                  </span>
                ) : (
                  <span className="absolute top-2 left-2 bg-black/55 text-white text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center">
                    {idx + 1}
                  </span>
                )}

                <span className="absolute bottom-2 left-2 bg-black/45 text-white rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <GripVertical size={14} />
                </span>

                <button
                  type="button"
                  onClick={() => handleDeleteImage(img.id)}
                  disabled={deletingImageId === img.id}
                  title="Delete image"
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center transition-colors disabled:opacity-60"
                >
                  {deletingImageId === img.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Trash2 size={13} />
                  )}
                </button>
              </div>
            ))}
            <label className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl border-2 border-dashed border-brand-brown/20 flex items-center justify-center text-brand-brown/40 hover:text-brand-orange hover:border-brand-orange/40 cursor-pointer transition-colors">
              {uploading ? <Loader2 size={22} className="animate-spin" /> : <ImagePlus size={22} />}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePickImage(file, current.images.length === 0);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>
      </div>

      <ImageCropModal
        open={!!pendingRawFile}
        file={pendingRawFile}
        aspect={PRODUCT_IMAGE_ASPECT}
        outputWidth={PRODUCT_IMAGE_OUTPUT_SIZE}
        outputHeight={PRODUCT_IMAGE_OUTPUT_SIZE}
        title="Crop product image"
        onCancel={() => setPendingRawFile(null)}
        onCropped={(cropped) => {
          const isPrimary = pendingIsPrimary;
          setPendingRawFile(null);
          handleUploadImage(cropped, isPrimary);
        }}
      />
    </Modal>
  );
}
