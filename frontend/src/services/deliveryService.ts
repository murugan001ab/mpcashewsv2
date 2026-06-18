// src/services/deliveryService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Maps every /api/v1/delivery/* endpoint.
// ─────────────────────────────────────────────────────────────────────────────

import { get, post } from "./api";
import type { DeliveryInfo, TrackingResponse } from "../types";

// GET /api/v1/delivery/{order_id}
export const getDelivery = (orderId: number): Promise<DeliveryInfo> =>
  get<DeliveryInfo>(`/delivery/${orderId}`);

// GET /api/v1/delivery/{order_id}/track
export const trackDelivery = (orderId: number): Promise<TrackingResponse> =>
  get<TrackingResponse>(`/delivery/${orderId}/track`);

// POST /api/v1/delivery/{order_id}/ship
export const createShipment = (orderId: number): Promise<DeliveryInfo> =>
  post<DeliveryInfo>(`/delivery/${orderId}/ship`);
