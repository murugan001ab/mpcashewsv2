"use client";
// src/contexts/WishlistContext.tsx
//
// Mirrors CartContext's shape/pattern. Before this file existed, ProductCard
// had its own local `useState(false)` for the heart icon — it never called
// wishlistService, never checked whether the product was actually saved, and
// reset on every reload. This context is the single source of truth so any
// component can ask "is product X wishlisted" and get a real answer, wired
// to the backend, with an optimistic update so the heart reacts instantly.
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext";
import * as wishlistService from "@/services/wishlistService";

interface WishlistContextValue {
  wishlistIds: Set<string>;
  wishlistLoading: boolean;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<void>;
  reloadWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue>({} as WishlistContextValue);

export const useWishlist = () => useContext(WishlistContext);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { isLogged } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [wishlistLoading, setWishlistLoading] = useState(false);
  // Product ids with an in-flight request, so a rapid double-tap on the
  // heart can't fire two overlapping toggles that race each other.
  const pendingRef = useRef<Set<string>>(new Set());

  const reloadWishlist = useCallback(async () => {
    if (!isLogged) {
      setWishlistIds(new Set());
      return;
    }
    setWishlistLoading(true);
    try {
      const res = await wishlistService.getWishlist();
      setWishlistIds(new Set((res.items || []).map((i) => i.product.id)));
    } catch (e) {
      console.error("[WishlistContext] reloadWishlist error:", e);
    } finally {
      setWishlistLoading(false);
    }
  }, [isLogged]);

  useEffect(() => {
    reloadWishlist();
  }, [reloadWishlist]);

  const isWishlisted = useCallback((productId: string) => wishlistIds.has(productId), [wishlistIds]);

  const toggleWishlist = async (productId: string) => {
    if (!isLogged || pendingRef.current.has(productId)) return;
    pendingRef.current.add(productId);
    const wasWishlisted = wishlistIds.has(productId);

    // Optimistic update so the heart flips instantly instead of waiting on
    // the network round trip.
    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (wasWishlisted) next.delete(productId);
      else next.add(productId);
      return next;
    });

    try {
      if (wasWishlisted) {
        await wishlistService.removeFromWishlist(productId);
      } else {
        await wishlistService.addToWishlist(productId);
      }
    } catch (e) {
      console.error("[WishlistContext] toggleWishlist error:", e);
      // Revert on failure.
      setWishlistIds((prev) => {
        const next = new Set(prev);
        if (wasWishlisted) next.add(productId);
        else next.delete(productId);
        return next;
      });
    } finally {
      pendingRef.current.delete(productId);
    }
  };

  return (
    <WishlistContext.Provider value={{ wishlistIds, wishlistLoading, isWishlisted, toggleWishlist, reloadWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}
