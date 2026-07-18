// src/utils/localCart.js
//
// FIXED: addLocalItem previously stored items with only an `id` field
// (taken from the product). Code elsewhere (e.g. Home.jsx) matches cart
// items by `product_id`, which was never set, so the "in cart" / quantity
// stepper UI never recognized items a guest had already added.

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
    // Stamp product_id alongside id so callers that match on either
    // field (Home.jsx uses product_id, Cart.jsx uses id) both work.
    cart.push({ ...product, product_id: product.id, quantity: 1 });
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
