"use client";
// src/app/google/callback/page.tsx
// Ported from pages/Login/GoogleCallback.tsx. useSearchParams() requires a
// Suspense boundary in the App Router, hence the wrapper at the bottom.
import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import { getLocalCart, clearLocalCart } from "@/utils/localCart";
import type { User } from "@/types";

function GoogleCallbackContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { setIsLogged, setUser } = useAuth();
  const [error, setError] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // StrictMode double-invoke guard
    ran.current = true;

    const code = params.get("code");
    if (!code) {
      setError("Missing authorization code from Google.");
      return;
    }

    (async () => {
      try {
        await api.get("/auth/google/callback", { params: { code } });
        const { data: userData } = await api.get<User>("/users/me");
        setUser(userData);
        setIsLogged(true);

        const guestCart = getLocalCart();
        if (guestCart.length) {
          for (const item of guestCart) {
            try {
              await api.post("/cart/items", { variant_id: item.product_id, quantity: item.quantity ?? 1 });
            } catch {
              /* ignore individual item failures */
            }
          }
          clearLocalCart();
        }

        router.replace(userData.role === "admin" ? "/admin" : "/");
      } catch (err) {
        console.error("Google login failed:", err);
        setError("Google sign-in failed. Please try again.");
      }
    })();
  }, [params, router, setIsLogged, setUser]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
      {error ? (
        <>
          <AlertCircle className="text-red-500" size={32} />
          <p className="text-stone-700 font-medium">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="text-amber-600 font-semibold hover:text-amber-700 transition"
          >
            Back to login
          </button>
        </>
      ) : (
        <>
          <Loader2 className="animate-spin text-amber-500" size={32} />
          <p className="text-stone-500 text-sm font-medium">Signing you in…</p>
        </>
      )}
    </div>
  );
}

export default function GoogleCallback() {
  return (
    <Suspense fallback={null}>
      <GoogleCallbackContent />
    </Suspense>
  );
}
