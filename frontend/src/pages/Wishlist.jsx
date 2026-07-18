import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, ArrowRight, Trash2, Package } from "lucide-react";
import { AuthContext } from "../contexts/AuthContext";
import * as wishlistService from "../services/wishlistService";

const API_HOST = import.meta.env.VITE_HOST || "";
const getImg = (p) =>
  p?.image ? (p.image.startsWith("http") ? p.image : `${API_HOST}${p.image}`) : null;

export default function Wishlist() {
  const { isLogged } = useContext(AuthContext);
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const loadWishlist = async () => {
    setLoading(true);
    try {
      const res = await wishlistService.getWishlist();
      setItems(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLogged) { navigate("/login"); return; }
    loadWishlist();
  }, [isLogged]);

  const handleRemove = async (productId) => {
    setBusyId(productId);
    try {
      await wishlistService.removeFromWishlist(productId);
      setItems((prev) => prev.filter((i) => i.product?.id !== productId));
    } catch (e) {
      console.error(e);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-16 pt-24 min-h-screen">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse shadow-sm">
              <div className="h-44 bg-brand-orange/10" />
              <div className="p-4 flex flex-col gap-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] px-4 pt-16">
        <div className="w-24 h-24 bg-brand-orange/10 text-brand-orange rounded-full flex items-center justify-center mb-6 shadow-sm">
          <Heart size={40} strokeWidth={2} />
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold text-brand-black mb-3 tracking-tight">
          Your wishlist is empty
        </h2>
        <p className="text-brand-brown/60 mb-8 text-center max-w-md text-base leading-relaxed">
          Save products you love and find them here later.
        </p>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 bg-brand-orange hover:bg-brand-brown text-white px-8 py-3.5 rounded-xl font-bold transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-0.5"
        >
          Start Shopping <ArrowRight size={18} strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-16 pt-24 min-h-screen">
      <div className="flex items-baseline gap-4 mb-8 border-b border-brand-brown/10 pb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold text-brand-black tracking-tight">Wishlist</h1>
        <span className="text-sm font-bold text-brand-brown/60 bg-gray-100 px-3 py-1 rounded-full border border-brand-brown/5">
          {items.length} {items.length === 1 ? "Item" : "Items"}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map(({ id, product }) => {
          if (!product) return null;
          const primaryImage = product.images?.find((i) => i.is_primary) ?? product.images?.[0];
          const imageUrl = primaryImage?.url
            ? primaryImage.url
            : getImg(product);

          return (
            <div
              key={id}
              className="group relative bg-brand-cream/30 border border-brand-brown/5 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              <div
                className="relative overflow-hidden cursor-pointer bg-white aspect-square flex items-center justify-center"
                onClick={() => navigate(`/product/${product.id}`)}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-brand-brown/30">
                    <Package size={24} />
                  </div>
                )}

                <button
                  className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-white/90 text-brand-brown/60 hover:bg-red-500 hover:text-white transition-all duration-300 shadow-sm backdrop-blur-sm disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(product.id);
                  }}
                  disabled={busyId === product.id}
                  aria-label="Remove from wishlist"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="flex flex-col flex-1 p-4 gap-2 bg-white">
                {product.category?.name && (
                  <span className="text-[10px] uppercase tracking-widest font-bold text-brand-brown/40">
                    {product.category.name}
                  </span>
                )}
                <h3
                  className="text-brand-black font-bold text-[15px] leading-snug line-clamp-2 cursor-pointer hover:text-brand-orange transition-colors"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  {product.name}
                </h3>
                <span className="text-brand-black font-extrabold text-lg tracking-tight mt-auto">
                  ₹{parseFloat(product.discounted_price ?? product.price ?? 0).toFixed(0)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
