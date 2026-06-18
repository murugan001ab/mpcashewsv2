// src/components/ProductCard.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Zap, Heart, Minus, Plus } from "lucide-react";


const API_HOST = import.meta.env.VITE_HOST || "";

export default function ProductCard({
  product,
  cartItems = [],
  onAddToCart,
  onIncrement,
  onDecrement,
  onBuyNow,
  adding,
  buttonTitle = "Add to Cart",
}) {
  const navigate = useNavigate();
  const [wishlisted, setWishlisted] = useState(false);

  const cartItem = cartItems.find(c => c.product_id === product.id);

  const imageUrl = product.images?.[0]?.url
    ? product.images[0].url
    : product.image
      ? (product.image.startsWith("http") ? product.image : `${API_HOST}${product.image}`)
      : null;

  const finalPrice    = product.discounted_price ?? product.final_price ?? product.price ?? 0;
  const originalPrice = product.price ?? 0;
  const hasDiscount   = originalPrice > finalPrice;
  const discountPct   = hasDiscount ? Math.round((1 - finalPrice / originalPrice) * 100) : 0;
  const outOfStock    = product.stock === 0;

  return (
    <div>
      {/* Image */}
      <div
       
        onClick={() => navigate(`/product/${product.id}`)}
        style={{ cursor: "pointer" }}
      >
        {imageUrl
          ? <img src={imageUrl} alt={product.name} />
          : <div>No Image</div>
        }
        {hasDiscount && <span>{discountPct}% OFF</span>}
        {product.stock > 0 && product.stock < 10 && (
          <span>Only {product.stock} left</span>
        )}
        {cartItem && <span>In Cart ✓</span>}

        <button
          className={`p-wishlist${wishlisted ? " active" : ""}`}
          onClick={e => { e.stopPropagation(); setWishlisted(v => !v); }}
          aria-label="Wishlist"
        >
          <Heart size={15} fill={wishlisted ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Body */}
      <div>
        {product.category?.name && (
          <span>{product.category.name}</span>
        )}
        <h3
         
          onClick={() => navigate(`/product/${product.id}`)}
          title={product.name}
        >
          {product.name}
        </h3>

        {product.short_description && (
          <p>{product.short_description}</p>
        )}

        <div>
          <span>₹{finalPrice}</span>
          {hasDiscount && <span>₹{originalPrice}</span>}
          {hasDiscount && <span>Save {discountPct}%</span>}
        </div>

        {/* Actions */}
        <div>
          {outOfStock ? (
            <div>Out of Stock</div>
          ) : cartItem ? (
            <div>
              <button
               
                onClick={() => onDecrement(product)}
                disabled={adding || cartItem.quantity <= 1}
                aria-label="Decrease"
              >
                <Minus size={14} />
              </button>
              <span>{cartItem.quantity}</span>
              <button
               
                onClick={() => onIncrement(product)}
                disabled={adding}
                aria-label="Increase"
              >
                <Plus size={14} />
              </button>
            </div>
          ) : (
            <button
             
              disabled={adding}
              onClick={() => onAddToCart(product)}
            >
              <ShoppingCart size={15} />
              {adding ? "Adding…" : buttonTitle}
            </button>
          )}

          <button onClick={() => onBuyNow(product)}>
            <Zap size={13} />
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}
