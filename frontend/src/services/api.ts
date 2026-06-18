// src/services/api.ts
import axios, { AxiosResponse, InternalAxiosRequestConfig } from "axios";

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

export const getData    = <T = unknown>(url: string): Promise<T>             => api.get<T>(url).then(r => r.data);
export const postData   = <T = unknown>(url: string, data: unknown): Promise<T> => api.post<T>(url, data).then(r => r.data);
export const patchData  = <T = unknown>(url: string, data: unknown): Promise<T> => api.patch<T>(url, data).then(r => r.data);
export const putData    = <T = unknown>(url: string, data: unknown): Promise<T> => api.put<T>(url, data).then(r => r.data);
export const deleteData = <T = unknown>(url: string): Promise<T>             => api.delete<T>(url).then(r => r.data);

export default api;
