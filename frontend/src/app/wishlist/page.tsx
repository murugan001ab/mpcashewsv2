"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Heart, ArrowRight, Trash2, Package } from "lucide-react";
import * as wishlistService from "@/services/wishlistService";
import { useCart } from "@/contexts/CartContext";
import AuthGuard from "@/components/AuthGuard";
import { assetUrl } from "@/config/env";
import type { WishlistItem } from "@/types";

function WishlistContent() {
  const router = useRouter();
  const { addToCart } = useCart();

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const loadWishlist = useCallback(async () => {
    setLoading(true);
    try {
      const res = await wishlistService.getWishlist();
      setItems(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  const handleRemove = async (productId: string) => {
    if (busyId === productId) return;
    setBusyId(productId);
    // Optimistic: drop the card immediately instead of waiting on the
    // network round trip, which is what made this feel locked/slow.
    const prevItems = items;
    setItems((prev) => prev.filter((i) => i.product?.id !== productId));
    try {
      await wishlistService.removeFromWishlist(productId);
    } catch (e) {
      console.error(e);
      // Roll back — the removal actually failed.
      setItems(prevItems);
    } finally {
      setBusyId(null);
    }
  };

  const handleAddToCart = async (item: WishlistItem) => {
    const variant =
      item.product?.variants?.find((v) => v.is_active) ?? item.product?.variants?.[0];
    if (!variant) return;
    await addToCart(variant.id, 1);
  };

if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-16 pt-28 md:pt-32 min-h-screen">
        <div className="flex items-baseline gap-4 mb-8 border-b border-brand-brown/10 pb-6">
          <div className="h-9 w-40 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
        </div>
        
        {/* Adjusted grid columns so cards aren't forced too narrow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="w-full bg-brand-cream/30 border border-brand-brown/5 rounded-2xl overflow-hidden shadow-sm animate-pulse flex flex-col">
              
              {/* Product Image Skeleton */}
              <div className="relative w-full aspect-square bg-white flex items-center justify-center">
                <div className="w-full h-full bg-brand-orange/10" />
                <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 border border-brand-brown/5" />
              </div>
              
              {/* Product Content Info Skeleton */}
              <div className="p-4 sm:p-5 flex flex-col gap-3 w-full bg-white">
                <div className="h-3 w-1/3 bg-gray-100 rounded" />
                <div className="h-5 w-full bg-gray-200 rounded" />
                <div className="h-5 w-4/5 bg-gray-200 rounded" />
                <div className="h-3 w-1/4 bg-gray-100 rounded mt-1" />
                
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                  <div className="h-6 w-1/3 bg-gray-200 rounded" />
                  <div className="h-9 w-24 bg-gray-100 rounded-xl" />
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] px-4 pt-16">
        <div className="w-24 h-24 bg-brand-orange/10 text-brand-orange rounded-full flex items-center justify-center mb-6 shadow-sm">
          <Heart size={40} strokeWidth={2} />
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold text-brand-black mb-3 tracking-tight">
          Your wishlist is empty
        </h2>
        <p className="text-brand-brown/60 mb-8 text-center max-w-md text-base leading-relaxed">
          Save products you love and find them here later.
        </p>
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 bg-brand-orange hover:bg-brand-brown text-white px-8 py-3.5 rounded-xl font-bold transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-0.5"
        >
          Start Shopping <ArrowRight size={18} strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-16 pt-28 md:pt-32 min-h-screen">
      <div className="flex items-baseline gap-4 mb-8 border-b border-brand-brown/10 pb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold text-brand-black tracking-tight">Wishlist</h1>
        <span className="text-sm font-bold text-brand-brown/60 bg-gray-100 px-3 py-1 rounded-full border border-brand-brown/5">
          {items.length} {items.length === 1 ? "Item" : "Items"}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => {
          const { id, product } = item;
          if (!product) return null;
          const primaryImage = product.images?.find((i) => i.is_primary) ?? product.images?.[0];
          const imageUrl = brokenImages[product.id] ? null : assetUrl(primaryImage?.url);
          const variant = product.variants?.find((v) => v.is_active) ?? product.variants?.[0];
          const price = parseFloat(String(variant?.discounted_price ?? variant?.price ?? "0"));

          return (
            <div
              key={id}
              className="group relative bg-brand-cream/30 border border-brand-brown/5 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              <div
                className="relative overflow-hidden cursor-pointer bg-white aspect-square flex items-center justify-center"
                onClick={() => router.push(`/products/${product.id}`)}
              >
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    onError={() =>
                      setBrokenImages((prev) => ({ ...prev, [product.id]: true }))
                    }
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-gray-50 text-brand-brown/30">
                    <Package size={22} strokeWidth={1.5} />
                    <span className="text-[11px] font-medium">No Image</span>
                  </div>
                )}

                <button
                  className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-white/90 text-brand-brown/60 hover:bg-red-500 hover:text-white transition-all duration-300 shadow-sm backdrop-blur-sm disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(product.id);
                  }}
                  disabled={busyId === product.id}
                  aria-label="Remove from wishlist"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="flex flex-col flex-1 p-4 gap-2 bg-white">
                {product.category?.name && (
                  <span className="text-[10px] uppercase tracking-widest font-bold text-brand-brown/40">
                    {product.category.name}
                  </span>
                )}
                <h3
                  className="text-brand-black font-bold text-[15px] leading-snug line-clamp-2 cursor-pointer hover:text-brand-orange transition-colors"
                  onClick={() => router.push(`/products/${product.id}`)}
                >
                  {product.name}
                </h3>
                {variant && (
                  <p className="text-xs text-brand-black/40 font-medium">{variant.weight_grams}g</p>
                )}
                <span className="text-brand-black font-extrabold text-lg tracking-tight mt-auto">
                  ₹{price.toFixed(0)}
                </span>
                <button
                  onClick={() => handleAddToCart(item)}
                  disabled={!variant}
                  className="mt-1 w-full bg-brand-black hover:bg-brand-brown disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-xl transition-all active:scale-[.98]"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function WishlistPage() {
  return (
    <AuthGuard>
      <WishlistContent />
    </AuthGuard>
  );
}
