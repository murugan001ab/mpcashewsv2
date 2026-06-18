// src/services/authService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Maps every /api/v1/auth/* and /api/v1/users/me endpoint.
// Cookie-based auth: login/register responses set httpOnly cookies;
// no token is stored in JS.
// ─────────────────────────────────────────────────────────────────────────────

import { get, post } from "./api";
import type {
  User,
  LoginPayload,
  RegisterPayload,
  ResendVerificationPayload,
  PhoneSendOtpPayload,
  PhoneVerifyOtpPayload,
} from "../types";

// ── Register ──────────────────────────────────────────────────────────────────
// POST /api/v1/auth/register
export const register = (payload: RegisterPayload): Promise<{ message: string }> =>
  post("/auth/register", payload);

// ── Email verification ────────────────────────────────────────────────────────
// GET /api/v1/auth/verify-email?token=...
export const verifyEmail = (token: string): Promise<{ message: string }> =>
  get(`/auth/verify-email`, { params: { token } });

// POST /api/v1/auth/resend-verification
export const resendVerification = (
  payload: ResendVerificationPayload
): Promise<{ message: string }> => post("/auth/resend-verification", payload);

// ── Login / Logout ────────────────────────────────────────────────────────────
// POST /api/v1/auth/login
// Server sets httpOnly access + refresh cookies on success.
export const login = (payload: LoginPayload): Promise<{ message: string }> =>
  post("/auth/login", payload);

// POST /api/v1/auth/logout
// Server clears both cookies.
export const logout = (): Promise<{ message: string }> =>
  post("/auth/logout");

// ── Token refresh ─────────────────────────────────────────────────────────────
// POST /api/v1/auth/refresh
// Browser sends the refresh cookie; server rotates and re-sets both cookies.
export const refreshToken = (): Promise<{ message: string }> =>
  post("/auth/refresh");

// ── Current user ──────────────────────────────────────────────────────────────
// GET /api/v1/auth/me
export const getAuthMe = (): Promise<User> =>
  get<User>("/auth/me");

// ── Google OAuth ──────────────────────────────────────────────────────────────
// GET /api/v1/auth/google/login  → redirect URL
// Typically used as a direct browser redirect, not an AJAX call.
export const getGoogleLoginUrl = (): string =>
  `${import.meta.env.VITE_API_BASE_URL}/auth/google/login`;

// GET /api/v1/auth/google/callback?code=...  (handled server-side / redirect)
export const googleCallback = (code: string): Promise<{ message: string }> =>
  get("/auth/google/callback", { params: { code } });

// ── Phone OTP ─────────────────────────────────────────────────────────────────
// POST /api/v1/auth/phone/send-otp
export const sendPhoneOtp = (
  payload: PhoneSendOtpPayload
): Promise<{ message: string }> => post("/auth/phone/send-otp", payload);

// POST /api/v1/auth/phone/verify-otp
export const verifyPhoneOtp = (
  payload: PhoneVerifyOtpPayload
): Promise<{ message: string }> => post("/auth/phone/verify-otp", payload);
