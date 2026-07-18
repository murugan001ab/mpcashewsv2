"use client";
// src/components/AuthGuard.tsx
// Replaces the old <PrivateRoute> wrapper from react-router. Wrap any page
// component that requires login, e.g.:
//   export default function WishlistPage() {
//     return <AuthGuard><WishlistContent /></AuthGuard>;
//   }
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLogged, authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isLogged) router.push("/login");
  }, [isLogged, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="animate-pulse text-brand-brown">Loading...</span>
      </div>
    );
  }
  if (!isLogged) return null;
  return <>{children}</>;
}
