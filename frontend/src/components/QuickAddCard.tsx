"use client";
// src/components/QuickAddCard.tsx
// Compact "add more" card for horizontal quick-add rows (cart page, etc.),
// styled after Zepto/Blinkit-style quick-commerce add rails.
//
// Deliberately does NOT expose a weight/variant picker — it always uses the
// lowest-weight variant so a tap on "+" adds instantly with zero friction.
// If someone wants a different weight, they can still open the product page.
import { useRouter } from "next/navigation";
import { Plus, Minus, Package } from "lucide-react";
import { HOST } from "@/config/env";
import type { Product, CartItem } from "@/types";
import type { ProductWithVariant } from "@/components/ProductCard";

interface QuickAddCardProps {
  product: Product;
  cartItems?: CartItem[];
  onAddToCart: (p: ProductWithVariant) => void;
  onIncrement: (p: ProductWithVariant) => void;
  onDecrement: (p: ProductWithVariant) => void;
  adding?: boolean;
}

function fmtWeight(g: number) {
  if (g >= 1000) return `${g / 1000}kg`;
  return `${g}g`;
}

export default function QuickAddCard({
  product,
  cartItems = [],
  onAddToCart,
  onIncrement,
  onDecrement,
  adding,
}: QuickAddCardProps) {
  const router = useRouter();

  // Always the smallest available pack — the default, no-choice weight.
  const variant = [...(product.variants ?? [])].sort((a, b) => a.weight_grams - b.weight_grams)[0];

  const finalPrice = parseFloat(variant?.discounted_price ?? variant?.price ?? "0");
  const stock = variant?.stock ?? 0;
  const outOfStock = !variant || stock === 0;

  const primaryImage = product.images?.find((i) => i.is_primary) ?? product.images?.[0];
  const imageUrl = primaryImage?.url
    ? primaryImage.url.startsWith("http")
      ? primaryImage.url
      : `${HOST}${primaryImage.url}`
    : null;

  const cartItem = cartItems.find((c) => c.variant?.id === variant?.id);
  const productWithVariant: ProductWithVariant = { ...product, selectedVariant: variant };

  return (
    <div className="w-[132px] sm:w-[148px] flex-shrink-0 bg-white border border-brand-brown/10 rounded-2xl overflow-hidden flex flex-col">
      <div
        className="relative aspect-square bg-brand-cream/30 cursor-pointer"
        onClick={() => router.push(`/products/${product.id}`)}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-brown/25">
            <Package size={22} />
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 p-2.5 gap-1.5">
        <h4
          className="text-[12.5px] font-bold text-brand-black leading-snug line-clamp-2 cursor-pointer"
          onClick={() => router.push(`/products/${product.id}`)}
          title={product.name}
        >
          {product.name}
        </h4>

        {variant && (
          <span className="w-fit text-[10px] font-semibold bg-gray-100 text-brand-brown/60 px-1.5 py-0.5 rounded-md">
            {fmtWeight(variant.weight_grams)}
          </span>
        )}

        <div className="flex items-center justify-between mt-auto pt-1 gap-2">
          <span className="text-[13px] font-extrabold text-brand-black">₹{finalPrice.toFixed(0)}</span>

          {outOfStock ? (
            <span className="text-[10px] font-bold text-brand-brown/40">Sold out</span>
          ) : cartItem ? (
            <div className="flex items-center gap-1.5 border border-brand-orange rounded-lg h-8 px-1 bg-white">
              <button
                className="w-6 h-6 flex items-center justify-center text-brand-orange hover:bg-brand-orange hover:text-white rounded-md transition-colors disabled:opacity-30"
                onClick={() => onDecrement(productWithVariant)}
                disabled={adding || cartItem.quantity <= 1}
                aria-label="Decrease quantity"
              >
                <Minus size={12} strokeWidth={3} />
              </button>
              <span className="font-bold text-[12.5px] text-brand-black tabular-nums w-3 text-center">{cartItem.quantity}</span>
              <button
                className="w-6 h-6 flex items-center justify-center text-brand-orange hover:bg-brand-orange hover:text-white rounded-md transition-colors disabled:opacity-30"
                onClick={() => onIncrement(productWithVariant)}
                disabled={adding}
                aria-label="Increase quantity"
              >
                <Plus size={12} strokeWidth={3} />
              </button>
            </div>
          ) : (
            <button
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center border border-brand-orange text-brand-orange rounded-lg hover:bg-brand-orange hover:text-white transition-colors disabled:opacity-50"
              disabled={adding}
              onClick={() => onAddToCart(productWithVariant)}
              aria-label={`Add ${product.name} to cart`}
            >
              <Plus size={15} strokeWidth={2.75} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
