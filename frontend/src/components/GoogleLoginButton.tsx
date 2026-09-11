"use client";
// src/components/GoogleLoginButton.tsx
// Ported as-is from components/GoogleLogin.jsx — kicks off the OAuth
// authorization-code redirect flow (GET /auth/google/login -> redirect).
// No tokens ever touch JS. Google redirects straight back to the BACKEND
// (GOOGLE_REDIRECT_URI = {API}/auth/google/callback), which exchanges the
// code, sets the HttpOnly cookies, and 302s the browser to the frontend at
// /auth/success — see src/app/auth/success/page.tsx for the other half of
// this flow. (src/app/google/callback/page.tsx is just a defensive fallback
// in case anything is ever misconfigured to redirect here instead.)
import api from "@/services/api";

export default function GoogleLoginButton() {
  const handleClick = async () => {
    try {
      const res = await api.get("/auth/google/login");
      const url = res.data?.authorization_url;
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      console.error("Failed to start Google login:", err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full flex items-center justify-center gap-3 cursor-pointer border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-sm py-2.5 rounded-xl transition shadow-sm"
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path
          fill="#FFC107"
          d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.5z"
        />
        <path
          fill="#FF3D00"
          d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
        />
        <path
          fill="#4CAF50"
          d="M24 44c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.7 34.7 27 35.8 24 35.8c-5.3 0-9.7-3.4-11.3-8l-6.6 5C9.7 39.7 16.3 44 24 44z"
        />
        <path
          fill="#1976D2"
          d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.6 5.6C41.7 35.9 44 30.3 44 24c0-1.3-.1-2.7-.4-3.5z"
        />
      </svg>
      Continue with Google
    </button>
  );
}
