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


const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const cardAnim = { hidden: { opacity:0, y:26 }, show: { opacity:1, y:0, transition: { duration:.44, ease:[.22,.61,.36,1] } } };

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
    <div style={{ paddingTop: "var(--nav-h)" }}>

      {/* ── HERO ── */}
      <section>
        <img src={cashewBanner} alt="" aria-hidden />
        <div />
        <div>
          <div>
            <Star size={11} fill="currentColor" /> Premium Quality Since 2010
          </div>
          <h1>
            Nature's Finest<br />
            <em>Cashew Nuts</em>
          </h1>
          <p>
            Hand-picked, sun-dried &amp; roasted to perfection — from the
            farms of Goa &amp; Kerala straight to your doorstep.
          </p>
          <div>
            <button
             
              onClick={() => document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" })}
            >
              Shop Now
            </button>
            <button onClick={() => navigate("/becomepatner")}>
              Become a Partner →
            </button>
          </div>
        </div>

        <div>
          {[["10K+","Happy Customers"],["50+","Product Variants"],["100%","Natural"],["2-Day","Delivery"]].map(([n,l]) => (
            <div key={l}>
              <div>{n}</div>
              <div>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TRUST STRIP ── */}
      <div>
        <div>
          {[...TRUST_ITEMS, ...TRUST_ITEMS].map(([Icon, text], i) => (
            <div key={i}>
              <div><Icon size={14} /></div>
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* ── CATEGORIES ── */}
      <CategoryScroller />

      {/* ── PRODUCTS ── */}
      <section id="products-section">
        <div>
          <div>Our Collection</div>
          <h2 style={{ fontFamily: "var(--font-display)" }}>
            {querySearch
              ? <>Results for "<span>{querySearch}</span>"</>
              : <>Fresh <span>Picks</span> For You</>
            }
          </h2>
        </div>

        {loading ? (
          <div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div />
                <div>
                  <div />
                  <div />
                  <div style={{ height: 36, marginTop: 16 }} />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div>
            <ShoppingBag size={64} />
            <h3>No products found</h3>
          </div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="show">
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

      {/* ── WHY US ── */}
      <section>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ color: "var(--amber-light)" }}>Why Choose Us</div>
          <h2 style={{ color: "#fff", fontFamily: "var(--font-display)" }}>
            The <em style={{ fontStyle:"italic", color:"var(--amber-light)" }}>MP Cashews</em> Difference
          </h2>
        </div>
        <div>
          {WHY_ITEMS.map(({ icon: Icon, title, desc }) => (
            <div key={title}>
              <div><Icon size={22} /></div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
