"use client";
// src/components/ProductCard.tsx
// Ported from components/ProductCard.jsx.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Zap, Heart, Minus, Plus } from "lucide-react";
import { HOST } from "@/config/env";
import type { Product, Variant, CartItem } from "@/types";

function fmtWeight(g: number) {
  if (g >= 1000) return `${g / 1000}kg`;
  return `${g}g`;
}

export type ProductWithVariant = Product & { selectedVariant?: Variant };

interface ProductCardProps {
  product: Product;
  cartItems?: CartItem[];
  onAddToCart: (p: ProductWithVariant) => void;
  onIncrement: (p: ProductWithVariant) => void;
  onDecrement: (p: ProductWithVariant) => void;
  onBuyNow: (p: ProductWithVariant) => void;
  adding?: boolean;
  buttonTitle?: string;
}

export default function ProductCard({
  product,
  cartItems = [],
  onAddToCart,
  onIncrement,
  onDecrement,
  onBuyNow,
  adding,
  buttonTitle = "Add",
}: ProductCardProps) {
  const router = useRouter();
  const [wishlisted, setWishlisted] = useState(false);

  const variants = [...(product.variants ?? [])].sort((a, b) => a.weight_grams - b.weight_grams);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(variants[0]?.id ?? null);
  const variant = variants.find((v) => v.id === selectedVariantId) ?? variants[0];

  const finalPrice = parseFloat(variant?.discounted_price ?? variant?.price ?? "0");
  const originalPrice = parseFloat(variant?.price ?? "0");
  const hasDiscount = originalPrice > finalPrice;
  const discountPct = hasDiscount ? Math.round((1 - finalPrice / originalPrice) * 100) : 0;
  const stock = variant?.stock ?? 0;
  const outOfStock = stock === 0;

  const primaryImage = product.images?.find((i) => i.is_primary) ?? product.images?.[0];
  const imageUrl = primaryImage?.url
    ? primaryImage.url.startsWith("http")
      ? primaryImage.url
      : `${HOST}${primaryImage.url}`
    : null;

  const cartItem = cartItems.find(
    (c) => c.variant?.id === variant?.id || c.product?.id === product.id
  );

  const productWithVariant: ProductWithVariant = { ...product, selectedVariant: variant };

  return (
    <div className="group relative bg-brand-cream/30 border border-brand-brown/5 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
      {/* Image */}
      <div
        className="relative overflow-hidden cursor-pointer bg-white aspect-square flex items-center justify-center"
        onClick={() => router.push(`/product/${product.id}`)}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={primaryImage?.alt_text ?? product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50 text-brand-brown/30 text-sm font-medium">
            No Image Available
          </div>
        )}

        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
          {hasDiscount && (
            <span className="bg-brand-orange text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm tracking-wide">
              {discountPct}% OFF
            </span>
          )}
          {product.is_featured && (
            <span className="bg-brand-brown text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm">
              Featured
            </span>
          )}
        </div>

        <button
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm backdrop-blur-sm
            ${
              wishlisted
                ? "bg-brand-orange text-white scale-110"
                : "bg-white/90 text-brand-brown/60 hover:bg-brand-orange hover:text-white"
            }`}
          onClick={(e) => {
            e.stopPropagation();
            setWishlisted((v) => !v);
          }}
          aria-label="Wishlist"
        >
          <Heart
            size={16}
            fill={wishlisted ? "currentColor" : "none"}
            strokeWidth={wishlisted ? 0 : 2}
            className={wishlisted ? "scale-110 transition-transform" : ""}
          />
        </button>

        <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 items-start pointer-events-none">
          {stock > 0 && stock < 10 && (
            <span className="bg-white/90 backdrop-blur-sm text-brand-orange border border-brand-orange/20 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              Only {stock} left
            </span>
          )}
          {cartItem && (
            <span className="bg-brand-green/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              ✓ In Cart
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 gap-3 bg-white">
        <div className="flex flex-col gap-1">
          {product.category?.name && (
            <span className="text-[10px] uppercase tracking-widest font-bold text-brand-brown/40">
              {product.category.name}
            </span>
          )}
          <h3
            className="text-brand-black font-bold text-[15px] leading-snug line-clamp-2 cursor-pointer hover:text-brand-orange transition-colors"
            onClick={() => router.push(`/product/${product.id}`)}
            title={product.name}
          >
            {product.name}
          </h3>
          {product.short_description && (
            <p className="text-xs text-brand-brown/60 line-clamp-1 mt-0.5">{product.short_description}</p>
          )}
        </div>

        {variants.length > 1 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedVariantId(v.id);
                }}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all duration-200
                  ${
                    selectedVariantId === v.id
                      ? "bg-brand-brown text-white shadow-md ring-1 ring-brand-brown"
                      : "bg-gray-50 text-brand-brown/70 hover:bg-brand-orange/10 hover:text-brand-orange"
                  }`}
              >
                {fmtWeight(v.weight_grams)}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-baseline gap-2 mt-auto pt-2">
          <span className="text-brand-black font-extrabold text-lg tracking-tight">
            ₹{finalPrice.toFixed(0)}
          </span>
          {hasDiscount && (
            <span className="text-brand-brown/40 text-sm font-medium line-through decoration-brand-brown/30">
              ₹{originalPrice.toFixed(0)}
            </span>
          )}
        </div>

        <div className="flex gap-2 mt-2">
          {outOfStock ? (
            <div className="flex-1 text-center text-sm font-bold text-brand-brown/40 bg-gray-50 rounded-xl py-2.5">
              Out of Stock
            </div>
          ) : cartItem ? (
            <div className="flex-1 flex items-center justify-between bg-brand-cream/30 border border-brand-orange/20 rounded-xl h-10 overflow-hidden">
              <button
                className="w-10 h-full flex items-center justify-center text-brand-orange hover:bg-brand-orange hover:text-white transition-colors disabled:opacity-30"
                onClick={() => onDecrement(productWithVariant)}
                disabled={adding || cartItem.quantity <= 1}
              >
                <Minus size={16} strokeWidth={2.5} />
              </button>
              <span className="font-bold text-sm text-brand-black tabular-nums">{cartItem.quantity}</span>
              <button
                className="w-10 h-full flex items-center justify-center text-brand-orange hover:bg-brand-orange hover:text-white transition-colors disabled:opacity-30"
                onClick={() => onIncrement(productWithVariant)}
                disabled={adding}
              >
                <Plus size={16} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              className="flex-1 flex items-center justify-center gap-1.5 bg-brand-orange/10 hover:bg-brand-orange text-brand-orange hover:text-white text-sm font-bold rounded-xl h-10 transition-all duration-300 disabled:opacity-50"
              disabled={adding}
              onClick={() => onAddToCart(productWithVariant)}
            >
              <ShoppingCart size={15} strokeWidth={2.5} />
              {adding ? "..." : buttonTitle}
            </button>
          )}

          <button
            className="flex items-center justify-center gap-1.5 bg-brand-black hover:bg-brand-brown text-white text-sm font-bold rounded-xl px-4 h-10 transition-all duration-300 whitespace-nowrap shadow-md hover:shadow-lg disabled:opacity-50"
            onClick={() => onBuyNow(productWithVariant)}
            disabled={outOfStock}
          >
            <Zap size={14} strokeWidth={2.5} className="text-brand-orange" />
            Buy
          </button>
        </div>
      </div>
    </div>
  );
}
