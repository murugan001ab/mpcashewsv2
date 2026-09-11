"use client";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { ShoppingCart, ArrowRight, Trash2, ArrowLeft, Minus, Plus, Package, Loader2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import type { ProductWithVariant } from "@/components/ProductCard";
import QuickAddCard from "@/components/QuickAddCard";
import * as productService from "@/services/productService";
import { useInfiniteRowSentinel } from "@/hooks/useInfiniteRowSentinel";
import type { CartItem, Product as RelatedProduct } from "@/types";

const RELATED_PAGE_SIZE = 8;

// Matches the CSS transition duration below — how long the slide/collapse
// plays before the item is actually removed from state (Zepto-style "card
// remove" animation instead of the row just vanishing instantly).
const REMOVE_ANIM_MS = 280;

function CartContent() {
  const router = useRouter();
  const { cartItems: cart, cartLoading: busy, increment, decrement, removeItem, addToCart, totals } = useCart();
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  // ── Related products row (bottom, single-row scrollable, paginated) ─────
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [relatedPage, setRelatedPage] = useState(1);
  const [relatedHasMore, setRelatedHasMore] = useState(false);
  const [relatedLoadingMore, setRelatedLoadingMore] = useState(false);
  const relatedRowRef = useRef<HTMLDivElement>(null);

  const cartProductIds = cart.map((i) => String(i.product?.id)).filter(Boolean).sort().join(",");

  // Most common category among cart items; falls back to featured products
  // when the cart has no categorized items to base recommendations on.
  let primaryCategoryId: string | null = null;
  {
    const freq = new Map<string, number>();
    cart.forEach((item) => {
      const catId = item.product?.category?.id;
      if (catId) freq.set(catId, (freq.get(catId) || 0) + 1);
    });
    let max = 0;
    freq.forEach((count, id) => {
      if (count > max) {
        max = count;
        primaryCategoryId = id;
      }
    });
  }

  useEffect(() => {
    if (!cart.length) {
      setRelatedProducts([]);
      setRelatedHasMore(false);
      return;
    }
    setRelatedPage(1);
    const excludeIds = new Set(cart.map((i) => String(i.product?.id)));
    let cancelled = false;

    const fetchFeatured = () =>
      productService.listProducts({ is_featured: true, page: 1, page_size: RELATED_PAGE_SIZE }).then((res) => {
        if (cancelled) return;
        const items = (res.items || []).filter((p) => !excludeIds.has(String(p.id)));
        setRelatedProducts(items);
        setRelatedHasMore(false); // featured fallback isn't paginated against a stable filter
      });

    if (!primaryCategoryId) {
      fetchFeatured().catch(console.error);
      return () => {
        cancelled = true;
      };
    }

    productService
      .listProducts({ category_id: primaryCategoryId, page: 1, page_size: RELATED_PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        const items = (res.items || []).filter((p) => !excludeIds.has(String(p.id)));
        if (items.length === 0) {
          // The cart's category has nothing else to recommend — fall back
          // to featured products instead of showing an empty row.
          return fetchFeatured();
        }
        setRelatedProducts(items);
        setRelatedHasMore((res.total ?? 0) > RELATED_PAGE_SIZE);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryCategoryId, cartProductIds]);

  const loadMoreRelated = useCallback(() => {
    if (relatedLoadingMore || !relatedHasMore) return;
    setRelatedLoadingMore(true);
    const nextPage = relatedPage + 1;
    const excludeIds = new Set(cart.map((i) => String(i.product?.id)));
    const params = primaryCategoryId
      ? { category_id: primaryCategoryId, page: nextPage, page_size: RELATED_PAGE_SIZE }
      : { is_featured: true, page: nextPage, page_size: RELATED_PAGE_SIZE };
    productService
      .listProducts(params)
      .then((res) => {
        const newItems = (res.items || []).filter((p) => !excludeIds.has(String(p.id)));
        setRelatedProducts((prev) => {
          const existingIds = new Set(prev.map((p) => String(p.id)));
          return [...prev, ...newItems.filter((p) => !existingIds.has(String(p.id)))];
        });
        setRelatedPage(nextPage);
        setRelatedHasMore(nextPage * RELATED_PAGE_SIZE < (res.total ?? 0));
      })
      .catch(console.error)
      .finally(() => setRelatedLoadingMore(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relatedLoadingMore, relatedHasMore, relatedPage, primaryCategoryId, cartProductIds]);

  const relatedSentinelRef = useInfiniteRowSentinel(relatedRowRef, loadMoreRelated, {
    enabled: relatedHasMore && !relatedLoadingMore,
  });

  const findRelatedCartItem = (p: ProductWithVariant) =>
    cart.find((i) => i.variant?.id === p.selectedVariant?.id);

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

  const handleUpdate = (item: CartItem, qty: number) => {
    if (qty < item.quantity) decrement(item);
    else increment(item);
  };

  const handleRemove = (item: CartItem) => {
    if (removingIds.has(item.id)) return;
    setRemovingIds((prev) => new Set(prev).add(item.id));
    setTimeout(() => {
      removeItem(item);
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }, REMOVE_ANIM_MS);
  };

  // ── Empty State ──────────────────────────────────────────────────────────
  if (!cart.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] px-4 pt-16">
        <div className="w-24 h-24 bg-brand-orange/10 text-brand-orange rounded-full flex items-center justify-center mb-6 shadow-sm">
          <ShoppingCart size={40} strokeWidth={2} />
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold text-brand-black mb-3 tracking-tight">Your cart is empty</h2>
        <p className="text-brand-brown/60 mb-8 text-center max-w-md text-base leading-relaxed">
          Looks like you haven't added anything yet! Discover our latest products and find something you love.
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

  // ── Calculations ─────────────────────────────────────────────────────────
  const { subtotal, tax, shipping, total } = totals;
  const freeShippingThreshold = 500; // must match backend FREE_SHIPPING_THRESHOLD (app/services/cart.py)
  const progressPct = Math.min((subtotal / freeShippingThreshold) * 100, 100);

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-10 md:py-16 pt-28 md:pt-32 min-h-screen">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-baseline gap-4 mb-8 border-b border-brand-brown/10 pb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold text-brand-black tracking-tight">Shopping Cart</h1>
        <span className="text-sm font-bold text-brand-brown/60 bg-gray-100 px-3 py-1 rounded-full border border-brand-brown/5">
          {cart.length} {cart.length === 1 ? 'Item' : 'Items'}
        </span>
      </div>

      {/* ── Cart Items List ──────────────────────────────────────────────── */}
      <div className="flex flex-col">

        {/* Desktop Table Header */}
        <div className="hidden md:grid grid-cols-12 gap-4 pb-4 mb-2 text-xs font-bold text-brand-brown/40 uppercase tracking-widest border-b border-brand-brown/5">
          <div className="col-span-6">Product</div>
          <div className="col-span-2 text-center">Price</div>
          <div className="col-span-2 text-center">Quantity</div>
          <div className="col-span-2 text-right">Total</div>
        </div>

        <div>
          {cart.map(item => {
            const p = item.product;
            const itemPrice = parseFloat(String(item.price_at_add ?? 0));
            const imgSrc = p?.images?.find(img => img.is_primary)?.url ?? p?.images?.[0]?.url ?? null;

            const isRemoving = removingIds.has(item.id);

            return (
              <div
                key={item.id}
                className={`grid grid-cols-1 md:grid-cols-12 gap-4 items-center border-b border-brand-brown/5 group overflow-hidden transition-all ease-in duration-[280ms] ${
                  isRemoving
                    ? "max-h-0 py-0 my-0 opacity-0 -translate-x-8 scale-[0.97] pointer-events-none border-transparent"
                    : "max-h-[220px] py-6 opacity-100 translate-x-0 scale-100"
                }`}
              >
                {/* Info Column */}
                <div className="col-span-1 md:col-span-6 flex gap-5">
                  {/* Image */}
                  <div 
                    className="w-24 h-24 md:w-28 md:h-28 bg-brand-cream/30 rounded-2xl overflow-hidden cursor-pointer flex-shrink-0 border border-brand-brown/10 relative"
                    onClick={() => router.push(`/products/${p?.id}`)}
                  >
                    {imgSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={imgSrc} 
                        alt={p?.name ?? "product"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-brand-brown/30">
                        <Package size={24} />
                      </div>
                    )}
                  </div>
                  
                  {/* Details */}
                  <div className="flex flex-col justify-center flex-1 py-1">
                    <h3 
                      className="font-bold text-brand-black text-[15px] leading-snug line-clamp-2 cursor-pointer hover:text-brand-orange transition-colors"
                      onClick={() => router.push(`/products/${p?.id}`)}
                    >
                      {p?.name}
                    </h3>
                    {item.variant && (
                      <span className="inline-block mt-1.5 text-[11px] font-semibold bg-gray-100 text-brand-brown/70 px-2 py-0.5 rounded-md w-fit border border-brand-brown/5">
                        {item.variant.weight_grams}g
                      </span>
                    )}
                    
                    {/* Mobile Price */}
                    <div className="md:hidden mt-2 font-bold text-brand-black text-sm">
                      ₹{itemPrice.toFixed(2)}
                    </div>

                    <button 
                      onClick={() => handleRemove(item)} 
                      disabled={busy || isRemoving}
                      className="text-[11px] font-bold text-red-400 hover:text-red-600 flex items-center gap-1 mt-auto pt-2 w-fit transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={13} strokeWidth={2.5} /> Remove
                    </button>
                  </div>
                </div>

                {/* Desktop Price */}
                <div className="hidden md:block col-span-2 text-center font-semibold text-brand-black/70 text-[15px]">
                  ₹{itemPrice.toFixed(2)}
                </div>

                {/* Quantity Stepper */}
                <div className="col-span-2 flex justify-start md:justify-center mt-2 md:mt-0">
                  <div className="flex items-center justify-between w-28 h-10 bg-white border border-brand-orange/20 rounded-xl overflow-hidden shadow-sm">
                    <button 
                      disabled={busy || item.quantity <= 1}
                      onClick={() => handleUpdate(item, item.quantity - 1)}
                      className="w-10 h-full flex items-center justify-center text-brand-orange hover:bg-brand-orange/10 transition-colors disabled:opacity-30"
                    >
                      <Minus size={14} strokeWidth={2.5} />
                    </button>
                    <span className="font-bold text-sm text-brand-black tabular-nums">
                      {item.quantity}
                    </span>
                    <button 
                      disabled={busy}
                      onClick={() => handleUpdate(item, item.quantity + 1)}
                      className="w-10 h-full flex items-center justify-center text-brand-orange hover:bg-brand-orange/10 transition-colors disabled:opacity-30"
                    >
                      <Plus size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                {/* Total */}
                <div className="hidden md:block col-span-2 text-right font-extrabold text-brand-black text-[17px]">
                  ₹{(itemPrice * item.quantity).toFixed(0)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Related Products (single-row scrollable, loads more on scroll) ── */}
      {relatedProducts.length > 0 && (
        <div className="mt-14">
          <div className="mb-6 flex flex-col gap-1">
            <span className="text-brand-orange text-xs font-black uppercase tracking-[0.2em]">Add more, no fuss</span>
            <h2 className="text-2xl md:text-3xl font-black text-brand-black uppercase leading-tight">
              You Might Also Like
            </h2>
            <p className="text-xs text-brand-brown/50 font-medium mt-1">Default pack size · tap + to add instantly</p>
          </div>
          <div ref={relatedRowRef} className="flex gap-3 overflow-x-auto pb-4 scroll-smooth scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            {relatedProducts.map((rp) => (
              <QuickAddCard
                key={rp.id}
                product={rp}
                cartItems={cart}
                onAddToCart={handleRelatedAdd}
                onIncrement={handleRelatedIncrement}
                onDecrement={handleRelatedDecrement}
              />
            ))}
            {relatedHasMore && (
              <div ref={relatedSentinelRef} className="w-4 flex-shrink-0 flex items-center justify-center">
                {relatedLoadingMore && <Loader2 size={18} className="animate-spin text-brand-orange" />}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Order Summary (single column, below cart items + add-more) ─────── */}
      <div className="mt-14">
        <div className="bg-brand-cream/20 border border-brand-brown/10 rounded-3xl p-6 md:p-8 shadow-sm">
          <h2 className="text-xl font-extrabold text-brand-black mb-6">Order Summary</h2>

          {/* Strict two-column rows: label column left, value column right,
              every row sharing the same grid so amounts line up exactly. */}
          <div className="grid grid-cols-[1fr_auto] gap-y-3 text-sm font-medium text-brand-brown/80 mb-6">
            <span>Subtotal</span>
            <span className="font-bold text-brand-black text-right">₹{subtotal.toFixed(0)}</span>

            <span>Tax (GST 18%)</span>
            <span className="font-bold text-brand-black text-right">₹{tax.toFixed(2)}</span>

            <span>Shipping estimate</span>
            <span className="text-right">
              {shipping === 0 ? (
                <span className="text-brand-green font-bold bg-brand-green/10 px-2 py-1 rounded-md text-[10px] uppercase tracking-widest border border-brand-green/20">
                  Free
                </span>
              ) : (
                <span className="font-bold text-brand-black">₹{shipping}</span>
              )}
            </span>
          </div>

          <hr className="border-brand-brown/10 mb-6" />

          <div className="grid grid-cols-[1fr_auto] items-end gap-y-1 mb-8">
            <span className="font-bold text-brand-black">Total</span>
            <span className="font-extrabold text-2xl text-brand-black text-right">₹{total.toFixed(0)}</span>
            <span />
            <span className="text-[11px] font-medium text-brand-brown/50 text-right">Tax included above.</span>
          </div>

          {/* Free Shipping Progress */}
          {subtotal < freeShippingThreshold && (
            <div className="bg-white rounded-2xl p-4 mb-8 border border-brand-brown/5 shadow-sm">
              <div className="flex justify-between text-[11px] font-bold mb-2.5">
                <span className="text-brand-black uppercase tracking-wider">Free Shipping Goal</span>
                <span className="text-brand-orange">₹{freeShippingThreshold}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3 overflow-hidden">
                <div 
                  className="bg-brand-orange h-full rounded-full transition-all duration-700 ease-out" 
                  style={{width: `${progressPct}%`}}
                ></div>
              </div>
              <p className="text-[11px] font-semibold text-brand-brown/70 leading-relaxed">
                You're just <span className="text-brand-orange font-bold text-xs">₹{(freeShippingThreshold - subtotal).toFixed(0)}</span> away from FREE shipping!
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button 
              onClick={() => router.push("/")}
              className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-brand-cream/50 text-brand-black py-3.5 rounded-xl font-bold text-sm transition-all border border-brand-brown/10"
            >
              <ArrowLeft size={16} strokeWidth={2.5} className="text-brand-brown/50" /> Continue
            </button>

            <button 
              onClick={() => router.push("/checkout")}
              className="flex-1 flex items-center justify-center gap-2 bg-brand-black hover:bg-brand-brown text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5"
            >
              Checkout <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* Trust Badges */}
          <div className="mt-8 pt-6 border-t border-brand-brown/5 flex items-center justify-center gap-6 opacity-60 grayscale">
            {/* Optional: Add payment provider SVG icons here */}
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-brown">Secure Checkout</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  return <CartContent />;
}
