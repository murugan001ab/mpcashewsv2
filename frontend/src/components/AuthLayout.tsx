"use client";
// src/components/AuthLayout.tsx
// Ported from pages/Login/AuthLayout.tsx — shared two-pane shell for
// /login and /register. Slides are now admin-managed (see
// src/app/admin/auth-slides) and fetched from GET /auth-slides; the array
// below is only a fallback for the moment before that fetch resolves (or
// if it fails / the admin hasn't added any slides yet).
import { useEffect, useState } from "react";
import type { AuthLayoutProps, SlideItem } from "@/types/authUi";
import { getAuthSlides } from "@/services/authSlideService";
import { assetUrl } from "@/config/env";

// Local brand asset, not random picsum.photos stock photos — this is what
// shows until the admin uploads real slides via /admin/auth-slides (or if
// that fetch fails). Just one real image cycled with a few different
// quotes so it doesn't look like a broken placeholder.
const FALLBACK_SLIDES: SlideItem[] = [
  { image: "/cashews-banner.png", quote: "Nature's finest nuts, delivered with love.", cite: "MP Cashews" },
  { image: "/cashews-banner.png", quote: "Pure. Natural. Delicious — straight from the farm.", cite: "Our Promise" },
  { image: "/cashews-banner.png", quote: "Handpicked goodness, packed with nutrition.", cite: "Quality Since Day One" },
];

const STATS: [string, string][] = [
  ["10K+", "Customers"],
  ["50+", "Products"],
  ["4.8★", "Rated"],
];

const SLIDE_INTERVAL_MS = 4000;

export default function AuthLayout({ children, stats = STATS }: AuthLayoutProps) {
  const [slides, setSlides] = useState<SlideItem[]>(FALLBACK_SLIDES);
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAuthSlides()
      .then((fetched) => {
        if (cancelled || fetched.length === 0) return;
        setSlides(
          fetched.map((s) => ({
            image: assetUrl(s.url) ?? s.url,
            quote: s.quote,
            cite: s.cite ?? "",
          }))
        );
        setCurrent(0);
      })
      .catch(() => {
        // Fall back to the static slides already in state — a failed fetch
        // here shouldn't ever block someone from logging in.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setCurrent((prev) => (prev + 1) % slides.length);
        setAnimating(false);
      }, 500);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [slides.length]);

  const goTo = (index: number) => {
    if (index === current) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrent(index);
      setAnimating(false);
    }, 500);
  };

  const slide = slides[current] ?? slides[0];

  return (
    <div className="flex min-h-screen pt-16 bg-white">
      <div className="relative hidden lg:flex lg:w-[62%] xl:w-[65%] overflow-hidden">
        {slides.map((s, index) => (
          <div
            key={index}
            className="absolute inset-0 bg-cover bg-center transition-all duration-700"
            style={{
              backgroundImage: `url(${s.image})`,
              opacity: current === index ? 1 : 0,
              transform: current === index ? "scale(1.05)" : "scale(1)",
            }}
          />
        ))}

        <div className="absolute inset-0 bg-linear-to-br from-black/70 via-black/40 to-amber-900/50" />
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-64 rounded-full bg-amber-600/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between w-full p-10 xl:p-14">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center shadow-lg">
              <span className="text-amber-900 font-black text-sm tracking-tight">MP</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-none tracking-wide">MP Cashews</h1>
              <p className="text-amber-300 text-[11px] font-medium tracking-widest uppercase mt-0.5">
                Premium Dry Fruits
              </p>
            </div>
          </div>

          <div className="flex-1 flex items-center">
            <div
              className={`max-w-md transition-all duration-500 ${
                animating ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"
              }`}
            >
              <blockquote className="text-white text-2xl xl:text-3xl font-semibold leading-snug mb-4">
                &ldquo;{slide.quote}&rdquo;
              </blockquote>
              <cite className="text-amber-300 text-sm font-medium not-italic tracking-wide">
                — {slide.cite}
              </cite>

              <div className="flex items-center gap-2 mt-8">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goTo(index)}
                    aria-label={`Slide ${index + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      current === index ? "w-8 bg-amber-400" : "w-2 bg-white/30 hover:bg-white/60"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 px-6 py-4">
            <div className="flex items-center divide-x divide-white/20">
              {stats.map(([number, label]) => (
                <div key={label} className="flex-1 text-center px-4 first:pl-0 last:pr-0">
                  <div className="text-amber-300 font-bold text-xl xl:text-2xl leading-none">{number}</div>
                  <div className="text-white/70 text-xs mt-1 tracking-wide">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-stone-50">
        <div className="w-full max-w-[420px]">
          <div className="flex justify-center mb-8 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="MP Cashews" className="h-10 w-auto" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
