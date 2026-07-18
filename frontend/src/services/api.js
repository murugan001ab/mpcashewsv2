// src/services/api.js
//
// NOTE: This file and api.ts are duplicates left over from a JS->TS migration.
// Vite's default module resolution tries `.js` BEFORE `.ts`, so this file
// (not api.ts) is the one that actually gets bundled whenever code does
// `import ... from "./api"` / `"../services/api"` without an extension.
// Keep this in sync with api.ts until one of the duplicates is deleted.
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/* ========================================================
    AXIOS INSTANCE — cookies only, no localStorage tokens
======================================================== */
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,          // send/receive httpOnly cookies on every request
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

/* ========================================================
    RESPONSE INTERCEPTOR — redirect to /login on 401
======================================================== */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Cookie expired / invalid — send user to login
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

/* ========================================================
    HELPER METHODS  (token param kept for back-compat but ignored)
======================================================== */
export const getData    = (url, config)       => api.get(url, config).then(r => r.data);
export const postData   = (url, data, config) => api.post(url, data, config).then(r => r.data);
export const patchData  = (url, data, config) => api.patch(url, data, config).then(r => r.data);
export const putData    = (url, data, config) => api.put(url, data, config).then(r => r.data);
export const deleteData = (url, config)       => api.delete(url, config).then(r => r.data);

/* ========================================================
    SHORT-NAME ALIASES — several .ts services import
    { get, post, patch, del, postForm } from "./api"; these
    did not exist before and broke the build for every one
    of those service files (auth, user, product, order,
    wishlist, payment, delivery, health).
======================================================== */
export const get      = getData;
export const post     = postData;
export const patch    = patchData;
export const put      = putData;
export const del      = deleteData;
export const postForm = (url, formData, config) =>
  api.post(url, formData, {
    ...config,
    headers: { ...(config?.headers ?? {}), "Content-Type": "multipart/form-data" },
  }).then(r => r.data);

export default api;
