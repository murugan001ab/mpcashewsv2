"use client";
// src/app/profile/page.tsx
import React, { useState, useContext } from "react";
import { Package, MapPin, User } from "lucide-react";
import { AuthContext } from "@/contexts/AuthContext";
import OrdersTab from "@/components/profile/OrdersTab";
import AddressesTab from "@/components/profile/AddressesTab";
import AccountTab from "@/components/profile/AccountTab";
import AuthGuard from "@/components/AuthGuard";
import type { Metadata } from "next";

const TABS = [
  { id: "orders", label: "My Orders", icon: Package },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "account", label: "Account", icon: User },
] as const;

type TabId = (typeof TABS)[number]["id"];

function ProfileContent() {
  const [active, setActive] = useState<TabId>("orders");
  const { user } = useContext(AuthContext);

  const initial =
    (user as any)?.full_name?.[0]?.toUpperCase() ||
    (user as any)?.name?.[0]?.toUpperCase() ||
    "U";
  const name = (user as any)?.full_name || (user as any)?.name || "Customer";
  const email = user?.email || "";

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-16 pt-24 min-h-screen">
      {/* Header Card */}
      <div className="bg-brand-cream/30 border border-brand-brown/10 rounded-3xl p-6 md:p-10 flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-6 mb-8 shadow-sm">
        <div className="w-20 h-20 md:w-24 md:h-24 bg-brand-orange text-white rounded-full flex items-center justify-center text-3xl md:text-4xl font-extrabold shadow-md flex-shrink-0">
          {initial}
        </div>
        <div className="flex flex-col justify-center h-full gap-1 pt-1">
          <h1 className="text-2xl md:text-3xl font-extrabold text-brand-black tracking-tight">
            Hi, {name} <span className="inline-block">👋</span>
          </h1>
          {email && (
            <p className="text-sm md:text-base font-medium text-brand-brown/70">{email}</p>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto gap-2 md:gap-4 mb-8 pb-2 border-b border-brand-brown/5">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all duration-300 whitespace-nowrap
                ${
                  isActive
                    ? "bg-brand-black text-white shadow-md scale-100"
                    : "bg-white text-brand-brown/60 hover:bg-brand-cream hover:text-brand-black border border-brand-brown/5 hover:border-brand-brown/10 scale-95 hover:scale-100"
                }`}
            >
              <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-white border border-brand-brown/5 rounded-3xl p-6 md:p-8 lg:p-10 shadow-sm min-h-[400px]">
        {active === "orders" && <OrdersTab />}
        {active === "addresses" && <AddressesTab />}
        {active === "account" && <AccountTab />}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}
