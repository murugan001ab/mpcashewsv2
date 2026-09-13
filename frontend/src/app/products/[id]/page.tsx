"use client";

// src/app/products/[id]/page.tsx

import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
  Suspense,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  ShoppingCart,
  Heart,
  ChevronLeft,
  Minus,
  Plus,
  Truck,
  ShieldCheck,
  RefreshCw,
  Zap,
  Share2,
  AlertCircle,
  Loader2,
} from "lucide-react";

import api from "@/services/api";
import * as productService from "@/services/productService";
import { AuthContext } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import ProductCard, {
  type ProductWithVariant,
} from "@/components/ProductCard";
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
  category?: {
    id: string;
    name: string;
  };
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

  const [activeTab, setActiveTab] = useState<
    "description" | "specifications" | "reviews"
  >("description");

  const [addingCart, setAddingCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [selectedVariantId, setSelectedVariantId] =
    useState<number | null>(null);

  const [relatedProducts, setRelatedProducts] = useState<
    RelatedProduct[]
  >([]);

  const [relatedPage, setRelatedPage] = useState(1);
  const [relatedHasMore, setRelatedHasMore] = useState(false);
  const [relatedLoadingMore, setRelatedLoadingMore] = useState(false);

  const RELATED_PAGE_SIZE = 8;

  const relatedRowRef = useRef<HTMLDivElement>(null);

  // ─────────────────────────────────────────────
  // Load Product
  // ─────────────────────────────────────────────

  useEffect(() => {
    api
      .get<Product>(`products/${id}`)
      .then((res) => {
        const data = res.data;

        setProduct(data);

        if (data.variants && data.variants.length > 0) {
          const sorted = [...data.variants].sort(
            (a, b) => a.weight_grams - b.weight_grams
          );

          const variantParam = searchParams.get("variant");

          const matched = variantParam
            ? sorted.find((v) => String(v.id) === variantParam)
            : undefined;

          setSelectedVariantId((matched ?? sorted[0]).id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ─────────────────────────────────────────────
  // Variants / Pricing
  // ─────────────────────────────────────────────

  const variants: Variant[] = product?.variants
    ? [...product.variants].sort(
        (a, b) => a.weight_grams - b.weight_grams
      )
    : [];

  const activeVariant: Partial<Variant> =
    variants.find((v) => v.id === selectedVariantId) ||
    variants[0] ||
    {};

  const originalPrice = parseFloat(
    (activeVariant.price ?? product?.price) || "0"
  );

  const finalPrice = parseFloat(
    (
      activeVariant.discounted_price ??
      activeVariant.price ??
      product?.discounted_price ??
      product?.price
    ) || "0"
  );

  const hasDiscount = originalPrice > finalPrice;

  const discountPct = hasDiscount
    ? Math.round((1 - finalPrice / originalPrice) * 100)
    : 0;

  const stockCount = activeVariant.stock ?? product?.stock ?? 0;

  const inStock = stockCount > 0;

  const activeSku = activeVariant.sku || product?.sku;

  const activeWgt =
    activeVariant.weight_grams || product?.weight_grams;

  // ─────────────────────────────────────────────
  // Related Products
  // ─────────────────────────────────────────────

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
      .listProducts({
        category_id: categoryId,
        page: 1,
        page_size: RELATED_PAGE_SIZE,
      })
      .then((res) => {
        if (cancelled) return;

        const items = (res.items || []).filter(
          (p) => String(p.id) !== String(product!.id)
        );

        setRelatedProducts(items);

        setRelatedHasMore(
          (res.total ?? 0) > RELATED_PAGE_SIZE
        );
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [product?.category?.id, product?.id]);

  const loadMoreRelated = useCallback(() => {
    const categoryId = product?.category?.id;

    if (
      !categoryId ||
      relatedLoadingMore ||
      !relatedHasMore
    ) {
      return;
    }

    setRelatedLoadingMore(true);

    const nextPage = relatedPage + 1;

    productService
      .listProducts({
        category_id: categoryId,
        page: nextPage,
        page_size: RELATED_PAGE_SIZE,
      })
      .then((res) => {
        const newItems = (res.items || []).filter(
          (p) => String(p.id) !== String(product!.id)
        );

        setRelatedProducts((prev) => {
          const existingIds = new Set(
            prev.map((p) => String(p.id))
          );

          return [
            ...prev,
            ...newItems.filter(
              (p) => !existingIds.has(String(p.id))
            ),
          ];
        });

        setRelatedPage(nextPage);

        setRelatedHasMore(
          nextPage * RELATED_PAGE_SIZE <
            (res.total ?? 0)
        );
      })
      .catch(console.error)
      .finally(() => setRelatedLoadingMore(false));
  }, [
    product?.category?.id,
    product?.id,
    relatedPage,
    relatedHasMore,
    relatedLoadingMore,
  ]);

  const relatedSentinelRef = useInfiniteRowSentinel(
    relatedRowRef,
    loadMoreRelated,
    {
      enabled: relatedHasMore && !relatedLoadingMore,
    }
  );

  // ─────────────────────────────────────────────
  // Cart
  // ─────────────────────────────────────────────

  const findRelatedCartItem = (
    p: ProductWithVariant
  ) =>
    cartItems.find(
      (i) => i.variant?.id === p.selectedVariant?.id
    );

  const detailCartItem = cartItems.find(
    (i) =>
      i.variant?.id === String(activeVariant.id ?? "")
  );

  const handleRelatedAdd = (
    p: ProductWithVariant
  ) => {
    if (!p.selectedVariant) return;

    const variant = p.selectedVariant;

    const price = parseFloat(
      variant.discounted_price ??
        variant.price ??
        "0"
    );

    const primaryImage =
      p.images?.find((i) => i.is_primary) ??
      p.images?.[0];

    addToCart(variant.id, 1, {
      name: p.name,
      price,
      image: primaryImage?.url,
    });
  };

  const handleRelatedIncrement = (
    p: ProductWithVariant
  ) => {
    const item = findRelatedCartItem(p);

    if (item) increment(item);
  };

  const handleRelatedDecrement = (
    p: ProductWithVariant
  ) => {
    const item = findRelatedCartItem(p);

    if (item) decrement(item);
  };

  const handleRelatedBuyNow = async (
    p: ProductWithVariant
  ) => {
    if (!isLogged) {
      router.push("/login");
      return;
    }

    if (!p.selectedVariant) return;

    handleRelatedAdd(p);

    router.push("/checkout");
  };

  // ─────────────────────────────────────────────
  // Add To Cart
  // ─────────────────────────────────────────────

  const handleAddToCart = async () => {
    if (!isLogged) {
      router.push("/login");
      return;
    }

    if (!activeVariant.id) return;

    setAddingCart(true);

    try {
      await addToCart(
        String(activeVariant.id),
        1
      );
    } catch (e) {
      console.error(e);
    } finally {
      setAddingCart(false);
    }
  };

  // ─────────────────────────────────────────────
  // Buy Now
  // ─────────────────────────────────────────────

  const handleBuyNow = async () => {
    if (buyingNow) return;

    if (!isLogged) {
      router.push("/login");
      return;
    }

    if (!activeVariant.id) return;

    setBuyingNow(true);

    try {
      if (!detailCartItem) {
        await addToCart(
          String(activeVariant.id),
          1
        );
      }

      router.push("/checkout");
    } catch (e) {
      console.error(e);
      setBuyingNow(false);
    }
  };

  // ─────────────────────────────────────────────
  // Loading Skeleton
  // ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-10 pt-20 md:pt-24 min-h-screen">

        <div className="w-14 h-4 skeleton rounded-md mb-5 md:mb-8" />

        <div className="flex flex-col md:flex-row gap-5 md:gap-10 mb-10 md:mb-14">

          {/* Image Skeleton */}
          <div className="w-full md:w-1/2 flex flex-col gap-3">
            <div className="w-full max-w-[420px] mx-auto aspect-square skeleton rounded-2xl" />

            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="w-16 h-16 flex-shrink-0 skeleton rounded-xl"
                />
              ))}
            </div>
          </div>

          {/* Info Skeleton */}
          <div className="w-full md:w-1/2 flex flex-col">

            <div className="w-24 h-2.5 skeleton rounded-md mb-2.5" />

            <div className="w-full h-7 md:h-10 skeleton rounded-xl mb-2" />

            <div className="w-2/3 h-7 md:h-10 skeleton rounded-xl mb-5" />

            <div className="flex items-center gap-2 mb-5">
              <div className="w-20 h-3.5 skeleton rounded-md" />
              <div className="w-24 h-3.5 skeleton-light rounded-md" />
            </div>

            <div className="flex items-end gap-3 mb-5">
              <div className="w-20 h-8 skeleton rounded-lg" />
              <div className="w-14 h-5 skeleton-light rounded-lg mb-1" />
            </div>

            <div className="w-36 h-3.5 skeleton-light rounded-md mb-5" />

            <div className="w-full h-3.5 skeleton-light rounded-md mb-2" />

            <div className="w-4/5 h-3.5 skeleton-light rounded-md mb-5" />

            <div className="w-20 h-2.5 skeleton rounded-md mb-2.5" />

            <div className="flex flex-wrap gap-2 mb-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="w-14 h-8 skeleton-light rounded-xl"
                />
              ))}
            </div>

            <div className="h-px bg-brand-brown/10 mb-5" />

            <div className="grid grid-cols-2 gap-3 mb-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 skeleton-light rounded-xl"
                />
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 mb-6">
              <div className="flex-1 h-12 skeleton rounded-xl" />
              <div className="flex-1 h-12 skeleton rounded-xl" />
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 skeleton-light rounded-xl"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="mt-10 md:mt-16">
          <div className="flex gap-4 border-b border-brand-brown/10 mb-6 pb-3 overflow-x-auto">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="w-16 h-3.5 skeleton rounded-md flex-shrink-0"
              />
            ))}
          </div>

          <div className="w-full h-3.5 skeleton-light rounded-md mb-2.5" />
          <div className="w-5/6 h-3.5 skeleton-light rounded-md mb-2.5" />
          <div className="w-2/3 h-3.5 skeleton-light rounded-md" />
        </div>

        {/* Related Products Skeleton */}
        <div className="mt-12 md:mt-20">

          <div className="w-40 h-3 skeleton-light rounded-md mb-2" />

          <div className="w-56 h-6 skeleton rounded-lg mb-6" />

          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">

            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="w-[160px] sm:w-[210px] flex-shrink-0"
              >
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

  // ─────────────────────────────────────────────
  // Not Found
  // ─────────────────────────────────────────────

  if (!product) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 pt-24">

        <div className="w-20 h-20 bg-brand-orange/10 text-brand-orange rounded-full flex items-center justify-center mb-6">
          <AlertCircle size={40} strokeWidth={2} />
        </div>

        <h2 className="text-3xl font-extrabold text-brand-black mb-4">
          Product Not Found
        </h2>

        <p className="text-brand-brown/60 mb-8">
          This product might have been removed or is
          currently unavailable.
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

  // ─────────────────────────────────────────────
  // Images
  // ─────────────────────────────────────────────

  const images = product.images?.length
    ? product.images
    : [];

  const mainImg =
    images[selectedImg]?.url
      ? getImg(images[selectedImg].url)
      : getImg(product.image);

  const thumbImgs = images.map((i) =>
    getImg(i.url)
  );

  // ─────────────────────────────────────────────
  // Main UI
  // ─────────────────────────────────────────────

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-5 sm:py-6 md:py-10 pt-20 md:pt-24 min-h-screen">

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm font-bold text-brand-brown/60 hover:text-brand-orange transition-colors mb-5 md:mb-8 w-fit"
      >
        <ChevronLeft
          size={16}
          strokeWidth={2.5}
        />
        Back
      </button>

      {/* ─────────────────────────────────────────
          Product Main Section
      ───────────────────────────────────────── */}

      <div className="flex flex-col md:flex-row gap-5 md:gap-10 mb-10 md:mb-14">

        {/* ───────────────────────────────────────
            Image Gallery
        ─────────────────────────────────────── */}

        <div className="w-full md:w-1/2 flex flex-col gap-3">

          {/* Main Image */}

          <div className="relative w-full max-w-[420px] mx-auto aspect-square overflow-hidden rounded-2xl bg-brand-cream/50 border border-brand-brown/5 shadow-sm">

            <img
              key={selectedImg}
              src={
                mainImg ||
                "https://placehold.co/600x600?text=No+Image"
              }
              alt={product.name}
              className="absolute inset-0 w-full h-full object-contain mix-blend-multiply p-4"
            />

            {/* Discount */}

            {hasDiscount && (
              <div className="absolute top-3 left-3 z-10">
                <span className="bg-brand-orange text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full shadow-sm tracking-wide">
                  {discountPct}% OFF
                </span>
              </div>
            )}

            {/* Wishlist / Share */}

            <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">

              <button
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm backdrop-blur-sm border ${
                  isWishlisted(String(product.id))
                    ? "bg-brand-orange border-brand-orange text-white scale-110"
                    : "bg-white/90 border-white text-brand-brown/50 hover:text-brand-orange"
                }`}
                onClick={() => {
                  if (!isLogged) {
                    router.push("/login");
                    return;
                  }

                  toggleWishlist(
                    String(product.id)
                  );
                }}
              >
                <Heart
                  size={17}
                  fill={
                    isWishlisted(String(product.id))
                      ? "currentColor"
                      : "none"
                  }
                  strokeWidth={
                    isWishlisted(String(product.id))
                      ? 0
                      : 2
                  }
                />
              </button>

              <button
                className="w-9 h-9 bg-white/90 border border-white text-brand-brown/50 hover:text-brand-orange rounded-full flex items-center justify-center transition-all duration-300 shadow-sm backdrop-blur-sm"
                onClick={() =>
                  navigator.share?.({
                    title: product.name,
                    url: window.location.href,
                  })
                }
              >
                <Share2
                  size={17}
                  strokeWidth={2}
                />
              </button>

            </div>
          </div>

          {/* Thumbnails */}

          {thumbImgs.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide max-w-[420px] mx-auto w-full">

              {thumbImgs.map((src, i) => (
                <button
                  key={i}
                  className={`w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all duration-200 bg-brand-cream/30 ${
                    selectedImg === i
                      ? "border-brand-orange ring-2 ring-brand-orange/20"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                  onClick={() =>
                    setSelectedImg(i)
                  }
                >
                  <img
                    src={src ?? ""}
                    alt={`Thumbnail ${i}`}
                    className="w-full h-full object-contain mix-blend-multiply p-1.5"
                  />
                </button>
              ))}

            </div>
          )}
        </div>

        {/* ───────────────────────────────────────
            Product Information
        ─────────────────────────────────────── */}

        <div className="w-full md:w-1/2 flex flex-col min-w-0">

          {/* Category + Title */}

          <div className="mb-3">

            {product.category?.name && (
              <span className="text-[10px] sm:text-[11px] uppercase tracking-widest font-extrabold text-brand-orange/80 mb-1.5 block">
                {product.category.name}
              </span>
            )}

            <h1 className="text-[22px] sm:text-2xl md:text-4xl font-extrabold text-brand-black tracking-tight leading-tight break-words">
              {product.name}
            </h1>
          </div>

          {/* Rating */}

          <div className="flex items-center gap-2 mb-4">

            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(
                (s) => (
                  <Star
                    key={s}
                    size={15}
                    fill={
                      s <= 4
                        ? "var(--amber)"
                        : "none"
                    }
                    stroke="var(--amber)"
                    strokeWidth={2}
                  />
                )
              )}
            </div>

            <span className="text-sm font-semibold text-brand-brown/60 underline decoration-brand-brown/20 cursor-pointer hover:text-brand-orange transition-colors">
              4.8 (124 reviews)
            </span>

          </div>

          {/* Price */}

          <div className="flex flex-wrap items-end gap-2.5 mb-4">

            <span className="text-[28px] sm:text-3xl font-extrabold text-brand-black tracking-tight">
              ₹{finalPrice.toFixed(0)}
            </span>

            {hasDiscount && (
              <span className="text-base font-bold text-brand-brown/40 line-through mb-0.5">
                ₹{originalPrice.toFixed(0)}
              </span>
            )}

            {hasDiscount && (
              <span className="bg-brand-green/10 text-brand-green text-xs font-bold px-2 py-0.5 rounded-md mb-0.5 border border-brand-green/20">
                Save ₹
                {(originalPrice - finalPrice).toFixed(
                  0
                )}
              </span>
            )}

          </div>

          {/* Stock */}

          <div className="flex items-center gap-2 mb-4">

            <span className="relative flex h-2.5 w-2.5">

              {inStock && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-40" />
              )}

              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  inStock
                    ? "bg-brand-green"
                    : "bg-red-500"
                }`}
              />

            </span>

            <span
              className={`text-sm font-bold ${
                inStock
                  ? "text-brand-green"
                  : "text-red-500"
              }`}
            >
              {inStock
                ? `In Stock (${stockCount} available)`
                : "Out of Stock"}
            </span>

          </div>

          {/* Short Description */}

          {product.short_description && (
            <p className="text-sm md:text-base text-brand-brown/80 leading-relaxed mb-5">
              {product.short_description}
            </p>
          )}

          {/* ─────────────────────────────────────
              Variant Selector
          ───────────────────────────────────── */}

          {variants.length > 0 && (
            <div className="mb-6">

              <span className="block text-[11px] font-bold uppercase tracking-widest text-brand-brown/70 mb-2.5">
                Select Weight
              </span>

              <div className="flex flex-wrap gap-2">

                {variants.map((v) => {
                  const isSelected =
                    selectedVariantId === v.id;

                  return (
                    <button
                      key={v.id}
                      onClick={() =>
                        setSelectedVariantId(v.id)
                      }
                      className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all duration-200 border-2 ${
                        isSelected
                          ? "bg-brand-orange/10 border-brand-orange text-brand-orange shadow-sm"
                          : "bg-white border-brand-brown/10 text-brand-brown/70 hover:border-brand-orange/40 hover:text-brand-orange"
                      }`}
                    >
                      {fmtWeight(v.weight_grams)}
                    </button>
                  );
                })}

              </div>
            </div>
          )}

          <hr className="border-brand-brown/10 mb-5" />

          {/* ─────────────────────────────────────
              Attributes
          ───────────────────────────────────── */}

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-6 text-sm">

            {activeWgt && (
              <div className="bg-gray-50 rounded-xl p-3 border border-brand-brown/5 min-w-0">

                <span className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-brand-brown/50 mb-1">
                  Weight
                </span>

                <span className="font-extrabold text-brand-black text-base break-words">
                  {fmtWeight(activeWgt)}
                </span>

              </div>
            )}

            {activeSku && (
              <div className="bg-gray-50 rounded-xl p-3 border border-brand-brown/5 min-w-0">

                <span className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-brand-brown/50 mb-1">
                  SKU
                </span>

                <span className="font-extrabold text-brand-black text-base break-words">
                  {activeSku}
                </span>

              </div>
            )}

          </div>

          {/* ─────────────────────────────────────
              Cart / Buy Buttons
          ───────────────────────────────────── */}

          <div className="flex flex-col sm:flex-row gap-3 mb-6 w-full">
  {/* ADD TO CART / QUANTITY */}
  {detailCartItem ? (
    <div
      className="
        w-full sm:flex-1
        h-14 sm:h-16
        flex items-center justify-between
        rounded-xl
        px-2
        bg-brand-orange/10
        border border-brand-orange/20
      "
    >
      <button
        onClick={() => decrement(detailCartItem)}
        disabled={detailCartItem.quantity <= 1}
        aria-label="Decrease quantity"
        className="
          w-10 h-10 shrink-0
          flex items-center justify-center
          rounded-lg
          text-brand-orange
          hover:bg-brand-orange/10
          active:scale-95
          disabled:opacity-30
          transition-all
        "
      >
        <Minus size={18} strokeWidth={2.5} />
      </button>

      <span
        className="
          min-w-[40px]
          px-2
          text-center
          font-bold
          text-lg
          text-brand-black
          tabular-nums
        "
      >
        {detailCartItem.quantity}
      </span>

      <button
        onClick={() => increment(detailCartItem)}
        aria-label="Increase quantity"
        className="
          w-10 h-10 shrink-0
          flex items-center justify-center
          rounded-lg
          text-brand-orange
          hover:bg-brand-orange/10
          active:scale-95
          transition-all
        "
      >
        <Plus size={18} strokeWidth={2.5} />
      </button>
    </div>
  ) : (
    <button
      onClick={handleAddToCart}
      disabled={addingCart || !inStock}
      className="
        w-full sm:flex-1
        h-14 sm:h-16
        flex items-center justify-center
        gap-2
        rounded-xl
        px-4
        border
        border-brand-orange/20
        bg-brand-orange/10
        text-brand-orange
        font-bold
        text-[15px]
        whitespace-nowrap
        hover:bg-brand-orange
        hover:text-white
        active:scale-[0.98]
        disabled:opacity-50
        disabled:cursor-not-allowed
        transition-all duration-200
      "
    >
      <ShoppingCart
        size={19}
        strokeWidth={2.5}
        className="shrink-0"
      />

      <span>
        {addingCart ? "Adding…" : "Add to Cart"}
      </span>
    </button>
  )}

  {/* BUY NOW */}
  <button
    onClick={handleBuyNow}
    disabled={!inStock || buyingNow}
    className="
      w-full sm:flex-1
      h-14 sm:h-16
      flex items-center justify-center
      gap-2
      rounded-xl
      px-4
      bg-brand-black
      text-white
      font-bold
      text-[15px]
      whitespace-nowrap
      shadow-md
      hover:bg-brand-brown
      active:scale-[0.98]
      disabled:opacity-50
      disabled:cursor-not-allowed
      transition-all duration-200
    "
  >
    {buyingNow ? (
      <Loader2
        size={19}
        className="animate-spin shrink-0"
      />
    ) : (
      <Zap
        size={19}
        strokeWidth={2.5}
        className="shrink-0 text-brand-orange"
      />
    )}

    <span>
      {buyingNow ? "Processing…" : "Buy Now"}
    </span>
  </button>
