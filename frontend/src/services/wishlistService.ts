// src/services/wishlistService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Maps every /api/v1/wishlist/* endpoint.
// ─────────────────────────────────────────────────────────────────────────────

import { get, post, del } from "./api";
import type { WishlistResponse } from "../types";

// GET /api/v1/wishlist
export const getWishlist = (): Promise<WishlistResponse> =>
  get<WishlistResponse>("/wishlist");

// POST /api/v1/wishlist/items
export const addToWishlist = (productId: number): Promise<WishlistResponse> =>
  post<WishlistResponse>("/wishlist/items", { product_id: productId });

// DELETE /api/v1/wishlist/items/{product_id}
export const removeFromWishlist = (productId: number): Promise<void> =>
  del<void>(`/wishlist/items/${productId}`);
