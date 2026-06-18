// src/utils/localCart.js

const CART_KEY = "local_cart";

export const getLocalCart = () => {
  return JSON.parse(localStorage.getItem(CART_KEY)) || [];
};

export const saveLocalCart = (cart) => {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
};

export const addLocalItem = (product) => {
  let cart = getLocalCart();
  const index = cart.findIndex((i) => i.id === product.id);

  if (index >= 0) {
    cart[index].quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  saveLocalCart(cart);
  return cart;
};

export const updateLocalItem = (productId, qty) => {
  let cart = getLocalCart();
  cart = cart
    .map((i) => (i.id === productId ? { ...i, quantity: qty } : i))
    .filter((i) => i.quantity > 0);
  saveLocalCart(cart);
  return cart;
};

export const removeLocalItem = (productId) => {
  let cart = getLocalCart().filter((i) => i.id !== productId);
  saveLocalCart(cart);
  return cart;
};

export const clearLocalCart = () => {
  localStorage.removeItem(CART_KEY);
};