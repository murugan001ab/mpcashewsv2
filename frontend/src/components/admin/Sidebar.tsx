"use client";
// src/components/admin/Sidebar.tsx
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Tag,
  Package,
  ShoppingBag,
  Star,
  LogOut,
  Store,
  FileText,
  Newspaper,
  Settings,
  Percent,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const links = [
  { href: "/admin", exact: true, icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/categories", exact: false, icon: Tag, label: "Categories" },
  { href: "/admin/products", exact: false, icon: Package, label: "Products" },
  { href: "/admin/orders", exact: false, icon: ShoppingBag, label: "Orders" },
  { href: "/admin/coupons", exact: false, icon: Percent, label: "Coupons" },
  { href: "/admin/reviews", exact: false, icon: Star, label: "Reviews" },
  { href: "/admin/blog", exact: false, icon: Newspaper, label: "Blog" },
  { href: "/admin/templates", exact: false, icon: FileText, label: "Templates" },
  { href: "/admin/settings", exact: false, icon: Settings, label: "Settings" },
];

export default function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname?.startsWith(href + "/");

  const content = (
    <div className="h-full flex flex-col bg-brand-black text-white/70">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10 shrink-0">
        <Image src="/logo.png" alt="MP Cashews" width={32} height={32} className="rounded-lg" />
        <div className="leading-tight">
          <p className="text-sm font-bold text-white">MP Cashews</p>
          <p className="text-[11px] text-white/40">Admin Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {links.map(({ href, exact, icon: Icon, label }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                active ? "bg-brand-orange text-white" : "text-white/55 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1 shrink-0">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/55 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Store size={17} />
          View store
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/55 hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:block fixed left-0 top-0 h-screen w-64 z-30">{content}</aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <aside className="absolute left-0 top-0 h-full w-64 shadow-2xl">{content}</aside>
        </div>
      )}
    </>
  );
}
