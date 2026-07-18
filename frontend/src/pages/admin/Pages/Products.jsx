import React, { useEffect, useState } from "react";
import { Pencil, Trash2, X, Plus, PackageOpen, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import {
  adminListProducts,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  adminListCategories,
} from "../../../services/adminService";

const EMPTY_VARIANT = { sku: "", weight_grams: "", price: "", discounted_price: "", stock: "", is_active: true };
const EMPTY_FORM = { name: "", description: "", short_description: "", is_featured: false, is_active: true, category_id: "", variants: [{ ...EMPTY_VARIANT }] };

export default function Products() {
  const [products,   setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [editingId,  setEditingId]  = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [error,      setError]      = useState("");
  const [expanded,   setExpanded]   = useState(null);

  const fetchAll = async () => {
    try {
      const [prods, cats] = await Promise.all([adminListProducts(), adminListCategories()]);
      setProducts(Array.isArray(prods) ? prods : []);
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchAll(); }, []);

  const setField = (field, value) => setForm(p => ({ ...p, [field]: value }));

  const setVariantField = (idx, field, value) => {
    setForm(p => {
      const variants = [...p.variants];
      variants[idx] = { ...variants[idx], [field]: value };
      return { ...p, variants };
    });
  };

  const addVariant = () => setForm(p => ({ ...p, variants: [...p.variants, { ...EMPTY_VARIANT }] }));
  const removeVariant = (idx) => setForm(p => ({ ...p, variants: p.variants.filter((_, i) => i !== idx) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        short_description: form.short_description || undefined,
        is_featured: form.is_featured,
        is_active: form.is_active,
        category_id: form.category_id,
        variants: form.variants.map(v => ({
          sku: v.sku,
          weight_grams: parseInt(v.weight_grams),
          price: v.price,
          discounted_price: v.discounted_price || undefined,
          stock: parseInt(v.stock) || 0,
          is_active: v.is_active,
        })),
      };

      if (editingId) {
        // Update only product fields (variants managed separately)
        const { variants, ...updatePayload } = payload;
        await adminUpdateProduct(editingId, updatePayload);
      } else {
        await adminCreateProduct(payload);
      }
      resetForm();
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong while saving the product.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => { setForm(EMPTY_FORM); setEditingId(null); setLoading(false); setError(""); };

  const editProduct = (p) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description || "",
      short_description: p.short_description || "",
      is_featured: p.is_featured,
      is_active: p.is_active,
      category_id: p.category?.id || p.category_id || "",
      variants: p.variants?.length
        ? p.variants.map(v => ({
            sku: v.sku,
            weight_grams: v.weight_grams,
            price: v.price,
            discounted_price: v.discounted_price || "",
            stock: v.stock,
            is_active: v.is_active,
          }))
        : [{ ...EMPTY_VARIANT }],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Permanently delete this product?")) return;
    try {
      await adminDeleteProduct(id);
      fetchAll();
    } catch (e) { console.error(e); }
  };

  const inputCls = "w-full bg-gray-50 border border-brand-brown/10 px-4 py-3 rounded-xl text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-orange/50 transition-all font-medium text-sm";

  const totalStock = (p) => p.variants?.reduce((s, v) => s + (v.stock || 0), 0) ?? 0;
  const minPrice   = (p) => {
    if (!p.variants?.length) return null;
    const prices = p.variants.map(v => parseFloat(v.discounted_price || v.price));
    return Math.min(...prices);
  };
  const primaryImage = (p) => p.images?.find(i => i.is_primary)?.url || p.images?.[0]?.url || null;

  return (
    <div className="max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-brand-black tracking-tight">Products</h2>
        <p className="text-brand-brown/60 mt-1 font-medium">Add, edit, and manage your inventory</p>
      </div>

      {/* Form Card */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-brand-brown/10">
        <h3 className="flex items-center gap-2 text-xl font-bold text-brand-black mb-6">
          <Plus size={20} className="text-brand-orange" />
          {editingId ? "Edit Product" : "Add New Product"}
        </h3>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-bold border border-red-100">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-brand-brown/60 uppercase tracking-wider mb-2">Product Name *</label>
              <input name="name" placeholder="E.g., W180 Premium Cashews" value={form.name} onChange={e => setField("name", e.target.value)} required className={inputCls} />
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-brown/60 uppercase tracking-wider mb-2">Category *</label>
              <select value={form.category_id} onChange={e => setField("category_id", e.target.value)} required className={inputCls}>
                <option value="">Select Category</option>
                {categories.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-brown/60 uppercase tracking-wider mb-2">Short Description</label>
              <input placeholder="Brief tagline..." value={form.short_description} onChange={e => setField("short_description", e.target.value)} className={inputCls} />
            </div>

            <div className="flex items-center gap-6 pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_featured} onChange={e => setField("is_featured", e.target.checked)} className="w-4 h-4 accent-brand-orange" />
                <span className="text-sm font-bold text-brand-black">Featured</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setField("is_active", e.target.checked)} className="w-4 h-4 accent-brand-orange" />
                <span className="text-sm font-bold text-brand-black">Active</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-brown/60 uppercase tracking-wider mb-2">Description</label>
            <textarea placeholder="Full product description..." value={form.description} onChange={e => setField("description", e.target.value)} rows={3} className={inputCls} />
          </div>

          {/* Variants — only shown on create */}
          {!editingId && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-brand-brown/60 uppercase tracking-wider">Variants (SKU / Weight / Price / Stock)</label>
                <button type="button" onClick={addVariant} className="flex items-center gap-1 text-xs font-bold text-brand-orange hover:underline">
                  <Plus size={14} /> Add Variant
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {form.variants.map((v, idx) => (
                  <div key={idx} className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-gray-50 p-4 rounded-2xl border border-brand-brown/5 relative">
                    <input placeholder="SKU e.g. CW-500" value={v.sku} onChange={e => setVariantField(idx, "sku", e.target.value)} required className={inputCls} />
                    <input placeholder="Weight (g)" type="number" min="1" value={v.weight_grams} onChange={e => setVariantField(idx, "weight_grams", e.target.value)} required className={inputCls} />
                    <input placeholder="Price ₹" type="number" min="0" step="0.01" value={v.price} onChange={e => setVariantField(idx, "price", e.target.value)} required className={inputCls} />
                    <input placeholder="Disc. Price ₹" type="number" min="0" step="0.01" value={v.discounted_price} onChange={e => setVariantField(idx, "discounted_price", e.target.value)} className={inputCls} />
                    <div className="flex gap-2">
                      <input placeholder="Stock" type="number" min="0" value={v.stock} onChange={e => setVariantField(idx, "stock", e.target.value)} className={inputCls} />
                      {form.variants.length > 1 && (
                        <button type="button" onClick={() => removeVariant(idx)} className="p-2 text-red-400 hover:text-red-600 bg-white rounded-lg border border-gray-200 flex-shrink-0">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {editingId && (
            <p className="text-xs text-brand-brown/50 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              ℹ️ Variants cannot be edited here. Use the variant management endpoint directly or delete and recreate the product.
            </p>
          )}

          <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
            <button type="submit" disabled={loading} className="bg-brand-black text-white hover:bg-brand-brown font-bold px-8 py-3.5 rounded-xl transition-all shadow-md disabled:opacity-50">
              {loading ? "Saving…" : editingId ? "Update Product" : "Create Product"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="flex items-center gap-2 text-brand-brown/60 hover:text-brand-orange font-bold px-4 py-3.5 rounded-xl transition-colors">
                <X size={18} strokeWidth={2.5} /> Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-brand-brown/10 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-brand-black">Inventory</h3>
          <span className="bg-gray-100 text-brand-brown font-extrabold text-sm px-3 py-1 rounded-full">{products.length} Products</span>
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-brand-brown/40">
            <PackageOpen size={48} strokeWidth={1.5} className="mb-4 text-brand-brown/20" />
            <p className="font-bold">No products yet. Add one above!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[11px] uppercase tracking-widest text-brand-brown/50 font-bold border-b border-brand-brown/5">
                  <th className="p-4 pl-6">Product</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Variants</th>
                  <th className="p-4">From Price</th>
                  <th className="p-4">Total Stock</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-brown/5">
                {products.map(p => (
                  <React.Fragment key={p.id}>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                            {primaryImage(p) ? (
                              <img src={primaryImage(p)} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl font-bold">
                                {p.name[0]}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-brand-black text-sm">{p.name}</p>
                            {p.is_featured && <span className="text-[10px] font-bold bg-brand-orange/10 text-brand-orange px-1.5 py-0.5 rounded">Featured</span>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm font-medium text-brand-brown/70">{p.category?.name || "—"}</td>
                      <td className="p-4 text-sm font-medium text-brand-brown">
                        <button
                          onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                          className="flex items-center gap-1 text-brand-orange hover:underline font-bold"
                        >
                          {p.variants?.length || 0} SKU{p.variants?.length !== 1 ? "s" : ""}
                          {expanded === p.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>
                      <td className="p-4 text-sm font-extrabold text-brand-black">
                        {minPrice(p) !== null ? `₹${minPrice(p).toFixed(2)}` : "—"}
                      </td>
                      <td className="p-4">
                        {(() => {
                          const stock = totalStock(p);
                          return (
                            <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-extrabold ${
                              stock > 10 ? "bg-green-100 text-green-700" :
                              stock > 0  ? "bg-amber-100 text-amber-700" :
                                           "bg-red-100 text-red-600"
                            }`}>
                              {stock > 0 ? `${stock} units` : "Out of stock"}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-4">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.is_active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>
                          {p.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => editProduct(p)} className="p-2 text-brand-brown/40 hover:text-brand-orange bg-white rounded-lg border border-gray-200 shadow-sm transition-all" title="Edit">
                            <Pencil size={15} strokeWidth={2.5} />
                          </button>
                          <button onClick={() => deleteProduct(p.id)} className="p-2 text-brand-brown/40 hover:text-red-500 bg-white rounded-lg border border-gray-200 shadow-sm transition-all" title="Delete">
                            <Trash2 size={15} strokeWidth={2.5} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded variants row */}
                    {expanded === p.id && p.variants?.length > 0 && (
                      <tr>
                        <td colSpan={7} className="bg-gray-50 px-6 pb-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2">
                            {p.variants.map(v => (
                              <div key={v.id} className="bg-white border border-brand-brown/10 rounded-xl px-4 py-3 text-xs">
                                <p className="font-bold text-brand-black mb-1">{v.sku}</p>
                                <p className="text-brand-brown/60">{v.weight_grams}g &nbsp;·&nbsp;
                                  {v.discounted_price
                                    ? <><span className="line-through text-brand-brown/40">₹{v.price}</span> <span className="font-bold text-brand-black">₹{v.discounted_price}</span></>
                                    : <span className="font-bold text-brand-black">₹{v.price}</span>
                                  }
                                  &nbsp;·&nbsp; Stock: <span className={v.stock > 0 ? "text-green-600 font-bold" : "text-red-500 font-bold"}>{v.stock}</span>
                                </p>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
