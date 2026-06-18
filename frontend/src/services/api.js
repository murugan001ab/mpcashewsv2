// src/services/api.js
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
export const getData    = (url)         => api.get(url).then(r => r.data);
export const postData   = (url, data)   => api.post(url, data).then(r => r.data);
export const patchData  = (url, data)   => api.patch(url, data).then(r => r.data);
export const putData    = (url, data)   => api.put(url, data).then(r => r.data);
export const deleteData = (url)         => api.delete(url).then(r => r.data);

export default api;
