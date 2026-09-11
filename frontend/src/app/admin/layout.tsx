"use client";
// src/app/admin/layout.tsx
// Shell for every /admin/* route: auth gate + dark Sidebar + Topbar + content.
import { useEffect, useState } from "react";
import AdminProtected from "@/components/admin/AdminProtected";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  // Desktop-only collapse preference, remembered per browser so it doesn't
  // reset every time the admin navigates or reloads.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    document.title = "Admin — MP Cashews";
    const stored = window.localStorage.getItem("admin-sidebar-collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem("admin-sidebar-collapsed", String(next));
      return next;
    });
  };

  return (
    <AdminProtected>
      <div className="min-h-screen bg-[#F7F5F2]">
        <Sidebar
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />
        <div className={`flex flex-col min-h-screen transition-[padding] duration-200 ${collapsed ? "lg:pl-20" : "lg:pl-64"}`}>
          <Topbar onMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1 px-4 sm:px-8 py-7">{children}</main>
        </div>
      </div>
    </AdminProtected>
  );
}
