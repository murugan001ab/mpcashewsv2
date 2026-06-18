// src/services/cartService.ts
import { getData, postData, patchData, deleteData } from "./api";

export interface CartItem {
  id: string | number;
  product_id: string | number;
  variant_id?: string | number;
  variant_name?: string;
  quantity: number;
  price?: number;
  product?: {
    id: string | number;
    name: string;
    image?: string;
    price?: number;
  };
}

export interface Cart {
  items: CartItem[];
  total?: number;
}

export const getCart         = (_token?: string): Promise<Cart>    => getData<Cart>("cart/");
export const addToCart       = (_token: string | undefined, data: { product_id: string | number; quantity: number }): Promise<CartItem> =>
  postData<CartItem>("cart/items", data);
export const updateCartItem  = (_token: string | undefined, itemId: string | number, data: { quantity: number }): Promise<CartItem> =>
  patchData<CartItem>(`cart/items/${itemId}`, data);
export const removeFromCart  = (_token: string | undefined, itemId: string | number): Promise<unknown> =>
  deleteData(`cart/items/${itemId}`);
export const clearCart       = (_token?: string): Promise<unknown> => deleteData("cart/");
