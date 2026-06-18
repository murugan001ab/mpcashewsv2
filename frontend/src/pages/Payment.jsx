// src/pages/Payment.jsx
import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, MapPin, ShoppingBag, ShieldCheck, Truck, Lock, CreditCard } from "lucide-react";
import api from "../services/api";
import * as cartService from "../services/cartService";


const API_HOST = import.meta.env.VITE_HOST || "";
const getImg = (p) => p?.image ? (p.image.startsWith("http") ? p.image : `${API_HOST}${p.image}`) : null;

export default function Payment() {
  const { accessToken, isLogged } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isBuyNow    = searchParams.get("buynow") === "1";
  const buyProductId = searchParams.get("product_id");
  const buyQty      = Number(searchParams.get("qty") || 1);

  const [address, setAddress] = useState(null);
  const [cart,    setCart]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying,  setPaying]  = useState(false);

  const subtotal = cart.reduce((s, i) => s + (i.price ?? i.product?.price ?? 0) * i.quantity, 0);
  const shipping = subtotal >= 499 ? 0 : 60;
  const total    = subtotal + shipping;

  useEffect(() => {
    if (!isLogged) { navigate("/login"); return; }
    const load = async () => {
      try {
        const addrRes  = await api.get("addresses/", { headers: { Authorization: `Bearer ${accessToken}` } });
        const list     = addrRes.data || [];
        if (!list.length) { navigate("/address?from=payment"); return; }
        setAddress(list.find(a => a.is_default) || list[0]);

        if (isBuyNow) {
          const pRes = await api.get(`products/${buyProductId}`);
          setCart([{ product: pRes.data, quantity: buyQty, price: pRes.data.discounted_price ?? pRes.data.price }]);
        } else {
          const cartData = await cartService.getCart(accessToken);
          setCart(cartData.items || []);
        }
      } catch (e) { console.error(e); navigate("/address?from=payment"); }
      finally     { setLoading(false); }
    };
    load();
  }, [isLogged, navigate, accessToken]);

  const handlePay = async () => {
    if (!address) { navigate("/address?from=payment"); return; }
    setPaying(true);
    let orderDbId = null;
    try {
      const payload = { address_id: address.id };
      if (isBuyNow) payload.buy_now = { product_id: buyProductId, quantity: buyQty };

      const orderRes = await api.post("orders/", payload, { headers: { Authorization: `Bearer ${accessToken}` } });
      orderDbId      = orderRes.data.id;

      const rpRes    = await api.post("payments/create-order", { order_id: orderDbId }, { headers: { Authorization: `Bearer ${accessToken}` } });
      const { id: rp_order_id, amount, currency } = rpRes.data;

      const rzp = new window.Razorpay({
        key:        import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount, currency,
        name:        "MP Cashews",
        description: `Order #${orderDbId}`,
        order_id:    rp_order_id,
        handler: async (response) => {
          await api.post("payments/verify", {
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
            order_id:            orderDbId,
          }, { headers: { Authorization: `Bearer ${accessToken}` } });
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

  if (loading) return (
    <div>
      <div />
      <span>Loading your order…</span>
    </div>
  );

  if (!cart.length) return (
    <div>
      <ShoppingBag size={40} style={{ opacity:.3 }} />
      <span>No items to checkout</span>
    </div>
  );

  return (
    <div>
      <button onClick={() => navigate(-1)}>
        <ChevronLeft size={16} /> Back
      </button>
      <h1>Checkout</h1>

      <div>
        {/* ── Left column ── */}
        <div>
          {/* Delivery address */}
          <div>
            <div>
              <div>
                <MapPin size={17} style={{ color:"var(--amber)" }} />
                Delivery Address
              </div>
              <button onClick={() => navigate("/address?from=payment")}>
                Change
              </button>
            </div>
            <div>
              {address ? (
                <div>
                  <div>
                    {address.name}
                    {address.is_default && (
                      <span style={{
                        fontSize:".67rem", fontWeight:700, padding:"2px 8px",
                        background:"var(--amber)", color:"#fff", borderRadius:"999px",
                        letterSpacing:".04em", textTransform:"uppercase"
                      }}>Default</span>
                    )}
                  </div>
                  <div>
                    {address.address_line1}{address.address_line2 ? `, ${address.address_line2}` : ""}
                  </div>
                  <div>
                    {address.city}, {address.state} — {address.pincode}
                  </div>
                  <div>📞 {address.phone_number}</div>
                </div>
              ) : (
                <button onClick={() => navigate("/address?from=payment")}>
                  + Add Address
                </button>
              )}
            </div>
          </div>

          {/* Items */}
          <div>
            <div>
              <div>
                <ShoppingBag size={17} style={{ color:"var(--amber)" }} />
                Order Items ({cart.length})
              </div>
            </div>
            <div>
              {cart.map((item, i) => {
                const p     = item.product || item;
                const price = item.price ?? p.price ?? 0;
                const img   = getImg(p);
                return (
                  <div key={i}>
                    {img
                      ? <img src={img} alt={p.name} />
                      : <div />
                    }
                    <div style={{ flex:1 }}>
                      <div>{p.name}</div>
                      <div>Qty: {item.quantity}</div>
                    </div>
                    <div>₹{(price * item.quantity).toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Right column – Summary ── */}
        <div>
          <div>Order Summary</div>
          <div>
            <span>Subtotal ({cart.length} items)</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div>
            <span>Shipping</span>
            <span style={{ color: shipping === 0 ? "var(--green)" : undefined }}>
              {shipping === 0 ? "FREE" : `₹${shipping}`}
            </span>
          </div>
          {shipping === 0 && (
            <div>
              <Truck size={14} /> Free delivery on this order!
            </div>
          )}
          {shipping > 0 && (
            <div style={{ fontSize:".76rem", color:"var(--gray-400)", marginTop:6 }}>
              Add ₹{(499 - subtotal).toFixed(0)} more for free shipping
            </div>
          )}
          <div>
            <span>Total</span>
            <span>₹{total.toFixed(2)}</span>
          </div>

          <button onClick={handlePay} disabled={paying || !address}>
            <CreditCard size={16} />
            {paying ? "Opening Payment…" : `Pay ₹${total.toFixed(2)}`}
          </button>

          <div>
            <Lock size={12} /> 100% Secure &amp; Encrypted Payment
          </div>
          <div>
            <ShieldCheck size={12} /> Powered by Razorpay
          </div>
        </div>
      </div>
    </div>
  );
}
