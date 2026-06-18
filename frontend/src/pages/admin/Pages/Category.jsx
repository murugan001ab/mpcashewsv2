import React, { useEffect, useState } from "react";
import api from "../../../services/api";
import { Pencil, Trash2, X, Plus, Tag } from "lucide-react";

export default function Category() {
  const [categories,    setCategories]    = useState([]);
  const [categoryName,  setCategoryName]  = useState("");
  const [editId,        setEditId]        = useState(null);
  const [editName,      setEditName]      = useState("");
  const [error,         setError]         = useState("");

  const fetchCategories = async () => {
    const res = await api.get("/categories/");
    setCategories(res.data);
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    setError("");
    try {
      await api.post("/categories/", { name: categoryName });
      setCategoryName("");
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add category");
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    try {
      await api.patch(`/categories/${editId}/`, { name: editName });
      setEditId(null); setEditName("");
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update category");
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    await api.delete(`/categories/${id}/`);
    fetchCategories();
  };

  return (
    <div>

      {/* Header */}
      <div>
        <h2>Categories</h2>
        <p>Manage product categories</p>
      </div>

      <div>

        {/* Add form */}
        <div>
          <h3>
            <Plus size={15} /> Add Category
          </h3>
          {error && (
            <p>{error}</p>
          )}
          <form onSubmit={handleAdd}>
            <input
              placeholder="Category name"
              value={categoryName}
              onChange={e => setCategoryName(e.target.value)}
             
            />
            <button
              type="submit"
             
            >
              Add
            </button>
          </form>
        </div>

        {/* List */}
        <div>
          <div>
            <Tag size={14} />
            All Categories
            <span>({categories.length})</span>
          </div>

          {categories.length === 0 ? (
            <p>No categories yet</p>
          ) : (
            <ul>
              {categories.map(c => (
                <li key={c.id}>
                  <span>{c.name}</span>
                  <div>
                    <button
                      onClick={() => { setEditId(c.id); setEditName(c.name); }}
                     
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => deleteCategory(c.id)}
                     
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editId && (
        <div>
          <div>
            <div>
              <h3>Edit Category</h3>
              <button onClick={() => setEditId(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEdit}>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
               
              />
              <div>
                <button
                  type="button" onClick={() => setEditId(null)}
                 
                >
                  Cancel
                </button>
                <button
                  type="submit"
                 
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
