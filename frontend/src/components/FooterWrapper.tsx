"use client";
// src/components/FooterWrapper.tsx
// Mirrors NavbarWrapper — hides the storefront Footer on every /admin/*
// route, since the admin layout has its own chrome.
import { usePathname } from "next/navigation";
import Footer from "./Footer";

export default function FooterWrapper() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <Footer />;
}
