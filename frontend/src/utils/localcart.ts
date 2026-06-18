// src/utils/localcart.ts

const CART_KEY = "local_cart";

export interface LocalCartItem {
  id: string | number;
  name?: string;
  price?: number;
  image?: string;
  quantity: number;
  qty?: number;
  product_id?: string | number;
  [key: string]: unknown;
}

export const getLocalCart = (): LocalCartItem[] => {
  return JSON.parse(localStorage.getItem(CART_KEY) ?? "[]") as LocalCartItem[];
};

export const saveLocalCart = (cart: LocalCartItem[]): void => {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
};

export const addLocalItem = (product: LocalCartItem): LocalCartItem[] => {
  let cart = getLocalCart();
  const index = cart.findIndex(i => i.id === product.id);
  if (index >= 0) {
    cart[index].quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  saveLocalCart(cart);
  return cart;
};

export const updateLocalItem = (productId: string | number, qty: number): LocalCartItem[] => {
  let cart = getLocalCart()
    .map(i => (i.id === productId ? { ...i, quantity: qty } : i))
    .filter(i => i.quantity > 0);
  saveLocalCart(cart);
  return cart;
};

export const removeLocalItem = (productId: string | number): LocalCartItem[] => {
  const cart = getLocalCart().filter(i => i.id !== productId);
  saveLocalCart(cart);
  return cart;
};

export const clearLocalCart = (): void => {
  localStorage.removeItem(CART_KEY);
};
