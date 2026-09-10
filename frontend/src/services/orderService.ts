// src/services/orderService.ts
import { get, post } from "./api";
import type { CartItem } from "@/types";

export interface OrderItem {
  id: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  product_name: string;
  product_sku: string;
  product: CartItem["product"];
  variant?: CartItem["variant"];
}

export interface Order {
  id: string;
  order_number: string;
  status: string;
  subtotal: string;
  tax_amount: string;
  shipping_amount: string;
  discount_amount: string;
  coupon_code?: string | null;
  total_amount: string;
  notes?: string;
  items: OrderItem[];
  address: {
    id: string;
    full_name: string;
    phone: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  created_at: string;
  updated_at: string;
}

export interface OrderTrackingStep {
  status: string;
  label: string;
  note?: string | null;
  timestamp?: string | null;
  completed: boolean;
}

export interface OrderTracking {
  order_id: string;
  order_number: string;
  current_status: string;
  steps: OrderTrackingStep[];
  awb_code?: string | null;
  courier_name?: string | null;
  courier_tracking_url?: string | null;
  estimated_delivery?: string | null;
}

// Creates an order from whatever is currently in the user's server-side cart.
// Pass `coupon_code` if the user applied one at checkout (see couponService).
export const createOrder = (data: {
  address_id: string | number;
  notes?: string;
  coupon_code?: string;
}): Promise<Order> => post<Order>("/orders", data);

export const getOrder = (orderId: string): Promise<Order> => get<Order>(`/orders/${orderId}`);

export const listOrders = (page = 1, pageSize = 10) =>
  get<{ items: Order[]; total: number; page: number; page_size: number }>("/orders", {
    params: { page, page_size: pageSize },
  });

export const cancelOrder = (orderId: string): Promise<Order> => post<Order>(`/orders/${orderId}/cancel`);

// Status timeline for the order page's "track order" view.
export const trackOrder = (orderId: string): Promise<OrderTracking> =>
  get<OrderTracking>(`/orders/${orderId}/track`);
