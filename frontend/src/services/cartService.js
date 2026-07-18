// src/services/cartService.js
// All endpoints go through /api/v1/cart/* (cookie auth via withCredentials,
// the `token` params below are kept only for call-site backward-compat and ignored)
import { getData, postData, patchData, deleteData } from "./api";

// GET /api/v1/cart  -> { items: [...], total: ... }
export const getCart = (_token) => getData("cart");

// POST /api/v1/cart/items  -> body: { product_id, quantity }
export const addToCart = (_token, data) => postData("cart/items", data);

// PATCH /api/v1/cart/items/{item_id}  -> body: { quantity }
export const updateCartItem = (_token, itemId, data) =>
  patchData(`cart/items/${itemId}`, data);

// DELETE /api/v1/cart/items/{item_id}
export const removeFromCart = (_token, itemId) =>
  deleteData(`cart/items/${itemId}`);

// DELETE /api/v1/cart  -> wipe entire cart
export const clearCart = (_token) => deleteData("cart");
