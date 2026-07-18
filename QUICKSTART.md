# Quick Start Guide - MP Cashews Frontend

Get the MP Cashews ecommerce frontend up and running in 5 minutes!

## Step 1: Install Dependencies (1 min)

```bash
cd /vercel/share/v0-project
pnpm install
```

## Step 2: Configure Environment (1 min)

Create `.env.local`:

```bash
cat > .env.local << EOF
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_test_key_id
EOF
```

**Note:** Get your Razorpay test key from [dashboard.razorpay.com](https://dashboard.razorpay.com)

## Step 3: Start Backend (0 min if already running)

Ensure FastAPI backend is running:
```bash
# In another terminal, from your FastAPI project
python -m uvicorn main:app --reload --port 8000
```

The backend should be accessible at: `http://localhost:8000/api`

## Step 4: Start Frontend Dev Server (1 min)

```bash
pnpm dev
```

**Output:**
```
▲ Next.js 16.2.6 (Turbopack)
- Local:         http://localhost:3000
- Network:       http://100.64.6.163:3000
```

## Step 5: Open in Browser (1 min)

Navigate to: **http://localhost:3000**

You should see the luxurious MP Cashews homepage!

## 🧪 Test the App

### 1. Create Account
- Click "Sign Up" in header
- Fill form: name, email, password
- Click "Create Account"

### 2. Browse Products
- Click "Shop" or "Explore Collection"
- See featured products
- Use filters/search

### 3. Make a Test Purchase
- Add item to cart
- Go to cart
- Click "Proceed to Checkout"
- Add delivery address
- Click "Pay with Razorpay"
- Use test card: **4111111111111111**
- Any future date, any CVV
- Complete payment

### 4. Track Order
- Go to "Orders" in header
- Click on order to see details
- See shipment tracking

### 5. Manage Profile
- Click your name > Profile
- Edit profile, change password
- Manage addresses

## 📁 Key Files

| File | Purpose |
|------|---------|
| `app/page.tsx` | Homepage |
| `app/auth/login/page.tsx` | Login page |
| `app/shop/page.tsx` | Product listing |
| `app/cart/page.tsx` | Shopping cart |
| `app/checkout/page.tsx` | Checkout with payment |
| `lib/api.ts` | API integration |
| `contexts/auth.tsx` | Auth state management |

## 🔧 Environment Variables

```env
# Backend API Base URL (must match your FastAPI server)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api

# Razorpay Test Key ID (get from Razorpay dashboard)
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_test_key_id
```

## 🐛 Troubleshooting

### Port 3000 already in use?
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
# Or use different port
pnpm dev -- -p 3001
```

### Backend not connecting?
1. Check backend is running: `http://localhost:8000/api/products`
2. Verify `NEXT_PUBLIC_API_BASE_URL` in `.env.local`
3. Check browser console for CORS errors

### Razorpay not showing?
1. Verify `NEXT_PUBLIC_RAZORPAY_KEY_ID` is set
2. Check browser console for errors
3. Ensure Razorpay script loads

## 📦 Test Credentials

**Test User:**
- Email: `test@example.com`
- Password: `password123`

**Test Card (Razorpay):**
- Card: `4111111111111111`
- Expiry: Any future date (e.g., 12/25)
- CVV: Any 3 digits (e.g., 123)

## 🚀 Project Structure

```
app/                    # Next.js App Router pages
├── page.tsx           # Home page
├── auth/              # Authentication
├── shop/              # Product pages
├── cart/              # Cart page
├── checkout/          # Checkout page
├── orders/            # Orders pages
└── profile/           # Profile page

lib/                   # Utilities
├── api.ts            # API client
└── store.ts          # State management

components/            # Reusable components
└── header.tsx        # Navigation

contexts/              # React Context
└── auth.tsx          # Auth provider

types/                 # TypeScript types
└── index.ts          # All interfaces
```

## 💡 Common Commands

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint

# Format code
pnpm format
```

## 📱 Features Available

- ✅ Product search and filtering
- ✅ Shopping cart
- ✅ Checkout with Razorpay
- ✅ Order tracking with Shiprocket
- ✅ User authentication
- ✅ Profile management
- ✅ Address management
- ✅ Wishlist (client-side)
- ✅ Product reviews
- ✅ Mobile responsive

## 🎯 Next Steps

1. **Register an account** to test the full flow
2. **Browse products** to see search/filter
3. **Make a test purchase** with Razorpay
4. **Track order** in order details
5. **Explore profile** for account management

## 📚 More Documentation

- **Full README:** See `README.md`
- **Build Summary:** See `BUILD_SUMMARY.md`
- **API Client:** See `lib/api.ts` for all endpoints

## 🆘 Need Help?

1. Check `BUILD_SUMMARY.md` for troubleshooting
2. Check `README.md` for detailed documentation
3. Look at the API client in `lib/api.ts`
4. Review component code for examples

---

**You're all set! Happy shopping! 🥜✨**
