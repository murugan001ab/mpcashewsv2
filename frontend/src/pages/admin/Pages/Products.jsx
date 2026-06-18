import React, { useEffect, useState } from "react";
import api from "../../../services/api";
import { Pencil, Trash2, X, Plus, PackageOpen } from "lucide-react";

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  discount: "",
  stock: "",
  category_id: "",
  image: null,
};

export default function Products() {
  const [products,   setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [editingId,  setEditingId]  = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [error,      setError]      = useState("");

  const fetchProducts   = async () => { const r = await api.get("/products/");   const d = r.data; setProducts(Array.isArray(d) ? d : (d?.results ?? [])); };
  const fetchCategories = async () => { const r = await api.get("/categories/"); const d = r.data; setCategories(Array.isArray(d) ? d : (d?.results ?? [])); };

  useEffect(() => { fetchProducts(); fetchCategories(); }, []);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm(prev => ({ ...prev, [name]: name === "image" ? files[0] : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const fd = new FormData();
      Object.keys(form).forEach(k => {
        if (form[k] !== null && form[k] !== "") fd.append(k, form[k]);
      });
      if (editingId) {
        await api.patch(`/products/${editingId}/`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        await api.post("/products/add/", fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      resetForm();
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => { setForm(EMPTY_FORM); setEditingId(null); setLoading(false); };

  const editProduct = (p) => {
    setEditingId(p.id);
    setForm({ name: p.name, description: p.description, price: p.price, discount: p.discount, stock: p.stock, category_id: p.category?.id || "", image: null });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    await api.delete(`/products/${id}/`);
    fetchProducts();
  };

  return (
    <div>

      {/* Header */}
      <div>
        <h2>Products</h2>
        <p>Add, edit or remove cashew products</p>
      </div>

      {/* Form card */}
      <div>
        <h3>
          <Plus size={16} />
          {editingId ? "Edit Product" : "Add New Product"}
        </h3>

        {error && (
          <div>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            name="name" placeholder="Product name" value={form.name}
            onChange={handleChange} required
           
          />
          <textarea
            name="description" placeholder="Description" value={form.description}
            onChange={handleChange} rows={3}
           
          />
          <input
            name="price" placeholder="Price (₹)" value={form.price}
            onChange={handleChange} type="number" min="0"
           
          />
          <input
            name="discount" placeholder="Discount %" value={form.discount}
            onChange={handleChange} type="number" min="0" max="100"
           
          />
          <input
            name="stock" placeholder="Stock qty" value={form.stock}
            onChange={handleChange} type="number" min="0"
           
          />
          <select
            name="category_id" value={form.category_id} onChange={handleChange}
           
          >
            <option value="">Select Category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div>
            <label>
              Product Image {editingId && <span>(leave blank to keep current)</span>}
            </label>
            <input
              type="file" name="image" accept="image/*" onChange={handleChange}
             
            />
          </div>

          <div>
            <button
              type="submit" disabled={loading}
             
            >
              {loading ? "Saving…" : editingId ? "Update Product" : "Add Product"}
            </button>
            {editingId && (
              <button
                type="button" onClick={resetForm}
               
              >
                <X size={14} /> Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Products table */}
      <div>
        <div>
          <h3>
            All Products <span>({products.length})</span>
          </h3>
        </div>

        {products.length === 0 ? (
          <div>
            <PackageOpen size={40} />
            <p>No products yet</p>
          </div>
        ) : (
          <div>
            <table>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Final</th>
                  <th>Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td>
                      <img
                        src={p.image} alt={p.name}
                       
                      />
                    </td>
                    <td>{p.name}</td>
                    <td>{p.category?.name || "—"}</td>
                    <td>₹{p.price}</td>
                    <td>₹{p.final_price}</td>
                    <td>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        p.stock > 10 ? "bg-green-100 text-green-700" :
                        p.stock > 0  ? "bg-yellow-100 text-yellow-700" :
                                       "bg-red-100 text-red-600"
                      }`}>
                        {p.stock}
                      </span>
                    </td>
                    <td>
                      <div>
                        <button
                          onClick={() => editProduct(p)}
                         
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => deleteProduct(p.id)}
                         
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
