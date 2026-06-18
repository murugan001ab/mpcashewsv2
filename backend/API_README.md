# MPCashews API — Endpoint Reference

Base URL: `http://localhost:8000/api/v1`  
Interactive docs: `http://localhost:8000/docs`

---

## Authentication

All protected endpoints require a valid JWT. Tokens are set as **HTTP-only cookies** on login.  
Alternatively pass `Authorization: Bearer <access_token>` in the header.

| Symbol | Meaning |
|--------|---------|
| 🔓 | Public — no auth required |
| 🔒 | Authenticated user required |
| 🛡️ | Admin role required |

---

## 1. Auth  `/auth`

### Registration & Email Verification

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | 🔓 | Register with email + password. Sends verification email. |
| GET | `/auth/verify-email?token=` | 🔓 | Verify email using token from the link. Activates account. |
| POST | `/auth/resend-verification` | 🔓 | Resend verification email for an unverified account. |

**POST `/auth/register`**
```json
// Request
{ "email": "user@example.com", "password": "Pass123" }

// Response 201
{ "message": "Registration successful! Please check your email to verify your account.", "email": "user@example.com" }
```

**GET `/auth/verify-email?token=abc123...`**
```json
// Response 200
{ "message": "Email verified successfully. You can now log in." }
```

**POST `/auth/resend-verification`**
```json
// Request
{ "email": "user@example.com" }

// Response 200
{ "message": "Verification email resent. Please check your inbox." }
```

---

### Login & Session

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | 🔓 | Login. Sets access + refresh token cookies. Blocked if email unverified. |
| POST | `/auth/logout` | 🔒 | Logout. Clears auth cookies. |
| POST | `/auth/refresh` | 🔓 | Rotate refresh token, issue new access token. |

**POST `/auth/login`**
```json
// Request
{ "email": "user@example.com", "password": "Pass123" }

// Response 200
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user_id": "uuid",
  "role": "user"
}

// Error — email not verified
{ "detail": "Please verify your email before logging in." }
```

---

### Google OAuth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/auth/google/login` | 🔓 | Get Google OAuth redirect URL. |
| GET | `/auth/google/callback?code=` | 🔓 | OAuth callback. Issues tokens on success. |

---

### Phone OTP  *(used at checkout when adding an address)*

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/phone/send-otp` | 🔒 | Send 6-digit OTP to phone via WhatsApp. |
| POST | `/auth/phone/verify-otp` | 🔒 | Verify OTP. Saves phone number on user profile. |

**POST `/auth/phone/send-otp`**
```json
// Request
{ "phone": "+919876543210" }

// Response 200
{ "success": true, "message": "OTP sent successfully via WhatsApp." }
```

**POST `/auth/phone/verify-otp`**
```json
// Request
{ "phone": "+919876543210", "code": "483921" }

// Response 200
{ "success": true, "message": "Phone number verified successfully." }
```

---

## 2. Users  `/users`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users/me` | 🔒 | Get current user profile. |
| PATCH | `/users/me` | 🔒 | Update profile (full_name, phone, avatar_url). |
| POST | `/users/me/change-password` | 🔒 | Change password. |
| GET | `/users/me/addresses` | 🔒 | List saved addresses. |
| POST | `/users/me/addresses` | 🔒 | Add a new address. Phone OTP must be verified first. |
| PATCH | `/users/me/addresses/{id}` | 🔒 | Update an address. |
| DELETE | `/users/me/addresses/{id}` | 🔒 | Delete an address. |

**PATCH `/users/me`**
```json
// Request (all fields optional)
{ "full_name": "Murugan", "phone": "+919876543210", "avatar_url": "https://..." }
```

**POST `/users/me/addresses`**
```json
// Request
{
  "address_line1": "12 Main Street",
  "address_line2": "Near Bus Stand",
  "city": "Kadayanallur",
  "state": "Tamil Nadu",
  "pincode": "627751",
  "country": "India",
  "is_default": true
}
```

---

## 3. Products  `/products`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/products` | 🔓 | List products with filters and pagination. |
| GET | `/products/{id}` | 🔓 | Get product by ID. |
| GET | `/products/slug/{slug}` | 🔓 | Get product by slug. |
| POST | `/products` | 🛡️ | Create a product. |
| PATCH | `/products/{id}` | 🛡️ | Update a product. |
| DELETE | `/products/{id}` | 🛡️ | Delete a product. |
| POST | `/products/{id}/images` | 🛡️ | Upload a product image. |
| DELETE | `/products/{id}/images/{img_id}` | 🛡️ | Delete a product image. |

**GET `/products` — Query params**

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search by name |
| `category_id` | UUID | Filter by category |
| `min_price` | float | Minimum price |
| `max_price` | float | Maximum price |
| `in_stock` | bool | Only in-stock items |
| `is_featured` | bool | Only featured items |
| `page` | int | Page number (default 1) |
| `page_size` | int | Items per page (default 20, max 100) |

**POST `/products`**
```json
{
  "name": "Premium W240 Cashews",
  "description": "Top grade whole cashews",
  "short_description": "W240 grade, 1kg pack",
  "price": 850.00,
  "discounted_price": 799.00,
  "stock": 100,
  "sku": "CW240-1KG",
  "weight_grams": 1000,
  "is_featured": true,
  "category_id": "uuid"
}
```

---

