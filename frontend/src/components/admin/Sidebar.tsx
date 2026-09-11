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
  Images,
  Info,
  ChevronLeft,
  ChevronRight,
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
  { href: "/admin/auth-slides", exact: false, icon: Images, label: "Auth Slides" },
  { href: "/admin/about", exact: false, icon: Info, label: "About Page" },
  { href: "/admin/settings", exact: false, icon: Settings, label: "Settings" },
];

export default function Sidebar({
  mobileOpen,
  onClose,
  collapsed,
  onToggleCollapse,
}: {
  mobileOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
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

  // `forceExpanded` is used by the mobile drawer, which always renders full
  // width regardless of the desktop collapsed preference.
  const renderContent = (forceExpanded: boolean) => {
    const isCollapsed = collapsed && !forceExpanded;
    return (
      <div className="h-full flex flex-col bg-brand-black text-white/70">
        {/* Logo */}
        <div
          className={`flex items-center gap-3 h-16 border-b border-white/10 shrink-0 ${
            isCollapsed ? "justify-center px-2" : "px-5"
          }`}
        >
          <Image src="/logo.png" alt="MP Cashews" width={32} height={32} className="rounded-lg shrink-0" />
          {!isCollapsed && (
            <div className="leading-tight min-w-0">
              <p className="text-sm font-bold text-white truncate">MP Cashews</p>
              <p className="text-[11px] text-white/40">Admin Panel</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 py-5 space-y-1 overflow-y-auto ${isCollapsed ? "px-2" : "px-3"}`}>
          {links.map(({ href, exact, icon: Icon, label }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                title={isCollapsed ? label : undefined}
                className={`flex items-center gap-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isCollapsed ? "justify-center px-0" : "px-3"
                } ${active ? "bg-brand-orange text-white" : "text-white/55 hover:text-white hover:bg-white/5"}`}
              >
                <Icon size={17} className="shrink-0" />
                {!isCollapsed && label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={`py-4 border-t border-white/10 space-y-1 shrink-0 ${isCollapsed ? "px-2" : "px-3"}`}>
          <Link
            href="/"
            title={isCollapsed ? "View store" : undefined}
            className={`flex items-center gap-3 py-2.5 rounded-xl text-sm font-semibold text-white/55 hover:text-white hover:bg-white/5 transition-colors ${
              isCollapsed ? "justify-center px-0" : "px-3"
            }`}
          >
            <Store size={17} className="shrink-0" />
            {!isCollapsed && "View store"}
          </Link>
          <button
            onClick={handleLogout}
            title={isCollapsed ? "Logout" : undefined}
            className={`w-full flex items-center gap-3 py-2.5 rounded-xl text-sm font-semibold text-white/55 hover:text-white hover:bg-white/5 transition-colors ${
              isCollapsed ? "justify-center px-0" : "px-3"
            }`}
          >
            <LogOut size={17} className="shrink-0" />
            {!isCollapsed && "Logout"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop */}
      <aside
        className={`hidden lg:block fixed left-0 top-0 h-screen z-30 transition-[width] duration-200 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {renderContent(false)}

        {/* Collapse / expand toggle — sits half-outside the sidebar's right
            edge so it reads as a handle on the panel itself. */}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute top-20 -right-3 w-6 h-6 rounded-full bg-brand-orange text-white flex items-center justify-center shadow-md hover:bg-[#cf7409] transition-colors"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* Mobile drawer — always full width, independent of the desktop
          collapsed preference. */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <aside className="absolute left-0 top-0 h-full w-64 shadow-2xl">{renderContent(true)}</aside>
        </div>
      )}
    </>
  );
}
