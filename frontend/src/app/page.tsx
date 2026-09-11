"use client";
// src/app/page.tsx
// Ported from pages/Home.jsx.
// Cart handling is now delegated to CartContext (src/contexts/CartContext.tsx)
// instead of duplicating local-cart/cart-API logic inline, the way the old
// Home.jsx, Cart.jsx, and ProductDetails.jsx each did separately.
import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Truck, ShieldCheck, Leaf, Star, ShoppingBag, Award, Zap, Heart } from "lucide-react";
import ProductCard, { type ProductWithVariant } from "@/components/ProductCard";
import CategoryScroller from "@/components/Category";
import * as productService from "@/services/productService";
import { useCart } from "@/contexts/CartContext";
import type { Product } from "@/types";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const cardAnim = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.44, ease: [0.22, 0.61, 0.36, 1] as const } },
};

const TRUST_ITEMS: [typeof Truck, string][] = [
  [Truck, "Free Delivery over ₹499"],
  [ShieldCheck, "100% Natural & Pure"],
  [Leaf, "No Preservatives Added"],
  [Star, "4.8★ Customer Rated"],
  [Award, "Premium Quality Since 2010"],
  [Zap, "2-Day Express Delivery"],
];

const WHY_ITEMS = [
  { icon: Leaf, title: "Farm Fresh", desc: "Hand-picked from the finest farms in Panruti, Tamil Nadu, ensuring peak freshness in every batch." },
  { icon: ShieldCheck, title: "Lab Tested", desc: "Every lot is tested for purity and quality before reaching your doorstep." },
  { icon: Truck, title: "Fast Delivery", desc: "Packed and dispatched within 24 hours. Reach you in 2 business days." },
  { icon: Heart, title: "Made with Love", desc: "Small-batch roasting that locks in the natural flavour of premium cashews." },
];

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const querySearch = searchParams.get("q") || "";

  const { cartItems, addToCart, increment, decrement } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productService.listProducts();
      setProducts(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const findCartItem = (p: ProductWithVariant) =>
    cartItems.find((i) => i.variant?.id === p.selectedVariant?.id);

  const handleAdd = (product: ProductWithVariant) => {
    if (!product.selectedVariant) {
      console.error("No variant selected for", product);
      return;
    }
    const variant = product.selectedVariant;
    const price = parseFloat(variant.discounted_price ?? variant.price ?? "0");
    const primaryImage = product.images?.find((i) => i.is_primary) ?? product.images?.[0];
    addToCart(variant.id, 1, { name: product.name, price, image: primaryImage?.url });
  };

  const handleIncrement = (product: ProductWithVariant) => {
    const item = findCartItem(product);
    if (item) increment(item);
  };

  const handleDecrement = (product: ProductWithVariant) => {
    const item = findCartItem(product);
    if (item) decrement(item);
  };

  const handleBuyNow = async (product: ProductWithVariant) => {
    if (!product.selectedVariant) return;
    const existing = findCartItem(product);
    if (!existing) handleAdd(product);
    router.push("/checkout");
  };

  const filteredProducts = products.filter(
    (p) => !querySearch || p.name.toLowerCase().includes(querySearch.toLowerCase())
  );

  return (
    <div className="bg-brand-cream min-h-screen font-sans pt-16 lg:pt-20">
      {/* HERO */}
      <section className="relative min-h-[90vh] flex flex-col justify-end overflow-hidden bg-brand-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/cashews-banner.png"
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />

        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-8 pb-16 pt-24 flex flex-col gap-8">
          <div className="inline-flex items-center gap-1.5 self-start bg-brand-orange/20 border border-brand-orange/40 text-brand-orange text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
            <Star size={11} fill="currentColor" />
            Premium Quality Panruti Cashews
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black leading-[0.92] tracking-tight text-white uppercase">
            Nature&apos;s
            <br />
            <span className="text-brand-orange">Finest</span>
            <br />
            <span className="text-white">Cashews</span>
          </h1>

          <p className="max-w-lg text-white/70 text-base sm:text-lg leading-relaxed">
            Genuine Panruti-native cashews — hand-picked, sun-dried &amp; roasted to perfection,
            straight from our farms to your doorstep. Retail &amp; wholesale, every grade including W240.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" })}
              className="bg-brand-orange hover:bg-[#d0720a] active:scale-[.97] text-white font-black uppercase tracking-widest text-sm px-8 py-4 rounded-xl transition-all duration-150 shadow-[0_4px_24px_rgba(232,130,12,0.45)]"
            >
              Shop Now
            </button>
            <button
              onClick={() => router.push("/become-partner")}
              className="border-2 border-white/30 hover:border-brand-orange text-white hover:text-brand-orange font-bold uppercase tracking-widest text-sm px-8 py-4 rounded-xl transition-all duration-150"
            >
              Become a Partner →
            </button>
          </div>

          <div className="flex flex-wrap gap-6 pt-4 border-t border-white/10 mt-2">
            {([["10K+", "Happy Customers"], ["50+", "Product Variants"], ["100%", "Natural"], ["2-Day", "Delivery"]] as const).map(
              ([n, l]) => (
                <div key={l} className="flex flex-col gap-0.5">
                  <span className="text-2xl sm:text-3xl font-black text-brand-orange leading-none">{n}</span>
                  <span className="text-xs text-white/50 uppercase tracking-wider font-medium">{l}</span>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <div className="bg-brand-black overflow-hidden border-y-2 border-brand-orange/30">
        <div className="flex gap-0 animate-marquee w-max py-3.5">
          {[...TRUST_ITEMS, ...TRUST_ITEMS].map(([Icon, text], i) => (
            <div key={i} className="flex items-center gap-2.5 px-8 text-white/80 text-sm font-semibold whitespace-nowrap">
              <div className="w-7 h-7 rounded-full bg-brand-orange/20 flex items-center justify-center text-brand-orange shrink-0">
                <Icon size={14} />
              </div>
              {text}
              <span className="ml-8 text-brand-orange/40">◆</span>
            </div>
          ))}
        </div>
      </div>

      {/* CATEGORIES */}
      <div className="mx-auto px-4 sm:px-8">
        <CategoryScroller />
      </div>

      <section id="products-section" className="mx-auto px-4 sm:px-8 pb-20">
        <div className="flex px-4 sm:px-8 flex-col items-center gap-1">
          <span className="text-brand-orange text-xs font-black uppercase tracking-[0.2em]">Our Collection</span>
          <h2 className="text-3xl sm:text-5xl font-black text-brand-black uppercase leading-tight">
            {querySearch ? (
              <>
                Results for &quot;<span className="text-brand-orange">{querySearch}</span>&quot;
              </>
            ) : (
              <>
                Fresh <span className="text-brand-orange">Picks</span> For You
              </>
            )}
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse shadow-sm">
                <div className="h-44 bg-brand-orange/10" />
                <div className="p-4 flex flex-col gap-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-9 bg-brand-orange/20 rounded-lg mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-brand-black/40">
            <ShoppingBag size={64} strokeWidth={1.2} />
            <h3 className="text-xl font-bold">No products found</h3>
          </div>
        ) : (
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid py-10 px-4 sm:px-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filteredProducts.map((p) => (
              <motion.div key={p.id} variants={cardAnim}>
                <ProductCard
                  product={p}
                  cartItems={cartItems}
                  onAddToCart={handleAdd}
                  onIncrement={handleIncrement}
                  onDecrement={handleDecrement}
                  onBuyNow={handleBuyNow}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* WHY US */}
      <section className="bg-brand-black py-20 px-4 sm:px-8 relative overflow-hidden">
        <div className="absolute -left-32 top-0 w-96 h-96 rounded-full bg-brand-orange opacity-10 blur-[100px] pointer-events-none" />
        <div className="absolute -right-32 bottom-0 w-96 h-96 rounded-full bg-brand-brown opacity-10 blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="mb-12 flex flex-col gap-1">
            <span className="text-brand-orange text-xs font-black uppercase tracking-[0.2em]">Why Choose Us</span>
            <h2 className="text-3xl sm:text-5xl font-black text-white uppercase leading-tight">
              The <em className="not-italic text-brand-orange">MP Cashews</em> Difference
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {WHY_ITEMS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group bg-white/5 hover:bg-brand-orange/10 border border-white/10 hover:border-brand-orange/40 rounded-2xl p-6 flex flex-col gap-4 transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-orange/20 group-hover:bg-brand-orange/30 flex items-center justify-center text-brand-orange transition-colors duration-200">
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

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
