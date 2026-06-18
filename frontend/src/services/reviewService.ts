// src/services/reviewService.ts
import { getData, postData } from "./api";
import type { Review } from "../types";

interface ReviewListResponse {
  items?: Review[];
}

export const getMyReviews = () =>
  getData<ReviewListResponse | Review[]>("feedback/reviews/me");

export const submitReview = (data: { product_id: number; rating: number; comment?: string }) =>
  postData<Review>("feedback/reviews/", data);

export const getAllReviews = () =>
  getData<ReviewListResponse | Review[]>("feedback/reviews/");
