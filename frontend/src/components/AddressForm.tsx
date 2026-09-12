"use client";
// src/components/AddressForm.tsx
//
// Shared address form used by the profile "Saved Addresses" tab and
// checkout's "Add new address" flow — one implementation, so both stay in
// sync instead of drifting into two address systems.
import React, { useRef, useState } from "react";
import { MapPin, Loader2, Home, Briefcase, Package2 } from "lucide-react";
import type { Address, AddressType } from "@/services/addressService";
import * as locationService from "@/services/locationService";
import LocationMapPicker from "@/components/LocationMapPicker";

export const EMPTY_ADDRESS_FORM: Omit<Address, "id"> = {
  name: "",
  phone_number: "",
  house_flat: "",
  street_area: "",
  landmark: "",
  city: "",
  district: "",
  state: "",
  pincode: "",
  country: "India",
  address_type: "home",
  latitude: null,
  longitude: null,
  is_default: false,
};

export type AddressFormState = Partial<Address>;

const MOBILE_RE = /^(?:\+?91)?[6-9]\d{9}$/;
const PINCODE_RE = /^[1-9][0-9]{5}$/;

const inputClass =
  "w-full bg-white border border-brand-brown/10 rounded-xl px-4 py-3 text-sm text-brand-black font-medium focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 outline-none transition-all shadow-sm";
const labelClass = "text-[11px] font-bold text-brand-brown/70 uppercase tracking-widest pl-1";

const ADDRESS_TYPES: { value: AddressType; label: string; icon: React.ElementType }[] = [
  { value: "home", label: "Home", icon: Home },
  { value: "work", label: "Work", icon: Briefcase },
  { value: "other", label: "Other", icon: Package2 },
];

