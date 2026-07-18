// src/utils/localCart.ts
// Guest cart stored in localStorage — used when the user is not logged in.
// IMPORTANT: only import this from Client Components ('use client'), since
// it touches `localStorage` which doesn't exist during SSR.

const CART_KEY = "local_cart";

export interface LocalCartItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
}

export const getLocalCart = (): LocalCartItem[] => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
};

export const saveLocalCart = (cart: LocalCartItem[]): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
};

export const addLocalItem = (
  product: Omit<LocalCartItem, "quantity"> & { quantity?: number }
): LocalCartItem[] => {
  const cart = getLocalCart();
  const index = cart.findIndex((i) => i.product_id === product.product_id);
  if (index >= 0) {
    cart[index].quantity += 1;
  } else {
    cart.push({ ...product, quantity: product.quantity ?? 1 });
  }
  saveLocalCart(cart);
  return cart;
};

export const updateLocalItem = (productId: string, qty: number): LocalCartItem[] => {
  const cart = getLocalCart()
    .map((i) => (i.product_id === productId ? { ...i, quantity: qty } : i))
    .filter((i) => i.quantity > 0);
  saveLocalCart(cart);
  return cart;
};

export const removeLocalItem = (productId: string): LocalCartItem[] => {
  const cart = getLocalCart().filter((i) => i.product_id !== productId);
  saveLocalCart(cart);
  return cart;
};

export const clearLocalCart = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CART_KEY);
};
