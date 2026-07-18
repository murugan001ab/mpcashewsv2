import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, MapPin, ShoppingBag, ShieldCheck, Truck, Lock, CreditCard, Loader2, Package } from "lucide-react";
import api from "../services/api";
import * as cartService from "../services/cartService";

const API_HOST = import.meta.env.VITE_HOST || "";
const getImg = (p) => p?.image ? (p.image.startsWith("http") ? p.image : `${API_HOST}${p.image}`) : null;

export default function Payment() {
  const { accessToken, isLogged } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isBuyNow     = searchParams.get("buynow") === "1";
  const buyProductId = searchParams.get("product_id");
  const buyQty       = Number(searchParams.get("qty") || 1);

  const [address, setAddress] = useState(null);
  const [cart,    setCart]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying,  setPaying]  = useState(false);

  const subtotal = cart.reduce((s, i) => s + (i.price ?? i.product?.price ?? 0) * i.quantity, 0);
  const freeShippingThreshold = 499;
  const shipping = subtotal >= freeShippingThreshold ? 0 : 60;
  const total    = subtotal + shipping;

  useEffect(() => {
    if (!isLogged) { navigate("/login"); return; }
    const load = async () => {
      try {
        const addrRes = await api.get("users/me/addresses");
        const list    = addrRes.data || [];
        if (!list.length) { navigate("/address?from=payment"); return; }
        setAddress(list.find(a => a.is_default) || list[0]);

        if (isBuyNow) {
          const pRes = await api.get(`products/${buyProductId}`);
          setCart([{ product: pRes.data, quantity: buyQty, price: pRes.data.discounted_price ?? pRes.data.price }]);
        } else {
          const cartData = await cartService.getCart(accessToken);
          setCart(cartData.items || []);
        }
      } catch (e) { 
        console.error(e); 
        navigate("/address?from=payment"); 
      } finally { 
        setLoading(false); 
      }
    };
    load();
  }, [isLogged, navigate, accessToken, isBuyNow, buyProductId, buyQty]);

  const handlePay = async () => {
    if (!address) { navigate("/address?from=payment"); return; }
    setPaying(true);
    let orderDbId = null;
    try {
      const payload = { address_id: address.id };
      if (isBuyNow) payload.buy_now = { product_id: buyProductId, quantity: buyQty };

      const orderRes = await api.post("orders", payload);
      orderDbId      = orderRes.data.id;

      const rpRes    = await api.post("payments/create", { order_id: orderDbId });
      const { id: rp_order_id, amount, currency } = rpRes.data;

      const rzp = new window.Razorpay({
        key:         import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount, 
        currency,
        name:        "MP Cashews",
        description: `Order #${orderDbId}`,
        order_id:    rp_order_id,
        handler: async (response) => {
          await api.post("payments/verify", {
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
            order_id:            orderDbId,
          });
          navigate(`/order-success/${orderDbId}`);
        },
        prefill: { name: address?.name, contact: address?.phone_number },
        theme:   { color: "#C9860A" },
      });
      rzp.open();
    } catch (e) {
      console.error(e);
      alert("Payment failed. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  // ── Loading & Empty States ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-brand-brown/50 pt-24">
        <Loader2 className="animate-spin w-10 h-10 text-brand-orange mb-4" />
        <span className="text-sm font-bold tracking-wide">Preparing secure checkout...</span>
      </div>
    );
  }

  if (!cart.length) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 pt-24">
        <div className="w-20 h-20 bg-brand-orange/10 text-brand-orange rounded-full flex items-center justify-center mb-6">
          <ShoppingBag size={32} strokeWidth={2} />
        </div>
        <h2 className="text-2xl font-extrabold text-brand-black mb-2">Your order is empty</h2>
        <button 
          onClick={() => navigate("/")}
          className="mt-6 bg-brand-black hover:bg-brand-brown text-white px-8 py-3.5 rounded-xl font-bold transition-all"
        >
          Return to Shop
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12 pt-24 min-h-screen animate-in fade-in duration-500">
      
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm font-bold text-brand-brown/60 hover:text-brand-orange transition-colors mb-6 w-fit"
      >
        <ChevronLeft size={16} strokeWidth={2.5} /> Back
      </button>
      <h1 className="text-3xl md:text-4xl font-extrabold text-brand-black tracking-tight mb-8 md:mb-12">
        Secure Checkout
      </h1>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-14">
        
        {/* ── Left Column: Address & Items ────────────────────────────────── */}
        <div className="lg:w-2/3 flex flex-col gap-6">
          
          {/* Address Block */}
          <div className="bg-white border border-brand-brown/10 rounded-3xl p-6 md:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-brand-brown/5">
              <h2 className="text-lg font-extrabold text-brand-black flex items-center gap-2">
                <MapPin size={20} className="text-brand-orange" /> Delivery Address
              </h2>
              <button 
                onClick={() => navigate("/address?from=payment")}
                className="text-xs font-bold text-brand-orange hover:text-brand-brown transition-colors uppercase tracking-widest"
              >
                Change
              </button>
            </div>

            {address ? (
              <div className="bg-brand-cream/20 border border-brand-brown/5 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-extrabold text-[15px] text-brand-black">{address.name}</span>
                  {address.is_default && (
                    <span className="bg-brand-orange text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-sm text-brand-brown/80 leading-relaxed mb-2 max-w-lg">
                  {address.address_line1}{address.address_line2 ? `, ${address.address_line2}` : ""}<br/>
                  {address.city}, {address.state} — <span className="font-semibold text-brand-black">{address.pincode}</span>
                </p>
                <div className="text-sm font-medium text-brand-black flex items-center gap-1.5">
                  <span className="text-brand-brown/40">📞</span> {address.phone_number}
                </div>
              </div>
            ) : (
              <button 
                onClick={() => navigate("/address?from=payment")}
                className="w-full py-4 rounded-xl border border-dashed border-brand-brown/20 text-brand-orange font-bold text-sm hover:bg-brand-orange/5 transition-colors"
              >
                + Add Delivery Address
              </button>
            )}
          </div>

          {/* Items Block */}
          <div className="bg-white border border-brand-brown/10 rounded-3xl p-6 md:p-8 shadow-sm">
            <div className="mb-6 pb-4 border-b border-brand-brown/5 flex items-center gap-2">
              <ShoppingBag size={20} className="text-brand-orange" />
              <h2 className="text-lg font-extrabold text-brand-black">
                Order Items <span className="text-brand-brown/40 font-medium">({cart.length})</span>
              </h2>
            </div>
            
            <div className="flex flex-col divide-y divide-brand-brown/5">
              {cart.map((item, i) => {
                const p     = item.product || item;
                const price = item.price ?? p.price ?? 0;
                const img   = getImg(p);
                return (
                  <div key={i} className="py-4 flex items-center gap-4 first:pt-0 last:pb-0">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-gray-50 border border-brand-brown/5 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {img ? (
                        <img src={img} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={20} className="text-brand-brown/20" />
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-col gap-1">
                      <h3 className="font-bold text-sm md:text-[15px] text-brand-black line-clamp-2 leading-snug">
                        {p.name}
                      </h3>
                      <div className="text-xs font-semibold text-brand-brown/60">
                        Qty: <span className="text-brand-black">{item.quantity}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="font-extrabold text-brand-black text-[15px] whitespace-nowrap">
                        ₹{(price * item.quantity).toFixed(0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Right Column: Order Summary ─────────────────────────────────── */}
        <div className="lg:w-1/3">
          <div className="bg-gray-50 border border-brand-brown/10 rounded-3xl p-6 md:p-8 sticky top-28 shadow-sm">
            <h2 className="text-xl font-extrabold text-brand-black mb-6">Order Summary</h2>
            
            <div className="flex flex-col gap-4 text-sm font-medium text-brand-brown/80 mb-6">
              <div className="flex justify-between">
                <span>Subtotal ({cart.length} items)</span>
                <span className="font-bold text-brand-black">₹{subtotal.toFixed(0)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Shipping</span>
                {shipping === 0 ? (
                  <span className="text-brand-green font-bold bg-brand-green/10 px-2 py-1 rounded-md text-[10px] uppercase tracking-widest border border-brand-green/20">
                    Free
                  </span>
                ) : (
                  <span className="font-bold text-brand-black">₹{shipping}</span>
                )}
              </div>
            </div>

            {/* Shipping Notice */}
            {shipping === 0 ? (
              <div className="flex items-center gap-2 text-[11px] font-bold text-brand-green bg-brand-green/5 p-3 rounded-xl mb-6 border border-brand-green/10">
                <Truck size={14} strokeWidth={2.5} /> Free delivery applied to this order!
              </div>
            ) : (
              <div className="bg-white p-4 rounded-xl mb-6 border border-brand-brown/5 shadow-sm">
                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2 overflow-hidden">
                  <div 
                    className="bg-brand-orange h-full rounded-full transition-all" 
                    style={{width: `${Math.min((subtotal/freeShippingThreshold)*100, 100)}%`}}
                  ></div>
                </div>
                <p className="text-[11px] font-semibold text-brand-brown/70">
                  Add <span className="text-brand-orange font-bold text-xs">₹{(freeShippingThreshold - subtotal).toFixed(0)}</span> more for free shipping
                </p>
              </div>
            )}

            <hr className="border-brand-brown/10 mb-6" />

            <div className="flex justify-between items-end mb-8">
              <span className="font-bold text-brand-black text-lg">Total</span>
              <span className="font-extrabold text-3xl text-brand-black tracking-tight">₹{total.toFixed(0)}</span>
            </div>

            {/* Pay Action */}
            <button 
              onClick={handlePay} 
              disabled={paying || !address}
              className="w-full flex items-center justify-center gap-2 bg-brand-black hover:bg-brand-brown text-white py-4 rounded-xl font-bold text-[15px] transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {paying ? (
                <><Loader2 size={18} className="animate-spin" /> Opening Secure Gateway…</>
              ) : (
                <><CreditCard size={18} strokeWidth={2.5} /> Pay ₹{total.toFixed(0)}</>
              )}
            </button>

            {/* Trust Indicators */}
            <div className="mt-6 pt-6 border-t border-brand-brown/5 flex flex-col gap-3">
              <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-brand-brown/50 uppercase tracking-widest">
                <Lock size={14} className="text-brand-orange" /> 100% Secure & Encrypted
              </div>
              <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-brand-brown/50 uppercase tracking-widest">
                <ShieldCheck size={14} className="text-blue-500" /> Powered by Razorpay
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}