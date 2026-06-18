// App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import SignInPage from "./pages/Login/Login";
import SignupPage from "./pages/Login/Register";
import Cart from "./pages/Cart";
import Address from "./pages/Address";
import Payment from "./pages/Payment";
import OrderSuccess from "./pages/OrderSuccess";
import ProductDetails from "./pages/ProductDetails";
import Profile from "./pages/Profile";

import AdminProtected from "./pages/admin/AdminProtected";
import AdminLayout from "./pages/admin/Home";
import Dashboard from "./pages/admin/Pages/Dashboard";
import Products from "./pages/admin/Pages/Products";
import Orders from "./pages/admin/Pages/Orders";
import Reviews from "./pages/admin/Pages/Reviews";
import Category from "./pages/admin/Pages/Category";
import BecomeParter from "./pages/BecomeParter";

function AppRoutes() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <>
      {!isAdminRoute && <Navbar />}

      <Routes>

        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Home />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/login" element={<SignInPage />} />
        <Route path="/register" element={<SignupPage />} />

        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/address" element={<Address />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/order-success/:id" element={<OrderSuccess />} />
        <Route path="/account" element={<Profile />} />

        <Route path="/becomepatner" element={<BecomeParter/>} />


        {/* 🔐 ADMIN ROUTES */}
        <Route
          path="/admin"
          element={
            <AdminProtected>
              <AdminLayout />
            </AdminProtected>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="categories" element={<Category />} />
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="reviews" element={<Reviews />} />
        </Route>

      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
