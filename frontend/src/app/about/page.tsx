"use client";
// src/app/about/page.tsx
// Public "About Us" page. Hero copy + main story content are admin-editable
// (Admin → About), same trust model as blog post content (rendered as-is
// via dangerouslySetInnerHTML). Gallery images are grouped by category —
// farm, factory, product, sales — and only rendered if that category has
// at least one active image, so an empty category never shows a blank
// section on launch day.
import { useEffect, useState } from "react";
import { Loader2, Leaf, Factory, Package, Users } from "lucide-react";
import * as aboutService from "@/services/aboutService";
import { assetUrl } from "@/config/env";
import type { AboutPage, AboutImage, AboutImageCategory } from "@/types";

const CATEGORY_META: Record<AboutImageCategory, { label: string; icon: typeof Leaf }> = {
  farm: { label: "Our Farm", icon: Leaf },
  factory: { label: "Our Factory", icon: Factory },
  product: { label: "Our Products", icon: Package },
  sales: { label: "Meet Our Team", icon: Users },
};

const CATEGORY_ORDER: AboutImageCategory[] = ["farm", "factory", "product", "sales"];

// Shown until the admin fills in real content via Admin → About, so the
// page never looks broken/empty before that first edit.
const FALLBACK_HERO_TITLE = "About MP Cashews";
const FALLBACK_HERO_SUBTITLE =
  "Panruti-native cashews, hand-picked and processed with care — retail and wholesale, every grade including W240.";
const FALLBACK_CONTENT = `
  <p>MP Cashews is rooted in Panruti, Tamil Nadu — one of India's most respected cashew-growing regions. We work directly with the farms our cashews come from, so quality is controlled from the tree all the way to your doorstep, with no unnecessary middlemen in between.</p>
  <p>We serve both retail customers looking for a genuinely premium pack at home, and wholesale partners — retailers, distributors, hotels, and exporters — who need consistent bulk supply they can rely on. Every major grade is available, including the widely sought-after W240.</p>
  <p>Hand-picked, sun-dried the traditional way, and packed in clean, hygienic conditions with no preservatives — that's the standard we hold ourselves to on every batch.</p>
`;

export default function AboutPagePublic() {
  const [about, setAbout] = useState<AboutPage | null>(null);
  const [images, setImages] = useState<AboutImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([aboutService.getAboutPage(), aboutService.listAboutImages()])
      .then(([aboutRes, imagesRes]) => {
        if (cancelled) return;
        setAbout(aboutRes);
        setImages(imagesRes);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 min-h-screen pt-24">
        <Loader2 size={28} className="animate-spin text-brand-orange" />
      </div>
    );
  }

  const heroTitle = about?.hero_title || FALLBACK_HERO_TITLE;
  const heroSubtitle = about?.hero_subtitle || FALLBACK_HERO_SUBTITLE;
  const content = about?.content || FALLBACK_CONTENT;

  const imagesByCategory = CATEGORY_ORDER.map((category) => ({
    category,
    items: images.filter((img) => img.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="bg-brand-cream min-h-screen pt-16 lg:pt-20">
      {/* Hero */}
      <section className="bg-brand-black py-20 px-4 sm:px-8 relative overflow-hidden">
        <div className="absolute -left-32 top-0 w-96 h-96 rounded-full bg-brand-orange opacity-10 blur-[100px] pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10 text-center flex flex-col items-center gap-4">
          <span className="text-brand-orange text-xs font-black uppercase tracking-[0.2em]">About Us</span>
          <h1 className="text-3xl sm:text-5xl font-black text-white uppercase leading-tight">{heroTitle}</h1>
          {heroSubtitle && (
            <p className="max-w-2xl text-white/70 text-base sm:text-lg leading-relaxed">{heroSubtitle}</p>
          )}
        </div>
      </section>

      {/* Story content — admin-authored HTML */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-16">
        <div
          className="prose max-w-none text-brand-brown/85 leading-loose prose-headings:text-brand-black prose-a:text-brand-orange"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </section>

      {/* Image galleries, grouped by category */}
      {imagesByCategory.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-8 pb-20 flex flex-col gap-14">
          {imagesByCategory.map(({ category, items }) => {
            const { label, icon: Icon } = CATEGORY_META[category];
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-brand-orange/10 flex items-center justify-center text-brand-orange">
                    <Icon size={18} />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-brand-black uppercase tracking-tight">
                    {label}
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {items.map((img) => (
                    <figure key={img.id} className="rounded-2xl overflow-hidden bg-white shadow-sm">
                      <div className="aspect-square bg-brand-cream/30">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={assetUrl(img.url) ?? ""}
                          alt={img.caption || label}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {img.caption && (
                        <figcaption className="px-3 py-2 text-xs text-brand-brown/60 text-center">
                          {img.caption}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
