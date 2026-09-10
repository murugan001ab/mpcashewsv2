// src/services/paymentService.ts
import { post } from "./api";

export interface RazorpayOrderResponse {
  razorpay_order_id: string;
  amount: number; // paise
  currency: string;
  payment_id: string;
}

export interface PaymentVerifyPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface PaymentResponse {
  id: string;
  order_id: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  amount: string;
  currency: string;
  status: string;
}

export const createPaymentOrder = (orderId: string): Promise<RazorpayOrderResponse> =>
  post<RazorpayOrderResponse>("/payments/create", { order_id: orderId });

export const verifyPayment = (data: PaymentVerifyPayload): Promise<PaymentResponse> =>
  post<PaymentResponse>("/payments/verify", data);
