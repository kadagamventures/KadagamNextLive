import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Centralized Token Manager with consistent key
const tokenManager = {
  get: () => {
    try {
      const token = localStorage.getItem("accessToken");
      return token && token !== "null" && token !== "undefined" ? token : null;
    } catch {
      return null;
    }
  },
  set: (token) => localStorage.setItem("accessToken", token),
  clear: () => localStorage.removeItem("accessToken"),
};

// Axios instance
const tokenRefreshInterceptor = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 30000,
});

// Token Refresh State
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

// Request Interceptor
tokenRefreshInterceptor.interceptors.request.use(
  (config) => {
    const token = tokenManager.get();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn("⚠️ No access token found in localStorage");
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
tokenRefreshInterceptor.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response) {
      console.error("❌ No response received:", error.message);
      return Promise.reject(error);
    }

    const { status } = error.response;

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
      const refreshResponse = await axios.post(`${BASE_URL}/auth/refresh`, null, {
        withCredentials: true,
      });

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

      // Session Expiry UX: Clear token and show user message/redirect
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

// Global logout handler
window.addEventListener("auth:logout", (event) => {
  // Optional: clear all app state, redux, react-query caches here
  // Customize the redirect as per your routing setup
  if (event?.detail?.reason) {
    alert(event.detail.reason); // Or use your UI snackbar/toast
  }
  // You might want to use a router: window.location = "/login"
  window.location.href = "/login";
});

export { tokenRefreshInterceptor };
