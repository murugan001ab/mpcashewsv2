// src/pages/Cart.jsx
import React, { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, ArrowRight, Trash2, ArrowLeft, Minus, Plus } from "lucide-react";
import { AuthContext } from "../contexts/AuthContext";
import * as cartService from "../services/cartService";
import { getLocalCart, updateLocalItem, removeLocalItem } from "../utils/localcart";


const API_HOST = import.meta.env.VITE_HOST || "";
const getImg = (p) => (p?.image ? (p.image.startsWith("http") ? p.image : `${API_HOST}${p.image}`) : null);

export default function Cart() {
  const { isLogged, accessToken } = useContext(AuthContext);
  const navigate = useNavigate();

  const [cart, setCart]   = useState([]);
  const [busy, setBusy]   = useState(false);

  const loadCart = async () => {
    if (!isLogged) { setCart(getLocalCart()); return; }
    try {
      const res = await cartService.getCart(accessToken);
      setCart(res.items || []);
    } catch(e) { console.error(e); }
  };

  useEffect(() => { loadCart(); }, [isLogged, accessToken]);

  const handleUpdate = async (item, qty) => {
    if (qty < 1) return handleRemove(item);
    setBusy(true);
    const vid = item.variant_id || item.id;
    if (!isLogged) { setCart(updateLocalItem(vid, qty)); setBusy(false); return; }
    try { await cartService.updateCartItem(accessToken, item.id, { quantity: qty }); await loadCart(); }
    catch(e) { console.error(e); } finally { setBusy(false); }
  };

  const handleRemove = async (item) => {
    setBusy(true);
    const vid = item.variant_id || item.id;
    if (!isLogged) { setCart(removeLocalItem(vid)); setBusy(false); return; }
    try { await cartService.removeFromCart(accessToken, item.id); await loadCart(); }
    catch(e) { console.error(e); } finally { setBusy(false); }
  };

  if (!cart.length) {
    return (
      <div style={{paddingTop:"calc(var(--nav-h) + 20px)"}}>
        <ShoppingCart size={80} />
        <h2>Your cart is empty</h2>
        <p>Looks like you haven't added anything yet!</p>
        <button onClick={() => navigate("/")}>
          Start Shopping <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  const subtotal  = cart.reduce((s,i) => s + (i.price ?? i.product?.price ?? 0) * i.quantity, 0);
  const shipping  = subtotal >= 499 ? 0 : 60;
  const total     = subtotal + shipping;

  return (
    <div>
      <div>
        <h1>Shopping Cart</h1>
        <span>{cart.length} items</span>
      </div>

      <div>
        {/* Items */}
        <div>
          <div>
            <span>Product</span>
            <span>Price</span>
            <span>Quantity</span>
            <span>Total</span>
          </div>

          <AnimatePresence>
            {cart.map(item => {
              const p         = item.product || item;
              const itemPrice = item.price ?? p.price ?? 0;
              const imgSrc    = getImg(p);
              return (
                <motion.div
                  key={item.id || item.variant_id || p.id}
                 
                  initial={{ opacity:0, x:-12 }}
                  animate={{ opacity:1, x:0 }}
                  exit={{ opacity:0, x:20, transition:{duration:.2} }}
                  layout
                >
                  {/* Info */}
                  <div>
                    {imgSrc ? (
                      <img src={imgSrc} alt={p.name}
                        onClick={() => navigate(`/product/${p.id}`)} />
                    ) : (
                      <div style={{width:72,height:72,background:"var(--gray-200)",borderRadius:"var(--radius-md)",flexShrink:0}} />
                    )}
                    <div>
                      <div onClick={() => navigate(`/product/${p.id}`)}>
                        {p.name}
                      </div>
                      {item.variant_name && <div>{item.variant_name}</div>}
                      <button onClick={() => handleRemove(item)} disabled={busy}>
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  </div>

                  <div>₹{itemPrice}</div>

                  <div>
                    <button disabled={busy || item.quantity <= 1}
                      onClick={() => handleUpdate(item, item.quantity - 1)}><Minus size={13} /></button>
                    <span>{item.quantity}</span>
                    <button disabled={busy}
                      onClick={() => handleUpdate(item, item.quantity + 1)}><Plus size={13} /></button>
                  </div>

                  <div>₹{(itemPrice * item.quantity).toFixed(2)}</div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Summary */}
        <div>
          <div>Order Summary</div>
          <div>
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div>
            <span>Shipping</span>
            <span>{shipping === 0 ? <b style={{color:"var(--green)"}}>FREE</b> : `₹${shipping}`}</span>
          </div>
          <div>
            <span>Total</span>
            <span>₹{total.toFixed(2)}</span>
          </div>
          {subtotal < 499 && (
            <div>
              Add ₹{(499 - subtotal).toFixed(0)} more for FREE shipping!
            </div>
          )}
          <p>Taxes included. Shipping calculated at checkout.</p>
          <button onClick={() => navigate("/address")}>
            Proceed to Checkout <ArrowRight size={16} />
          </button>
          <button onClick={() => navigate("/")}>
            <ArrowLeft size={15} /> Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
