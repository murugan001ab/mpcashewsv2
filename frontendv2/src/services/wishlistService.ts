// src/services/wishlistService.ts
import { get, post, del } from "./api";
import type { WishlistResponse } from "@/types";

export const getWishlist = (): Promise<WishlistResponse> => get<WishlistResponse>("/wishlist");

export const addToWishlist = (productId: string): Promise<WishlistResponse> =>
  post<WishlistResponse>("/wishlist/items", { product_id: productId });

export const removeFromWishlist = (productId: string): Promise<WishlistResponse> =>
  del<WishlistResponse>(`/wishlist/items/${productId}`);
