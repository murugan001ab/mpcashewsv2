// src/contexts/CartContext.tsx
// Centralised cart state — works for both guest (localStorage) and logged-in (API) users.
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import * as cartService from "../services/cartService";
import { getLocalCart, addLocalItem, updateLocalItem, removeLocalItem, clearLocalCart } from "../utils/localCart";
import type { CartItem } from "../types";

interface CartContextValue {
  cartItems: CartItem[];
  cartCount: number;
  cartLoading: boolean;
  addToCart:    (productId: number, quantity?: number) => Promise<void>;
  increment:    (item: CartItem) => Promise<void>;
  decrement:    (item: CartItem) => Promise<void>;
  removeItem:   (item: CartItem) => Promise<void>;
  clearCart:    () => Promise<void>;
  reloadCart:   () => Promise<void>;
}

const CartContext = createContext<CartContextValue>({} as CartContextValue);

export const useCart = () => useContext(CartContext);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isLogged } = useAuth();
  const [cartItems,    setCartItems]    = useState<CartItem[]>([]);
  const [cartLoading,  setCartLoading]  = useState(false);

  const reloadCart = useCallback(async () => {
    if (!isLogged) {
      // Map local cart shape to CartItem shape
      const local = getLocalCart();
      setCartItems(local.map(i => ({
        id: i.product_id,
        product_id: i.product_id,
        price: i.price,
        quantity: i.quantity,
        product: { id: i.product_id, name: i.name, price: i.price, stock: 999, image: i.image },
      } as CartItem)));
      return;
    }
    setCartLoading(true);
    try {
      const res = await cartService.getCart();
      setCartItems((res as any).items || []);
    } catch (e) {
      console.error("[CartContext] reloadCart error:", e);
    } finally {
      setCartLoading(false);
    }
  }, [isLogged]);

  // Reload whenever auth state changes
  useEffect(() => { reloadCart(); }, [reloadCart]);

  const addToCart = async (productId: number, quantity = 1) => {
    if (!isLogged) {
      // For guest, we don't have full product data here;
      // caller may use local helpers directly. Reload to sync.
      await reloadCart();
      return;
    }
    try {
      await cartService.addToCart({ product_id: productId, quantity });
      await reloadCart();
    } catch (e) {
      console.error("[CartContext] addToCart error:", e);
    }
  };

  const increment = async (item: CartItem) => {
    if (!isLogged) {
      updateLocalItem(item.product_id, item.quantity + 1);
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
      updateLocalItem(item.product_id, item.quantity - 1);
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
      removeLocalItem(item.product_id);
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
    if (!isLogged) { clearLocalCart(); await reloadCart(); return; }
    try {
      await cartService.clearCart();
      setCartItems([]);
    } catch (e) {
      console.error("[CartContext] clearCart error:", e);
    }
  };

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{
      cartItems, cartCount, cartLoading,
      addToCart, increment, decrement, removeItem,
      clearCart: clearCartFn,
      reloadCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}
