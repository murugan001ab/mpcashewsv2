// src/pages/Home.jsx
import React, { useEffect, useState, useCallback, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Truck, ShieldCheck, Leaf, Star, ShoppingBag, Award, Zap, Heart } from "lucide-react";
import { AuthContext } from "../contexts/AuthContext";
import ProductCard from "../components/ProductCard";
import CategoryScroller from "../components/Category";
import api from "../services/api";
import * as cartService from "../services/cartService";
import { getLocalCart, addLocalItem } from "../utils/localcart";
import cashewBanner from "../assets/cashews_top.png";

// ── Brand colours (match logo exactly) ──────────────────────────────────────
// Orange  : #E8820C   (the "CA" in CASHEWS)
// Black   : #111111   (the "MP" and "SHEWS")
// Brown   : #7C4A1E   (cashew illustration shell)
// Cream   : #FDF6EC   (light background / card tint)
// Green   : #4A7C3F   (leaf accent)

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const cardAnim = {
  hidden: { opacity: 0, y: 26 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.44, ease: [0.22, 0.61, 0.36, 1] } },
};

const TRUST_ITEMS = [
  [Truck,       "Free Delivery over ₹499"],
  [ShieldCheck, "100% Natural & Pure"],
  [Leaf,        "No Preservatives Added"],
  [Star,        "4.8★ Customer Rated"],
  [Award,       "Premium Quality Since 2010"],
  [Zap,         "2-Day Express Delivery"],
];

const WHY_ITEMS = [
  { icon: Leaf,        title: "Farm Fresh",    desc: "Hand-picked from the finest farms in Goa & Kerala, ensuring peak freshness in every batch." },
  { icon: ShieldCheck, title: "Lab Tested",    desc: "Every lot is tested for purity and quality before reaching your doorstep." },
  { icon: Truck,       title: "Fast Delivery", desc: "Packed and dispatched within 24 hours. Reach you in 2 business days." },
  { icon: Heart,       title: "Made with Love",desc: "Small-batch roasting that locks in the natural flavour of premium cashews." },
];

