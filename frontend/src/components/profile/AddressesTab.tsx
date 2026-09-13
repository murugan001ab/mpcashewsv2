"use client";

import React, { useEffect, useState } from "react";
import {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddressById,
  type Address,
} from "@/services/addressService";
import AddressForm, {
  EMPTY_ADDRESS_FORM,
  type AddressFormState,
} from "@/components/AddressForm";
import {
  Plus,
  Edit2,
  Trash2,
  Home,
  Briefcase,
  Package2,
  CheckCircle2,
  Phone,
  Loader2,
} from "lucide-react";

const TYPE_ICON = {
  home: Home,
  work: Briefcase,
  other: Package2,
} as const;

export default function AddressesTab() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState<AddressFormState | null>(null);
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

  useEffect(() => {
    load();
  }, []);

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
    if (!window.confirm("Are you sure you want to delete this address?")) {
      return;
    }

    try {
      await deleteAddressById(id);
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-14 sm:py-16 text-brand-brown/50">
        <Loader2 className="animate-spin w-7 h-7 sm:w-8 sm:h-8" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-7">
        <div className="min-w-0">
          <h3 className="text-lg sm:text-xl font-extrabold text-brand-black tracking-tight">
            Saved Addresses
          </h3>

          <p className="text-xs sm:text-sm font-medium text-brand-brown/60 mt-1 leading-relaxed">
            Manage your delivery addresses for a faster checkout.
          </p>
        </div>

        {!form && (
          <button
            onClick={() => setForm({ ...EMPTY_ADDRESS_FORM })}
            className="
              w-full
              sm:w-auto
              shrink-0
              flex
              items-center
              justify-center
              gap-2
              bg-brand-orange
              hover:bg-brand-brown
              text-white
              text-xs
              sm:text-sm
              font-bold
              py-3
              sm:py-2.5
              px-5
              rounded-xl
              transition-all
              shadow-sm
              hover:shadow-md
            "
          >
            <Plus size={16} strokeWidth={2.5} />
            Add New Address
          </button>
        )}
      </div>

      {/* Address Form */}
      {form ? (
        <AddressForm
          form={form}
          setForm={setForm}
          onSubmit={saveAddress}
          onCancel={() => setForm(null)}
          saving={saving}
        />
      ) : addresses.length === 0 ? (
        <div
          className="
            flex
            flex-col
            items-center
            justify-center
            py-12
            sm:py-16
            px-4
            bg-gray-50
            border
            border-brand-brown/5
            text-center
            rounded-2xl
            sm:rounded-3xl
            border-dashed
          "
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-brand-orange/10 text-brand-orange rounded-full flex items-center justify-center mb-4">
            <Home size={28} sm-size={32} strokeWidth={1.5} />
          </div>

          <p className="text-base sm:text-lg font-bold text-brand-black mb-1">
            No addresses saved yet
          </p>

          <p className="text-xs sm:text-sm text-brand-brown/60 mb-5 sm:mb-6 max-w-sm leading-relaxed">
            Add your home or office address to checkout faster next time.
          </p>

          <button
            onClick={() => setForm({ ...EMPTY_ADDRESS_FORM })}
            className="
              flex
              items-center
              justify-center
              gap-2
              bg-brand-orange
              hover:bg-brand-brown
              text-white
              text-xs
              sm:text-sm
              font-bold
              py-3
              px-5
              sm:px-6
              rounded-xl
              transition-all
              shadow-sm
            "
          >
            <Plus size={16} strokeWidth={2.5} />
            Add New Address
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5">
          {addresses.map((addr) => {
            const TypeIcon = TYPE_ICON[addr.address_type] ?? Home;

            return (
              <div
                key={addr.id}
                className={`
                  group
                  relative
                  min-w-0
                  bg-white
                  border
                  p-4
                  sm:p-5
                  rounded-2xl
                  transition-all
                  duration-300
                  shadow-sm
                  ${
                    addr.is_default
                      ? "border-brand-orange/40 ring-1 ring-brand-orange/10"
                      : "border-brand-brown/10 hover:border-brand-brown/30 hover:shadow-md"
                  }
                `}
              >
                {/* Default Badge */}
                {addr.is_default && (
                  <div
                    className="
                      absolute
                      -top-2.5
                      left-4
                      bg-brand-orange
                      text-white
                      text-[9px]
                      sm:text-[10px]
                      font-bold
                      px-2.5
                      py-1
                      rounded-full
                      shadow-sm
                      flex
                      items-center
                      gap-1
                      uppercase
                      tracking-wider
                    "
                  >
                    <CheckCircle2 size={11} strokeWidth={3} />
                    Default
                  </div>
                )}

                {/* Address Content */}
                <div className="mt-1 mb-4">
                  <div className="flex items-center gap-2 min-w-0 mb-2.5">
                    <div className="w-8 h-8 shrink-0 rounded-lg bg-brand-cream/50 flex items-center justify-center">
                      <TypeIcon
                        size={15}
                        className="text-brand-orange"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <h4 className="text-sm font-extrabold text-brand-black truncate">
                        {addr.name}
                      </h4>

                      <span
                        className="
                          shrink-0
                          text-[9px]
                          font-bold
                          uppercase
                          tracking-wider
                          text-brand-brown/40
                          bg-brand-brown/5
                          px-1.5
                          py-0.5
                          rounded-full
                        "
                      >
                        {addr.address_type}
                      </span>
                    </div>
                  </div>

                  <p
                    className="
                      text-xs
                      sm:text-sm
                      text-brand-brown/80
                      leading-relaxed
                      break-words
                    "
                  >
                    {addr.house_flat}

                    {addr.street_area
                      ? `, ${addr.street_area}`
                      : ""}

                    {addr.landmark
                      ? `, ${addr.landmark}`
                      : ""}

                    <br />

                    {addr.city}

                    {addr.district
                      ? `, ${addr.district}`
                      : ""}

                    {addr.state
                      ? `, ${addr.state}`
                      : ""}

                    {" - "}

                    <span className="font-semibold text-brand-black">
                      {addr.pincode}
                    </span>
                  </p>

                  {/* Phone */}
                  <div className="flex items-center gap-1.5 mt-3 text-xs sm:text-sm font-medium text-brand-black break-words">
                    <Phone
                      size={13}
                      className="text-brand-brown/40 shrink-0"
                    />
                    <span>{addr.phone_number}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-brand-brown/5">
                  <button
                    onClick={() => setForm(addr)}
                    className="
                      flex-1
                      flex
                      items-center
                      justify-center
                      gap-1.5
                      py-2.5
                      rounded-lg
                      text-[11px]
                      sm:text-xs
                      font-bold
                      text-brand-black
                      bg-gray-50
                      hover:bg-brand-cream
                      hover:text-brand-orange
                      transition-colors
                      border
                      border-brand-brown/5
                    "
                  >
                    <Edit2 size={13} strokeWidth={2.5} />
                    Edit
                  </button>

                  <button
                    onClick={() => handleDelete(addr.id)}
                    className="
                      flex-1
                      flex
                      items-center
                      justify-center
                      gap-1.5
                      py-2.5
                      rounded-lg
                      text-[11px]
                      sm:text-xs
                      font-bold
                      text-red-500
                      bg-red-50
                      hover:bg-red-500
                      hover:text-white
                      transition-colors
                      border
                      border-red-100
                    "
                  >
                    <Trash2 size={13} strokeWidth={2.5} />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}