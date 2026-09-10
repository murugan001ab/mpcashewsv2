"use client";
// src/app/auth/success/page.tsx
//
// Landing page for the Google OAuth flow. The backend now handles the full
// code<->token exchange itself (see backend app/services/auth.py
// google_callback) and sets HttpOnly access/refresh cookies before issuing
// a 302 redirect here — no `code` or token is ever present in this URL.
//
// All this page has to do is confirm the cookie landed (GET /users/me),
// merge any guest cart, and send the user on to home/admin. If the cookie
// somehow didn't land, send them back to login.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import { getLocalCart, clearLocalCart } from "@/utils/localCart";
import type { User } from "@/types";

export default function AuthSuccess() {
  const router = useRouter();
  const { setIsLogged, setUser } = useAuth();
  const [error, setError] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // StrictMode double-invoke guard
    ran.current = true;

    (async () => {
      try {
        const { data: userData } = await api.get<User>("/users/me");
        setUser(userData);
        setIsLogged(true);

        const guestCart = getLocalCart();
        if (guestCart.length) {
          for (const item of guestCart) {
            try {
              await api.post("/cart/items", {
                variant_id: item.product_id,
                quantity: item.quantity ?? 1,
              });
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
  }, [router, setIsLogged, setUser]);

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
