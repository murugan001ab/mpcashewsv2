// src/services/api.ts
// Single Axios instance + helpers. Cookie-based auth (withCredentials: true) —
// no tokens are read from or written to storage, so every helper here takes
// no token argument. (The old frontend had vestigial `_token` params left
// over from a pre-cookie-auth version; dropped here on purpose.)
import axios, { AxiosResponse, AxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/config/env";
console.log(API_BASE_URL)
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (
      typeof window !== "undefined" &&
      error.response?.status === 401 &&
      window.location.pathname !== "/login"
    ) {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const get = <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> =>
  api.get<T>(url, config).then((r) => r.data);

export const post = <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
  api.post<T>(url, data, config).then((r) => r.data);

export const patch = <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
  api.patch<T>(url, data, config).then((r) => r.data);

export const put = <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
  api.put<T>(url, data, config).then((r) => r.data);

export const del = <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> =>
  api.delete<T>(url, config).then((r) => r.data);

export const postForm = <T = unknown>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> =>
  api
    .post<T>(url, formData, {
      ...config,
      headers: { ...(config?.headers ?? {}), "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);

export default api;
