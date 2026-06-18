// src/profile/ReviewForm.jsx
import React, { useContext, useState } from "react";
import api from "../../services/api";
import { AuthContext } from "../../contexts/AuthContext";

export default function ReviewForm({ productId, productName, onSubmitted }) {
  const { accessToken } = useContext(AuthContext);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) return;

    setSubmitting(true);
    setError("");

    try {
      // POST /api/feedback/reviews
      await api.post(
        "feedback/reviews",
        { product_id: productId, rating, comment },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (onSubmitted) onSubmitted(productId);
      setComment("");
    } catch (err) {
      console.error("Error submitting review:", err);
      setError("Could not submit review. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>Rate &amp; Review</div>

      <div>
        {[1, 2, 3, 4, 5].map((value) => (
          <label key={value}>
            <input
              type="radio"
              name={`rating-${productId}`}
              value={value}
              checked={rating === value}
              onChange={() => setRating(value)}
            />
            <span className={value <= rating ? "star filled" : "star"}>★</span>
          </label>
        ))}
      </div>

      <textarea
       
        placeholder={`Write something about "${productName}" (optional)...`}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
      />

      {error && <div>{error}</div>}

      <button type="submit" disabled={submitting}>
        {submitting ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
}
