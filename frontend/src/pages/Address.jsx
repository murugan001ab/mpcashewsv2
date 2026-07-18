import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { getAddresses, addAddress, updateAddress } from "../services/addressService";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapPin, Plus, ArrowRight, Edit2, CheckCircle2, Home, Phone, Loader2 } from "lucide-react";

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
  const [loading,    setLoading]    = useState(true);

  const loadAddresses = async () => {
    try {
      const res  = await getAddresses(accessToken);
      const list = res || [];
      setAddresses(list);
      if (!list.length) { setShowForm(true); } 
      else {
        const def = list.find(a => a.is_default);
        setSelectedId(def ? def.id : list[0].id);
      }
    } catch(e) { 
      console.error(e); 
    } finally {
      setLoading(false);
    }
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
    value: form[field] || "",
    onChange: e => setForm(f => ({ ...f, [field]: e.target.value })),
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-brand-brown/50">
        <Loader2 className="animate-spin w-10 h-10 text-brand-orange" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 pt-24 min-h-screen">
      
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-8 pb-6 border-b border-brand-brown/10">
        <div className="w-12 h-12 bg-brand-orange/10 text-brand-orange rounded-full flex items-center justify-center shadow-sm">
          <MapPin size={24} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-brand-black tracking-tight">Delivery Address</h1>
          <p className="text-sm font-medium text-brand-brown/60 mt-1">Where should we send your order?</p>
        </div>
      </div>

      {/* ── Address List ────────────────────────────────────────────────── */}
      {!showForm && addresses.length > 0 && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
          <div className="flex flex-col gap-4">
            {addresses.map(addr => {
              const isSelected = selectedId === addr.id;
              return (
                <div
                  key={addr.id}
                  className={`relative flex flex-col sm:flex-row sm:items-start gap-4 p-5 md:p-6 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    isSelected 
                      ? "border-brand-orange bg-brand-orange/5 ring-1 ring-brand-orange/20 shadow-md" 
                      : "border-brand-brown/10 hover:border-brand-brown/30 bg-white shadow-sm hover:shadow-md"
                  }`}
                  onClick={() => setSelectedId(addr.id)}
                >
                  {/* Custom Radio Button */}
                  <div className="flex-shrink-0 mt-1 hidden sm:block">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected ? "border-brand-orange bg-brand-orange" : "border-brand-brown/30"
                    }`}>
                      {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                    </div>
                  </div>

                  {/* Address Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-[15px] font-extrabold text-brand-black flex items-center gap-1.5">
                        <Home size={16} className="text-brand-brown/40 hidden sm:block" /> {addr.name}
                      </h3>
                      {addr.is_default && (
                        <span className="bg-brand-orange text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                          <CheckCircle2 size={12} strokeWidth={3} /> Default
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-brand-brown/80 leading-relaxed">
                      {addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ""}<br />
                      {addr.city}, {addr.state} — <span className="font-semibold text-brand-black">{addr.pincode}</span>
                    </p>
                    
                    <div className="flex items-center gap-1.5 mt-3 text-sm font-medium text-brand-black">
                      <Phone size={14} className="text-brand-brown/40" /> {addr.phone_number}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col gap-2 mt-4 sm:mt-0 items-end justify-center w-full sm:w-auto">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setForm(addr); setEditingId(addr.id); setShowForm(true); }}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-brand-black bg-white border border-brand-brown/10 hover:border-brand-orange hover:text-brand-orange transition-colors"
                    >
                      <Edit2 size={13} strokeWidth={2.5} /> Edit
                    </button>
                    {!isSelected && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleSelect(addr.id); }}
                        className="flex-[2] sm:flex-none px-4 py-2 rounded-lg text-xs font-bold bg-brand-black text-white hover:bg-brand-brown transition-colors"
                      >
                        Select
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* List Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-brand-brown/10">
            <button 
              onClick={() => setShowForm(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-brand-brown/10 text-brand-black font-bold py-3.5 px-6 rounded-xl transition-colors shadow-sm"
            >
              <Plus size={18} strokeWidth={2.5} /> Add New Address
            </button>
            <button 
              onClick={() => navigate("/payment")}
              className="flex-[2] flex items-center justify-center gap-2 bg-brand-black hover:bg-brand-brown text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              Continue to Payment <ArrowRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* ── Form View ───────────────────────────────────────────────────── */}
      {(showForm || addresses.length === 0) && (
        <div className="bg-gray-50 border border-brand-brown/10 rounded-3xl p-6 md:p-8 animate-in slide-in-from-bottom-4 duration-300">
          <h2 className="text-xl font-extrabold text-brand-black mb-6 flex items-center gap-2 border-b border-brand-brown/5 pb-4">
            {editingId ? "Edit Address" : "Add New Address"}
          </h2>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-brand-brown/70 uppercase tracking-widest pl-1">Name / Label</label>
                <input placeholder="e.g. Home, Office" required {...F("name")} className="w-full bg-white border border-brand-brown/10 rounded-xl px-4 py-3 text-sm text-brand-black font-medium focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 outline-none transition-all shadow-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-brand-brown/70 uppercase tracking-widest pl-1">Phone Number</label>
                <input placeholder="+91 98765 43210" required {...F("phone_number")} className="w-full bg-white border border-brand-brown/10 rounded-xl px-4 py-3 text-sm text-brand-black font-medium focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 outline-none transition-all shadow-sm" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-brand-brown/70 uppercase tracking-widest pl-1">Address Line 1</label>
              <input placeholder="House/Flat No., Building, Street" required {...F("address_line1")} className="w-full bg-white border border-brand-brown/10 rounded-xl px-4 py-3 text-sm text-brand-black font-medium focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 outline-none transition-all shadow-sm" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-brand-brown/70 uppercase tracking-widest pl-1">Address Line 2 (Optional)</label>
              <input placeholder="Landmark, Area" {...F("address_line2")} className="w-full bg-white border border-brand-brown/10 rounded-xl px-4 py-3 text-sm text-brand-black font-medium focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 outline-none transition-all shadow-sm" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <div className="col-span-2 md:col-span-1 flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-brand-brown/70 uppercase tracking-widest pl-1">City</label>
                <input placeholder="City" required {...F("city")} className="w-full bg-white border border-brand-brown/10 rounded-xl px-4 py-3 text-sm text-brand-black font-medium focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 outline-none transition-all shadow-sm" />
              </div>
              <div className="col-span-2 md:col-span-1 flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-brand-brown/70 uppercase tracking-widest pl-1">State</label>
                <input placeholder="State" required {...F("state")} className="w-full bg-white border border-brand-brown/10 rounded-xl px-4 py-3 text-sm text-brand-black font-medium focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 outline-none transition-all shadow-sm" />
              </div>
              <div className="col-span-2 md:col-span-1 flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-brand-brown/70 uppercase tracking-widest pl-1">Pincode</label>
                <input placeholder="Pincode" required {...F("pincode")} className="w-full bg-white border border-brand-brown/10 rounded-xl px-4 py-3 text-sm text-brand-black font-medium focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 outline-none transition-all shadow-sm" />
              </div>
              <div className="col-span-2 md:col-span-1 flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-brand-brown/70 uppercase tracking-widest pl-1">Country</label>
                <input placeholder="Country" required {...F("country")} className="w-full bg-white border border-brand-brown/10 rounded-xl px-4 py-3 text-sm text-brand-black font-medium focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 outline-none transition-all shadow-sm" />
              </div>
            </div>

            {addresses.length > 0 && (
              <div className="flex items-center gap-3 mt-2">
                <input 
                  type="checkbox" 
                  id="default-address"
                  checked={form.is_default}
                  onChange={e => setForm(f => ({...f, is_default: e.target.checked}))}
                  className="w-4 h-4 text-brand-orange bg-white border-brand-brown/20 rounded focus:ring-brand-orange/20 focus:ring-2 cursor-pointer" 
                />
                <label htmlFor="default-address" className="text-sm font-bold text-brand-black cursor-pointer select-none">
                  Set as default address
                </label>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-brand-brown/5 mt-2">
              {addresses.length > 0 && (
                <button 
                  type="button"
                  onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
                  className="flex-1 sm:flex-none py-3.5 px-6 rounded-xl font-bold text-sm bg-white border border-brand-brown/10 text-brand-black hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button 
                type="submit" 
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-8 rounded-xl font-bold text-sm bg-brand-black text-white hover:bg-brand-brown shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? "Saving…" : (editingId ? "Update Address" : "Save Address")}
              </button>
            </div>

          </form>
        </div>
      )}
    </div>
  );
}