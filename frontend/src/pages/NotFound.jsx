import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { SearchX, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-20 pt-32 text-center animate-in fade-in duration-700">
      
      {/* ── Visual Icon ─────────────────────────────────────────────────── */}
      <div className="relative mb-8 z-10">
        <div className="absolute inset-0 bg-brand-orange/20 rounded-full animate-pulse blur-xl"></div>
        <div className="relative w-24 h-24 bg-brand-orange/10 text-brand-orange border border-brand-orange/20 rounded-full flex items-center justify-center shadow-sm mx-auto transition-transform hover:scale-105 duration-300">
          <SearchX size={40} strokeWidth={2} />
        </div>
      </div>

      {/* ── 404 Watermark ───────────────────────────────────────────────── */}
      <h1 className="text-[10rem] md:text-[14rem] leading-none font-extrabold text-brand-black tracking-tighter opacity-5 mb-[-4rem] md:mb-[-6rem] select-none pointer-events-none">
        404
      </h1>

      {/* ── Message Content ─────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center max-w-md">
        <h2 className="text-3xl md:text-4xl font-extrabold text-brand-black tracking-tight mb-4">
          Page Not Found
        </h2>
        <p className="text-base font-medium text-brand-brown/70 mb-10 leading-relaxed px-4">
          Oops! The page you're looking for seems to have gone missing or doesn't exist anymore. Let's get you back on track.
        </p>

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full px-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white hover:bg-brand-cream border border-brand-brown/10 text-brand-black px-8 py-3.5 rounded-xl font-bold transition-colors shadow-sm"
          >
            <ArrowLeft size={18} strokeWidth={2.5} className="text-brand-brown/50" /> 
            Go Back
          </button>
          
          <Link to="/" className="w-full sm:w-auto">
            <button className="w-full flex items-center justify-center gap-2 bg-brand-black hover:bg-brand-brown text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5">
              <Home size={18} strokeWidth={2.5} className="text-brand-orange" /> 
              Back to Home
            </button>
          </Link>
        </div>
      </div>

    </div>
  );
}