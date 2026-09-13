"use client";

import React, {
  useEffect,
  useState,
  useContext,
} from "react";

import { AuthContext } from "@/contexts/AuthContext";
import {
  getProfile,
  updateProfile,
  changePassword,
} from "@/services/userService";

import {
  Save,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

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
      .catch((err) =>
        console.error("Failed to load profile", err)
      )
      .finally(() => setInitialLoading(false));
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (
      newPassword ||
      confirmPassword ||
      currentPassword
    ) {
      if (newPassword !== confirmPassword) {
        setError("New passwords do not match");
        return;
      }

      if (!currentPassword) {
        setError(
          "Enter your current password to change it"
        );
        return;
      }
    }

    setLoading(true);

    try {
      const updated = await updateProfile({
        full_name: fullName,
        phone,
      } as any);

      setProfile(updated);

      setUser?.((u: User | null) =>
        u
          ? {
              ...u,
              full_name: (updated as any).full_name,
              phone: (updated as any).phone,
            }
          : u
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
      setError(
        err?.response?.data?.detail ||
          "Something went wrong while updating your profile."
      );
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-brand-brown/50">
        <Loader2 className="animate-spin w-7 h-7 sm:w-8 sm:h-8" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl">
      {/* Header */}
      <div className="mb-5 sm:mb-8">
        <h3 className="text-lg sm:text-xl font-extrabold text-brand-black tracking-tight">
          Account Details
        </h3>

        <p className="text-xs sm:text-sm font-medium text-brand-brown/60 mt-1 leading-relaxed">
          Update your personal information and password.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          className="
            flex
            items-start
            gap-2
            bg-red-50
            text-red-600
            border
            border-red-100
            p-3
            sm:p-4
            rounded-xl
            text-xs
            sm:text-sm
            font-semibold
            mb-5
            sm:mb-8
            shadow-sm
          "
        >
          <AlertCircle
            size={17}
            className="shrink-0 mt-0.5"
          />

          <span>{error}</span>
        </div>
      )}

      {/* Success */}
      {success && (
        <div
          className="
            flex
            items-start
            gap-2
            bg-green-50
            text-green-600
            border
            border-green-100
            p-3
            sm:p-4
            rounded-xl
            text-xs
            sm:text-sm
            font-semibold
            mb-5
            sm:mb-8
            shadow-sm
          "
        >
          <CheckCircle2
            size={17}
            className="shrink-0 mt-0.5"
          />

          <span>{success}</span>
        </div>
      )}

      {/* Profile Avatar */}
      <div
        className="
          flex
          items-center
          gap-4
          sm:gap-6
          mb-6
          sm:mb-10
          pb-6
          sm:pb-8
          border-b
          border-brand-brown/5
        "
      >
        <div
          className="
            w-16
            h-16
            sm:w-20
            sm:h-20
            md:w-28
            md:h-28
            shrink-0
            bg-brand-orange
            text-white
            rounded-full
            flex
            items-center
            justify-center
            text-2xl
            sm:text-3xl
            md:text-4xl
            font-extrabold
            shadow-md
            border-2
            sm:border-4
            border-brand-cream
          "
        >
          {fullName?.[0]?.toUpperCase() ||
            (profile as any)?.email?.[0]?.toUpperCase() ||
            "U"}
        </div>

        <div className="min-w-0">
          <span className="block text-sm font-bold text-brand-black">
            Profile Picture
          </span>

          <span className="block text-[10px] sm:text-[11px] text-brand-brown/50 mt-1 leading-relaxed">
            Avatar uploads aren&apos;t supported yet.
          </span>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleUpdate}
        className="flex flex-col gap-5 sm:gap-6"
      >
        {/* Basic Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Full Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] sm:text-[11px] font-bold text-brand-brown/70 uppercase tracking-widest pl-1">
              Full Name
            </label>

            <input
              type="text"
              value={fullName}
              onChange={(e) =>
                setFullName(e.target.value)
              }
              className="
                w-full
                bg-gray-50
                border
                border-brand-brown/10
                rounded-xl
                px-3.5
                sm:px-4
                py-3
                text-sm
                text-brand-black
                font-medium
                focus:bg-white
                focus:border-brand-orange
                focus:ring-2
                focus:ring-brand-orange/20
                outline-none
                transition-all
                shadow-sm
              "
              placeholder="Enter your full name"
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] sm:text-[11px] font-bold text-brand-brown/70 uppercase tracking-widest pl-1">
              Email Address
            </label>

            <input
              type="email"
              value={(profile as any)?.email || ""}
              disabled
              className="
                w-full
                bg-gray-100
                border
                border-brand-brown/5
                rounded-xl
                px-3.5
                sm:px-4
                py-3
                text-sm
                text-brand-black/60
                font-medium
                cursor-not-allowed
                outline-none
              "
            />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] sm:text-[11px] font-bold text-brand-brown/70 uppercase tracking-widest pl-1">
              Phone
            </label>

            <input
              type="text"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value)
              }
              className="
                w-full
                bg-gray-50
                border
                border-brand-brown/10
                rounded-xl
                px-3.5
                sm:px-4
                py-3
                text-sm
                text-brand-black
                font-medium
                focus:bg-white
                focus:border-brand-orange
                focus:ring-2
                focus:ring-brand-orange/20
                outline-none
                transition-all
                shadow-sm
              "
              placeholder="+91 98765 43210"
            />
          </div>
        </div>

        {/* Password Section */}
        <div
          className="
            border-t
            border-brand-brown/5
            mt-1
            sm:mt-2
            pt-6
            sm:pt-8
          "
        >
          <div className="mb-4 sm:mb-5">
            <h4 className="text-sm font-bold text-brand-black">
              Change Password{" "}
              <span className="text-brand-brown/40 font-normal">
                (Optional)
              </span>
            </h4>

            <p className="text-[11px] text-brand-brown/50 mt-1">
              Leave these fields empty if you don&apos;t
              want to change your password.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                label: "Current Password",
                value: currentPassword,
                setter: setCurrentPassword,
              },
              {
                label: "New Password",
                value: newPassword,
                setter: setNewPassword,
              },
              {
                label: "Confirm Password",
                value: confirmPassword,
                setter: setConfirmPassword,
              },
            ].map(
              ({ label, value, setter }) => (
                <div
                  key={label}
                  className="flex flex-col gap-1.5"
                >
                  <label className="text-[10px] sm:text-[11px] font-bold text-brand-brown/70 uppercase tracking-widest pl-1">
                    {label}
                  </label>

                  <input
                    type="password"
                    value={value}
                    onChange={(e) =>
                      setter(e.target.value)
                    }
                    className="
                      w-full
                      bg-gray-50
                      border
                      border-brand-brown/10
                      rounded-xl
                      px-3.5
                      sm:px-4
                      py-3
                      text-sm
                      text-brand-black
                      font-medium
                      focus:bg-white
                      focus:border-brand-orange
                      focus:ring-2
                      focus:ring-brand-orange/20
                      outline-none
                      transition-all
                      shadow-sm
                    "
                    placeholder="••••••••"
                  />
                </div>
              )
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-stretch sm:justify-end mt-1 sm:mt-4">
          <button
            type="submit"
            disabled={loading}
            className="
              w-full
              sm:w-auto
              flex
              items-center
              justify-center
              gap-2
              bg-brand-black
              hover:bg-brand-brown
              text-white
              text-sm
              font-bold
              py-3
              sm:py-3.5
              px-8
              rounded-xl
              transition-all
              duration-300
              shadow-md
              hover:shadow-xl
              disabled:opacity-70
              disabled:hover:translate-y-0
            "
          >
            {loading ? (
              <Loader2
                size={18}
                className="animate-spin"
              />
            ) : (
              <Save
                size={18}
                strokeWidth={2.5}
              />
            )}

            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}