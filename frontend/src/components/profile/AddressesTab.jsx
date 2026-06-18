// src/components/profile/AddressesTab.jsx
import React, { useEffect, useState, useContext } from "react";
import api from "../../services/api";
import { AuthContext } from "../../contexts/AuthContext";

export default function AddressesTab() {
  const { accessToken } = useContext(AuthContext);
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState(null);

  const load = () => {
    api
      .get("addresses/", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => setAddresses(res.data || []));
  };

  useEffect(load, []);

  const saveAddress = async (e) => {
    e.preventDefault();

    if (form.id) {
      // PUT /api/addresses/{id}
      await api.put(`addresses/${form.id}`, form, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } else {
      // POST /api/addresses/
      await api.post("addresses/", form, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    }

    setForm(null);
    load();
  };

  const handleDelete = async (id) => {
    await api.delete(`addresses/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    load();
  };

  return (
    <div>
      <h3>Saved Addresses</h3>

      {/* LIST */}
      {addresses.map((addr) => (
        <div key={addr.id}>
          <p>
            <strong>{addr.name}</strong>{" "}
            {addr.is_default && <span>(Default)</span>}
          </p>
          <p>
            {addr.address_line}, {addr.city}, {addr.state} - {addr.pincode}
          </p>
          <p>📞 {addr.phone_number}</p>

          <button onClick={() => setForm(addr)}>Edit</button>
          <button onClick={() => handleDelete(addr.id)} style={{ marginLeft: 8 }}>
            Delete
          </button>
        </div>
      ))}

      <button onClick={() => setForm({})}>
        + Add New Address
      </button>

      {/* FORM */}
      {form && (
        <div>
          <h4>{form.id ? "Edit Address" : "Add Address"}</h4>
          <form onSubmit={saveAddress}>
            <input
              value={form.name || ""}
              placeholder="Name"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              value={form.phone_number || ""}
              placeholder="Phone"
              onChange={(e) =>
                setForm({ ...form, phone_number: e.target.value })
              }
            />
            <input
              value={form.address_line || ""}
              placeholder="Address"
              onChange={(e) =>
                setForm({ ...form, address_line: e.target.value })
              }
            />
            <input
              value={form.city || ""}
              placeholder="City"
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
            <input
              value={form.state || ""}
              placeholder="State"
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            />
            <input
              value={form.pincode || ""}
              placeholder="Pincode"
              onChange={(e) => setForm({ ...form, pincode: e.target.value })}
            />
            <label>
              <input
                type="checkbox"
                checked={form.is_default || false}
                onChange={(e) =>
                  setForm({ ...form, is_default: e.target.checked })
                }
              />
              &nbsp;Set as default
            </label>

            <button type="submit">Save</button>
            <button
              type="button"
             
              onClick={() => setForm(null)}
            >
              Cancel
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
