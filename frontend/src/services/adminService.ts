// src/services/adminService.ts
// Admin-only endpoints under /admin/*. Requires the logged-in user to have
// role "admin" — the backend enforces this via get_current_admin on every
// route here; this file just wraps the HTTP calls.
import { get, post, patch, del, postForm } from "./api";
import type {
  AdminDashboard,
  RevenueByMonth,
  TopProduct,
  InventoryRow,
  AdminPaginatedOrders,
  AdminOrder,
  AdminOrderStatus,
  Category,
  Product,
  PaginatedReviews,
  Review,
  ImageUploadResponse,
  SiteSettings,
  SiteSettingsUpdatePayload,
  Coupon,
  CouponPayload,
  CouponUpdatePayload,
  PaginatedCoupons,
} from "@/types";

// ── Generic image upload (ImageKit) ─────────────────────────────────────────
// Used anywhere the admin UI needs a bare CDN URL rather than a
// resource-attached image (product images instead go through
// /products/{id}/images — see productService.uploadProductImage — since
// those are tracked as their own DB rows for ordering/primary/delete).
export const uploadImage = (file: File, folder = "misc"): Promise<ImageUploadResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  return postForm<ImageUploadResponse>("/admin/upload/image", formData, { params: { folder } });
};

// ── Dashboard & reporting ────────────────────────────────────────────────────
export const getDashboardStats = (): Promise<AdminDashboard> => get<AdminDashboard>("/admin/dashboard");

export const getRevenueByMonth = (): Promise<RevenueByMonth[]> => get<RevenueByMonth[]>("/admin/revenue");

export const getTopProducts = (limit = 10): Promise<TopProduct[]> =>
  get<TopProduct[]>("/admin/top-products", { params: { limit } });

export const getInventoryReport = (): Promise<InventoryRow[]> => get<InventoryRow[]>("/admin/inventory");

// ── Categories (admin view includes inactive ones) ──────────────────────────
export const getAdminCategories = (): Promise<Category[]> => get<Category[]>("/admin/categories");

// ── Products (admin view includes inactive ones) ─────────────────────────────
export const getAdminProducts = (page = 1, pageSize = 50): Promise<Product[]> =>
  get<Product[]>("/admin/products", { params: { page, page_size: pageSize } });

// ── Orders ────────────────────────────────────────────────────────────────
export const listAdminOrders = (params?: {
  status?: AdminOrderStatus;
  page?: number;
  page_size?: number;
}): Promise<AdminPaginatedOrders> => get<AdminPaginatedOrders>("/admin/orders", { params });

export const updateOrderStatus = (
  orderId: string,
  status: AdminOrderStatus,
  trackingId?: string
): Promise<AdminOrder> =>
  patch<AdminOrder>(
    `/admin/orders/${orderId}/status`,
    { status },
    trackingId ? { params: { tracking_id: trackingId } } : undefined
  );

// ── Reviews (moderation) ─────────────────────────────────────────────────
export const listAdminReviews = (params?: {
  page?: number;
  page_size?: number;
  is_approved?: boolean;
  product_id?: string;
}): Promise<PaginatedReviews> => get<PaginatedReviews>("/admin/reviews", { params });

export const approveReview = (reviewId: string): Promise<Review> =>
  patch<Review>(`/admin/reviews/${reviewId}/approve`);

export const rejectReview = (reviewId: string): Promise<Review> =>
  patch<Review>(`/admin/reviews/${reviewId}/reject`);

export const replyToReview = (reviewId: string, adminReply: string): Promise<Review> =>
  patch<Review>(`/admin/reviews/${reviewId}/reply`, { admin_reply: adminReply });

export const deleteReviewAdmin = (reviewId: string): Promise<void> =>
  del<void>(`/admin/reviews/${reviewId}`);

// ── Site settings (footer / contact / legal info) ────────────────────────
export const getAdminSiteSettings = (): Promise<SiteSettings> => get<SiteSettings>("/admin/settings");

export const updateSiteSettings = (data: SiteSettingsUpdatePayload): Promise<SiteSettings> =>
  patch<SiteSettings>("/admin/settings", data);

// ── Coupons (festival sales / promoter-given codes) ──────────────────────
export const listCoupons = (page = 1, pageSize = 20): Promise<PaginatedCoupons> =>
  get<PaginatedCoupons>("/admin/coupons", { params: { page, page_size: pageSize } });

export const getCoupon = (couponId: string): Promise<Coupon> => get<Coupon>(`/admin/coupons/${couponId}`);

export const createCoupon = (data: CouponPayload): Promise<Coupon> => post<Coupon>("/admin/coupons", data);

export const updateCoupon = (couponId: string, data: CouponUpdatePayload): Promise<Coupon> =>
  patch<Coupon>(`/admin/coupons/${couponId}`, data);

export const deleteCoupon = (couponId: string): Promise<void> => del<void>(`/admin/coupons/${couponId}`);
