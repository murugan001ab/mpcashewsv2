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
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext";
import * as cartService from "@/services/cartService";
import {
  getLocalCart,
  addLocalItem,
  updateLocalItem,
  removeLocalItem,
  clearLocalCart,
} from "@/utils/localCart";
import type { CartItem } from "@/types";

interface CartTotals {
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}

// Must mirror the backend exactly (app/services/cart.py) so a guest's
// estimated total (shown before login, e.g. in a mini-cart) never disagrees
// with what they're actually charged once cart/checkout load the real
// server-computed CartSummary. cart.py and checkout.py used to hardcode
// their OWN, different (and tax-free) numbers here — that mismatch is what
// caused the displayed total to differ from the Razorpay charge.
const TAX_RATE = 0.18;
const FREE_SHIPPING_THRESHOLD = 500;
const SHIPPING_FEE = 50;

const computeGuestTotals = (items: CartItem[]): CartTotals => {
  const subtotal = items.reduce((s, i) => s + parseFloat(String(i.price_at_add ?? 0)) * i.quantity, 0);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = subtotal + tax + shipping;
  return { subtotal, tax, shipping, total };
};

interface CartContextValue {
  cartItems: CartItem[];
  cartCount: number;
  cartLoading: boolean;
  totals: CartTotals;
  addToCart: (
    variantId: string,
    quantity?: number,
    guestItem?: { name: string; price: number; image?: string }
  ) => Promise<void>;
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
  const [totals, setTotals] = useState<CartTotals>({ subtotal: 0, tax: 0, shipping: 0, total: 0 });
  const [cartLoading, setCartLoading] = useState(false);
  // Item ids with an in-flight mutation. Without this, a fast double-click
  // on +/- fires two overlapping requests that both read the same stale
  // quantity and race each other — one update silently gets clobbered by
  // the other, which is what made the stepper look like it "wasn't working".
  const mutatingRef = useRef<Set<string>>(new Set());

  // Applies a fresh CartSummary (returned by every mutating cart endpoint,
  // not just GET /cart) to both cartItems AND totals in one go. Mutations
  // used to only call setCartItems from the response and leave `totals`
  // untouched — so subtotal/tax/total stayed at whatever they were before
  // (0 for an empty cart) until the next full reloadCart(), which is why
  // the cart showed ₹0 right after adding an item and only fixed itself
  // on refresh.
  const applySummary = (summary: { items?: CartItem[]; subtotal?: string; tax?: string; shipping?: string; total?: string }) => {
    setCartItems(summary.items || []);
    setTotals({
      subtotal: parseFloat(summary.subtotal ?? "0"),
      tax: parseFloat(summary.tax ?? "0"),
      shipping: parseFloat(summary.shipping ?? "0"),
      total: parseFloat(summary.total ?? "0"),
    });
  };