export default function AddressForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  saving,
}: {
  form: AddressFormState;
  setForm: (updater: (f: AddressFormState) => AddressFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [showMap, setShowMap] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Tracks which fields the user has hand-edited, so a later pincode/GPS
  // lookup doesn't clobber something they've already typed themselves.
  const touchedRef = useRef<Set<string>>(new Set());

  const set = <K extends keyof Address>(key: K, value: Address[K]) => {
    touchedRef.current.add(key as string);
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handlePincodeChange = async (value: string) => {
    touchedRef.current.add("pincode");
    setForm((f) => ({ ...f, pincode: value }));
    setPincodeError("");
    if (!/^\d{6}$/.test(value)) return;
    if (!PINCODE_RE.test(value)) {
      setPincodeError("Enter a valid 6-digit pincode");
      return;
    }
    setPincodeLoading(true);
    try {
      const res = await locationService.lookupPincode(value);
      setForm((f) => ({
        ...f,
        state: !touchedRef.current.has("state") || !f.state ? res.state || f.state : f.state,
        city: !touchedRef.current.has("city") || !f.city ? res.city || f.city : f.city,
        district: !touchedRef.current.has("district") || !f.district ? res.district || f.district : f.district,
      }));
    } catch {
      setPincodeError("Couldn't find that pincode. You can enter the details manually.");
    } finally {
      setPincodeLoading(false);
    }
  };

  const handleConfirmLocation = async (coords: { lat: number; lng: number }) => {
    setShowMap(false);
    setGeoLoading(true);
    setForm((f) => ({ ...f, latitude: coords.lat, longitude: coords.lng }));
    try {
      const res = await locationService.reverseGeocode(coords.lat, coords.lng);
      setForm((f) => ({
        ...f,
        house_flat: !touchedRef.current.has("house_flat") || !f.house_flat ? res.address_line1 || f.house_flat : f.house_flat,
        street_area: !touchedRef.current.has("street_area") || !f.street_area ? res.address_line2 || f.street_area : f.street_area,
        city: !touchedRef.current.has("city") || !f.city ? res.city || f.city : f.city,
        district: !touchedRef.current.has("district") || !f.district ? res.district || f.district : f.district,
        state: !touchedRef.current.has("state") || !f.state ? res.state || f.state : f.state,
        pincode: !touchedRef.current.has("pincode") || !f.pincode ? res.postal_code || f.pincode : f.pincode,
        country: res.country || f.country,
      }));
    } catch {
      // Reverse-geocoding failed — coordinates are still saved, admin/user
      // just has to fill the address fields in manually.
    } finally {
      setGeoLoading(false);
    }
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.name?.trim()) next.name = "Required";
    if (!form.phone_number || !MOBILE_RE.test(form.phone_number.replace(/\s|-/g, "")))
      next.phone_number = "Enter a valid 10-digit Indian mobile number";
    if (!form.house_flat?.trim()) next.house_flat = "Required";
    if (!form.city?.trim()) next.city = "Required";
    if (!form.state?.trim()) next.state = "Required";
    if (!form.pincode || !PINCODE_RE.test(form.pincode)) next.pincode = "Enter a valid 6-digit pincode";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(e);
  };

  return (
    <div className="bg-gray-50 border border-brand-brown/10 rounded-2xl p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6 border-b border-brand-brown/5 pb-4">
        <div className="w-10 h-10 bg-white border border-brand-brown/10 flex items-center justify-center rounded-full text-brand-orange shadow-sm">
          <MapPin size={20} />
        </div>
        <h4 className="text-lg font-bold text-brand-black">{form.id ? "Edit Address" : "Add New Address"}</h4>
      </div>

      {showMap ? (
        <LocationMapPicker onConfirm={handleConfirmLocation} onCancel={() => setShowMap(false)} />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <button
            type="button"
            onClick={() => setShowMap(true)}
            disabled={geoLoading}
            className="flex items-center justify-center gap-2 bg-white border-2 border-dashed border-brand-orange/40 hover:border-brand-orange text-brand-orange text-sm font-bold py-3 rounded-xl transition-all disabled:opacity-60"
          >
            {geoLoading ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
            {geoLoading ? "Detecting address…" : "📍 Use Current Location"}
          </button>

          {(form.latitude || form.longitude) && (
            <p className="text-[11px] text-brand-brown/45 -mt-2">
              Location pinned on map — fields below were auto-filled and can still be edited.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Full Name</label>
              <input
                value={form.name || ""}
                placeholder="e.g. Jane Doe"
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
              />
              {errors.name && <p className="text-xs text-red-500 font-semibold">{errors.name}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Mobile Number</label>
              <input
                value={form.phone_number || ""}
                placeholder="9876543210"
                inputMode="numeric"
                onChange={(e) => set("phone_number", e.target.value)}
                className={inputClass}
              />
              {errors.phone_number && <p className="text-xs text-red-500 font-semibold">{errors.phone_number}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>House / Flat / Building</label>
            <input
              value={form.house_flat || ""}
              placeholder="Flat no, building name"
              onChange={(e) => set("house_flat", e.target.value)}
              className={inputClass}
            />
            {errors.house_flat && <p className="text-xs text-red-500 font-semibold">{errors.house_flat}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Street / Area</label>
              <input
                value={form.street_area || ""}
                placeholder="Street, area"
                onChange={(e) => set("street_area", e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Landmark (Optional)</label>
              <input
                value={form.landmark || ""}
                placeholder="e.g. Near city hospital"
                onChange={(e) => set("landmark", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Pincode</label>
              <div className="relative">
                <input
                  value={form.pincode || ""}
                  placeholder="e.g. 641001"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(e) => handlePincodeChange(e.target.value.replace(/\D/g, ""))}
                  className={inputClass}
                />
                {pincodeLoading && (
                  <Loader2 size={16} className="animate-spin text-brand-orange absolute right-3 top-1/2 -translate-y-1/2" />
                )}
              </div>
              {(errors.pincode || pincodeError) && (
                <p className="text-xs text-red-500 font-semibold">{errors.pincode || pincodeError}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>City</label>
              <input
                value={form.city || ""}
                placeholder="City"
                onChange={(e) => set("city", e.target.value)}
                className={inputClass}
              />
              {errors.city && <p className="text-xs text-red-500 font-semibold">{errors.city}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>District</label>
              <input
                value={form.district || ""}
                placeholder="District"
                onChange={(e) => set("district", e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>State</label>
              <input
                value={form.state || ""}
                placeholder="State"
                onChange={(e) => set("state", e.target.value)}
                className={inputClass}
              />
              {errors.state && <p className="text-xs text-red-500 font-semibold">{errors.state}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Country</label>
            <input
              value={form.country || "India"}
              onChange={(e) => set("country", e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className={labelClass}>Address Type</label>
            <div className="flex gap-2">
              {ADDRESS_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => set("address_type", value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                    form.address_type === value
                      ? "bg-brand-orange/10 border-brand-orange text-brand-orange"
                      : "bg-white border-brand-brown/10 text-brand-brown/60 hover:border-brand-brown/30"
                  }`}
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <input
              type="checkbox"
              id="default-checkbox"
              checked={form.is_default || false}
              onChange={(e) => set("is_default", e.target.checked)}
              className="w-4 h-4 text-brand-orange bg-white border-brand-brown/20 rounded focus:ring-brand-orange/20 focus:ring-2 cursor-pointer"
            />
            <label htmlFor="default-checkbox" className="text-sm font-bold text-brand-black cursor-pointer select-none">
              Set as default address
            </label>
          </div>

          <div className="flex items-center gap-3 mt-4 pt-6 border-t border-brand-brown/5">
            <button
              type="button"
              onClick={onCancel}
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
      )}
    </div>
  );
}
