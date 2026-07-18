"use client";
// src/components/profile/ReviewForm.tsx
import React, { useState } from "react";
import api from "@/services/api";
import { Star, Loader2, AlertCircle, MessageSquare } from "lucide-react";

interface ReviewFormProps {
  productId: number;
  productName: string;
  onSubmitted?: (productId: number) => void;
}

export default function ReviewForm({ productId, productName, onSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return;

    setSubmitting(true);
    setError("");

    try {
      await api.post("feedback/reviews", { product_id: productId, rating, comment });
      if (onSubmitted) onSubmitted(productId);
      setComment("");
    } catch (err) {
      console.error("Error submitting review:", err);
      setError("Could not submit. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 bg-white p-4 rounded-2xl border border-brand-brown/10 shadow-sm w-full max-w-sm"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-brand-black uppercase tracking-widest flex items-center gap-1.5">
          <MessageSquare size={14} className="text-brand-orange" />
          Rate &amp; Review
        </span>
      </div>

      <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(0)}>
        {[1, 2, 3, 4, 5].map((value) => {
          const isFilled = value <= (hoverRating || rating);
          return (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              onMouseEnter={() => setHoverRating(value)}
              className="focus:outline-none transition-transform hover:scale-110"
              aria-label={`Rate ${value} stars`}
            >
              <Star
                size={22}
                strokeWidth={isFilled ? 0 : 2}
                fill={isFilled ? "currentColor" : "none"}
                className={`${isFilled ? "text-brand-orange" : "text-brand-brown/20"} transition-colors duration-200`}
              />
            </button>
          );
        })}
      </div>

      <textarea
        placeholder={`Write something about "${productName}" (optional)...`}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        className="w-full bg-gray-50 border border-brand-brown/10 rounded-xl px-3 py-2.5 text-xs text-brand-black font-medium focus:bg-white focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 outline-none transition-all resize-none placeholder:text-brand-brown/40"
      />

      {error && (
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-500 bg-red-50 p-2 rounded-lg">
          <AlertCircle size={12} strokeWidth={2.5} />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 bg-brand-black hover:bg-brand-brown text-white text-xs font-bold py-2.5 rounded-xl transition-all duration-300 disabled:opacity-60 shadow-sm"
      >
        {submitting ? (
          <><Loader2 size={14} className="animate-spin" /> Submitting...</>
        ) : (
          "Submit Review"
        )}
      </button>
    </form>
  );
}
