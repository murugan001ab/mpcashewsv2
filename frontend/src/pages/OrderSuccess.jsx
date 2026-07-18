import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { CheckCircle2, Package, Home, Star, ChevronRight } from "lucide-react";

export default function OrderSuccess() {
  const { id } = useParams();
  const [visible, setVisible] = useState(false);
  
  useEffect(() => { 
    const timer = setTimeout(() => setVisible(true), 100); 
    return () => clearTimeout(timer);
  }, []);

  const steps = [
    { label: "Confirmed", done: true },
    { label: "Packing",   done: false },
    { label: "Shipped",   done: false },
    { label: "Delivered", done: false },
  ];

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-16 pt-24">
      
      <div 
        className={`relative max-w-lg w-full bg-white border border-brand-brown/10 rounded-3xl p-8 md:p-10 shadow-xl flex flex-col items-center text-center transition-all duration-700 ease-out transform ${
          visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-10 scale-95"
        }`}
      >
        
        {/* ── Success Icon with Pulse Effect ────────────────────────────── */}
        <div className="relative mb-6 mt-2">
          <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
          <div className="absolute inset-0 bg-green-200 rounded-full animate-pulse opacity-40 scale-150"></div>
          <div className="relative w-20 h-20 bg-green-50 text-green-500 border border-green-100 rounded-full flex items-center justify-center shadow-sm">
            <CheckCircle2 size={40} strokeWidth={2.5} />
          </div>
        </div>

        {/* ── Typography ────────────────────────────────────────────────── */}
        <h1 className="text-3xl font-extrabold text-brand-black tracking-tight mb-3">
          Order Placed!
        </h1>
        <p className="text-sm md:text-base font-medium text-brand-brown/70 mb-6 leading-relaxed px-4">
          Thank you for your order. We're packing your premium cashews and will dispatch them shortly.
        </p>

        {/* ── Order ID Badge ────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 bg-brand-orange/10 border border-brand-orange/20 text-brand-orange text-sm font-bold px-5 py-2 rounded-full mb-10 shadow-sm">
          <Package size={16} strokeWidth={2.5} />
          Order #{id || "0000"}
        </div>

        {/* ── Order Tracker ─────────────────────────────────────────────── */}
        <div className="w-full relative z-0 mb-12">
          {/* Background Connecting Line */}
          <div className="absolute top-4 left-[12%] right-[12%] h-1 bg-gray-100 -z-10 rounded-full"></div>
          
          <div className="flex justify-between w-full">
            {steps.map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-2.5 relative z-10 flex-1">
                {/* Dot */}
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors shadow-sm ${
                    s.done 
                      ? "bg-green-500 text-white ring-4 ring-white" 
                      : "bg-white text-brand-brown/40 border-2 border-gray-200 ring-4 ring-white"
                  }`}
                >
                  {s.done ? <CheckCircle2 size={16} strokeWidth={3} /> : i + 1}
                </div>
                {/* Label */}
                <span className={`text-[10px] uppercase tracking-widest font-bold ${
                  s.done ? "text-brand-black" : "text-brand-brown/40"
                }`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className="w-full flex flex-col sm:flex-row gap-3 mb-6">
          <Link to="/account" className="flex-1">
            <button className="w-full flex items-center justify-center gap-2 bg-brand-black hover:bg-brand-brown text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
              <Package size={18} strokeWidth={2.5} /> Track Order
            </button>
          </Link>
          <Link to="/" className="flex-1">
            <button className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-brand-brown/10 text-brand-black font-bold py-3.5 px-6 rounded-xl transition-colors shadow-sm">
              <Home size={18} strokeWidth={2.5} /> Home
            </button>
          </Link>
        </div>

        {/* ── Footer Note ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 text-xs font-bold text-brand-brown/50 bg-gray-50 px-4 py-2 rounded-lg">
          <Star size={14} className="text-brand-orange" fill="currentColor" />
          You can leave a review after delivery!
        </div>

      </div>
    </div>
  );
}