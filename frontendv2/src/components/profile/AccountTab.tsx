"use client";
// src/components/profile/AccountTab.tsx
import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import { getProfile, updateProfile, changePassword } from "@/services/userService";
import { Save, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { User } from "@/types";

export default function AccountTab() {
  const { setUser } = useContext(AuthContext);

  const [profile, setProfile] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    getProfile()
      .then((data) => {
        setProfile(data);
        setFullName((data as any).full_name || "");
        setPhone((data as any).phone || "");
      })
      .catch((err) => console.error("Failed to load profile", err))
      .finally(() => setInitialLoading(false));
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword || confirmPassword || currentPassword) {
      if (newPassword !== confirmPassword) {
        setError("New passwords do not match");
        return;
      }
      if (!currentPassword) {
        setError("Enter your current password to change it");
        return;
      }
    }

    setLoading(true);
    try {
      const updated = await updateProfile({ full_name: fullName, phone } as any);
      setProfile(updated);
      setUser?.((u: User | null) =>
        u ? { ...u, full_name: (updated as any).full_name, phone: (updated as any).phone } : u
      );

      if (newPassword) {
        await changePassword({
          current_password: currentPassword,
          new_password: newPassword,
        } as any);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }

      setSuccess("Profile updated successfully!");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Something went wrong while updating your profile.");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-brand-brown/50">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h3 className="text-xl font-extrabold text-brand-black tracking-tight">Account Details</h3>
        <p className="text-sm font-medium text-brand-brown/60 mt-1">
          Update your personal information and password.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-100 p-4 rounded-xl text-sm font-semibold mb-8 shadow-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 bg-green-50 text-green-600 border border-green-100 p-4 rounded-xl text-sm font-semibold mb-8 shadow-sm">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      {/* Avatar */}
      <div className="flex items-center gap-6 mb-10 pb-8 border-b border-brand-brown/5">
        <div className="w-24 h-24 md:w-28 md:h-28 bg-brand-orange text-white rounded-full flex items-center justify-center text-4xl font-extrabold shadow-md border-4 border-brand-cream">
          {fullName?.[0]?.toUpperCase() || (profile as any)?.email?.[0]?.toUpperCase() || "U"}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-brand-black">Profile Picture</span>
          <span className="text-[11px] text-brand-brown/50 mt-1">Avatar uploads aren&apos;t supported yet.</span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleUpdate} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-brand-brown/70 uppercase tracking-widest pl-1">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-gray-50 border border-brand-brown/10 rounded-xl px-4 py-3 text-sm text-brand-black font-medium focus:bg-white focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 outline-none transition-all shadow-sm"
              placeholder="Enter your full name"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-brand-brown/70 uppercase tracking-widest pl-1">
              Email Address
            </label>
            <input
              type="email"
              value={(profile as any)?.email || ""}
              disabled
              className="w-full bg-gray-100 border border-brand-brown/5 rounded-xl px-4 py-3 text-sm text-brand-black/60 font-medium cursor-not-allowed outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-brand-brown/70 uppercase tracking-widest pl-1">
              Phone
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-gray-50 border border-brand-brown/10 rounded-xl px-4 py-3 text-sm text-brand-black font-medium focus:bg-white focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 outline-none transition-all shadow-sm"
              placeholder="+91 98765 43210"
            />
          </div>
        </div>

        <div className="border-t border-brand-brown/5 my-2 pt-8">
          <h4 className="text-sm font-bold text-brand-black mb-5">
            Change Password <span className="text-brand-brown/40 font-normal">(Optional)</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: "Current Password", value: currentPassword, setter: setCurrentPassword },
              { label: "New Password", value: newPassword, setter: setNewPassword },
              { label: "Confirm Password", value: confirmPassword, setter: setConfirmPassword },
            ].map(({ label, value, setter }) => (
              <div key={label} className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-brand-brown/70 uppercase tracking-widest pl-1">
                  {label}
                </label>
                <input
                  type="password"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className="w-full bg-gray-50 border border-brand-brown/10 rounded-xl px-4 py-3 text-sm text-brand-black font-medium focus:bg-white focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 outline-none transition-all shadow-sm"
                  placeholder="••••••••"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-brand-black hover:bg-brand-brown text-white font-bold py-3.5 px-8 rounded-xl transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} strokeWidth={2.5} />}
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
