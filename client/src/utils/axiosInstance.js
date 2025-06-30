// src/utils/axiosInstance.js

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Use a consistent key everywhere
const ACCESS_TOKEN_KEY = "accessToken";

// Centralized Token Manager (now always uses 'accessToken')
const tokenManager = {
  get: () => {
    try {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      return token && token !== "null" && token !== "undefined" ? token : null;
    } catch {
      return null;
    }
  },
  set: (token) => localStorage.setItem(ACCESS_TOKEN_KEY, token),
  clear: () => localStorage.removeItem(ACCESS_TOKEN_KEY),
};

// Axios instance for all API calls
const tokenRefreshInterceptor = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 30000,
});

// Token refresh state
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

const onTokenRefreshed = (token) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

const retryFailedRequest = (error) => {
  return new Promise((resolve) => {
    subscribeTokenRefresh(() => {
      resolve(tokenRefreshInterceptor(error.config));
    });
  });
};

// Request Interceptor: Attach token to all requests
tokenRefreshInterceptor.interceptors.request.use(
  (config) => {
    const token = tokenManager.get();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handles 401 and token refresh
tokenRefreshInterceptor.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response) {
      console.error("❌ No response received:", error.message);
      return Promise.reject(error);
    }

    const { status } = error.response;

    // Only intercept *first* 401 error per request
    if (status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return retryFailedRequest(error);
    }

    isRefreshing = true;
    console.info("🔄 Attempting token refresh...");

    try {
      // Try to get a new access token via refresh endpoint (must be HTTP-only cookie in browser)
      const refreshResponse = await axios.post(
        `${BASE_URL}/auth/refresh`,
        null,
        { withCredentials: true }
      );

      const { accessToken } = refreshResponse.data;

      if (!accessToken) {
        throw new Error("No access token returned during refresh.");
      }

      tokenManager.set(accessToken);
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      onTokenRefreshed(accessToken);

      console.info("✅ Token refreshed successfully");
      isRefreshing = false;
      return tokenRefreshInterceptor(originalRequest);
    } catch (refreshError) {
      isRefreshing = false;
      refreshSubscribers = [];

      // Session expired: clear tokens, notify user, and redirect
      tokenManager.clear();
      window.dispatchEvent(
        new CustomEvent("auth:logout", {
          detail: { reason: "Session expired. Please log in again." },
        })
      );
      return Promise.reject(refreshError);
    }
  }
);

// Global logout handler - applies everywhere
window.addEventListener("auth:logout", (event) => {
  // Remove all user data and tokens
  localStorage.clear();
  // Optionally: clear Redux, React Query, etc.
  if (event?.detail?.reason) {
    alert(event.detail.reason); // Replace with toast/snackbar if desired
  }
  window.location.href = "/admin/login";
});

// 🔐 On every page load, check for localStorage/cookie desync (extra safety)
if (
  typeof window !== "undefined" &&
  localStorage.getItem(ACCESS_TOKEN_KEY) &&
  !document.cookie.includes("refreshToken")
) {
  localStorage.clear();
  window.location.href = "/admin/login";
}

export { tokenRefreshInterceptor };
