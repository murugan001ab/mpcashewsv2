// src/services/cartService.ts
import { get, post, patch, del } from "./api";
import type { CartSummary } from "@/types";

// Cookie-based auth — no token params (the old frontend had `_token?` params
// here that CartContext never actually passed, since it was already calling
// these with the cookie-auth signature; cleaned up here).
export const getCart = (): Promise<CartSummary> => get<CartSummary>("/cart");

export const addToCart = (data: { variant_id: string; quantity: number }): Promise<CartSummary> =>
  post<CartSummary>("/cart/items", data);

export const updateCartItem = (itemId: string, data: { quantity: number }): Promise<CartSummary> =>
  patch<CartSummary>(`/cart/items/${itemId}`, data);

export const removeFromCart = (itemId: string): Promise<CartSummary> =>
  del<CartSummary>(`/cart/items/${itemId}`);

export const clearCart = (): Promise<void> => del<void>("/cart");
