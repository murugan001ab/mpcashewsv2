"use client";
// src/components/VariantProductCard.tsx
// Shows ONE product+variant combo as its own distinct card (e.g. "Cashews
// W240 — 500g" as a separate card from "Cashews W240 — 1kg"), for the
// /products shop grid. This is deliberately different from ProductCard
// (used on the homepage), which shows one card per product with a pill
// selector to switch between variants — here each variant IS the card.
// Clicking through still lands on the normal product detail page, with the
// clicked variant pre-selected via a ?variant= query param so the person
// can still switch weights from there.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Zap, Heart, Minus, Plus, Loader2, Star } from "lucide-react";
import { HOST } from "@/config/env";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useCart } from "@/contexts/CartContext";
import type { Product, Variant } from "@/types";

function fmtWeight(g: number) {
  if (g >= 1000) return `${g / 1000}kg`;
  return `${g}g`;
}

export default function VariantProductCard({ product, variant }: { product: Product; variant: Variant }) {
  const router = useRouter();
  const { isLogged } = useAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { cartItems, addToCart, increment, decrement } = useCart();
  const [buyingNow, setBuyingNow] = useState(false);
  const wishlisted = isWishlisted(product.id);

  const finalPrice = parseFloat(variant.discounted_price ?? variant.price ?? "0");
  const originalPrice = parseFloat(variant.price ?? "0");
  const hasDiscount = originalPrice > finalPrice;
  const discountPct = hasDiscount ? Math.round((1 - finalPrice / originalPrice) * 100) : 0;
  const outOfStock = variant.stock === 0;

  const primaryImage = product.images?.find((i) => i.is_primary) ?? product.images?.[0];
  const imageUrl = primaryImage?.url
    ? primaryImage.url.startsWith("http")
      ? primaryImage.url
      : `${HOST}${primaryImage.url}`
    : null;

  const cartItem = cartItems.find((c) => c.variant?.id === variant.id);

  const goToDetail = () => router.push(`/products/${product.id}?variant=${variant.id}`);

  const handleAdd = () => {
    if (!isLogged) {
      router.push("/login");
      return;
    }
    addToCart(variant.id, 1, { name: `${product.name} — ${fmtWeight(variant.weight_grams)}`, price: finalPrice, image: primaryImage?.url });
  };

  const handleBuyNow = async () => {
    if (buyingNow) return;
    if (!isLogged) {
      router.push("/login");
      return;
    }
    setBuyingNow(true);
    try {
      if (!cartItem) {
        await addToCart(variant.id, 1, { name: `${product.name} — ${fmtWeight(variant.weight_grams)}`, price: finalPrice, image: primaryImage?.url });
      }
      router.push("/checkout");
    } finally {
      setBuyingNow(false);
    }
  };

  return (
    <div className="group relative bg-brand-cream/30 border border-brand-brown/5 lg:border-brand-brown/10 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm lg:shadow-md hover:shadow-xl lg:hover:shadow-2xl hover:-translate-y-1 lg:hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full">
      {/* Image */}
      <div
        className="relative overflow-hidden cursor-pointer bg-white aspect-square flex items-center justify-center"
        onClick={goToDetail}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={primaryImage?.alt_text ?? product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50 text-brand-brown/30 text-xs sm:text-sm font-medium">
            No Image
          </div>
        )}

        <div className="absolute top-1.5 left-1.5 sm:top-3 sm:left-3 flex flex-col gap-1 sm:gap-1.5 items-start">
          {hasDiscount && (
            <span className="bg-brand-orange text-white text-[9px] sm:text-[11px] font-bold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full shadow-sm tracking-wide">
              {discountPct}% OFF
            </span>
          )}
          {product.grade && (
            <span className="bg-brand-black/85 text-white text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full shadow-sm tracking-wide">
              {product.grade}
            </span>
          )}
        </div>

        <button
          className={`absolute top-1.5 right-1.5 sm:top-3 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm backdrop-blur-sm
            ${wishlisted ? "bg-brand-orange text-white scale-110" : "bg-white/90 text-brand-brown/60 hover:bg-brand-orange hover:text-white"}`}
          onClick={(e) => {
            e.stopPropagation();
            if (!isLogged) {
              router.push("/login");
              return;
            }
            toggleWishlist(product.id);
          }}
          aria-label="Wishlist"
        >
          <Heart size={13} className="sm:hidden" fill={wishlisted ? "currentColor" : "none"} strokeWidth={wishlisted ? 0 : 2} />
          <Heart size={16} className="hidden sm:block" fill={wishlisted ? "currentColor" : "none"} strokeWidth={wishlisted ? 0 : 2} />
        </button>

        {variant.stock > 0 && variant.stock < 10 && (
          <span className="absolute bottom-1.5 left-1.5 sm:bottom-3 sm:left-3 bg-white/90 backdrop-blur-sm text-brand-orange border border-brand-orange/20 text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full shadow-sm pointer-events-none">
            Only {variant.stock} left
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-2.5 sm:p-4 lg:p-5 gap-1.5 sm:gap-2.5 lg:gap-3 bg-white">
        <div className="flex flex-col gap-0.5 sm:gap-1">
          {product.category?.name && (
            <span className="hidden sm:block text-[10px] lg:text-[11px] uppercase tracking-widest font-bold text-brand-brown/40">
              {product.category.name}
            </span>
          )}
          {/* Weight is part of the title itself — this card IS that variant,
              not the product with a size picker. */}
          <h3
            className="text-brand-black font-bold text-[12.5px] sm:text-[15px] lg:text-[17px] leading-snug line-clamp-2 cursor-pointer hover:text-brand-orange transition-colors"
            onClick={goToDetail}
            title={`${product.name} — ${fmtWeight(variant.weight_grams)}`}
          >
            {product.name} <span className="text-brand-brown/50 font-semibold">— {fmtWeight(variant.weight_grams)}</span>
          </h3>

          {product.review_count ? (
            <button
              type="button"
              className="flex items-center gap-1 w-fit hover:text-brand-orange transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/products/${product.id}?variant=${variant.id}#reviews`);
              }}
              aria-label="See reviews"
            >
              <Star size={10} className="sm:hidden text-brand-orange fill-brand-orange" />
              <Star size={12} className="hidden sm:block lg:!w-3.5 lg:!h-3.5 text-brand-orange fill-brand-orange" />
              <span className="text-[10px] sm:text-xs lg:text-sm font-semibold text-brand-brown/60">
                {product.average_rating?.toFixed(1)} ({product.review_count})
              </span>
            </button>
          ) : null}
        </div>

        <div className="flex items-baseline gap-1.5 sm:gap-2 mt-auto pt-0.5 sm:pt-1">
          <span className="text-brand-black font-extrabold text-base sm:text-lg lg:text-xl tracking-tight">₹{finalPrice.toFixed(0)}</span>
          {hasDiscount && (
            <span className="text-brand-brown/40 text-xs sm:text-sm lg:text-base font-medium line-through decoration-brand-brown/30">
              ₹{originalPrice.toFixed(0)}
            </span>
          )}
        </div>

        <div className="flex flex-row gap-1.5 sm:gap-2 lg:gap-2.5 mt-1 sm:mt-2 lg:mt-3">
          {outOfStock ? (
            <div className="flex-1 text-center text-[11px] sm:text-sm font-bold text-brand-brown/40 bg-gray-50 rounded-lg sm:rounded-xl py-2 sm:py-2.5">
              Out of Stock
            </div>
          ) : cartItem ? (
            <div className="flex-1 flex items-center justify-between bg-brand-cream/30 border border-brand-orange/20 rounded-lg sm:rounded-xl h-9 sm:h-10 lg:h-11 overflow-hidden">
              <button
                className="w-8 sm:w-10 h-full flex items-center justify-center text-brand-orange hover:bg-brand-orange hover:text-white transition-colors disabled:opacity-30"
                onClick={() => decrement(cartItem)}
                disabled={cartItem.quantity <= 1}
              >
                <Minus size={14} strokeWidth={2.5} />
              </button>
              <span className="font-bold text-xs sm:text-sm text-brand-black tabular-nums">{cartItem.quantity}</span>
              <button
                className="w-8 sm:w-10 h-full flex items-center justify-center text-brand-orange hover:bg-brand-orange hover:text-white transition-colors"
                onClick={() => increment(cartItem)}
              >
                <Plus size={14} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              className="flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-1.5 bg-brand-orange/10 hover:bg-brand-orange text-brand-orange hover:text-white text-[11px] sm:text-sm lg:text-base font-bold rounded-lg sm:rounded-xl h-9 sm:h-10 lg:h-11 px-1.5 sm:px-3 lg:px-4 whitespace-nowrap transition-all duration-300"
              onClick={handleAdd}
              aria-label="Add to cart"
            >
              <ShoppingCart size={13} className="sm:hidden" strokeWidth={2.5} />
              <ShoppingCart size={16} className="hidden sm:block" strokeWidth={2.5} />
            </button>
          )}

          <BuyNowButton disabled={outOfStock || buyingNow} loading={buyingNow} onClick={handleBuyNow} />
        </div>
      </div>
    </div>
  );
}

function BuyNowButton({ disabled, loading, onClick }: { disabled: boolean; loading: boolean; onClick: () => void }) {
  return (
    <button
      className="flex-1 min-w-0 sm:flex-none flex items-center justify-center gap-1 sm:gap-1.5 bg-brand-black hover:bg-brand-brown text-white text-[11px] sm:text-sm lg:text-base font-bold rounded-lg sm:rounded-xl px-2 sm:px-4 lg:px-5 h-9 sm:h-10 lg:h-11 transition-all duration-300 whitespace-nowrap shadow-md hover:shadow-lg disabled:opacity-50"
      onClick={onClick}
      disabled={disabled}
    >
      {loading ? (
        <Loader2 size={13} className="animate-spin" />
      ) : (
        <>
          <Zap size={13} strokeWidth={2.5} className="sm:hidden text-brand-orange shrink-0" />
          <Zap size={14} strokeWidth={2.5} className="hidden sm:block text-brand-orange shrink-0" />
        </>
      )}
      {loading ? "..." : "Buy"}
    </button>
  );
}
