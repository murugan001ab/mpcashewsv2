// src/services/paymentService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Maps every /api/v1/payments/* endpoint.
// ─────────────────────────────────────────────────────────────────────────────

import { get, post } from "./api";
import type {
  RazorpayOrderResponse,
  CreatePaymentPayload,
  VerifyPaymentPayload,
  RefundPayload,
  PaymentRecord,
  PaginatedResponse,
} from "../types";

// POST /api/v1/payments/create
export const createPaymentOrder = (
  payload: CreatePaymentPayload
): Promise<RazorpayOrderResponse> =>
  post<RazorpayOrderResponse>("/payments/create", payload);

// POST /api/v1/payments/verify
export const verifyPayment = (
  payload: VerifyPaymentPayload
): Promise<{ message: string }> =>
  post("/payments/verify", payload);

// POST /api/v1/payments/refund
export const requestRefund = (
  payload: RefundPayload
): Promise<{ message: string }> =>
  post("/payments/refund", payload);

// GET /api/v1/payments/history
export const getPaymentHistory = (params?: {
  page?: number;
  size?: number;
}): Promise<PaginatedResponse<PaymentRecord>> =>
  get<PaginatedResponse<PaymentRecord>>("/payments/history", { params });
