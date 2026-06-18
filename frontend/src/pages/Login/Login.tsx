// src/pages/Login/Login.tsx
import React, { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, LogIn, Eye, EyeOff } from "lucide-react";
import { AuthContext } from "../../contexts/AuthContext";
import api from "../../services/api";
import { getLocalCart, clearLocalCart } from "../../utils/localcart";
import GoogleLoginButton from "../../components/GoogleLogin";
import AuthLayout from "./AuthLayout";
import type { LoginFormState } from "../../types/auth";

export default function SignInPage() {
  const [form, setForm] = useState<LoginFormState>({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const navigate = useNavigate();
  const { setIsLogged, setUser } = useContext(AuthContext);

  const set = (field: keyof LoginFormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const mergeCartAfterLogin = async () => {
    const guestCart = getLocalCart();
    if (!guestCart.length) return;
    for (const item of guestCart) {
      try {
        await api.post("cart/items", {
          product_id: item.id,
          quantity: item.qty ?? item.quantity ?? 1,
        });
      } catch { /* ignore */ }
    }
    clearLocalCart();
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("auth/login", { email: form.email, password: form.password });
      const { data: userData } = await api.get("users/me");
      setUser(userData);
      setIsLogged(true);
      await mergeCartAfterLogin();
      navigate(userData.role === "admin" ? "/admin" : "/", { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string; message?: string } } };
      setError(
        axiosErr.response?.data?.detail ??
        axiosErr.response?.data?.message ??
        "Invalid email or password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-2xl">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <h1 className="text-2xl font-bold text-stone-800 tracking-tight">
        Welcome back
      </h1>
      <p className="text-stone-500 text-sm mt-1 mb-7">
        Sign in to continue to your account
      </p>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 mb-5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Google */}
      <GoogleLoginButton />

      {/* Divider */}
      <div className="flex items-center gap-3 my-5 text-stone-400 text-xs font-medium">
        <span className="flex-1 h-px bg-stone-200" />
        or continue with email
        <span className="flex-1 h-px bg-stone-200" />
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} noValidate className="space-y-4">
        {/* Email */}
        <div>
          <label
            htmlFor="login-email"
            className="block text-xs font-semibold text-stone-600 mb-1.5"
          >
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={set("email")}
            autoComplete="email"
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
          />
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="login-password"
            className="block text-xs font-semibold text-stone-600 mb-1.5"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPwd ? "text" : "password"}
              placeholder="••••••••"
              value={form.password}
              onChange={set("password")}
              autoComplete="current-password"
              className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-stone-200 bg-white text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              aria-label={showPwd ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition"
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-amber-950 text-sm font-semibold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogIn size={16} />
          Sign In
        </button>
      </form>

      <p className="text-stone-500 text-sm text-center mt-7">
        Don&apos;t have an account?{" "}
        <Link
          to="/register"
          className="text-amber-600 font-semibold hover:text-amber-700 transition"
        >
          Create one free →
        </Link>
      </p>
    </AuthLayout>
  );
}
