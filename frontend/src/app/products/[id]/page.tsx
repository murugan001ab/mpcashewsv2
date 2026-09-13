"use client";
// src/app/products/[id]/page.tsx
import React, { useState, useEffect, useContext, useRef, useCallback, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, ShoppingCart, Heart, ChevronLeft, Minus, Plus,
  Truck, ShieldCheck, RefreshCw, Zap, Share2, AlertCircle, Loader2,
} from "lucide-react";
import api from "@/services/api";
import * as productService from "@/services/productService";
import { AuthContext } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import ProductCard, { type ProductWithVariant } from "@/components/ProductCard";
import type { Product as RelatedProduct } from "@/types";
import { useInfiniteRowSentinel } from "@/hooks/useInfiniteRowSentinel";

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
  category?: { id: string; name: string };
  variants?: Variant[];
}

function ProductDetailsPageInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLogged } = useContext(AuthContext);
  const { addToCart, increment, decrement, cartItems } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImg, setSelectedImg] = useState(0);
  const [activeTab, setActiveTab] = useState<"description" | "specifications" | "reviews">("description");
  const [addingCart, setAddingCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [relatedPage, setRelatedPage] = useState(1);
  const [relatedHasMore, setRelatedHasMore] = useState(false);
  const [relatedLoadingMore, setRelatedLoadingMore] = useState(false);
  const RELATED_PAGE_SIZE = 8;
  const relatedRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get<Product>(`products/${id}`)
      .then((res) => {
        const data = res.data;
        setProduct(data);
        if (data.variants && data.variants.length > 0) {
          const sorted = [...data.variants].sort((a, b) => a.weight_grams - b.weight_grams);
          // Honor ?variant=<id> from the shop grid (VariantProductCard links
          // here as /products/{id}?variant={variantId}) so clicking the
          // "1kg" card lands with 1kg pre-selected instead of silently
          // resetting to the lightest variant.
          const variantParam = searchParams.get("variant");
          const matched = variantParam ? sorted.find((v) => String(v.id) === variantParam) : undefined;
          setSelectedVariantId((matched ?? sorted[0]).id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    // Only re-fetch when the product id changes — searchParams is read once
    // per product load, not on every subsequent param change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Related products: same category, current product excluded. Paginated —
  // more pages load automatically as the user scrolls the row (see the
  // sentinel at the end of the related-products list further down).
  useEffect(() => {
    const categoryId = product?.category?.id;
    setRelatedPage(1);
    if (!categoryId) {
      setRelatedProducts([]);
      setRelatedHasMore(false);
      return;
    }
    let cancelled = false;
    productService
      .listProducts({ category_id: categoryId, page: 1, page_size: RELATED_PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        const items = (res.items || []).filter((p) => String(p.id) !== String(product!.id));
        setRelatedProducts(items);
        setRelatedHasMore((res.total ?? 0) > RELATED_PAGE_SIZE);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [product?.category?.id, product?.id]);

  const loadMoreRelated = useCallback(() => {
    const categoryId = product?.category?.id;
    if (!categoryId || relatedLoadingMore || !relatedHasMore) return;
    setRelatedLoadingMore(true);
    const nextPage = relatedPage + 1;
    productService
      .listProducts({ category_id: categoryId, page: nextPage, page_size: RELATED_PAGE_SIZE })
      .then((res) => {
        const newItems = (res.items || []).filter(
          (p) => String(p.id) !== String(product!.id)
        );
        setRelatedProducts((prev) => {
          const existingIds = new Set(prev.map((p) => String(p.id)));
          return [...prev, ...newItems.filter((p) => !existingIds.has(String(p.id)))];
        });
        setRelatedPage(nextPage);
        setRelatedHasMore(nextPage * RELATED_PAGE_SIZE < (res.total ?? 0));
      })
      .catch(console.error)
      .finally(() => setRelatedLoadingMore(false));
  }, [product?.category?.id, product?.id, relatedPage, relatedHasMore, relatedLoadingMore]);

  const relatedSentinelRef = useInfiniteRowSentinel(relatedRowRef, loadMoreRelated, {
    enabled: relatedHasMore && !relatedLoadingMore,
  });

  const findRelatedCartItem = (p: ProductWithVariant) =>
    cartItems.find((i) => i.variant?.id === p.selectedVariant?.id);

  const detailCartItem = cartItems.find((i) => i.variant?.id === String(activeVariant.id ?? ""));

  const handleRelatedAdd = (p: ProductWithVariant) => {
    if (!p.selectedVariant) return;
    const variant = p.selectedVariant;
    const price = parseFloat(variant.discounted_price ?? variant.price ?? "0");
    const primaryImage = p.images?.find((i) => i.is_primary) ?? p.images?.[0];
    addToCart(variant.id, 1, { name: p.name, price, image: primaryImage?.url });
  };

  const handleRelatedIncrement = (p: ProductWithVariant) => {
    const item = findRelatedCartItem(p);
    if (item) increment(item);
  };

  const handleRelatedDecrement = (p: ProductWithVariant) => {
    const item = findRelatedCartItem(p);
    if (item) decrement(item);
  };

  const handleRelatedBuyNow = async (p: ProductWithVariant) => {
    if (!isLogged) { router.push("/login"); return; }
    if (!p.selectedVariant) return;
    handleRelatedAdd(p);
    router.push("/checkout");
  };

  const handleAddToCart = async () => {
    if (!isLogged) { router.push("/login"); return; }
    if (!activeVariant.id) return;
    setAddingCart(true);
    try {
      // Go through CartContext instead of calling the API directly, so the
      // navbar badge and /cart page pick up the change immediately instead
      // of only after their own next reload.
      await addToCart(String(activeVariant.id), 1);
    } catch (e) {
      console.error(e);
    } finally {
      setAddingCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (buyingNow) return; // guard against double-tap adding twice / opening checkout twice
    if (!isLogged) { router.push("/login"); return; }
    if (!activeVariant.id) return;
    setBuyingNow(true);
    try {
      if (!detailCartItem) {
        await addToCart(String(activeVariant.id), 1);
      }
      router.push("/checkout");
    } catch (e) {
      console.error(e);
      setBuyingNow(false);
    }
  };

  // ── Loading Skeleton ───────────────────────────────────────────────
  // Mirrors the real layout's own breakpoints (grid-cols-1 -> lg:grid-cols-12,
  // flex-col -> sm:flex-row action buttons, etc) with sizes tuned per
  // breakpoint, rather than one desktop-sized block shrunk down — so it
  // doesn't jump/reflow once real content swaps in on either screen size.
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 md:py-16 pt-20 sm:pt-24 min-h-screen">
        <div className="w-14 h-4 sm:w-16 sm:h-5 skeleton rounded-md mb-5 sm:mb-8" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 lg:gap-16 mb-12 sm:mb-16">
          {/* Image gallery */}
          <div className="lg:col-span-6 flex flex-col gap-3 sm:gap-4">
            <div className="aspect-square skeleton rounded-2xl sm:rounded-3xl" />
            <div className="flex gap-2.5 sm:gap-3 overflow-x-auto">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 skeleton rounded-xl sm:rounded-2xl" />
              ))}
            </div>
          </div>

          {/* Info column */}
          <div className="lg:col-span-6 flex flex-col pt-1 lg:pt-6">
            <div className="w-24 h-2.5 sm:w-28 sm:h-3 skeleton rounded-md mb-2.5 sm:mb-3" />
            {/* Title wraps to two lines on mobile just like the real h1 does at this width */}
            <div className="w-full h-7 sm:h-9 md:h-12 skeleton rounded-xl mb-2" />
            <div className="w-2/3 sm:w-1/2 h-7 sm:h-9 md:h-12 skeleton rounded-xl mb-5 sm:mb-6" />

            <div className="flex items-center gap-2 mb-5 sm:mb-6">
              <div className="w-20 sm:w-24 h-3.5 sm:h-4 skeleton rounded-md" />
              <div className="w-24 sm:w-28 h-3.5 sm:h-4 skeleton-light rounded-md" />
            </div>

            <div className="flex items-end gap-3 mb-5 sm:mb-6">
              <div className="w-20 sm:w-24 h-8 sm:h-9 skeleton rounded-lg" />
              <div className="w-14 sm:w-16 h-5 sm:h-6 skeleton-light rounded-lg mb-1" />
            </div>

            <div className="w-36 sm:w-40 h-3.5 sm:h-4 skeleton-light rounded-md mb-5 sm:mb-6" />

            {/* short_description — two lines on mobile, matches leading-relaxed wrap */}
            <div className="w-full h-3.5 sm:h-4 skeleton-light rounded-md mb-2" />
            <div className="w-4/5 h-3.5 sm:h-4 skeleton-light rounded-md mb-5 sm:mb-6" />

            {/* Variant selector — pills wrap on narrow screens same as the real buttons */}
            <div className="w-20 sm:w-24 h-2.5 sm:h-3 skeleton rounded-md mb-2.5 sm:mb-3" />
            <div className="flex flex-wrap gap-2 sm:gap-2.5 mb-6 sm:mb-8">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="w-14 sm:w-16 h-8 sm:h-9 skeleton-light rounded-xl" />
              ))}
            </div>

            <div className="h-px bg-brand-brown/10 mb-5 sm:mb-6" />

            {/* Attributes — stays 2-up even on small phones, same as the real grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-14 sm:h-16 skeleton-light rounded-xl" />
              ))}
            </div>

            {/* Actions — stacked full-width on mobile, side-by-side from sm: up */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="flex-1 h-12 sm:h-14 skeleton rounded-xl" />
              <div className="flex-1 h-12 sm:h-14 skeleton rounded-xl" />
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 sm:h-[72px] skeleton-light rounded-xl" />
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto mt-10 sm:mt-16 md:mt-24">
          <div className="flex gap-4 sm:gap-6 border-b border-brand-brown/10 mb-6 sm:mb-8 pb-3 sm:pb-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="w-16 sm:w-24 h-3.5 sm:h-4 skeleton rounded-md" />
            ))}
          </div>
          <div className="w-full h-3.5 sm:h-4 skeleton-light rounded-md mb-2.5 sm:mb-3" />
          <div className="w-5/6 h-3.5 sm:h-4 skeleton-light rounded-md mb-2.5 sm:mb-3" />
          <div className="w-2/3 h-3.5 sm:h-4 skeleton-light rounded-md" />
        </div>

        {/* Related products row — horizontally scrollable on mobile just like
            the real one, so the skeleton doesn't collapse to a single tall
            block while the real row scrolls sideways once loaded. */}
        <div className="mt-12 sm:mt-16 md:mt-24">
          <div className="w-40 h-3 skeleton-light rounded-md mb-2" />
          <div className="w-56 sm:w-64 h-6 sm:h-8 skeleton rounded-lg mb-6 sm:mb-8" />
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-[160px] sm:w-[210px] md:w-[240px] flex-shrink-0">
                <div className="aspect-square skeleton rounded-2xl mb-3" />
                <div className="w-4/5 h-3.5 skeleton-light rounded-md mb-2" />
                <div className="w-1/2 h-4 skeleton-light rounded-md" />
              </div>
            ))}
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
                  ${isWishlisted(String(product.id))
                    ? "bg-brand-orange border-brand-orange text-white scale-110"
                    : "bg-white/90 border-white text-brand-brown/50 hover:text-brand-orange"}`}
                onClick={() => {
                  if (!isLogged) { router.push("/login"); return; }
                  toggleWishlist(String(product.id));
                }}
              >
                <Heart size={18} fill={isWishlisted(String(product.id)) ? "currentColor" : "none"} strokeWidth={isWishlisted(String(product.id)) ? 0 : 2} />
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
              <div className="bg-gray-50 rounded-xl p-3 border border-brand-brown/5 min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-widest text-brand-brown/50 mb-1">Weight</span>
                <span className="font-extrabold text-brand-black break-words">{fmtWeight(activeWgt)}</span>
              </div>
            )}
            {activeSku && (
              <div className="bg-gray-50 rounded-xl p-3 border border-brand-brown/5 min-w-0">
                <span className="block text-[11px] font-bold uppercase tracking-widest text-brand-brown/50 mb-1">SKU</span>
                <span className="font-extrabold text-brand-black break-words">{activeSku}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            {detailCartItem ? (
              <div className="flex-1 flex items-center justify-between bg-brand-orange/10 border border-brand-orange/20 rounded-xl h-14 px-2">
                <button
                  onClick={() => decrement(detailCartItem)}
                  disabled={detailCartItem.quantity <= 1}
                  className="w-10 h-10 flex items-center justify-center rounded-lg text-brand-orange hover:bg-brand-orange/10 disabled:opacity-30 transition-colors"
                >
                  <Minus size={18} strokeWidth={2.5} />
                </button>
                <span className="font-bold text-lg text-brand-black tabular-nums">{detailCartItem.quantity}</span>
                <button
                  onClick={() => increment(detailCartItem)}
                  className="w-10 h-10 flex items-center justify-center rounded-lg text-brand-orange hover:bg-brand-orange/10 transition-colors"
                >
                  <Plus size={18} strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={addingCart || !inStock}
                className="flex-1 flex items-center justify-center gap-2 h-14 rounded-xl font-bold text-[15px] transition-all duration-300 border bg-brand-orange/10 border-brand-orange/20 text-brand-orange hover:bg-brand-orange hover:text-white disabled:opacity-50"
              >
                <ShoppingCart size={18} strokeWidth={2.5} /> {addingCart ? "Adding…" : "Add to Cart"}
              </button>
            )}

            <button
              onClick={handleBuyNow}
              disabled={!inStock || buyingNow}
              className="flex-1 flex items-center justify-center gap-2 h-14 bg-brand-black text-white hover:bg-brand-brown rounded-xl font-bold text-[15px] transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {buyingNow ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Zap size={18} strokeWidth={2.5} className="text-brand-orange" />
              )}
              {buyingNow ? "Processing…" : "Buy Now"}
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
                      <div key={idx} className="flex justify-between gap-3 py-3 border-b border-brand-brown/5">
                        <span className="font-bold text-brand-brown/60 text-sm shrink-0">{item.label}</span>
                        {item.isBadge ? (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md shrink-0 ${inStock ? "bg-brand-green/10 text-brand-green" : "bg-red-100 text-red-600"}`}>
                            {item.value}
                          </span>
                        ) : (
                          <span className="font-bold text-brand-black text-sm text-right break-words min-w-0">{item.value}</span>
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

      {/* ── Related Products ──────────────────────────────────────────────── */}
      {relatedProducts.length > 0 && (
        <div className="mt-16 md:mt-24">
          <div className="mb-8 flex flex-col gap-1">
            <span className="text-brand-orange text-xs font-black uppercase tracking-[0.2em]">You Might Also Like</span>
            <h2 className="text-2xl md:text-3xl font-black text-brand-black uppercase leading-tight">
              Related Products
            </h2>
          </div>
          <div ref={relatedRowRef} className="flex gap-4 overflow-x-auto pb-4 scroll-smooth scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            {relatedProducts.map((rp) => (
              <div key={rp.id} className="w-[210px] sm:w-[240px] flex-shrink-0">
                <ProductCard
                  product={rp}
                  cartItems={cartItems}
                  onAddToCart={handleRelatedAdd}
                  onIncrement={handleRelatedIncrement}
                  onDecrement={handleRelatedDecrement}
                  onBuyNow={handleRelatedBuyNow}
                />
              </div>
            ))}
            {relatedHasMore && (
              <div ref={relatedSentinelRef} className="w-4 flex-shrink-0 flex items-center justify-center">
                {relatedLoadingMore && <Loader2 size={18} className="animate-spin text-brand-orange" />}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// useSearchParams() (added to read ?variant=) requires a Suspense boundary
// during prerender or `next build` fails the static export step for this
// route entirely. The fallback mirrors the real loading skeleton above so
// there's no visible jump once ProductDetailsPageInner takes over.
export default function ProductDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 md:py-16 pt-20 sm:pt-24 min-h-screen">
          <div className="w-14 h-4 sm:w-16 sm:h-5 skeleton rounded-md mb-5 sm:mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 lg:gap-16">
            <div className="lg:col-span-6 aspect-square skeleton rounded-2xl sm:rounded-3xl" />
            <div className="lg:col-span-6 flex flex-col gap-3 pt-1 lg:pt-6">
              <div className="w-24 h-2.5 skeleton rounded-md" />
              <div className="w-full h-7 sm:h-9 md:h-12 skeleton rounded-xl" />
              <div className="w-2/3 h-7 sm:h-9 md:h-12 skeleton rounded-xl" />
            </div>
          </div>
        </div>
      }
    >
      <ProductDetailsPageInner />
    </Suspense>
  );
}
