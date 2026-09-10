"use client";
// src/app/verify-email/page.tsx
// The backend's verification email links here as
// {FRONTEND_URL}/verify-email?token=... (see backend/app/utils/email.py).
// This page just forwards the token to GET /auth/verify-email and shows the
// result. useSearchParams() requires a Suspense boundary in the App Router,
// same pattern as src/app/google/callback/page.tsx.
import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import api from "@/services/api";
import AuthLayout from "@/components/AuthLayout";
import { getErrorMessage } from "@/utils/apiError";

type Status = "verifying" | "success" | "error";

function VerifyEmailContent() {
  const params = useSearchParams();
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // StrictMode double-invoke guard
    ran.current = true;

    const token = params.get("token");
    if (!token) {
      setStatus("error");
      setMessage("This verification link is missing its token.");
      return;
    }

    (async () => {
      try {
        const { data } = await api.get<{ message: string }>("/auth/verify-email", { params: { token } });
        setStatus("success");
        setMessage(data.message || "Email verified successfully.");
      } catch (err) {
        setStatus("error");
        setMessage(getErrorMessage(err, "This verification link is invalid or has expired."));
      }
    })();
  }, [params]);

  return (
    <AuthLayout>
      <div className="flex flex-col items-center text-center gap-4 py-6">
        {status === "verifying" && (
          <>
            <Loader2 className="animate-spin text-amber-500" size={32} />
            <p className="text-stone-500 text-sm font-medium">Verifying your email…</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="text-green-500" size={32} />
            <h1 className="text-xl font-bold text-stone-800">Email verified</h1>
            <p className="text-stone-500 text-sm">{message}</p>
            <Link
              href="/login"
              className="mt-2 inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-amber-950 text-sm font-semibold shadow-sm transition"
            >
              Go to login
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle className="text-red-500" size={32} />
            <h1 className="text-xl font-bold text-stone-800">Verification failed</h1>
            <p className="text-stone-500 text-sm">{message}</p>
            <p className="text-stone-500 text-sm">
              You can request a new link from the{" "}
              <Link href="/login" className="text-amber-600 font-semibold hover:text-amber-700 transition">
                login page
              </Link>
              .
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
