// src/services/orderService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Maps every /api/v1/orders/* endpoint.
// ─────────────────────────────────────────────────────────────────────────────

import { get, post } from "./api";
import type { Order, CreateOrderPayload, PaginatedResponse } from "../types";

// POST /api/v1/orders
export const createOrder = (payload: CreateOrderPayload): Promise<Order> =>
  post<Order>("/orders", payload);

// GET /api/v1/orders
export const listOrders = (params?: {
  page?: number;
  size?: number;
}): Promise<PaginatedResponse<Order>> =>
  get<PaginatedResponse<Order>>("/orders", { params });

// GET /api/v1/orders/{order_id}
export const getOrder = (orderId: number): Promise<Order> =>
  get<Order>(`/orders/${orderId}`);

// POST /api/v1/orders/{order_id}/cancel
export const cancelOrder = (orderId: number): Promise<Order> =>
  post<Order>(`/orders/${orderId}/cancel`);
