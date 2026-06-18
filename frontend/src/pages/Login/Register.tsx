// src/pages/Login/Register.tsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, UserPlus, Eye, EyeOff } from "lucide-react";
import api from "../../services/api";
import GoogleLoginButton from "../../components/GoogleLogin";
import AuthLayout from "./AuthLayout";
import type { RegisterFormState, AlertState, PasswordRule } from "../../types/auth";

// ── Password rules ────────────────────────────────────────────────────────────
const PW_RULES: PasswordRule[] = [
  { label: "8+ chars",        test: (v) => v.length >= 8 },
  { label: "Uppercase",       test: (v) => /[A-Z]/.test(v) },
  { label: "Lowercase",       test: (v) => /[a-z]/.test(v) },
  { label: "Number",          test: (v) => /[0-9]/.test(v) },
  { label: "Special (!@#…)",  test: (v) => /[@$!%*?&#^.]/.test(v) },
];

const STRENGTH_COLORS = ["", "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];
const STRENGTH_LABELS = ["", "Very Weak", "Weak", "Fair", "Good", "Strong"];

// ── Component ─────────────────────────────────────────────────────────────────
export default function SignupPage() {
  const [form, setForm] = useState<RegisterFormState>({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  const navigate = useNavigate();

  const set = (field: keyof RegisterFormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setAlert({ type: "error", msg: "Name cannot be empty" });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      setAlert({ type: "error", msg: "Invalid email format" });
      return;
    }
    if (PW_RULES.some((r) => !r.test(form.password))) {
      setAlert({ type: "error", msg: "Password doesn't meet all requirements" });
      return;
    }
    setLoading(true);
    setAlert(null);
    try {
      const res = await api.post("auth/register", {
        full_name: form.name,
        email: form.email,
        password: form.password,
      });
      if (res.status === 201 || res.status === 200) {
        setAlert({ type: "success", msg: "Verification link sent! Redirecting to login…" });
        setTimeout(() => navigate("/login"), 2800);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setAlert({
        type: "error",
        msg: axiosErr.response?.data?.detail ?? "Registration failed. Try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const strength = PW_RULES.filter((r) => r.test(form.password)).length;

  return (
    <AuthLayout>
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-2xl">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <h1 className="text-2xl font-bold text-stone-800 tracking-tight">Create account</h1>
      <p className="text-stone-500 text-sm mt-1 mb-7">
        Join thousands of happy customers
      </p>

      {/* Alert */}
      {alert && (
        <div
          className={`flex items-start gap-2.5 px-4 py-3 mb-5 rounded-xl border text-sm font-medium ${
            alert.type === "error"
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-green-50 border-green-200 text-green-700"
          }`}
        >
          {alert.type === "error" ? (
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
          ) : (
            <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
          )}
          <span>{alert.msg}</span>
        </div>
      )}

      {/* Google */}
      <GoogleLoginButton />

      {/* Divider */}
      <div className="flex items-center gap-3 my-5 text-stone-400 text-xs font-medium">
        <span className="flex-1 h-px bg-stone-200" />
        or create with email
        <span className="flex-1 h-px bg-stone-200" />
      </div>

      {/* Form */}
      <form onSubmit={handleRegister} noValidate className="space-y-4">
        {/* Full name */}
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1.5">Full Name</label>
          <input
            type="text"
            placeholder="Your full name"
            value={form.name}
            onChange={set("name")}
            autoComplete="name"
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1.5">Email address</label>
          <input
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
          <label className="block text-xs font-semibold text-stone-600 mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              placeholder="••••••••"
              value={form.password}
              onChange={set("password")}
              autoComplete="new-password"
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

          {/* Strength meter */}
          {form.password && (
            <div className="mt-3 space-y-2">
              {/* Bar */}
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex-1 h-1 rounded-full transition-all duration-300"
                    style={{
                      background: i <= strength ? STRENGTH_COLORS[strength] : "#e7e5e4",
                    }}
                  />
                ))}
              </div>
              {/* Strength label */}
              <div
                className="text-[11px] font-semibold"
                style={{ color: STRENGTH_COLORS[strength] ?? "#a8a29e" }}
              >
                {STRENGTH_LABELS[strength]}
              </div>
              {/* Rule chips */}
              <div className="flex flex-wrap gap-1.5">
                {PW_RULES.map((r) => {
                  const pass = r.test(form.password);
                  return (
                    <span
                      key={r.label}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all ${
                        pass
                          ? "bg-green-50 border-green-200 text-green-700"
                          : "bg-stone-50 border-stone-200 text-stone-500"
                      }`}
                    >
                      {pass ? "✓" : "✗"} {r.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-amber-950 text-sm font-semibold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <UserPlus size={16} />
          Create Account
        </button>
      </form>

      <p className="text-stone-500 text-sm text-center mt-7">
        Already have an account?{" "}
        <Link
          to="/login"
          className="text-amber-600 font-semibold hover:text-amber-700 transition"
        >
          Sign in →
        </Link>
      </p>
    </AuthLayout>
  );
}