</div>

          {/* ─────────────────────────────────────
              Feature Cards
          ───────────────────────────────────── */}

          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">

            {(
              [
                {
                  icon: Truck,
                  text: "Free Delivery",
                },
                {
                  icon: ShieldCheck,
                  text: "100% Natural",
                },
                {
                  icon: RefreshCw,
                  text: "Easy Returns",
                },
              ] as const
            ).map(
              ({
                icon: Icon,
                text,
              }) => (
                <div
                  key={text}
                  className="flex flex-col items-center justify-center text-center p-2 sm:p-2.5 rounded-xl bg-gray-50 border border-brand-brown/5 gap-1.5 min-w-0"
                >
                  <Icon
                    size={19}
                    className="text-brand-orange flex-shrink-0"
                    strokeWidth={2}
                  />

                  <span className="text-[9px] sm:text-[10px] font-bold text-brand-black uppercase tracking-wider leading-tight">
                    {text}
                  </span>
                </div>
              )
            )}

          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────
          Details Tabs
      ───────────────────────────────────────── */}

      <div className="mt-10 md:mt-16">

        <div className="flex gap-4 sm:gap-6 border-b border-brand-brown/10 overflow-x-auto mb-6 scrollbar-hide">

          {(
            [
              "description",
              "specifications",
              "reviews",
            ] as const
          ).map((t) => {
            const isActive =
              activeTab === t;

            return (
              <button
                key={t}
                className={`py-3 text-[12px] sm:text-sm md:text-base font-extrabold uppercase tracking-widest whitespace-nowrap transition-colors relative flex-shrink-0 ${
                  isActive
                    ? "text-brand-black"
                    : "text-brand-brown/40 hover:text-brand-orange"
                }`}
                onClick={() =>
                  setActiveTab(t)
                }
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

        <div className="min-h-[160px]">

          <AnimatePresence mode="wait">

            <motion.div
              key={activeTab}
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -10,
              }}
              transition={{
                duration: 0.2,
              }}
            >

              {/* Description */}

              {activeTab ===
                "description" && (
                <div className="prose max-w-none text-brand-brown/80 leading-loose">
                  <p>
                    {product.description ||
                      "No description available for this product."}
                  </p>
                </div>
              )}

              {/* Specifications */}

              {activeTab ===
                "specifications" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">

                  {[
                    {
                      label: "Weight",
                      value: activeWgt
                        ? fmtWeight(activeWgt)
                        : null,
                    },
                    {
                      label: "SKU",
                      value: activeSku,
                    },
                    {
                      label: "Category",
                      value:
                        product.category
                          ?.name,
                    },
                    {
                      label: "Availability",
                      value: inStock
                        ? "In Stock"
                        : "Out of Stock",
                      isBadge: true,
                    },
                  ]
                    .filter(
                      (item) => item.value
                    )
                    .map(
                      (
                        item,
                        idx
                      ) => (
                        <div
                          key={idx}
                          className="flex justify-between gap-3 py-3 border-b border-brand-brown/5"
                        >
                          <span className="font-bold text-brand-brown/60 text-sm shrink-0">
                            {item.label}
                          </span>

                          {item.isBadge ? (
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-md shrink-0 ${
                                inStock
                                  ? "bg-brand-green/10 text-brand-green"
                                  : "bg-red-100 text-red-600"
                              }`}
                            >
                              {item.value}
                            </span>
                          ) : (
                            <span className="font-bold text-brand-black text-sm text-right break-words min-w-0">
                              {item.value}
                            </span>
                          )}
                        </div>
                      )
                    )}

                </div>
              )}

              {/* Reviews */}

              {activeTab === "reviews" && (
                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-brand-brown/10 rounded-3xl bg-gray-50">

                  <Star
                    size={32}
                    className="text-brand-brown/20 mb-3"
                  />

                  <p className="text-brand-black font-bold mb-1">
                    No reviews yet
                  </p>

                  <p className="text-sm text-brand-brown/50">
                    Be the first to review this product!
                  </p>

                </div>
              )}

            </motion.div>

          </AnimatePresence>
        </div>
      </div>

      {/* ─────────────────────────────────────────
          Related Products
      ───────────────────────────────────────── */}

      {relatedProducts.length > 0 && (
        <div className="mt-12 md:mt-20">

          <div className="mb-6 flex flex-col gap-1">

            <span className="text-brand-orange text-[11px] font-black uppercase tracking-[0.2em]">
              You Might Also Like
            </span>

            <h2 className="text-xl md:text-2xl font-black text-brand-black uppercase leading-tight">
              Related Products
            </h2>

          </div>

          <div
            ref={relatedRowRef}
            className="flex gap-4 overflow-x-auto pb-4 scroll-smooth scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0"
          >

            {relatedProducts.map((rp) => (
              <div
                key={rp.id}
                className="w-[180px] sm:w-[210px] md:w-[240px] flex-shrink-0"
              >
                <ProductCard
                  product={rp}
                  cartItems={cartItems}
                  onAddToCart={
                    handleRelatedAdd
                  }
                  onIncrement={
                    handleRelatedIncrement
                  }
                  onDecrement={
                    handleRelatedDecrement
                  }
                  onBuyNow={
                    handleRelatedBuyNow
                  }
                />
              </div>
            ))}

            {relatedHasMore && (
              <div
                ref={relatedSentinelRef}
                className="w-4 flex-shrink-0 flex items-center justify-center"
              >
                {relatedLoadingMore && (
                  <Loader2
                    size={18}
                    className="animate-spin text-brand-orange"
                  />
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Suspense Boundary
// ─────────────────────────────────────────────

export default function ProductDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-10 pt-20 md:pt-24 min-h-screen">

          <div className="w-14 h-4 skeleton rounded-md mb-5 md:mb-8" />

          <div className="flex flex-col md:flex-row gap-5 md:gap-10">

            <div className="w-full md:w-1/2 max-w-[420px] mx-auto aspect-square skeleton rounded-2xl" />

            <div className="w-full md:w-1/2 flex flex-col gap-3">

              <div className="w-24 h-2.5 skeleton rounded-md" />

              <div className="w-full h-7 md:h-10 skeleton rounded-xl" />

              <div className="w-2/3 h-7 md:h-10 skeleton rounded-xl" />

            </div>

          </div>
        </div>
      }
    >
      <ProductDetailsPageInner />
    </Suspense>
  );
}