// src/components/GoogleLogin.jsx
//
// FIXED: previously used Google Identity Services (GSI) to get an ID token
// and POST it to "auth/google/" — a route that does not exist on the
// backend — then stored the resulting tokens in localStorage, which
// directly contradicts this app's httpOnly-cookie-only auth design.
//
// The backend only supports the OAuth *authorization code* redirect flow:
//   1. GET /auth/google/login  -> { authorization_url }
//   2. Browser is redirected to Google, then back to GOOGLE_REDIRECT_URI
//      (a frontend route, see backend .env) with ?code=...
//   3. That frontend route (see pages/Login/GoogleCallback.tsx) calls
//      GET /auth/google/callback?code=... which sets httpOnly cookies
//      and returns { user_id, role } — no tokens ever touch JS.
//
// So this button simply kicks off step 1 with a normal redirect.
import api from "../services/api";

export default function GoogleLoginButton() {
  const handleClick = async () => {
    try {
      const res = await api.get("auth/google/login");
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
      className="w-full flex items-center justify-center gap-3 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-sm py-2.5 rounded-xl transition shadow-sm"
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
        <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.7 34.7 27 35.8 24 35.8c-5.3 0-9.7-3.4-11.3-8l-6.6 5C9.7 39.7 16.3 44 24 44z"/>
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.6 5.6C41.7 35.9 44 30.3 44 24c0-1.3-.1-2.7-.4-3.5z"/>
      </svg>
      Continue with Google
    </button>
  );
}
