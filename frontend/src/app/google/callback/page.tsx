"use client";
// src/app/google/callback/page.tsx
//
// Defensive fallback only. The real Google OAuth callback is handled by the
// BACKEND at {API}/auth/google/callback (see backend app/services/auth.py
// google_callback), which sets the HttpOnly cookies itself and 302-redirects
// the browser straight to /auth/success — this frontend route should never
// actually be hit in normal operation.
//
// It exists purely so that if GOOGLE_REDIRECT_URI (or the Google Cloud
// Console "Authorized redirect URI") is ever misconfigured to point here
// instead of the backend, the user gets bounced to the real handler instead
// of a 404.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GoogleCallbackFallback() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/auth/success");
  }, [router]);

  return null;
}
