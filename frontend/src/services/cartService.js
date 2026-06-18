// src/services/cartService.js
// All endpoints go through the Gateway → /api/cart/*
import { getData, postData, patchData, deleteData } from "./api";

// GET /api/cart/  → returns { items: [...], total: ... }
export const getCart = (token) => getData("cart/", token);

// POST /api/cart/items  → body: { variant_id, quantity }
export const addToCart = (token, data) => postData("cart/items", data, token);

// PATCH /api/cart/items/{variant_id}  → body: { quantity }  (0 = remove)
export const updateCartItem = (token, variantId, data) =>
  patchData(`cart/items/${variantId}`, data, token);

// DELETE /api/cart/items/{variant_id}
export const removeFromCart = (token, variantId) =>
  deleteData(`cart/items/${variantId}`, token);

// DELETE /api/cart/  → wipe entire cart
export const clearCart = (token) => deleteData("cart/", token);
