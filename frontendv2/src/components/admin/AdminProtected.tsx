"use client";
// src/components/admin/AdminProtected.tsx
// Ported from pages/admin/AdminProtected.jsx. Used by src/app/admin/layout.tsx
// to gate every /admin/* route. <Navigate> -> useRouter().replace + useEffect,
// since redirects can't happen during render in Next.js Client Components.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminProtected({ children }: { children: React.ReactNode }) {
  const { isLogged, user, authLoading } = useAuth();
  const router = useRouter();

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (authLoading) return;
    if (!isLogged || !user) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) {
      router.replace("/");
    }
  }, [authLoading, isLogged, user, isAdmin, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={40} className="animate-spin text-brand-orange" />
      </div>
    );
  }

  if (!isLogged || !user || !isAdmin) return null;

  return <>{children}</>;
}
