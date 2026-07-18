import React from "react";
// import { Handshake } from "lucide-react"; // Uncomment if you bring the header back

export default function BecomePartner() {
  return (
    // Changed `min-h-screen` to `h-screen` and adjusted padding so it fits exactly in the viewport
    <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 pt-24 pb-6 h-screen flex flex-col items-center">
      
      {/* ── Form Container ──────────────────────────────────────────────── */}
      {/* Replaced fixed heights (h-[800px]) with `flex-1` so it perfectly fills the remaining space */}
      <div className="w-full flex-1 bg-white border border-brand-brown/10 rounded-3xl overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-8 duration-700 relative">
        
        {/* Optional loading placeholder behind the iframe */}
        <div className="absolute inset-0 flex items-center justify-center -z-10 bg-gray-50 text-brand-brown/40 font-semibold text-sm animate-pulse">
          Loading Form...
        </div>

        <iframe
          src="https://docs.google.com/forms/d/e/1FAIpQLScbJBZO1jjT62SCXM4CDFWisBHJ8oTP0WoWbeoUVZs1mIC8DA/viewform?embedded=true"
          width="100%"
          height="100%"
          className="w-full h-full border-none bg-transparent"
          title="Partner Application Form"
        >
          Loading…
        </iframe>
      </div>
      
    </div>
  );
}