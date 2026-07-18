import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { MailCheck, Loader2 } from "lucide-react";

export default function EmailVerified() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setUser, setAccessToken, setIsLogged } = useContext(AuthContext);

  useEffect(() => {
    const access = params.get("access");
    const refresh = params.get("refresh");

    if (!access || !refresh) {
      navigate("/verify-error");
      return;
    }

    // decode user
    const user = jwtDecode(access);
    setUser(user);

    // save tokens
    setAccessToken(access);
    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);

    setIsLogged(true);

    // ⏳ Delay redirect for 3 seconds
    const timer = setTimeout(() => {
      navigate("/");
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate, params, setAccessToken, setIsLogged, setUser]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-20 pt-32">
      <div className="max-w-md w-full bg-white border border-brand-brown/10 rounded-3xl p-8 md:p-10 shadow-xl flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
        
        {/* ── Success Icon ────────────────────────────────────────────────── */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
          <div className="relative w-20 h-20 bg-green-50 text-green-500 border border-green-100 rounded-full flex items-center justify-center shadow-sm">
            <MailCheck size={40} strokeWidth={2.5} />
          </div>
        </div>

        {/* ── Message ─────────────────────────────────────────────────────── */}
        <h2 className="text-3xl font-extrabold text-brand-black tracking-tight mb-3">
          Email Verified! <span className="inline-block animate-bounce origin-bottom">🎉</span>
        </h2>
        <p className="text-base font-medium text-brand-brown/70 mb-10 leading-relaxed">
          Your email address has been successfully confirmed. Your account is now fully active.
        </p>

        {/* ── Redirect Indicator ──────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 bg-brand-orange/10 text-brand-orange text-sm font-bold px-5 py-2.5 rounded-full border border-brand-orange/20">
          <Loader2 size={16} strokeWidth={3} className="animate-spin" />
          Redirecting to home...
        </div>
      </div>
    </div>
  );
}