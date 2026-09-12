"use client";
// src/app/checkout/page.tsx
// Address selection + Razorpay payment. Creates an order from whatever is in
// the user's server-side cart (backend /orders creates from-cart, there's no
// per-item "buy now" order type), then opens Razorpay checkout for it.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Loader2, CheckCircle2, Package, ArrowLeft, ShieldCheck, Tag, X, Plus } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import * as addressService from "@/services/addressService";
import type { Address } from "@/services/addressService";
import AddressForm, { EMPTY_ADDRESS_FORM, type AddressFormState } from "@/components/AddressForm";
import * as orderService from "@/services/orderService";
import * as paymentService from "@/services/paymentService";
import * as couponService from "@/services/couponService";
import { getErrorMessage } from "@/utils/apiError";
import { RAZORPAY_KEY_ID } from "@/config/env";

interface RazorpayInstance {
  open: () => void;
  close: () => void;
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function CheckoutContent() {
  const router = useRouter();
  const { cartItems: cart, clearCart, totals } = useCart();
  const { user } = useAuth();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rzpRef = useRef<RazorpayInstance | null>(null);

  // "+ Add New Address" inline modal — reuses the same AddressForm as the
  // profile page instead of redirecting away from checkout.
  const [addressForm, setAddressForm] = useState<AddressFormState | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);

  // Coupon (optional) — applying it here only previews the discount against
  // the cart subtotal; it's actually consumed once the order is placed with
  // this same code (see orderService.createOrder's coupon_code field).
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // If the user navigates away (or the component unmounts) while a Razorpay
  // instance is still open, its checkout.js keeps polling api.razorpay.com
  // in the background (UPI/QR status checks) since that script attaches
  // itself directly to document.body — an SPA route change doesn't tear it
  // down. Explicitly closing it here is what actually stops those requests;
  // without this they only stop on a full page refresh.
  useEffect(() => {
    return () => {
      rzpRef.current?.close();
      rzpRef.current = null;
    };
  }, []);

  useEffect(() => {
    loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAddresses = () => {
    setLoadingAddresses(true);
    return addressService
      .getAddresses()
      .then((list) => {
        setAddresses(list);
        const def = list.find((a) => a.is_default) ?? list[0];
        if (def) setSelectedId((prev) => prev ?? def.id);
        return list;
      })
      .catch((e) => {
        console.error(e);
        return [];
      })
      .finally(() => setLoadingAddresses(false));
  };

  const handleSaveNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm) return;
    setSavingAddress(true);
    try {
      const created = await addressService.addAddress(addressForm as Omit<Address, "id">);
      setAddressForm(null);
      const list = await loadAddresses();
      setSelectedId(created.id ?? list.find((a) => a.is_default)?.id ?? null);
    } catch (e) {
      console.error(e);
      alert("Failed to save address.");
    } finally {
      setSavingAddress(false);
    }
  };

