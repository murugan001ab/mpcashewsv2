import React, { useEffect, useState } from "react";
import { Pencil, Trash2, X, Plus, Tag, AlertCircle, ToggleLeft, ToggleRight } from "lucide-react";
import {
  adminListCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
} from "../../../services/adminService";

const EMPTY_FORM = { name: "", description: "", image_url: "" };

export default function Category() {
  const [categories, setCategories] = useState([]);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [editId,     setEditId]     = useState(null);
  const [editForm,   setEditForm]   = useState(EMPTY_FORM);
  const [error,      setError]      = useState("");
  const [saving,     setSaving]     = useState(false);

  const fetchCategories = async () => {
    try {
      const data = await adminListCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setError(""); setSaving(true);
    try {
      await adminCreateCategory({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        image_url: form.image_url.trim() || undefined,
      });
      setForm(EMPTY_FORM);
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add category");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (c) => {
    setEditId(c.id);
    setEditForm({ name: c.name, description: c.description || "", image_url: c.image_url || "" });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setError(""); setSaving(true);
    try {
      await adminUpdateCategory(editId, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        image_url: editForm.image_url.trim() || undefined,
      });
      setEditId(null);
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update category");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c) => {
    try {
      await adminUpdateCategory(c.id, { is_active: !c.is_active });
      fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm("Permanently delete this category?")) return;
    try {
      await adminDeleteCategory(id);
      fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  const inputCls = "w-full bg-gray-50 border border-brand-brown/10 px-4 py-3 rounded-xl text-brand-black focus:outline-none focus:ring-2 focus:ring-brand-orange/50 transition-all font-medium text-sm";

  return (
    <div className="max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-brand-black tracking-tight">Categories</h2>
        <p className="text-brand-brown/60 mt-1 font-medium">Manage product categories and collections</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-xl mb-6 border border-red-100">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Add Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-brand-brown/10">
            <h3 className="flex items-center gap-2 text-lg font-bold text-brand-black mb-5">
              <Plus size={18} className="text-brand-orange" /> Add Category
            </h3>
            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-brand-brown/60 uppercase tracking-wider mb-2">Name *</label>
                <input
                  placeholder="E.g., Whole Cashews"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-brand-brown/60 uppercase tracking-wider mb-2">Description</label>
                <textarea
                  placeholder="Short description..."
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={2}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-brand-brown/60 uppercase tracking-wider mb-2">Image URL</label>
                <input
                  placeholder="https://..."
                  value={form.image_url}
                  onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-brand-black text-white hover:bg-brand-brown font-bold py-3.5 rounded-xl transition-all shadow-md disabled:opacity-50"
              >
                {saving ? "Adding…" : "Add Category"}
              </button>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-brand-brown/10">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
              <h3 className="flex items-center gap-2 text-lg font-bold text-brand-black">
                <Tag size={18} className="text-brand-orange" /> All Categories
              </h3>
              <span className="bg-brand-orange/10 text-brand-orange px-3 py-1 rounded-full text-sm font-extrabold">
                {categories.length} Total
              </span>
            </div>

            {categories.length === 0 ? (
              <p className="text-brand-brown/40 text-center py-8 font-medium">No categories yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {categories.map(c => (
                  <li key={c.id} className="flex items-center justify-between bg-gray-50 border border-brand-brown/5 px-4 py-3 rounded-2xl group hover:border-brand-orange/30 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      {c.image_url && (
                        <img src={c.image_url} alt={c.name} className="w-9 h-9 rounded-lg object-cover border border-gray-200 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-brand-black text-sm truncate">{c.name}</p>
                        {c.description && <p className="text-xs text-brand-brown/50 truncate">{c.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.is_active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                      <button
                        onClick={() => toggleActive(c)}
                        className="p-2 text-brand-brown/40 hover:text-brand-orange bg-white rounded-lg shadow-sm border border-gray-100 transition-colors"
                        title={c.is_active ? "Deactivate" : "Activate"}
                      >
                        {c.is_active ? <ToggleRight size={14} strokeWidth={2.5} /> : <ToggleLeft size={14} strokeWidth={2.5} />}
                      </button>
                      <button
                        onClick={() => openEdit(c)}
                        className="p-2 text-brand-brown/40 hover:text-brand-orange bg-white rounded-lg shadow-sm border border-gray-100 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} strokeWidth={2.5} />
                      </button>
                      <button
                        onClick={() => deleteCategory(c.id)}
                        className="p-2 text-brand-brown/40 hover:text-red-500 bg-white rounded-lg shadow-sm border border-gray-100 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editId && (
        <div className="fixed inset-0 bg-brand-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-extrabold text-brand-black">Edit Category</h3>
              <button onClick={() => setEditId(null)} className="text-brand-brown/40 hover:text-red-500 transition-colors">
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
            <form onSubmit={handleEdit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-brand-brown/60 uppercase tracking-wider mb-2">Name *</label>
                <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} required className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-brand-brown/60 uppercase tracking-wider mb-2">Description</label>
                <textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} rows={2} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-brand-brown/60 uppercase tracking-wider mb-2">Image URL</label>
                <input value={editForm.image_url} onChange={e => setEditForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://..." className={inputCls} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditId(null)} className="flex-1 bg-gray-100 text-brand-brown hover:bg-gray-200 font-bold py-3.5 rounded-xl transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 bg-brand-orange text-white hover:bg-[#d96a1a] font-bold py-3.5 rounded-xl shadow-md transition-all disabled:opacity-50">
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
