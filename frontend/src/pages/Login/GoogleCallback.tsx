// src/pages/Login/GoogleCallback.tsx
//
// NEW FILE — this route did not exist before, even though the backend's
// GOOGLE_REDIRECT_URI (see backend/.env) points here: it's the page Google
// sends the browser back to after the user approves sign-in.
//
// Flow:
//   1. GoogleLoginButton redirects to Google's consent screen.
//   2. Google redirects back to this page with ?code=...
//   3. We hand that code to the backend, which exchanges it with Google,
//      sets httpOnly auth cookies, and returns { user_id, role }.
//   4. We then call /users/me to populate the full profile and finish login.
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { AuthContext } from "../../contexts/AuthContext";
import api from "../../services/api";
import { getLocalCart, clearLocalCart } from "../../utils/localcart";

export default function GoogleCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setIsLogged, setUser } = React.useContext(AuthContext);
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
        await api.get("auth/google/callback", { params: { code } });
        const { data: userData } = await api.get("users/me");
        setUser(userData);
        setIsLogged(true);

        // Merge any guest cart, same as the email/password login flow
        const guestCart = getLocalCart();
        if (guestCart.length) {
          for (const item of guestCart) {
            try {
              await api.post("cart/items", {
                product_id: item.id,
                quantity: item.qty ?? item.quantity ?? 1,
              });
            } catch {
              /* ignore individual item failures */
            }
          }
          clearLocalCart();
        }

        navigate(userData.role === "admin" ? "/admin" : "/", { replace: true });
      } catch (err) {
        console.error("Google login failed:", err);
        setError("Google sign-in failed. Please try again.");
      }
    })();
  }, [params, navigate, setIsLogged, setUser]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
      {error ? (
        <>
          <AlertCircle className="text-red-500" size={32} />
          <p className="text-stone-700 font-medium">{error}</p>
          <button
            onClick={() => navigate("/login")}
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
