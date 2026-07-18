"use client";
// src/app/products/[id]/page.tsx
import React, { useState, useEffect, useContext } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, ShoppingCart, Heart, ChevronLeft, Minus, Plus,
  Truck, ShieldCheck, RefreshCw, Zap, Share2, Check, AlertCircle,
} from "lucide-react";
import api from "@/services/api";
import { AuthContext } from "@/contexts/AuthContext";

const API_HOST = process.env.NEXT_PUBLIC_HOST ?? "";
const getImg = (url?: string | null) =>
  url ? (url.startsWith("http") ? url : `${API_HOST}${url}`) : null;

function fmtWeight(g?: number | null): string {
  if (!g) return "";
  if (g >= 1000) return `${g / 1000}kg`;
  return `${g}g`;
}

interface Variant {
  id: number;
  weight_grams: number;
  price: string;
  discounted_price?: string;
  stock: number;
  sku?: string;
}

interface Product {
  id: number;
  name: string;
  description?: string;
  short_description?: string;
  price: string;
  discounted_price?: string;
  stock?: number;
  sku?: string;
  weight_grams?: number;
  image?: string;
  images?: { url: string }[];
  category?: { name: string };
  variants?: Variant[];
}

export default function ProductDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isLogged } = useContext(AuthContext);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImg, setSelectedImg] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"description" | "specifications" | "reviews">("description");
  const [wishlisted, setWishlisted] = useState(false);
  const [addingCart, setAddingCart] = useState(false);
  const [cartSuccess, setCartSuccess] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

  useEffect(() => {
    api
      .get<Product>(`products/${id}`)
      .then((res) => {
        const data = res.data;
        setProduct(data);
        if (data.variants && data.variants.length > 0) {
          const sorted = [...data.variants].sort((a, b) => a.weight_grams - b.weight_grams);
          setSelectedVariantId(sorted[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const variants: Variant[] = product?.variants
    ? [...product.variants].sort((a, b) => a.weight_grams - b.weight_grams)
    : [];
  const activeVariant: Partial<Variant> =
    variants.find((v) => v.id === selectedVariantId) || variants[0] || {};

  const originalPrice = parseFloat((activeVariant.price ?? product?.price) || "0");
  const finalPrice = parseFloat(
    (activeVariant.discounted_price ?? activeVariant.price ?? product?.discounted_price ?? product?.price) || "0"
  );
  const hasDiscount = originalPrice > finalPrice;
  const discountPct = hasDiscount ? Math.round((1 - finalPrice / originalPrice) * 100) : 0;
  const stockCount = activeVariant.stock ?? product?.stock ?? 0;
  const inStock = stockCount > 0;
  const activeSku = activeVariant.sku || product?.sku;
  const activeWgt = activeVariant.weight_grams || product?.weight_grams;

  useEffect(() => {
    if (quantity > stockCount && stockCount > 0) setQuantity(stockCount);
    if (stockCount === 0) setQuantity(1);
  }, [selectedVariantId, stockCount, quantity]);

  const handleQty = (delta: number) =>
    setQuantity((prev) => Math.max(1, Math.min(prev + delta, stockCount || 99)));

  const handleAddToCart = async () => {
    if (!isLogged) { router.push("/login"); return; }
    setAddingCart(true);
    try {
      await api.post("cart/items", {
        product_id: product!.id,
        variant_id: activeVariant.id,
        quantity,
      });
      setCartSuccess(true);
      setTimeout(() => setCartSuccess(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setAddingCart(false);
    }
  };

  const handleBuyNow = () => {
    router.push(`/payment?buynow=1&product_id=${product!.id}&variant_id=${activeVariant.id}&qty=${quantity}`);
  };

  // ── Loading Skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 pt-24 min-h-screen">
        <div className="w-24 h-6 bg-gray-200 animate-pulse rounded-md mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
          <div className="aspect-square bg-gray-100 animate-pulse rounded-3xl" />
          <div className="flex flex-col gap-6 pt-4">
            <div className="w-1/3 h-6 bg-gray-200 animate-pulse rounded-md" />
            <div className="w-3/4 h-12 bg-gray-200 animate-pulse rounded-xl" />
            <div className="w-full h-16 bg-gray-200 animate-pulse rounded-md" />
            <div className="w-full h-14 bg-gray-200 animate-pulse rounded-xl mt-4" />
          </div>
        </div>
      </div>
    );
  }

  // ── Not Found ─────────────────────────────────────────────────────────────
  if (!product) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 pt-24">
        <div className="w-20 h-20 bg-brand-orange/10 text-brand-orange rounded-full flex items-center justify-center mb-6">
          <AlertCircle size={40} strokeWidth={2} />
        </div>
        <h2 className="text-3xl font-extrabold text-brand-black mb-4">Product Not Found</h2>
        <p className="text-brand-brown/60 mb-8">
          This product might have been removed or is currently unavailable.
        </p>
        <button
          onClick={() => router.push("/")}
          className="bg-brand-black hover:bg-brand-brown text-white px-8 py-3.5 rounded-xl font-bold transition-all"
        >
          Return to Shop
        </button>
      </div>
    );
  }

  const images = product.images?.length ? product.images : [];
  const mainImg =
    images[selectedImg]?.url
      ? getImg(images[selectedImg].url)
      : getImg(product.image);
  const thumbImgs = images.map((i) => getImg(i.url));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 pt-24 min-h-screen">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm font-bold text-brand-brown/60 hover:text-brand-orange transition-colors mb-8 w-fit"
      >
        <ChevronLeft size={16} strokeWidth={2.5} /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 mb-16">
        {/* ── Image Gallery ─────────────────────────────────────────────── */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="relative bg-brand-cream/30 border border-brand-brown/5 rounded-3xl aspect-square flex items-center justify-center overflow-hidden shadow-sm">
            <AnimatePresence mode="wait">
              <motion.img
                key={selectedImg}
                src={mainImg || "https://placehold.co/600x600?text=No+Image"}
                alt={product.name}
                className="w-full h-full object-cover mix-blend-multiply"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </AnimatePresence>

            {hasDiscount && (
              <div className="absolute top-4 left-4 z-10">
                <span className="bg-brand-orange text-white text-xs font-extrabold px-3 py-1.5 rounded-full shadow-sm tracking-wide">
                  {discountPct}% OFF
                </span>
              </div>
            )}

            <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
              <button
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm backdrop-blur-sm border
                  ${wishlisted
                    ? "bg-brand-orange border-brand-orange text-white scale-110"
                    : "bg-white/90 border-white text-brand-brown/50 hover:text-brand-orange"}`}
                onClick={() => setWishlisted((v) => !v)}
              >
                <Heart size={18} fill={wishlisted ? "currentColor" : "none"} strokeWidth={wishlisted ? 0 : 2} />
              </button>
              <button
                className="w-10 h-10 bg-white/90 border border-white text-brand-brown/50 hover:text-brand-orange rounded-full flex items-center justify-center transition-all duration-300 shadow-sm backdrop-blur-sm"
                onClick={() => navigator.share?.({ title: product.name, url: window.location.href })}
              >
                <Share2 size={18} strokeWidth={2} />
              </button>
            </div>
          </div>

          {thumbImgs.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {thumbImgs.map((src, i) => (
                <button
                  key={i}
                  className={`w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all duration-200 bg-brand-cream/30 ${
                    selectedImg === i
                      ? "border-brand-orange ring-2 ring-brand-orange/20"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                  onClick={() => setSelectedImg(i)}
                >
                  <img src={src ?? ""} alt={`Thumbnail ${i}`} className="w-full h-full object-cover mix-blend-multiply" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Product Info ──────────────────────────────────────────────── */}
        <div className="lg:col-span-6 flex flex-col pt-2 lg:pt-6">
          <div className="mb-4">
            {product.category?.name && (
              <span className="text-xs uppercase tracking-widest font-extrabold text-brand-orange/80 mb-2 block">
                {product.category.name}
              </span>
            )}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-brand-black tracking-tight leading-tight">
              {product.name}
            </h1>
          </div>

          <div className="flex items-center gap-2 mb-6">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={16} fill={s <= 4 ? "var(--amber)" : "none"} stroke="var(--amber)" strokeWidth={2} className="text-brand-orange" />
              ))}
            </div>
            <span className="text-sm font-semibold text-brand-brown/60 underline decoration-brand-brown/20 cursor-pointer hover:text-brand-orange transition-colors">
              4.8 (124 reviews)
            </span>
          </div>

          <div className="flex flex-wrap items-end gap-3 mb-6">
            <span className="text-4xl font-extrabold text-brand-black tracking-tight">
              ₹{finalPrice.toFixed(0)}
            </span>
            {hasDiscount && (
              <span className="text-lg font-bold text-brand-brown/40 line-through mb-1">
                ₹{originalPrice.toFixed(0)}
              </span>
            )}
            {hasDiscount && (
              <span className="bg-brand-green/10 text-brand-green text-xs font-bold px-2 py-1 rounded-md mb-1.5 border border-brand-green/20">
                Save ₹{(originalPrice - finalPrice).toFixed(0)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mb-6">
            <span className="relative flex h-2.5 w-2.5">
              {inStock && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-40" />}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${inStock ? "bg-brand-green" : "bg-red-500"}`} />
            </span>
            <span className={`text-sm font-bold ${inStock ? "text-brand-green" : "text-red-500"}`}>
              {inStock ? `In Stock (${stockCount} available)` : "Out of Stock"}
            </span>
          </div>

          {product.short_description && (
            <p className="text-base text-brand-brown/80 leading-relaxed mb-6">
              {product.short_description}
            </p>
          )}

          {/* Variant Selector */}
          {variants.length > 0 && (
            <div className="mb-8">
              <span className="block text-[11px] font-bold uppercase tracking-widest text-brand-brown/70 mb-3">
                Select Weight
              </span>
              <div className="flex flex-wrap gap-2.5">
                {variants.map((v) => {
                  const isSelected = selectedVariantId === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 border-2
                        ${isSelected
                          ? "bg-brand-orange/10 border-brand-orange text-brand-orange shadow-sm"
                          : "bg-white border-brand-brown/10 text-brand-brown/70 hover:border-brand-orange/40 hover:text-brand-orange"}`}
                    >
                      {fmtWeight(v.weight_grams)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <hr className="border-brand-brown/10 mb-6" />

          {/* Attributes */}
          <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
            {activeWgt && (
              <div className="bg-gray-50 rounded-xl p-3 border border-brand-brown/5">
                <span className="block text-[11px] font-bold uppercase tracking-widest text-brand-brown/50 mb-1">Weight</span>
                <span className="font-extrabold text-brand-black">{fmtWeight(activeWgt)}</span>
              </div>
            )}
            {activeSku && (
              <div className="bg-gray-50 rounded-xl p-3 border border-brand-brown/5">
                <span className="block text-[11px] font-bold uppercase tracking-widest text-brand-brown/50 mb-1">SKU</span>
                <span className="font-extrabold text-brand-black">{activeSku}</span>
              </div>
            )}
          </div>

          {/* Quantity & Actions */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex items-center justify-between w-full sm:w-36 h-14 bg-white border border-brand-brown/10 rounded-xl px-2 shadow-sm">
              <button
                onClick={() => handleQty(-1)}
                disabled={quantity <= 1}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-brand-orange hover:bg-brand-orange/10 disabled:opacity-30 transition-colors"
              >
                <Minus size={16} strokeWidth={2.5} />
              </button>
              <span className="font-bold text-lg text-brand-black tabular-nums">{quantity}</span>
              <button
                onClick={() => handleQty(1)}
                disabled={quantity >= (stockCount || 99)}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-brand-orange hover:bg-brand-orange/10 disabled:opacity-30 transition-colors"
              >
                <Plus size={16} strokeWidth={2.5} />
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={addingCart || !inStock}
              className={`flex-1 flex items-center justify-center gap-2 h-14 rounded-xl font-bold text-[15px] transition-all duration-300 border
                ${cartSuccess
                  ? "bg-brand-green border-brand-green text-white shadow-md"
                  : "bg-brand-orange/10 border-brand-orange/20 text-brand-orange hover:bg-brand-orange hover:text-white disabled:opacity-50"}`}
            >
              {cartSuccess ? (
                <><Check size={18} strokeWidth={2.5} /> Added to Cart</>
              ) : (
                <><ShoppingCart size={18} strokeWidth={2.5} /> {addingCart ? "Adding…" : "Add to Cart"}</>
              )}
            </button>

            <button
              onClick={handleBuyNow}
              disabled={!inStock}
              className="flex-1 flex items-center justify-center gap-2 h-14 bg-brand-black text-white hover:bg-brand-brown rounded-xl font-bold text-[15px] transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <Zap size={18} strokeWidth={2.5} className="text-brand-orange" /> Buy Now
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {([
              { icon: Truck, text: "Free Delivery" },
              { icon: ShieldCheck, text: "100% Natural" },
              { icon: RefreshCw, text: "Easy Returns" },
            ] as const).map(({ icon: Icon, text }) => (
              <div key={text} className="flex flex-col items-center justify-center text-center p-3 rounded-xl bg-gray-50 border border-brand-brown/5 gap-2">
                <Icon size={20} className="text-brand-orange" strokeWidth={2} />
                <span className="text-[10px] font-bold text-brand-black uppercase tracking-wider">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Details Tabs ──────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto mt-16 md:mt-24">
        <div className="flex border-b border-brand-brown/10 overflow-x-auto mb-8">
          {(["description", "specifications", "reviews"] as const).map((t) => {
            const isActive = activeTab === t;
            return (
              <button
                key={t}
                className={`flex-1 py-4 px-6 text-sm md:text-base font-extrabold uppercase tracking-widest whitespace-nowrap transition-colors relative
                  ${isActive ? "text-brand-black" : "text-brand-brown/40 hover:text-brand-orange"}`}
                onClick={() => setActiveTab(t)}
              >
                {t}
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-orange"
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="min-h-[200px] p-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "description" && (
                <div className="prose max-w-none text-brand-brown/80 leading-loose">
                  <p>{product.description || "No description available for this product."}</p>
                </div>
              )}

              {activeTab === "specifications" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                  {[
                    { label: "Weight", value: activeWgt ? fmtWeight(activeWgt) : null },
                    { label: "SKU", value: activeSku },
                    { label: "Category", value: product.category?.name },
                    { label: "Availability", value: inStock ? "In Stock" : "Out of Stock", isBadge: true },
                  ]
                    .filter((item) => item.value)
                    .map((item, idx) => (
                      <div key={idx} className="flex justify-between py-3 border-b border-brand-brown/5">
                        <span className="font-bold text-brand-brown/60 text-sm">{item.label}</span>
                        {item.isBadge ? (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${inStock ? "bg-brand-green/10 text-brand-green" : "bg-red-100 text-red-600"}`}>
                            {item.value}
                          </span>
                        ) : (
                          <span className="font-bold text-brand-black text-sm">{item.value}</span>
                        )}
                      </div>
                    ))}
                </div>
              )}

              {activeTab === "reviews" && (
                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-brand-brown/10 rounded-3xl bg-gray-50">
                  <Star size={32} className="text-brand-brown/20 mb-3" />
                  <p className="text-brand-black font-bold mb-1">No reviews yet</p>
                  <p className="text-sm text-brand-brown/50">Be the first to review this product!</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
