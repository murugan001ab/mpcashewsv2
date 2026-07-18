"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, ArrowRight, Trash2, ArrowLeft, Minus, Plus, Package, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import AuthGuard from "@/components/AuthGuard";
import type { CartItem } from "@/types";

function CartContent() {
  const router = useRouter();
  const { cartItems: cart, cartLoading: busy, increment, decrement, removeItem } = useCart();

  const handleUpdate = (item: CartItem, qty: number) => {
    if (qty < item.quantity) decrement(item);
    else increment(item);
  };

  const handleRemove = (item: CartItem) => removeItem(item);

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
  const subtotal = cart.reduce((s, i) => s + parseFloat(String(i.price_at_add ?? 0)) * i.quantity, 0);
  const freeShippingThreshold = 499;
  const shipping = subtotal >= freeShippingThreshold ? 0 : 60;
  const total = subtotal + shipping;
  const progressPct = Math.min((subtotal / freeShippingThreshold) * 100, 100);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-16 pt-24 min-h-screen">
      
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-baseline gap-4 mb-8 border-b border-brand-brown/10 pb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold text-brand-black tracking-tight">Shopping Cart</h1>
        <span className="text-sm font-bold text-brand-brown/60 bg-gray-100 px-3 py-1 rounded-full border border-brand-brown/5">
          {cart.length} {cart.length === 1 ? 'Item' : 'Items'}
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-10 lg:gap-14">
        
        {/* ── Cart Items List (Left Column) ─────────────────────────────── */}
        <div className="lg:w-2/3 flex flex-col">
          
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

              return (
                <div
                  key={item.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center py-6 border-b border-brand-brown/5 group"
                >
                  {/* Info Column */}
                  <div className="col-span-1 md:col-span-6 flex gap-5">
                    {/* Image */}
                    <div 
                      className="w-24 h-24 md:w-28 md:h-28 bg-brand-cream/30 rounded-2xl overflow-hidden cursor-pointer flex-shrink-0 border border-brand-brown/10 relative"
                      onClick={() => router.push(`/product/${p?.id}`)}
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
                        onClick={() => router.push(`/product/${p?.id}`)}
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
                        disabled={busy}
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

        {/* ── Order Summary (Right Column) ──────────────────────────────── */}
        <div className="lg:w-1/3">
          <div className="bg-brand-cream/20 border border-brand-brown/10 rounded-3xl p-6 md:p-8 sticky top-28 shadow-sm">
            <h2 className="text-xl font-extrabold text-brand-black mb-6">Order Summary</h2>
            
            <div className="flex flex-col gap-4 text-sm font-medium text-brand-brown/80 mb-6">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-brand-black">₹{subtotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Shipping estimate</span>
                {shipping === 0 ? (
                  <span className="text-brand-green font-bold bg-brand-green/10 px-2 py-1 rounded-md text-[10px] uppercase tracking-widest border border-brand-green/20">
                    Free
                  </span>
                ) : (
                  <span className="font-bold text-brand-black">₹{shipping}</span>
                )}
              </div>
            </div>

            <hr className="border-brand-brown/10 mb-6" />

            <div className="flex justify-between items-end mb-2">
              <span className="font-bold text-brand-black">Total</span>
              <div className="text-right">
                <span className="font-extrabold text-2xl text-brand-black">₹{total.toFixed(0)}</span>
              </div>
            </div>
            <p className="text-[11px] font-medium text-brand-brown/50 text-right mb-8">
              Taxes included. Calculated at checkout.
            </p>

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
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => router.push("/checkout")}
                className="w-full flex items-center justify-center gap-2 bg-brand-black hover:bg-brand-brown text-white py-4 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5"
              >
                Proceed to Checkout <ArrowRight size={16} strokeWidth={2.5} />
              </button>
              
              <button 
                onClick={() => router.push("/")}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-brand-cream/50 text-brand-black py-3.5 rounded-xl font-bold text-sm transition-all border border-brand-brown/10"
              >
                <ArrowLeft size={16} strokeWidth={2.5} className="text-brand-brown/50" /> Continue Shopping
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
    </div>
  );
}

export default function CartPage() {
  return (
    <AuthGuard>
      <CartContent />
    </AuthGuard>
  );
}