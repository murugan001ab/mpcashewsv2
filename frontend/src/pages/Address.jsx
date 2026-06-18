// src/pages/Address.jsx
import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { getAddresses, addAddress, updateAddress } from "../services/addressService";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapPin, Plus, ArrowRight } from "lucide-react";

const EMPTY_FORM = { name:"", phone_number:"", address_line1:"", city:"", state:"", pincode:"", country:"India", is_default:false };

export default function Address() {
  const { accessToken } = useContext(AuthContext);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fromPayment = params.get("from") === "payment";

  const [addresses,  setAddresses]  = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [editingId,  setEditingId]  = useState(null);
  const [showForm,   setShowForm]   = useState(false);
  const [saving,     setSaving]     = useState(false);

  const loadAddresses = async () => {
    try {
      const res  = await getAddresses(accessToken);
      const list = res || [];
      setAddresses(list);
      if (!list.length) { setShowForm(true); return; }
      const def = list.find(a => a.is_default);
      setSelectedId(def ? def.id : list[0].id);
    } catch(e) { console.error(e); }
  };

  useEffect(() => { loadAddresses(); }, []);

  const handleSelect = async (id) => {
    setSelectedId(id);
    const addr = addresses.find(a => a.id === id);
    if (addr) await updateAddress(accessToken, id, { ...addr, is_default: true });
    loadAddresses();
    if (fromPayment) navigate("/payment");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) await updateAddress(accessToken, editingId, form);
      else           await addAddress(accessToken, form);
      setForm(EMPTY_FORM); setEditingId(null); setShowForm(false);
      await loadAddresses();
      if (fromPayment) navigate("/payment");
    } catch(e) { console.error(e); } finally { setSaving(false); }
  };

  const F = (field) => ({
    value: form[field],
    onChange: e => setForm(f => ({ ...f, [field]: e.target.value })),
  });

  return (
    <div>
      <h1>
        <MapPin size={28} style={{display:"inline",verticalAlign:"middle",marginRight:8,color:"var(--amber)"}} />
        Delivery Address
      </h1>

      {/* Address list */}
      {!showForm && addresses.length > 0 && (
        <>
          {addresses.map(addr => (
            <div
              key={addr.id}
              className={`addr-card${selectedId === addr.id ? " selected" : ""}`}
              onClick={() => setSelectedId(addr.id)}
            >
              <div>
                <div />
              </div>
              <div>
                <div>
                  {addr.name}
                  {addr.is_default && <span>Default</span>}
                </div>
                <div>{addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ""}</div>
                <div>{addr.city}, {addr.state} — {addr.pincode}</div>
                <div>📞 {addr.phone_number}</div>
                <div>
                  <button onClick={e => { e.stopPropagation(); setForm(addr); setEditingId(addr.id); setShowForm(true); }}>
                    Edit
                  </button>
                  {selectedId !== addr.id && (
                    <button onClick={e => { e.stopPropagation(); handleSelect(addr.id); }}>
                      Select &amp; Continue
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div>
            <button onClick={() => setShowForm(true)}>
              <Plus size={16} /> Add New Address
            </button>
            <button onClick={() => navigate("/payment")}>
              Continue to Payment <ArrowRight size={16} />
            </button>
          </div>
        </>
      )}

      {/* Form */}
      {(showForm || addresses.length === 0) && (
        <div>
          <div>
            {editingId ? "Edit Address" : "Add New Address"}
          </div>
          <form onSubmit={handleSubmit}>
            <div>
              <div>
                <label>Name / Label</label>
                <input placeholder="Home, Office…" required {...F("name")} />
              </div>
              <div>
                <label>Phone Number</label>
                <input placeholder="+91 98765 43210" required {...F("phone_number")} />
              </div>
              <div>
                <label>Address Line 1</label>
                <input placeholder="House/Flat No., Street…" required {...F("address_line1")} />
              </div>
              <div>
                <label>Address Line 2 (optional)</label>
                <input placeholder="Landmark, Area…" {...F("address_line2")} />
              </div>
              <div>
                <label>City</label>
                <input placeholder="Kadayanallur" required {...F("city")} />
              </div>
              <div>
                <label>State</label>
                <input placeholder="Tamil Nadu" required {...F("state")} />
              </div>
              <div>
                <label>Pincode</label>
                <input placeholder="627751" required {...F("pincode")} />
              </div>
              <div>
                <label>Country</label>
                <input placeholder="India" {...F("country")} />
              </div>
              {addresses.length > 0 && (
                <div>
                  <label>
                    <input type="checkbox" checked={form.is_default}
                      onChange={e => setForm(f => ({...f, is_default: e.target.checked}))} />
                    Set as default address
                  </label>
                </div>
              )}
            </div>

            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              <button type="submit" disabled={saving}>
                {saving ? "Saving…" : (editingId ? "Update Address" : "Save Address")}
              </button>
              {addresses.length > 0 && (
                <button type="button"
                  onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
