"use client";
// src/contexts/CartContext.tsx
// Centralised cart state — works for both guest (localStorage) and logged-in
// (API) users.
//
// NOTE on the old frontend's bug: CartContext.jsx existed as an EMPTY file
// and shadowed CartContext.tsx (the real implementation) due to Vite's
// extension resolution order — so `CartProvider`/`useCart` resolved to
// nothing usable. On top of that, App.tsx never wrapped the tree in
// <CartProvider> at all, so cart-dependent components were doubly orphaned.
// This Next.js app has exactly one CartContext file, and it IS wired into
// the root layout (see src/app/layout.tsx).
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import * as cartService from "@/services/cartService";
import {
  getLocalCart,
  updateLocalItem,
  removeLocalItem,
  clearLocalCart,
} from "@/utils/localCart";
import type { CartItem } from "@/types";

interface CartContextValue {
  cartItems: CartItem[];
  cartCount: number;
  cartLoading: boolean;
  addToCart: (variantId: string, quantity?: number) => Promise<void>;
  increment: (item: CartItem) => Promise<void>;
  decrement: (item: CartItem) => Promise<void>;
  removeItem: (item: CartItem) => Promise<void>;
  clearCart: () => Promise<void>;
  reloadCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue>({} as CartContextValue);

export const useCart = () => useContext(CartContext);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isLogged } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartLoading, setCartLoading] = useState(false);

  const reloadCart = useCallback(async () => {
    if (!isLogged) {
      const local = getLocalCart();
      setCartItems(
        local.map(
          (i) =>
            ({
              id: i.id,
              quantity: i.quantity,
              price_at_add: String(i.price),
              subtotal: String(i.price * i.quantity),
              product: { id: i.product_id, name: i.name } as CartItem["product"],
              variant: { id: i.product_id } as CartItem["variant"],
            }) as CartItem
        )
      );
      return;
    }
    setCartLoading(true);
    try {
      const res = await cartService.getCart();
      setCartItems(res.items || []);
    } catch (e) {
      console.error("[CartContext] reloadCart error:", e);
    } finally {
      setCartLoading(false);
    }
  }, [isLogged]);

  // Reload whenever auth state changes
  useEffect(() => {
    reloadCart();
  }, [reloadCart]);

  const addToCart = async (variantId: string, quantity = 1) => {
    if (!isLogged) {
      // Guest cart needs full product data which isn't available here;
      // calling code should use the localCart helpers directly, then call
      // reloadCart() to sync this context's state.
      await reloadCart();
      return;
    }
    try {
      await cartService.addToCart({ variant_id: variantId, quantity });
      await reloadCart();
    } catch (e) {
      console.error("[CartContext] addToCart error:", e);
    }
  };

  const increment = async (item: CartItem) => {
    if (!isLogged) {
      updateLocalItem(item.id, item.quantity + 1);
      await reloadCart();
      return;
    }
    try {
      await cartService.updateCartItem(item.id, { quantity: item.quantity + 1 });
      await reloadCart();
    } catch (e) {
      console.error("[CartContext] increment error:", e);
    }
  };

  const decrement = async (item: CartItem) => {
    if (item.quantity <= 1) return;
    if (!isLogged) {
      updateLocalItem(item.id, item.quantity - 1);
      await reloadCart();
      return;
    }
    try {
      await cartService.updateCartItem(item.id, { quantity: item.quantity - 1 });
      await reloadCart();
    } catch (e) {
      console.error("[CartContext] decrement error:", e);
    }
  };

  const removeItem = async (item: CartItem) => {
    if (!isLogged) {
      removeLocalItem(item.id);
      await reloadCart();
      return;
    }
    try {
      await cartService.removeFromCart(item.id);
      await reloadCart();
    } catch (e) {
      console.error("[CartContext] removeItem error:", e);
    }
  };

  const clearCartFn = async () => {
    if (!isLogged) {
      clearLocalCart();
      await reloadCart();
      return;
    }
    try {
      await cartService.clearCart();
      setCartItems([]);
    } catch (e) {
      console.error("[CartContext] clearCart error:", e);
    }
  };

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartCount,
        cartLoading,
        addToCart,
        increment,
        decrement,
        removeItem,
        clearCart: clearCartFn,
        reloadCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
