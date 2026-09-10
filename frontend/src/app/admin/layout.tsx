"use client";
// src/app/admin/layout.tsx
// Shell for every /admin/* route: auth gate + dark Sidebar + Topbar + content.
import { useEffect, useState } from "react";
import AdminProtected from "@/components/admin/AdminProtected";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.title = "Admin — MP Cashews";
  }, []);

  return (
    <AdminProtected>
      <div className="min-h-screen bg-[#F7F5F2]">
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="lg:pl-64 flex flex-col min-h-screen">
          <Topbar onMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1 px-4 sm:px-8 py-7">{children}</main>
        </div>
      </div>
    </AdminProtected>
  );
}