  const { subtotal, tax, shipping, total: totalBeforeDiscount } = totals;
  const discount = appliedCoupon?.discount ?? 0;
  const total = Math.max(totalBeforeDiscount - discount, 0);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim() || applyingCoupon) return;
    setApplyingCoupon(true);
    setCouponError(null);
    try {
      const res = await couponService.applyCoupon(couponInput.trim());
      setAppliedCoupon({ code: res.code, discount: parseFloat(res.discount_amount) });
    } catch (e) {
      setAppliedCoupon(null);
      setCouponError(getErrorMessage(e, "That coupon couldn't be applied."));
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  };

  const handlePlaceOrder = async () => {
    if (placing) return; // guard against double-click opening two checkout instances
    if (!selectedId) {
      setError("Please select a delivery address.");
      return;
    }
    setError(null);
    setPlacing(true);
    try {
      // 1. Create the order from the current cart.
      const order = await orderService.createOrder({
        address_id: selectedId,
        coupon_code: appliedCoupon?.code,
      });

      // 2. Create a Razorpay payment order for it.
      const payment = await paymentService.createPaymentOrder(order.id);

      // 3. Load the Razorpay checkout script and open the modal.
      const ok = await loadRazorpayScript();
      if (!ok) {
        setError("Couldn't load the payment gateway. Please check your connection and try again.");
        setPlacing(false);
        return;
      }

      const selectedAddress = addresses.find((a) => a.id === selectedId);

      const rzp = new window.Razorpay({
        key: RAZORPAY_KEY_ID,
        amount: payment.amount,
        currency: payment.currency,
        order_id: payment.razorpay_order_id,
        name: "MP Cashews",
        description: `Order ${order.order_number}`,
        prefill: {
          name: selectedAddress?.name || user?.full_name || "",
          email: user?.email || "",
          contact: selectedAddress?.phone_number || "",
        },
        theme: { color: "#E8820C" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await paymentService.verifyPayment(response);
            rzp.close();
            rzpRef.current = null;
            await clearCart();
            router.push(`/profile?tab=orders`);
          } catch (e) {
            console.error(e);
            rzp.close();
            rzpRef.current = null;
            setError("Payment verification failed. If money was deducted, it will be refunded shortly.");
            setPlacing(false);
          }
        },
        modal: {
          ondismiss: () => {
            rzpRef.current = null;
            setPlacing(false);
          },
        },
      });
      rzpRef.current = rzp;
      rzp.open();
    } catch (e) {
      console.error(e);
      setError("Couldn't place your order. Please try again.");
      setPlacing(false);
    }
  };

  if (!cart.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] px-4 pt-16">
        <div className="w-24 h-24 bg-brand-orange/10 text-brand-orange rounded-full flex items-center justify-center mb-6 shadow-sm">
          <Package size={40} strokeWidth={2} />
        </div>
        <h2 className="text-3xl font-extrabold text-brand-black mb-3 tracking-tight">Your cart is empty</h2>
        <p className="text-brand-brown/60 mb-8 text-center max-w-md">
          Add something to your cart before checking out.
        </p>
        <button
          onClick={() => router.push("/")}
          className="bg-brand-orange hover:bg-brand-brown text-white px-8 py-3.5 rounded-xl font-bold transition-all duration-300 shadow-md"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 pt-28 md:pt-32 pb-28 lg:pb-16 min-h-screen">
      <button
        onClick={() => router.push("/cart")}
        className="flex items-center gap-1.5 text-sm font-bold text-brand-brown/60 hover:text-brand-orange transition-colors mb-8 w-fit"
      >
        <ArrowLeft size={16} strokeWidth={2.5} /> Back to Cart
      </button>

      <h1 className="text-3xl md:text-4xl font-extrabold text-brand-black tracking-tight mb-8">Checkout</h1>

      <div className="flex flex-col lg:flex-row lg:items-start gap-10 lg:gap-14">
        {/* ── Address + Items ──────────────────────────────────────────── */}
        <div className="lg:w-2/3 flex flex-col gap-8">
          <div>
            <h2 className="text-lg font-extrabold text-brand-black mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-brand-orange" /> Delivery Address
            </h2>

            {loadingAddresses ? (
              <div className="flex items-center gap-2 text-brand-brown/50 py-8">
                <Loader2 className="animate-spin" size={20} /> Loading addresses…
              </div>
            ) : addresses.length === 0 ? (
              <div className="bg-gray-50 border border-dashed border-brand-brown/20 rounded-2xl p-6 text-center">
                <p className="text-brand-brown/70 font-medium mb-4">You don't have a saved address yet.</p>
                <button
                  onClick={() => setAddressForm({ ...EMPTY_ADDRESS_FORM })}
                  className="bg-brand-orange hover:bg-brand-brown text-white px-6 py-3 rounded-xl font-bold transition-all"
                >
                  📍 Add Delivery Address
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {addresses.map((addr) => {
                  const isSelected = selectedId === addr.id;
                  return (
                    <button
                      key={addr.id}
                      onClick={() => setSelectedId(addr.id)}
                      className={`text-left relative bg-white border p-5 rounded-2xl transition-all duration-200 ${
                        isSelected
                          ? "border-brand-orange ring-2 ring-brand-orange/20 shadow-sm"
                          : "border-brand-brown/10 hover:border-brand-brown/30"
                      }`}
                    >
                      {isSelected && (
                        <CheckCircle2 size={20} className="absolute top-4 right-4 text-brand-orange" fill="currentColor" strokeWidth={0} />
                      )}
                      <p className="font-bold text-brand-black text-sm mb-1 pr-6 flex items-center gap-2">
                        {addr.name}
                        <span className="text-[9px] font-bold uppercase tracking-wider text-brand-brown/40 bg-brand-brown/5 px-1.5 py-0.5 rounded-full">
                          {addr.address_type}
                        </span>
                      </p>
                      <p className="text-sm text-brand-brown/70 leading-relaxed pr-6">
                        {addr.house_flat}
                        {addr.street_area ? `, ${addr.street_area}` : ""}
                        <br />
                        {addr.city}, {addr.state} - {addr.pincode}
                      </p>
                      <p className="text-xs font-semibold text-brand-brown/50 mt-2">{addr.phone_number}</p>
                    </button>
                  );
                })}

                <button
                  onClick={() => setAddressForm({ ...EMPTY_ADDRESS_FORM })}
                  className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-brand-brown/20 hover:border-brand-orange/50 hover:text-brand-orange text-brand-brown/50 rounded-2xl p-5 transition-colors min-h-[110px]"
                >
                  <Plus size={20} strokeWidth={2.5} />
                  <span className="text-sm font-bold">Add New Address</span>
                </button>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-brand-black mb-4">Order Items</h2>
            <div className="flex flex-col divide-y divide-brand-brown/5 border border-brand-brown/10 rounded-2xl overflow-hidden bg-white">
              {cart.map((item) => {
                const p = item.product;
                const imgSrc = p?.images?.find((img) => img.is_primary)?.url ?? p?.images?.[0]?.url ?? null;
                const itemPrice = parseFloat(String(item.price_at_add ?? 0));
                return (
                  <div key={item.id} className="flex items-center gap-4 p-4">
                    <div className="w-16 h-16 bg-brand-cream/30 rounded-xl overflow-hidden flex-shrink-0 border border-brand-brown/10">
                      {imgSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imgSrc} alt={p?.name ?? "product"} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-brand-brown/30">
                          <Package size={18} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-brand-black truncate">{p?.name}</p>
                      <p className="text-xs text-brand-brown/50">Qty {item.quantity}</p>
                    </div>
                    <p className="font-extrabold text-sm text-brand-black">₹{(itemPrice * item.quantity).toFixed(0)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Order Summary ────────────────────────────────────────────── */}
        <div className="lg:w-1/3">
          <div className="bg-brand-cream/20 border border-brand-brown/10 rounded-3xl p-6 md:p-8 sticky top-28 shadow-sm">
            <h2 className="text-xl font-extrabold text-brand-black mb-6">Order Summary</h2>

            {/* Coupon */}
            <div className="mb-6">
              {appliedCoupon ? (
                <div className="flex items-center justify-between gap-2 bg-brand-green/10 border border-brand-green/20 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-brand-green">
                    <Tag size={15} />
                    {appliedCoupon.code} applied
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-brand-brown/50 hover:text-red-600 transition-colors"
                    title="Remove coupon"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleApplyCoupon();
                    }}
                    className="flex gap-2"
                  >
                    <input
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value.toUpperCase());
                        if (couponError) setCouponError(null);
                      }}
                      placeholder="Coupon code"
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-brand-brown/15 bg-white text-sm font-semibold text-brand-black placeholder:text-brand-brown/35 placeholder:font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange/40 transition uppercase"
                    />
                    <button
                      type="submit"
                      disabled={applyingCoupon || !couponInput.trim()}
                      className="px-4 py-2.5 rounded-xl bg-brand-black hover:bg-brand-brown text-white text-sm font-bold transition-colors disabled:opacity-50"
                    >
                      {applyingCoupon ? <Loader2 size={16} className="animate-spin" /> : "Apply"}
                    </button>
                  </form>
                  {couponError && <p className="text-red-500 text-xs font-semibold">{couponError}</p>}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 text-sm font-medium text-brand-brown/80 mb-6">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-brand-black">₹{subtotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (GST 18%)</span>
                <span className="font-bold text-brand-black">₹{tax.toFixed(2)}</span>
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
              {discount > 0 && (
                <div className="flex justify-between">
                  <span>Coupon discount</span>
                  <span className="font-bold text-brand-green">-₹{discount.toFixed(0)}</span>
                </div>
              )}
            </div>

            <hr className="border-brand-brown/10 mb-6" />

            <div className="flex justify-between items-end mb-8">
              <span className="font-bold text-brand-black">Total</span>
              <span className="font-extrabold text-2xl text-brand-black">₹{total.toFixed(0)}</span>
            </div>

            {error && (
              <p className="text-red-500 text-xs font-semibold mb-4 bg-red-50 border border-red-100 rounded-lg p-3">
                {error}
              </p>
            )}

            <button
              onClick={handlePlaceOrder}
              disabled={placing || loadingAddresses || addresses.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-brand-black hover:bg-brand-brown text-white py-4 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {placing ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Processing…
                </>
              ) : (
                <>Pay ₹{total.toFixed(0)}</>
              )}
            </button>

            <div className="mt-6 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest text-brand-brown/50">
              <ShieldCheck size={14} /> Secured by Razorpay
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky pay bar -- the summary card only sticks at lg:, so on
          phones/tablets the Pay button can be a long scroll away below a
          large cart. Mirrors the same action so it's always reachable. */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-brand-brown/10 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-brown/50">Total</span>
            <span className="text-lg font-extrabold text-brand-black">₹{total.toFixed(0)}</span>
          </div>
          <button
            onClick={handlePlaceOrder}
            disabled={placing || loadingAddresses || addresses.length === 0}
            className="flex-1 max-w-[220px] flex items-center justify-center gap-2 bg-brand-black hover:bg-brand-brown text-white px-6 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
          >
            {placing ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Processing…
              </>
            ) : (
              <>Pay ₹{total.toFixed(0)}</>
            )}
          </button>
        </div>
      </div>

      {addressForm && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-brand-black/40 backdrop-blur-sm" onClick={() => setAddressForm(null)} />
          <div className="relative w-full sm:max-w-xl h-[100dvh] sm:h-auto sm:max-h-[88vh] bg-white sm:rounded-2xl flex flex-col overflow-hidden">
            {/* Small top bar so the page's own "Back to Cart" (hidden behind
                this full-screen overlay on mobile) is still reachable while
                adding an address -- otherwise a new user with no saved
                address has no way back to the cart except finishing the form. */}
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-brand-brown/10 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setAddressForm(null);
                  router.push("/cart");
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-brand-brown/60 hover:text-brand-orange transition-colors"
              >
                <ArrowLeft size={14} strokeWidth={2.5} /> Back to Cart
              </button>
              <button
                type="button"
                onClick={() => setAddressForm(null)}
                aria-label="Close"
                className="w-8 h-8 flex items-center justify-center rounded-full text-brand-brown/50 hover:bg-gray-100 hover:text-brand-black transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <AddressForm
                form={addressForm}
                setForm={setAddressForm}
                onSubmit={handleSaveNewAddress}
                onCancel={() => setAddressForm(null)}
                saving={savingAddress}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <AuthGuard>
      <CheckoutContent />
    </AuthGuard>
  );
}
