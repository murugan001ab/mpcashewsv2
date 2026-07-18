import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { XCircle, Loader2, ArrowRight } from "lucide-react";

export default function VerifyError() {
  const navigate = useNavigate();

  // Auto redirect after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login");
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-20 pt-32">
      <div className="max-w-md w-full bg-white border border-brand-brown/10 rounded-3xl p-8 md:p-10 shadow-xl flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
        
        {/* ── Error Icon ──────────────────────────────────────────────────── */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-20"></div>
          <div className="relative w-20 h-20 bg-red-50 text-red-500 border border-red-100 rounded-full flex items-center justify-center shadow-sm">
            <XCircle size={40} strokeWidth={2.5} />
          </div>
        </div>

        {/* ── Message ─────────────────────────────────────────────────────── */}
        <h2 className="text-3xl font-extrabold text-brand-black tracking-tight mb-3">
          Verification Failed
        </h2>
        <p className="text-base font-medium text-brand-brown/70 mb-8 leading-relaxed">
          Your verification link appears to be invalid or has expired. Please try requesting a new link.
        </p>

        {/* ── Redirect Indicator ──────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 bg-gray-50 text-brand-brown/60 text-sm font-bold px-5 py-2.5 rounded-full border border-brand-brown/10 mb-8">
          <Loader2 size={16} strokeWidth={3} className="animate-spin text-brand-orange" />
          Redirecting to login...
        </div>

        {/* ── Manual Action ───────────────────────────────────────────────── */}
        <button
          onClick={() => navigate("/login")}
          className="w-full flex items-center justify-center gap-2 bg-brand-black hover:bg-brand-brown text-white py-3.5 rounded-xl font-bold transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5"
        >
          Go to Login <ArrowRight size={18} strokeWidth={2.5} />
        </button>
        
      </div>
    </div>
  );
}