  const reloadCart = useCallback(async () => {
    if (!isLogged) {
      const local = getLocalCart();
      const items = local.map(
        (i) =>
          ({
            id: String(i.id),
            quantity: i.quantity,
            price_at_add: String(i.price),
            subtotal: String(i.price * i.quantity),
            product: { id: i.product_id, name: i.name } as CartItem["product"],
            variant: { id: i.product_id } as CartItem["variant"],
          }) as CartItem
      );
      setCartItems(items);
      setTotals(computeGuestTotals(items));
      return;
    }
    setCartLoading(true);
    try {
      const res = await cartService.getCart();
      applySummary(res);
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

  const addToCart = async (
    variantId: string,
    quantity = 1,
    guestItem?: { name: string; price: number; image?: string }
  ) => {
    if (!isLogged) {
      // Guest cart lives in localStorage, keyed by variant id. We need the
      // product's name/price/image to store a usable line item, so callers
      // (ProductCard, product detail page) pass that along as `guestItem`.
      addLocalItem({
        id: variantId,
        product_id: variantId,
        name: guestItem?.name ?? "Product",
        price: guestItem?.price ?? 0,
        image: guestItem?.image,
        quantity,
      });
      await reloadCart();
      return;
    }

    // Optimistic: show the item (and flip the card over to the +/- stepper)
    // immediately instead of waiting on the network round trip, which is
    // what made "Add to Cart" feel slow. We reconcile with the server's
    // response right after, and roll back only if the request fails.
    const optimisticId = `optimistic-${variantId}`;
    const price = guestItem?.price ?? 0;
    setCartItems((prev) => {
      if (prev.some((c) => c.variant?.id === variantId)) return prev;
      const optimisticItem = {
        id: optimisticId,
        quantity,
        price_at_add: String(price),
        subtotal: String(price * quantity),
        product: { id: variantId, name: guestItem?.name ?? "Product" } as CartItem["product"],
        variant: { id: variantId } as CartItem["variant"],
      } as CartItem;
      return [...prev, optimisticItem];
    });

    try {
      // addToCart already returns the full, up-to-date CartSummary — apply it
      // directly instead of firing a second GET /cart afterwards. That extra
      // round trip was the main reason "add to cart" felt slow.
      const summary = await cartService.addToCart({ variant_id: variantId, quantity });
      applySummary(summary);
    } catch (e) {
      console.error("[CartContext] addToCart error:", e);
      // Roll back the optimistic entry so the UI doesn't lie about what's
      // actually in the cart.
      setCartItems((prev) => prev.filter((c) => c.id !== optimisticId));
    }
  };

  const increment = async (item: CartItem) => {
    if (mutatingRef.current.has(item.id)) return;
    mutatingRef.current.add(item.id);
    if (!isLogged) {
      updateLocalItem(item.id, item.quantity + 1);
      await reloadCart();
      mutatingRef.current.delete(item.id);
      return;
    }
    const nextQuantity = item.quantity + 1;
    // Optimistic bump so the number changes the instant you tap +.
    setCartItems((prev) => prev.map((c) => (c.id === item.id ? { ...c, quantity: nextQuantity } : c)));
    try {
      const summary = await cartService.updateCartItem(item.id, { quantity: nextQuantity });
      applySummary(summary);
    } catch (e) {
      console.error("[CartContext] increment error:", e);
      setCartItems((prev) => prev.map((c) => (c.id === item.id ? { ...c, quantity: item.quantity } : c)));
    } finally {
      mutatingRef.current.delete(item.id);
    }
  };

  const decrement = async (item: CartItem) => {
    if (item.quantity <= 1 || mutatingRef.current.has(item.id)) return;
    mutatingRef.current.add(item.id);
    if (!isLogged) {
      updateLocalItem(item.id, item.quantity - 1);
      await reloadCart();
      mutatingRef.current.delete(item.id);
      return;
    }
    const nextQuantity = item.quantity - 1;
    setCartItems((prev) => prev.map((c) => (c.id === item.id ? { ...c, quantity: nextQuantity } : c)));
    try {
      const summary = await cartService.updateCartItem(item.id, { quantity: nextQuantity });
      applySummary(summary);
    } catch (e) {
      console.error("[CartContext] decrement error:", e);
      setCartItems((prev) => prev.map((c) => (c.id === item.id ? { ...c, quantity: item.quantity } : c)));
    } finally {
      mutatingRef.current.delete(item.id);
    }
  };

  const removeItem = async (item: CartItem) => {
    if (mutatingRef.current.has(item.id)) return;
    mutatingRef.current.add(item.id);
    if (!isLogged) {
      removeLocalItem(item.id);
      await reloadCart();
      mutatingRef.current.delete(item.id);
      return;
    }
    const prevItems = cartItems;
    // Optimistic remove — the item disappears immediately, not after the
    // server confirms.
    setCartItems((prev) => prev.filter((c) => c.id !== item.id));
    try {
      const summary = await cartService.removeFromCart(item.id);
      applySummary(summary);
    } catch (e) {
      console.error("[CartContext] removeItem error:", e);
      setCartItems(prevItems);
    } finally {
      mutatingRef.current.delete(item.id);
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
      setTotals({ subtotal: 0, tax: 0, shipping: 0, total: 0 });
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
        totals,
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
