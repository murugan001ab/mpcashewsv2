"use client";
// src/components/profile/AddressesTab.tsx
import React, { useEffect, useState } from "react";
import {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddressById,
  type Address,
} from "@/services/addressService";
import { MapPin, Plus, Edit2, Trash2, Home, CheckCircle2, Phone, Loader2 } from "lucide-react";

const EMPTY_FORM: Omit<Address, "id"> = {
  name: "",
  phone_number: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  is_default: false,
};

type FormState = Partial<Address>;

export default function AddressesTab() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const list = await getAddresses();
      setAddresses(list || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      if (form.id) {
        await updateAddress(form.id, form as Partial<Address>);
      } else {
        await addAddress(form as Omit<Address, "id">);
      }
      setForm(null);
      await load();
    } catch (err) {
      console.error(err);
      alert("Failed to save address.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!window.confirm("Are you sure you want to delete this address?")) return;
    try {
      await deleteAddressById(id);
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-brand-brown/50">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h3 className="text-xl font-extrabold text-brand-black tracking-tight">Saved Addresses</h3>
          <p className="text-sm font-medium text-brand-brown/60 mt-1">
            Manage your delivery addresses for a faster checkout.
          </p>
        </div>
        {!form && (
          <button
            onClick={() => setForm({ ...EMPTY_FORM })}
            className="flex items-center justify-center gap-2 bg-brand-orange hover:bg-brand-brown text-white text-sm font-bold py-2.5 px-5 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            <Plus size={16} strokeWidth={2.5} /> Add New Address
          </button>
        )}
      </div>

      {/* Address Form */}
      {form ? (
        <div className="bg-gray-50 border border-brand-brown/10 rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6 border-b border-brand-brown/5 pb-4">
            <div className="w-10 h-10 bg-white border border-brand-brown/10 flex items-center justify-center rounded-full text-brand-orange shadow-sm">
              <MapPin size={20} />
            </div>
            <h4 className="text-lg font-bold text-brand-black">
              {form.id ? "Edit Address" : "Add New Address"}
            </h4>
          </div>

          <form onSubmit={saveAddress} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-brand-brown/70 uppercase tracking-widest pl-1">Full Name</label>
                <input
                  required
                  value={form.name || ""}
                  placeholder="e.g. Jane Doe"
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-white border border-brand-brown/10 rounded-xl px-4 py-3 text-sm text-brand-black font-medium focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 outline-none transition-all shadow-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-brand-brown/70 uppercase tracking-widest pl-1">Phone Number</label>
                <input
                  required
                  value={form.phone_number || ""}
                  placeholder="+91 9876543210"
                  onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                  className="w-full bg-white border border-brand-brown/10 rounded-xl px-4 py-3 text-sm text-brand-black font-medium focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-brand-brown/70 uppercase tracking-widest pl-1">Address Line 1</label>
              <input
                required
                value={form.address_line1 || ""}
                placeholder="House No, Building, Street, Area"
                onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
                className="w-full bg-white border border-brand-brown/10 rounded-xl px-4 py-3 text-sm text-brand-black font-medium focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 outline-none transition-all shadow-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-brand-brown/70 uppercase tracking-widest pl-1">Address Line 2 (Optional)</label>
              <input
                value={form.address_line2 || ""}
                placeholder="Landmark, Area"
                onChange={(e) => setForm({ ...form, address_line2: e.target.value })}
                className="w-full bg-white border border-brand-brown/10 rounded-xl px-4 py-3 text-sm text-brand-black font-medium focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 outline-none transition-all shadow-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { label: "City", key: "city", placeholder: "City" },
                { label: "State", key: "state", placeholder: "State" },
                { label: "Pincode", key: "pincode", placeholder: "e.g. 110001" },
              ].map(({ label, key, placeholder }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-brand-brown/70 uppercase tracking-widest pl-1">{label}</label>
                  <input
                    required
                    value={(form as any)[key] || ""}
                    placeholder={placeholder}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full bg-white border border-brand-brown/10 rounded-xl px-4 py-3 text-sm text-brand-black font-medium focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 outline-none transition-all shadow-sm"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 mt-2">
              <input
                type="checkbox"
                id="default-checkbox"
                checked={form.is_default || false}
                onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                className="w-4 h-4 text-brand-orange bg-white border-brand-brown/20 rounded focus:ring-brand-orange/20 focus:ring-2 cursor-pointer"
              />
              <label htmlFor="default-checkbox" className="text-sm font-bold text-brand-black cursor-pointer select-none">
                Set as default address
              </label>
            </div>

            <div className="flex items-center gap-3 mt-4 pt-6 border-t border-brand-brown/5">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="flex-1 sm:flex-none px-6 py-3.5 rounded-xl font-bold text-sm bg-white border border-brand-brown/10 text-brand-black hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 sm:flex-none px-8 py-3.5 rounded-xl font-bold text-sm bg-brand-black text-white hover:bg-brand-brown shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-70"
              >
                {saving ? "Saving…" : "Save Address"}
              </button>
            </div>
          </form>
        </div>
      ) : addresses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-gray-50 border border-brand-brown/5 text-center rounded-3xl border-dashed">
          <div className="w-16 h-16 bg-brand-orange/10 text-brand-orange rounded-full flex items-center justify-center mb-4">
            <Home size={32} strokeWidth={1.5} />
          </div>
          <p className="text-lg font-bold text-brand-black mb-1">No addresses saved yet</p>
          <p className="text-sm text-brand-brown/60 mb-6 max-w-sm">
            Add your home or office address to checkout faster next time.
          </p>
          <button
            onClick={() => setForm({ ...EMPTY_FORM })}
            className="flex items-center justify-center gap-2 bg-brand-orange hover:bg-brand-brown text-white text-sm font-bold py-3 px-6 rounded-xl transition-all shadow-md"
          >
            <Plus size={16} strokeWidth={2.5} /> Add New Address
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`group relative bg-white border p-6 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md ${
                addr.is_default
                  ? "border-brand-orange/40 ring-1 ring-brand-orange/10"
                  : "border-brand-brown/10 hover:border-brand-brown/30"
              }`}
            >
              {addr.is_default && (
                <div className="absolute -top-3 left-5 bg-brand-orange text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1 uppercase tracking-wider">
                  <CheckCircle2 size={12} strokeWidth={3} /> Default
                </div>
              )}

              <div className="mt-1 mb-4">
                <h4 className="text-[15px] font-extrabold text-brand-black mb-2 flex items-center gap-2">
                  <Home size={16} className="text-brand-brown/40" /> {addr.name}
                </h4>
                <p className="text-sm text-brand-brown/80 leading-relaxed max-w-[90%]">
                  {addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ""}
                  <br />
                  {addr.city}, {addr.state} -{" "}
                  <span className="font-semibold text-brand-black">{addr.pincode}</span>
                </p>
                <div className="flex items-center gap-1.5 mt-3 text-sm font-medium text-brand-black">
                  <Phone size={14} className="text-brand-brown/40" />
                  {addr.phone_number}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-brand-brown/5">
                <button
                  onClick={() => setForm(addr)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-brand-black bg-gray-50 hover:bg-brand-cream hover:text-brand-orange transition-colors border border-brand-brown/5"
                >
                  <Edit2 size={13} strokeWidth={2.5} /> Edit
                </button>
                <button
                  onClick={() => handleDelete(addr.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-red-500 bg-red-50 hover:bg-red-500 hover:text-white transition-colors border border-red-100"
                >
                  <Trash2 size={13} strokeWidth={2.5} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
