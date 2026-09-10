// src/services/couponService.ts
// User-facing coupon endpoints. Applying a coupon here only PREVIEWS the
// discount against the current cart — it's actually consumed (and the
// per-user limit enforced) when the order is placed with the same code
// (see orderService.createOrder's coupon_code field).
import { post } from "./api";

export interface CouponApplyResponse {
  code: string;
  discount_amount: string;
  message: string;
}

export const applyCoupon = (code: string): Promise<CouponApplyResponse> =>
  post<CouponApplyResponse>("/coupons/apply", { code });
