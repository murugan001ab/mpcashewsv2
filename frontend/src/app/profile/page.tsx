
"use client";

// src/app/profile/page.tsx

import React, {
  useState,
  useContext,
  useEffect,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Package, MapPin, User } from "lucide-react";

import { AuthContext } from "@/contexts/AuthContext";
import OrdersTab from "@/components/profile/OrdersTab";
import AddressesTab from "@/components/profile/AddressesTab";
import AccountTab from "@/components/profile/AccountTab";
import AuthGuard from "@/components/AuthGuard";

const TABS = [
  { id: "orders", label: "My Orders", icon: Package },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "account", label: "Account", icon: User },
] as const;

type TabId = (typeof TABS)[number]["id"];

const TAB_IDS = TABS.map((t) => t.id) as readonly string[];

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");

  const initialTab: TabId = TAB_IDS.includes(tabParam ?? "")
    ? (tabParam as TabId)
    : "orders";

  const [active, setActive] = useState<TabId>(initialTab);

  const { user } = useContext(AuthContext);

  // Keep active tab synced with URL
  useEffect(() => {
    if (
      tabParam &&
      TAB_IDS.includes(tabParam) &&
      tabParam !== active
    ) {
      setActive(tabParam as TabId);
    }
  }, [tabParam, active]);

  const selectTab = (id: TabId) => {
    setActive(id);
    router.push(`/profile?tab=${id}`, {
      scroll: false,
    });
  };

  const initial =
    (user as any)?.full_name?.[0]?.toUpperCase() ||
    (user as any)?.name?.[0]?.toUpperCase() ||
    "U";

  const name =
    (user as any)?.full_name ||
    (user as any)?.name ||
    "Customer";

  const email = user?.email || "";

  return (
    <div
      className="
        w-full
        max-w-5xl
        mx-auto
        px-3
        sm:px-4
        md:px-6
        lg:px-8
        pt-24
        sm:pt-28
        md:pt-32
        pb-8
        sm:pb-10
        md:pb-16
        min-h-screen
      "
    >
      {/* =========================================================
          PROFILE HEADER
      ========================================================== */}

      <div
        className="
          bg-brand-cream/30
          border
          border-brand-brown/10
          rounded-2xl
          sm:rounded-3xl
          p-4
          sm:p-6
          md:p-10
          flex
          flex-row
          items-center
          text-left
          gap-4
          sm:gap-6
          mb-5
          sm:mb-7
          md:mb-8
          shadow-sm
        "
      >
        {/* Avatar */}
        <div
          className="
            w-14
            h-14
            sm:w-16
            sm:h-16
            md:w-24
            md:h-24
            bg-brand-orange
            text-white
            rounded-full
            flex
            items-center
            justify-center
            text-xl
            sm:text-2xl
            md:text-4xl
            font-extrabold
            shadow-md
            flex-shrink-0
          "
        >
          {initial}
        </div>

        {/* User Details */}
        <div className="min-w-0 flex flex-col justify-center gap-0.5 sm:gap-1">
          <h1
            className="
              text-lg
              sm:text-xl
              md:text-3xl
              font-extrabold
              text-brand-black
              tracking-tight
              leading-tight
              truncate
            "
          >
            Hi, {name}{" "}
            <span className="inline-block">👋</span>
          </h1>

          {email && (
            <p
              className="
                text-xs
                sm:text-sm
                md:text-base
                font-medium
                text-brand-brown/70
                truncate
                max-w-[240px]
                sm:max-w-none
              "
            >
              {email}
            </p>
          )}
        </div>
      </div>

      {/* =========================================================
          TAB NAVIGATION
      ========================================================== */}

      <div
        className="
          flex
          items-center
          gap-1.5
          sm:gap-2
          md:gap-4
          mb-5
          sm:mb-7
          md:mb-8
          overflow-x-auto
          overscroll-x-contain
          pb-1
          scrollbar-none
          border-b
          border-brand-brown/5
        "
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;

          return (
            <button
              key={id}
              onClick={() => selectTab(id)}
              className={`
                flex
                items-center
                justify-center
                gap-1.5
                sm:gap-2

                px-3.5
                sm:px-4
                md:px-5

                py-2.5
                sm:py-3

                rounded-xl
                sm:rounded-2xl

                font-bold
                text-xs
                sm:text-sm

                whitespace-nowrap
                flex-shrink-0

                transition-colors
                duration-200

                ${
                  isActive
                    ? `
                      bg-brand-black
                      text-white
                      shadow-sm
                    `
                    : `
                      bg-white
                      text-brand-brown/60
                      border
                      border-brand-brown/5
                      hover:bg-brand-cream
                      hover:text-brand-black
                      hover:border-brand-brown/10
                    `
                }
              `}
            >
              <Icon
                size={15}
                className="sm:w-4 sm:h-4"
                strokeWidth={isActive ? 2.5 : 2}
              />

              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* =========================================================
          TAB CONTENT
      ========================================================== */}

      <div
        className="
          bg-white
          border
          border-brand-brown/5

          rounded-2xl
          sm:rounded-3xl

          p-3.5
          sm:p-5
          md:p-8
          lg:p-10

          shadow-sm

          min-h-[360px]
          sm:min-h-[400px]
        "
      >
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
      <Suspense fallback={null}>
        <ProfileContent />
      </Suspense>
    </AuthGuard>
  );
}
