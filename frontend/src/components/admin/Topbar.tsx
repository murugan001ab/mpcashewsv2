"use client";
// src/components/admin/Topbar.tsx
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const TITLES: Record<string, { title: string; subtitle: string }> = {
  "/admin": { title: "Dashboard", subtitle: "An overview of how the store is doing" },
  "/admin/categories": { title: "Categories", subtitle: "Organize products into browsable groups" },
  "/admin/products": { title: "Products", subtitle: "Manage listings, variants and stock" },
  "/admin/orders": { title: "Orders", subtitle: "Track and update order fulfillment" },
  "/admin/reviews": { title: "Reviews", subtitle: "Customer feedback on products" },
  "/admin/blog": { title: "Blog", subtitle: "Write and publish posts" },
  "/admin/templates": { title: "Templates", subtitle: "Edit automated email and WhatsApp messages" },
  "/admin/settings": { title: "Site settings", subtitle: "Business, contact, and legal info shown in the footer" },
};

function titleFor(pathname: string) {
  if (TITLES[pathname]) return TITLES[pathname];
  const base = "/" + pathname.split("/").slice(1, 3).join("/");
  return TITLES[base] ?? { title: "Admin", subtitle: "" };
}

export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname() ?? "/admin";
  const { user } = useAuth();
  const { title, subtitle } = titleFor(pathname);

  const initial = (user?.full_name || user?.email || "A").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 h-16 flex items-center justify-between gap-4 px-4 sm:px-8 bg-[#F7F5F2]/90 backdrop-blur-sm border-b border-brand-brown/10">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 -ml-1 rounded-lg flex items-center justify-center text-brand-black hover:bg-brand-brown/8"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-brand-black leading-tight truncate">{title}</h2>
          {subtitle && <p className="text-xs text-brand-brown/50 truncate hidden sm:block">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <div className="text-right hidden sm:block leading-tight">
          <p className="text-sm font-semibold text-brand-black">{user?.full_name || "Admin"}</p>
          <p className="text-[11px] text-brand-brown/45">{user?.email}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-brand-orange text-white flex items-center justify-center font-bold text-sm shrink-0">
          {initial}
        </div>
      </div>
    </header>
  );
}
