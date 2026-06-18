// src/utils/localCart.ts
// Guest cart stored in localStorage — used when the user is not logged in.

const CART_KEY = "local_cart";

export interface LocalCartItem {
  id: number;
  product_id: number;
  name: string;
  price: number;
  image?: string;
  quantity: number;
}

export const getLocalCart = (): LocalCartItem[] => {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
};

export const saveLocalCart = (cart: LocalCartItem[]): void => {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
};

export const addLocalItem = (product: Omit<LocalCartItem, "quantity"> & { quantity?: number }): LocalCartItem[] => {
  const cart = getLocalCart();
  const index = cart.findIndex(i => i.product_id === product.product_id);
  if (index >= 0) {
    cart[index].quantity += 1;
  } else {
    cart.push({ ...product, quantity: product.quantity ?? 1 });
  }
  saveLocalCart(cart);
  return cart;
};

export const updateLocalItem = (productId: number, qty: number): LocalCartItem[] => {
  const cart = getLocalCart()
    .map(i => (i.product_id === productId ? { ...i, quantity: qty } : i))
    .filter(i => i.quantity > 0);
  saveLocalCart(cart);
  return cart;
};

export const removeLocalItem = (productId: number): LocalCartItem[] => {
  const cart = getLocalCart().filter(i => i.product_id !== productId);
  saveLocalCart(cart);
  return cart;
};

export const clearLocalCart = (): void => {
  localStorage.removeItem(CART_KEY);
};
