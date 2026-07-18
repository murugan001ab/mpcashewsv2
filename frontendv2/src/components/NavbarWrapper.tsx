"use client";
// src/components/NavbarWrapper.tsx
// Replaces the `isAdminRoute` check that used to live inside AppRoutes in the
// old App.tsx — hides the storefront Navbar on every /admin/* route, since
// the admin layout (src/app/admin/layout.tsx) has its own Sidebar instead.
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

export default function NavbarWrapper() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <Navbar />;
}
