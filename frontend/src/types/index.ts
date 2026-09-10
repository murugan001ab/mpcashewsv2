// src/types/index.ts
// Shared TypeScript types used across services/components/pages.
// NOTE: in the old Vite app, authService.ts and userService.ts both did
// `import type {...} from "../types"` but no such index file existed —
// only types/auth.ts (form/UI types) was present. This file is the missing
// piece; it both fixes that broken import and gives every domain a home.

// ── User / Auth ────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: "admin" | "customer" | string;
  is_active: boolean;
  is_verified: boolean;
  avatar_url?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface ResendVerificationPayload {
  email: string;
}

export interface PhoneSendOtpPayload {
  phone: string;
}

export interface PhoneVerifyOtpPayload {
  phone: string;
  code: string;
}

export interface UpdateProfilePayload {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

// ── Addresses ──────────────────────────────────────────────────────────────
export interface Address {
  id: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

export type AddressPayload = Omit<Address, "id">;

// ── Catalog ────────────────────────────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  image_url?: string;
  image?: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt_text?: string;
  is_primary: boolean;
  sort_order: number;
}

export interface Variant {
  id: string;
  product_id: string;
  sku: string;
  weight_grams: number;
  price: string;
  discounted_price?: string;
  stock: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  is_active: boolean;
  is_featured: boolean;
  category: Category;
  variants: Variant[];
  images: ProductImage[];
  created_at: string;
  updated_at: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export type PaginatedResponse<T> = Paginated<T>;
export type PaginatedProducts = Paginated<Product>;

export interface ProductListParams {
  q?: string;
  category_id?: string;
  is_featured?: boolean;
  page?: number;
  page_size?: number;
}

export interface ProductPayload {
  name: string;
  slug?: string;
  description?: string;
  short_description?: string;
  is_active?: boolean;
  is_featured?: boolean;
  category_id: string;
}

export interface CategoryPayload {
  name: string;
  slug?: string;
  is_active?: boolean;
  image_url?: string;
}

// ── Admin: generic image upload (ImageKit) ──────────────────────────────────
export interface ImageUploadResponse {
  url: string;
  file_id: string;
}

// ── Cart ───────────────────────────────────────────────────────────────────
export interface CartItem {
  id: string;
  quantity: number;
  price_at_add: string;
  subtotal: string;
  product: Product;
  variant: Variant;
}

export interface CartSummary {
  cart_id: string;
  items: CartItem[];
  item_count: number;
  subtotal: string;
  tax: string;
  shipping: string;
  total: string;
}

// ── Wishlist ───────────────────────────────────────────────────────────────
export interface WishlistItem {
  id: string;
  product: Product;
}

export interface WishlistResponse {
  id: string;
  items: WishlistItem[];
  total: number;
}

// ── Orders ─────────────────────────────────────────────────────────────────
export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

export interface Order {
  id: string;
  status: OrderStatus;
  address_id: string;
  notes?: string;
  items: CartItem[];
  total: string;
  created_at: string;
}

export type PaginatedOrders = Paginated<Order>;

// ── Payments ───────────────────────────────────────────────────────────────
export interface PaymentCreateResponse {
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

export type PaginatedPayments = Paginated<{
  id: string;
  amount: number;
  status: string;
  created_at: string;
}>;

// ── Delivery ───────────────────────────────────────────────────────────────
export interface DeliveryTracking {
  awb_code: string;
  current_status: string;
  courier_name: string;
  tracking_url: string;
  activities: { status: string; timestamp: string; location?: string }[];
}

// ── Admin ──────────────────────────────────────────────────────────────────
export interface AdminDashboard {
  total_users: number;
  total_orders: number;
  total_revenue: number;
  total_products: number;
  pending_orders: number;
  low_stock_products: number;
}

export interface InventoryRow {
  product_id: string;
  name: string;
  sku: string;
  stock: number;
  status: "ok" | "low" | "out";
}

export interface RevenueByMonth {
  month: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  product_id: string;
  product_name: string;
  total_sold: number;
  revenue: number;
}

// ── Admin: full order lifecycle (distinct from the storefront's simplified
// Order type above, which only models the statuses a customer sees) ────────
export type AdminOrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "out_for_delivery"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface AdminOrderItem {
  id: string;
  product: { id: string; name: string; slug: string };
  quantity: number;
  unit_price: string;
  total_price: string;
  product_name: string;
  product_sku: string;
}

export interface AdminOrder {
  id: string;
  order_number: string;
  status: AdminOrderStatus;
  subtotal: string;
  tax_amount: string;
  shipping_amount: string;
  discount_amount: string;
  coupon_code?: string | null;
  total_amount: string;
  notes?: string;
  items: AdminOrderItem[];
  address: Address;
  created_at: string;
  updated_at: string;
}

export interface AdminPaginatedOrders {
  items: AdminOrder[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// ── Admin: coupons (festival sales / promoter codes) ────────────────────────
export type DiscountType = "percentage" | "fixed";

export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discount_type: DiscountType;
  discount_value: string;
  max_discount_amount?: string | null;
  min_order_value: string;
  usage_limit_total?: number | null;
  usage_limit_per_user?: number | null;
  times_used: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CouponPayload {
  code: string;
  description?: string;
  discount_type: DiscountType;
  discount_value: number;
  max_discount_amount?: number | null;
  min_order_value?: number;
  usage_limit_total?: number | null;
  usage_limit_per_user?: number | null;
  valid_from: string;
  valid_until: string;
  is_active?: boolean;
}

export type CouponUpdatePayload = Partial<CouponPayload>;

export interface PaginatedCoupons {
  items: Coupon[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// ── Admin: product/variant authoring payloads ───────────────────────────────
export interface ProductVariantPayload {
  sku: string;
  weight_grams: number;
  price: number;
  discounted_price?: number;
  stock: number;
  is_active?: boolean;
}

export interface AdminProductCreatePayload extends ProductPayload {
  variants: ProductVariantPayload[];
}

// ── Admin: message templates (email + WhatsApp) ─────────────────────────────
export interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  html_body: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplateUpsertPayload {
  name: string;
  subject: string;
  html_body: string;
  description?: string;
  is_active?: boolean;
}

export type EmailTemplateUpdatePayload = Partial<EmailTemplateUpsertPayload>;

export interface WhatsAppTemplate {
  id: string;
  key: string;
  name: string;
  template_name: string;
  language_code: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppTemplateUpdatePayload {
  template_name?: string;
  language_code?: string;
  description?: string;
  is_active?: boolean;
}

// ── Admin: reviews ────────────────────────────────────────────
export interface ReviewerInfo {
  id: string;
  full_name: string;
  avatar_url?: string;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  user: ReviewerInfo;
  rating: number;
  title?: string;
  comment?: string;
  is_verified_purchase: boolean;
  is_approved: boolean;
  admin_reply?: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedReviews {
  items: Review[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// ── Blog ───────────────────────────────────────────────────────────────
export interface BlogAuthorInfo {
  id: string;
  full_name: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featured_image?: string;
  author?: BlogAuthorInfo;
  is_published: boolean;
  published_at?: string;
  meta_title?: string;
  meta_description?: string;
  view_count: number;
  created_at: string;
  updated_at: string;
}

// Lighter shape used by the public list endpoint — omits the full HTML body.
export interface BlogPostListItem {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  featured_image?: string;
  author?: BlogAuthorInfo;
  is_published: boolean;
  published_at?: string;
  created_at: string;
}

export interface BlogPostPayload {
  title: string;
  excerpt?: string;
  content: string;
  featured_image?: string;
  is_published?: boolean;
  meta_title?: string;
  meta_description?: string;
}

export type BlogPostUpdatePayload = Partial<BlogPostPayload>;

export interface PaginatedBlogPosts {
  items: BlogPostListItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface PaginatedBlogPostsAdmin {
  items: BlogPost[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// ── Site settings (footer / contact / legal info) ─────────────────────────
export interface SiteSettings {
  business_name?: string;
  trademark_text?: string;
  footer_about?: string;

  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;

  contact_email?: string;
  contact_phone?: string;
  whatsapp_number?: string;
  support_hours?: string;

  fssai_license_no?: string;
  gstin?: string;
  cin?: string;

  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  youtube_url?: string;
  linkedin_url?: string;

  copyright_text?: string;
  updated_at: string;
}

export type SiteSettingsUpdatePayload = Partial<Omit<SiteSettings, "updated_at">>;
