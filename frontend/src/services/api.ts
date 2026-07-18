// src/services/api.ts
import axios, { AxiosResponse, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const getData    = <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>             => api.get<T>(url, config).then(r => r.data);
export const postData   = <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => api.post<T>(url, data, config).then(r => r.data);
export const patchData  = <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => api.patch<T>(url, data, config).then(r => r.data);
export const putData    = <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => api.put<T>(url, data, config).then(r => r.data);
export const deleteData = <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>             => api.delete<T>(url, config).then(r => r.data);

/* ========================================================
    SHORT-NAME ALIASES
    Several service files (authService, userService, productService,
    orderService, wishlistService, paymentService, deliveryService,
    healthService) import { get, post, patch, del, postForm } from "./api".
    These did not exist before, which broke the build for every one of
    those services. Kept as thin wrappers around the *Data helpers above
    so there is a single implementation to maintain.
======================================================== */
export const get      = getData;
export const post     = postData;
export const patch    = patchData;
export const put      = putData;
export const del      = deleteData;
export const postForm = <T = unknown>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> =>
  api.post<T>(url, formData, {
    ...config,
    headers: { ...(config?.headers ?? {}), "Content-Type": "multipart/form-data" },
  }).then(r => r.data);

export default api;
