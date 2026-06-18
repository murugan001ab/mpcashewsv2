// src/pages/ProductDetails.jsx
import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, ShoppingCart, Heart, ChevronLeft, Minus, Plus,
  Truck, ShieldCheck, RefreshCw, Zap, Share2, Check
} from "lucide-react";
import api from "../services/api";
import * as cartService from "../services/cartService";
import { AuthContext } from "../contexts/AuthContext";


const API_HOST = import.meta.env.VITE_HOST || "";
const getImg = (url) => (url ? (url.startsWith("http") ? url : `${API_HOST}${url}`) : null);

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLogged, accessToken } = useContext(AuthContext);

  const [product,     setProduct]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [selectedImg, setSelectedImg] = useState(0);
  const [quantity,    setQuantity]    = useState(1);
  const [activeTab,   setActiveTab]   = useState("description");
  const [wishlisted,  setWishlisted]  = useState(false);
  const [addingCart,  setAddingCart]  = useState(false);
  const [cartSuccess, setCartSuccess] = useState(false);

  useEffect(() => {
    api.get(`products/${id}`)
      .then(res => setProduct(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleQty = (delta) =>
    setQuantity(prev => Math.max(1, Math.min(prev + delta, product?.stock ?? 99)));

  const handleAddToCart = async () => {
    if (!isLogged) { navigate("/login"); return; }
    setAddingCart(true);
    try {
      await cartService.addToCart(accessToken, { product_id: product.id, quantity });
      setCartSuccess(true);
      setTimeout(() => setCartSuccess(false), 2000);
    } catch (e) { console.error(e); }
    finally { setAddingCart(false); }
  };

  const handleBuyNow = () =>
    navigate(`/payment?buynow=1&product_id=${product.id}&qty=${quantity}`);

  if (loading) return (
    <div>
      <div>
        <div><div style={{ height:440, borderRadius:"var(--radius-xl)" }} /></div>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ height:32, width:"70%" }} />
          <div style={{ height:20, width:"40%" }} />
          <div style={{ height:52, width:"50%" }} />
          <div style={{ height:80 }} />
          <div style={{ height:52 }} />
          <div style={{ height:52 }} />
        </div>
      </div>
    </div>
  );

  if (!product) return (
    <div style={{ textAlign:"center", paddingTop:"calc(var(--nav-h)+80px)" }}>
      <h2 style={{ fontFamily:"var(--font-display)", marginBottom:16 }}>Product not found</h2>
      <button onClick={() => navigate("/")}>Go Home</button>
    </div>
  );

  const images    = product.images?.length ? product.images : [];
  const mainImg   = images[selectedImg]?.url ? getImg(images[selectedImg].url) : getImg(product.image);
  const thumbImgs = images.map(i => getImg(i.url));

  const finalPrice  = product.discounted_price ?? product.price ?? 0;
  const hasDiscount = product.price && product.discounted_price && product.price > product.discounted_price;
  const discountPct = hasDiscount ? Math.round((1 - finalPrice / product.price) * 100) : 0;
  const inStock     = product.stock > 0;

  return (
    <div>
      <button onClick={() => navigate(-1)}>
        <ChevronLeft size={17} /> Back
      </button>

      <div>
        {/* ── Images ── */}
        <div>
          <div>
            <AnimatePresence mode="wait">
              <motion.img
                key={selectedImg}
                src={mainImg || "https://placehold.co/500x500?text=No+Image"}
                alt={product.name}
               
                initial={{ opacity:0, scale:.97 }}
                animate={{ opacity:1, scale:1 }}
                exit={{ opacity:0 }}
                transition={{ duration:.28 }}
              />
            </AnimatePresence>

            {hasDiscount && <span>{discountPct}% OFF</span>}

            <button
              className={`pd-heart-btn${wishlisted ? " active" : ""}`}
              onClick={() => setWishlisted(v => !v)}
            >
              <Heart size={17} fill={wishlisted ? "currentColor" : "none"} />
            </button>
            <button
             
              onClick={() => navigator.share?.({ title: product.name, url: window.location.href })}
            >
              <Share2 size={15} />
            </button>
          </div>

          {thumbImgs.length > 1 && (
            <div>
              {thumbImgs.map((src, i) => (
                <button
                  key={i}
                  className={`pd-thumb${selectedImg === i ? " active" : ""}`}
                  onClick={() => setSelectedImg(i)}
                >
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Info ── */}
        <div>
          {product.category?.name && (
            <span>{product.category.name}</span>
          )}
          <h1>{product.name}</h1>

          <div>
            {[1,2,3,4,5].map(s => (
              <Star key={s} size={14} fill={s <= 4 ? "var(--amber)" : "none"} stroke="var(--amber)" />
            ))}
            <span>4.8 (124 reviews)</span>
          </div>

          <div>
            <span>₹{finalPrice}</span>
            {hasDiscount && <span>₹{product.price}</span>}
            {hasDiscount && (
              <span>Save ₹{product.price - finalPrice}</span>
            )}
          </div>

          <div className={`pd-stock ${inStock ? "in" : "out"}`}>
            <span />
            {inStock ? `In Stock (${product.stock} available)` : "Out of Stock"}
          </div>

          {product.short_description && (
            <p>{product.short_description}</p>
          )}

          <div>
            {product.weight_grams && (
              <div><span>Weight</span> {product.weight_grams}g</div>
            )}
            {product.sku && (
              <div><span>SKU</span> {product.sku}</div>
            )}
          </div>

          <div>
            <div style={{ fontSize:".8rem", fontWeight:600, color:"var(--gray-600)", marginBottom:8 }}>Quantity</div>
            <div>
              <button onClick={() => handleQty(-1)} disabled={quantity <= 1}>
                <Minus size={14} />
              </button>
              <span>{quantity}</span>
              <button onClick={() => handleQty(1)} disabled={quantity >= (product.stock || 99)}>
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div>
            <button onClick={handleAddToCart} disabled={addingCart || !inStock}>
              {cartSuccess
                ? <><Check size={16} /> Added!</>
                : <><ShoppingCart size={16} /> {addingCart ? "Adding…" : "Add to Cart"}</>
              }
            </button>
            <button onClick={handleBuyNow} disabled={!inStock}>
              <Zap size={15} /> Buy Now
            </button>
          </div>

          <div>
            {[[Truck,"Free Delivery"],[ShieldCheck,"100% Natural"],[RefreshCw,"Easy Returns"]].map(([Icon,txt]) => (
              <div key={txt}>
                <Icon size={18} />
                <span>{txt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div>
        <div>
          {["description","specifications","reviews"].map(t => (
            <button
              key={t}
              className={`pd-tab-btn${activeTab === t ? " active" : ""}`}
              onClick={() => setActiveTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            exit={{ opacity:0 }} transition={{ duration:.22 }}
          >
            {activeTab === "description" && (
              <p style={{ lineHeight:1.8, color:"var(--gray-700)" }}>
                {product.description || "No description available."}
              </p>
            )}
            {activeTab === "specifications" && (
              <div>
                {product.weight_grams && <div><span>Weight</span><span>{product.weight_grams}g</span></div>}
                {product.sku && <div><span>SKU</span><span>{product.sku}</span></div>}
                {product.category?.name && <div><span>Category</span><span>{product.category.name}</span></div>}
                <div><span>Availability</span><span style={{ color: inStock ? "var(--green)" : "var(--red)" }}>{inStock ? "In Stock" : "Out of Stock"}</span></div>
              </div>
            )}
            {activeTab === "reviews" && (
              <div style={{ color:"var(--gray-400)", textAlign:"center", padding:"48px 0", fontSize:".95rem" }}>
                No reviews yet. Be the first to review!
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
