import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ✅ Axios instance using cookies
const tokenRefreshInterceptor = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // 🔥 Essential to send cookies
  timeout: 30000,
});

// --- Token Refresh State
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
    subscribeTokenRefresh((token) => {
      resolve(tokenRefreshInterceptor(error.config));
    });
  });
};

// --- Helper to read cookie value
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
};

// --- Request Interceptor: Add Authorization Header
tokenRefreshInterceptor.interceptors.request.use(
  (config) => {
    const token = getCookie("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Response Interceptor: Auto-refresh token on 401
tokenRefreshInterceptor.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response || error.response.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return retryFailedRequest(error);
    }

    isRefreshing = true;

    try {
      // 🔄 Use POST /auth/refresh and path match backend
      const refreshResponse = await axios.post(
        `${BASE_URL}/auth/refresh`,
        null,
        { withCredentials: true }
      );

      const { accessToken } = refreshResponse.data;

      if (!accessToken) {
        throw new Error("No token received during refresh.");
      }

      // Notify all subscribers and retry original request
      onTokenRefreshed(accessToken);
      isRefreshing = false;

      // Update Authorization header for the retried request
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return tokenRefreshInterceptor(originalRequest);
    } catch (refreshError) {
      console.error("🔴 Token refresh failed:", refreshError.message);
      isRefreshing = false;
      refreshSubscribers = [];

      window.dispatchEvent(new CustomEvent("auth:logout"));
      return Promise.reject(refreshError);
    }
  }
);

export { tokenRefreshInterceptor };