## 4. Categories  `/categories`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/categories` | 🔓 | List all active categories. |
| GET | `/categories/{id}` | 🔓 | Get category by ID. |
| POST | `/categories` | 🛡️ | Create a category. |
| PATCH | `/categories/{id}` | 🛡️ | Update a category. |
| DELETE | `/categories/{id}` | 🛡️ | Delete a category. |

**POST `/categories`**
```json
{ "name": "Whole Cashews", "description": "Premium whole cashew grades", "image_url": "https://..." }
```

---

## 5. Cart  `/cart`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/cart` | 🔒 | Get cart with item totals. |
| POST | `/cart/items` | 🔒 | Add item to cart. |
| PATCH | `/cart/items/{item_id}` | 🔒 | Update item quantity. |
| DELETE | `/cart/items/{item_id}` | 🔒 | Remove item from cart. |
| DELETE | `/cart` | 🔒 | Clear entire cart. |

**POST `/cart/items`**
```json
{ "product_id": "uuid", "quantity": 2 }
```

---

## 6. Wishlist  `/wishlist`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/wishlist` | 🔒 | Get wishlist. |
| POST | `/wishlist/items` | 🔒 | Add product to wishlist. |
| DELETE | `/wishlist/items/{product_id}` | 🔒 | Remove product from wishlist. |

---

## 7. Orders  `/orders`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/orders` | 🔒 | Create order from current cart. |
| GET | `/orders` | 🔒 | List user's orders (paginated). |
| GET | `/orders/{id}` | 🔒 | Get order details. |
| POST | `/orders/{id}/cancel` | 🔒 | Cancel a pending/confirmed order. |

**POST `/orders`**
```json
{ "address_id": "uuid", "notes": "Leave at door" }
```

**Order statuses:** `pending` → `confirmed` → `processing` → `shipped` → `out_for_delivery` → `delivered` | `cancelled`

WhatsApp notifications are sent automatically on each status change.

---

## 8. Payments  `/payments`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/payments/create` | 🔒 | Create Razorpay payment order for an order. |
| POST | `/payments/verify` | 🔒 | Verify payment signature after checkout. |
| POST | `/payments/refund` | 🔒 | Request a refund. |
| GET | `/payments/history` | 🔒 | Get payment history (paginated). |

**POST `/payments/create`**
```json
{ "order_id": "uuid" }
```

**POST `/payments/verify`**
```json
{
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature_xxx"
}
```

---

## 9. Delivery  `/delivery`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/delivery/{order_id}` | 🔒 | Get delivery details for an order. |
| GET | `/delivery/{order_id}/track` | 🔒 | Live tracking info (Shiprocket). |
| POST | `/delivery/{order_id}/ship` | 🛡️ | Admin: create Shiprocket shipment. |

---

## 10. Admin  `/admin`

All endpoints require admin role 🛡️.

### Dashboard & Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/dashboard` | Overall stats (revenue, orders, users, products). |
| GET | `/admin/revenue` | Monthly revenue breakdown. |
| GET | `/admin/top-products?limit=10` | Top-selling products. |
| GET | `/admin/inventory` | Inventory status report. |

### User Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/users?page=1&page_size=20` | List all users (paginated). |
| PATCH | `/admin/users/{id}/toggle-active` | Enable / disable a user account. |

### Order Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/orders?status=pending&page=1` | List all orders, filterable by status. |
| PATCH | `/admin/orders/{id}/status` | Update order status. Triggers WhatsApp notification. |

**PATCH `/admin/orders/{id}/status`**
```json
{ "status": "shipped" }
// Optional query param: ?tracking_id=SR123456789
```

### Category Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/categories` | List all categories. |
| POST | `/admin/categories` | Create a category. |
| PATCH | `/admin/categories/{id}` | Update a category. |
| DELETE | `/admin/categories/{id}` | Delete a category. |

### Product Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/products?page=1&page_size=20` | List all products (including inactive). |
| POST | `/admin/products` | Create a product. |
| GET | `/admin/products/{id}` | Get product by ID. |
| PATCH | `/admin/products/{id}` | Update a product. |
| DELETE | `/admin/products/{id}` | Delete a product. |

---

## Typical User Flow

```
1. POST /auth/register          → get verification email
2. GET  /auth/verify-email      → account activated
3. POST /auth/login             → tokens set in cookies
4. GET  /products               → browse products
5. POST /cart/items             → add to cart
6. POST /auth/phone/send-otp    → verify phone before checkout
7. POST /auth/phone/verify-otp  → phone saved on profile
8. POST /users/me/addresses     → save delivery address
9. POST /orders                 → place order
10. POST /payments/create       → get Razorpay order
11. POST /payments/verify       → confirm payment
    → WhatsApp notification sent automatically
```

## Typical Admin Flow

```
1. POST /auth/login                      → login as admin
2. GET  /admin/dashboard                 → view stats
3. POST /admin/products                  → add products
4. GET  /admin/orders?status=pending     → view new orders
5. PATCH /admin/orders/{id}/status       → update to "confirmed", "shipped" etc.
6. POST /delivery/{order_id}/ship        → create Shiprocket shipment
```

---

## Error Responses

All errors follow this shape:
```json
{ "detail": "Human readable error message" }
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request / validation error |
| 401 | Not authenticated |
| 403 | Forbidden (wrong role, or email not verified) |
| 404 | Resource not found |
| 409 | Conflict (duplicate email, SKU, etc.) |
| 422 | Unprocessable entity (schema validation failed) |
| 500 | Internal server error |
