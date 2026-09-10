// src/services/api.ts
// Single Axios instance + helpers. Cookie-based auth (withCredentials: true) —
// no tokens are read from or written to storage, so every helper here takes
// no token argument. (The old frontend had vestigial `_token` params left
// over from a pre-cookie-auth version; dropped here on purpose.)
import axios, { AxiosResponse, AxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/config/env";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Routes that legitimately 401 for a logged-out visitor and must NEVER
// trigger a redirect or a refresh attempt:
//  - /users/me      -> AuthContext's silent "am I logged in?" check on mount
//  - /auth/login     -> a wrong password is a normal 401, not a dead session
//  - /auth/refresh   -> the refresh call itself; a 401 here means the
//                       refresh token is gone/expired, so retrying is pointless
const SILENT_401_PATHS = ["/users/me", "/auth/login", "/auth/refresh"];

let refreshPromise: Promise<void> | null = null;

const attemptRefresh = (): Promise<void> => {
  if (!refreshPromise) {
    refreshPromise = api
      .post("/auth/refresh")
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const status = error.response?.status;
    const url: string = error.config?.url ?? "";
    const isSilentPath = SILENT_401_PATHS.some((p) => url.includes(p));

    if (status === 401 && !isSilentPath && !error.config?._retried) {
      // Access token likely expired mid-session — try the HttpOnly
      // refresh-token cookie once before giving up. Only ONE refresh call
      // is ever in flight; concurrent 401s all await the same promise.
      try {
        await attemptRefresh();
        error.config._retried = true;
        return api.request(error.config);
      } catch {
        // Refresh failed too — the session is genuinely gone.
        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
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
