// src/components/ProductCard.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Zap, Heart, Minus, Plus } from "lucide-react";

const API_HOST = import.meta.env.VITE_HOST || "";

/** Format grams → "100g", "1kg", "10kg" */
function fmtWeight(g) {
  if (g >= 1000) return `${g / 1000}kg`;
  return `${g}g`;
}

export default function ProductCard({
  product,
  cartItems = [],
  onAddToCart,
  onIncrement,
  onDecrement,
  onBuyNow,
  adding,
  buttonTitle = "Add to Cart",
}) {
  const navigate = useNavigate();
  const [wishlisted, setWishlisted] = useState(false);

  // ── Variants ──────────────────────────────────────────────────────────────
  // Sort variants by weight ascending so the smallest is the default
  const variants = [...(product.variants ?? [])].sort(
    (a, b) => a.weight_grams - b.weight_grams
  );
  const [selectedVariantId, setSelectedVariantId] = useState(
    variants[0]?.id ?? null
  );
  const variant = variants.find((v) => v.id === selectedVariantId) ?? variants[0];

  // ── Derived price / stock from selected variant ───────────────────────────
  const finalPrice    = variant
    ? parseFloat(variant.discounted_price ?? variant.price ?? 0)
    : parseFloat(product.discounted_price ?? product.final_price ?? product.price ?? 0);
  const originalPrice = variant
    ? parseFloat(variant.price ?? 0)
    : parseFloat(product.price ?? 0);
  const hasDiscount   = originalPrice > finalPrice;
  const discountPct   = hasDiscount
    ? Math.round((1 - finalPrice / originalPrice) * 100)
    : 0;
  const stock         = variant?.stock ?? product.stock ?? 0;
  const outOfStock    = stock === 0;

  // ── Image ─────────────────────────────────────────────────────────────────
  const primaryImage =
    product.images?.find((i) => i.is_primary) ?? product.images?.[0];
  const imageUrl = primaryImage?.url
    ? primaryImage.url
    : product.image
      ? product.image.startsWith("http")
        ? product.image
        : `${API_HOST}${product.image}`
      : null;

  // ── Cart lookup — keyed by variant id when available ─────────────────────
  const cartItem = cartItems.find(
    (c) => c.variant_id === variant?.id || c.product_id === product.id
  );

  // Enrich the product object passed to cart handlers with the selected variant
  const productWithVariant = { ...product, selectedVariant: variant };

  return (
    <div className="group relative bg-brand-cream rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 flex flex-col">

      {/* ── Image ─────────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden cursor-pointer bg-white aspect-square"
        onClick={() => navigate(`/product/${product.id}`)}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={primaryImage?.alt_text ?? product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-brown/40 text-sm font-medium">
            No Image
          </div>
        )}

        {/* Discount badge */}
        {hasDiscount && (
          <span className="absolute top-2.5 left-2.5 bg-brand-orange text-white text-[11px] font-bold px-2 py-0.5 rounded-full tracking-wide">
            {discountPct}% OFF
          </span>
        )}

        {/* Featured badge */}
        {product.is_featured && (
          <span className="absolute bottom-2.5 left-2.5 bg-brand-brown text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
            Featured
          </span>
        )}

        {/* Low stock */}
        {stock > 0 && stock < 10 && (
          <span className="absolute bottom-2.5 left-2.5 bg-brand-brown text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
            Only {stock} left
          </span>
        )}

        {/* In-cart indicator */}
        {cartItem && (
          <span className="absolute bottom-2.5 right-2.5 bg-brand-green text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
            ✓ In Cart
          </span>
        )}

        {/* Wishlist */}
        <button
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200 shadow
            ${wishlisted
              ? "bg-brand-orange text-white"
              : "bg-white/80 text-brand-brown hover:bg-brand-orange hover:text-white"
            }`}
          onClick={(e) => { e.stopPropagation(); setWishlisted((v) => !v); }}
          aria-label="Wishlist"
        >
          <Heart size={14} fill={wishlisted ? "currentColor" : "none"} strokeWidth={2} />
        </button>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-3.5 gap-2">

        {/* Category */}
        {product.category?.name && (
          <span className="text-[10px] uppercase tracking-widest font-semibold text-brand-brown/60">
            {product.category.name}
          </span>
        )}

        {/* Name */}
        <h3
          className="text-brand-black font-bold text-sm leading-snug line-clamp-2 cursor-pointer hover:text-brand-orange transition-colors"
          onClick={() => navigate(`/product/${product.id}`)}
          title={product.name}
        >
          {product.name}
        </h3>

        {/* Short description (optional field) */}
        {product.short_description && (
          <p className="text-xs text-brand-brown/70 line-clamp-2 leading-relaxed">
            {product.short_description}
          </p>
        )}

        {/* ── Variant weight selector ─────────────────────────────────────── */}
        {variants.length > 1 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={(e) => { e.stopPropagation(); setSelectedVariantId(v.id); }}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors duration-150
                  ${selectedVariantId === v.id
                    ? "bg-brand-orange text-white border-brand-orange"
                    : "bg-white text-brand-brown border-brand-brown/25 hover:border-brand-orange hover:text-brand-orange"
                  }`}
              >
                {fmtWeight(v.weight_grams)}
              </button>
            ))}
          </div>
        )}

        {/* Price row */}
        <div className="flex items-baseline gap-2 mt-auto pt-1">
          <span className="text-brand-orange font-extrabold text-base">
            ₹{finalPrice.toFixed(0)}
          </span>
          {hasDiscount && (
            <>
              <span className="text-brand-brown/40 text-xs line-through">
                ₹{originalPrice.toFixed(0)}
              </span>
              <span className="text-brand-green text-[10px] font-semibold">
                Save {discountPct}%
              </span>
            </>
          )}
        </div>

        {/* ── Actions ────────────────────────────────────────────────────── */}
        <div className="flex gap-2 mt-1">
          {outOfStock ? (
            <div className="flex-1 text-center text-xs font-semibold text-brand-brown/50 border border-brand-brown/20 rounded-xl py-2">
              Out of Stock
            </div>
          ) : cartItem ? (
            /* Quantity stepper */
            <div className="flex-1 flex items-center justify-between bg-white border border-brand-orange/30 rounded-xl overflow-hidden">
              <button
                className="w-9 h-9 flex items-center justify-center text-brand-orange hover:bg-brand-orange hover:text-white transition-colors disabled:opacity-30"
                onClick={() => onDecrement(productWithVariant)}
                disabled={adding || cartItem.quantity <= 1}
                aria-label="Decrease"
              >
                <Minus size={14} />
              </button>
              <span className="font-bold text-sm text-brand-black tabular-nums">
                {cartItem.quantity}
              </span>
              <button
                className="w-9 h-9 flex items-center justify-center text-brand-orange hover:bg-brand-orange hover:text-white transition-colors disabled:opacity-30"
                onClick={() => onIncrement(productWithVariant)}
                disabled={adding}
                aria-label="Increase"
              >
                <Plus size={14} />
              </button>
            </div>
          ) : (
            /* Add to cart */
            <button
              className="flex-1 flex items-center justify-center gap-1.5 bg-brand-orange hover:bg-brand-brown text-white text-xs font-bold rounded-xl py-2 transition-colors duration-200 disabled:opacity-50"
              disabled={adding}
              onClick={() => onAddToCart(productWithVariant)}
            >
              <ShoppingCart size={13} />
              {adding ? "Adding…" : buttonTitle}
            </button>
          )}

          {/* Buy Now */}
          <button
            className="flex items-center justify-center gap-1 bg-brand-black hover:bg-brand-brown text-brand-cream text-xs font-bold rounded-xl px-3 py-2 transition-colors duration-200 whitespace-nowrap"
            onClick={() => onBuyNow(productWithVariant)}
          >
            <Zap size={12} />
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}