export default function Home() {
  const { isLogged, accessToken } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [products,  setProducts]  = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [loading,   setLoading]   = useState(true);

  const querySearch = searchParams.get("q") || "";

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("products/");
      setProducts(res.data?.items || res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const loadCart = useCallback(async () => {
    if (!isLogged) { setCartItems(getLocalCart()); return; }
    try {
      const res = await cartService.getCart(accessToken);
      setCartItems(res.items || []);
    } catch (e) { console.error(e); }
  }, [isLogged, accessToken]);

  useEffect(() => { Promise.all([loadProducts(), loadCart()]); }, [loadProducts, loadCart]);

  const handleAdd = async (product) => {
    if (!isLogged) { setCartItems(addLocalItem(product)); return; }
    try { await cartService.addToCart(accessToken, { product_id: product.id, quantity: 1 }); loadCart(); }
    catch (e) { console.error(e); }
  };

  const handleIncrement = async (product) => {
    const item = cartItems.find(i => i.product_id === product.id);
    if (!item) return;
    if (!isLogged) { setCartItems(addLocalItem(product)); return; }
    await cartService.updateCartItem(accessToken, item.id, { quantity: item.quantity + 1 });
    loadCart();
  };

  const handleDecrement = async (product) => {
    const item = cartItems.find(i => i.product_id === product.id);
    if (!item || item.quantity <= 1) return;
    if (!isLogged) return;
    await cartService.updateCartItem(accessToken, item.id, { quantity: item.quantity - 1 });
    loadCart();
  };

  const handleBuyNow = (product) => navigate(`/payment?buynow=1&product_id=${product.id}&qty=1`);

  const filteredProducts = products.filter(p =>
    !querySearch || p.name.toLowerCase().includes(querySearch.toLowerCase())
  );

  return (
    <div className="pt-[var(--nav-h)] bg-[#FDF6EC] min-h-screen font-sans">

      {/* ══════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════ */}
      <section className="relative min-h-[90vh] flex flex-col justify-end overflow-hidden bg-[#111111]">

        {/* Background banner image */}
        <img
          src={cashewBanner}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity"
        />

        {/* Orange glow blob */}
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] rounded-full bg-[#E8820C] opacity-20 blur-[120px] pointer-events-none" />

        {/* Hero content */}
        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-8 pb-16 pt-24 flex flex-col gap-8">

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 self-start bg-[#E8820C]/20 border border-[#E8820C]/40 text-[#E8820C] text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
            <Star size={11} fill="currentColor" />
            Premium Quality Panruti Cashews
          </div>

          {/* Headline — mirrors the logo's bold condensed style */}
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black leading-[0.92] tracking-tight text-white uppercase">
            Nature's<br />
            <span className="text-[#E8820C] italic not-italic">Finest</span><br />
            <span className="text-white">Cashews</span>
          </h1>

          <p className="max-w-lg text-white/70 text-base sm:text-lg leading-relaxed">
            Hand-picked, sun-dried &amp; roasted to perfection — from the farms of
            Goa &amp; Kerala straight to your doorstep.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" })}
              className="bg-[#E8820C] hover:bg-[#d0720a] active:scale-[.97] text-white font-black uppercase tracking-widest text-sm px-8 py-4 rounded-xl transition-all duration-150 shadow-[0_4px_24px_rgba(232,130,12,0.45)]"
            >
              Shop Now
            </button>
            <button
              onClick={() => navigate("/becomepatner")}
              className="border-2 border-white/30 hover:border-[#E8820C] text-white hover:text-[#E8820C] font-bold uppercase tracking-widest text-sm px-8 py-4 rounded-xl transition-all duration-150"
            >
              Become a Partner →
            </button>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-6 pt-4 border-t border-white/10 mt-2">
            {[["10K+","Happy Customers"],["50+","Product Variants"],["100%","Natural"],["2-Day","Delivery"]].map(([n,l]) => (
              <div key={l} className="flex flex-col gap-0.5">
                <span className="text-2xl sm:text-3xl font-black text-[#E8820C] leading-none">{n}</span>
                <span className="text-xs text-white/50 uppercase tracking-wider font-medium">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          TRUST STRIP
      ══════════════════════════════════════════════ */}
      <div className="bg-[#111111] overflow-hidden border-y-2 border-[#E8820C]/30">
        <div className="flex gap-0 animate-[marquee_28s_linear_infinite] w-max py-3.5">
          {[...TRUST_ITEMS, ...TRUST_ITEMS].map(([Icon, text], i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 px-8 text-white/80 text-sm font-semibold whitespace-nowrap"
            >
              <div className="w-7 h-7 rounded-full bg-[#E8820C]/20 flex items-center justify-center text-[#E8820C] shrink-0">
                <Icon size={14} />
              </div>
              {text}
              <span className="ml-8 text-[#E8820C]/40">◆</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          CATEGORIES
      ══════════════════════════════════════════════ */}
      <div className=" mx-auto px-4 sm:px-8 py-10">
        <CategoryScroller />
      </div>

     
      <section id="products-section" className=" mx-auto px-4 sm:px-8 pb-20">

        {/* Section header */}
        <div className="mb-10 flex  px-4 sm:px-8 flex-col gap-1">
          <span className="text-[#E8820C] text-xs font-black uppercase tracking-[0.2em]">
            Our Collection
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-[#111111] uppercase leading-tight">
            {querySearch ? (
              <>Results for "<span className="text-[#E8820C]">{querySearch}</span>"</>
            ) : (
              <>Fresh <span className="text-[#E8820C]">Picks</span> For You</>
            )}
          </h2>
        </div>

        {/* Loading skeletons */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse shadow-sm">
                <div className="h-44 bg-[#E8820C]/10" />
                <div className="p-4 flex flex-col gap-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-9 bg-[#E8820C]/20 rounded-lg mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-[#111111]/40">
            <ShoppingBag size={64} strokeWidth={1.2} />
            <h3 className="text-xl font-bold">No products found</h3>
          </div>
        ) : (
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid py-10 px-4 sm:px-8 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            {filteredProducts.map(p => (
              <motion.div key={p.id} variants={cardAnim}>
                <ProductCard
                  product={p}
                  cartItems={cartItems}
                  onAddToCart={() => handleAdd(p)}
                  onIncrement={handleIncrement}
                  onDecrement={handleDecrement}
                  onBuyNow={handleBuyNow}
                  buttonTitle={cartItems.find(i => i.product_id === p.id) ? "Update Cart" : "Add to Cart"}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* ══════════════════════════════════════════════
          WHY US
      ══════════════════════════════════════════════ */}
      <section className="bg-[#111111] py-20 px-4 sm:px-8 relative overflow-hidden">

        {/* Decorative orange glow */}
        <div className="absolute -left-32 top-0 w-96 h-96 rounded-full bg-[#E8820C] opacity-10 blur-[100px] pointer-events-none" />
        <div className="absolute -right-32 bottom-0 w-96 h-96 rounded-full bg-[#7C4A1E] opacity-10 blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">

          {/* Header */}
          <div className="mb-12 flex flex-col gap-1">
            <span className="text-[#E8820C] text-xs font-black uppercase tracking-[0.2em]">
              Why Choose Us
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white uppercase leading-tight">
              The <em className="not-italic text-[#E8820C]">MP Cashews</em> Difference
            </h2>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {WHY_ITEMS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group bg-white/5 hover:bg-[#E8820C]/10 border border-white/10 hover:border-[#E8820C]/40 rounded-2xl p-6 flex flex-col gap-4 transition-all duration-200"
              >
                {/* Icon badge */}
                <div className="w-12 h-12 rounded-xl bg-[#E8820C]/20 group-hover:bg-[#E8820C]/30 flex items-center justify-center text-[#E8820C] transition-colors duration-200">
                  <Icon size={22} />
                </div>
                <h3 className="text-white font-black uppercase tracking-wide text-base">{title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}

