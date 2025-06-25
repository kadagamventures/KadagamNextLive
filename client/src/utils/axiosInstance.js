import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ✅ Axios instance
const tokenRefreshInterceptor = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, 
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
    subscribeTokenRefresh(() => {
      resolve(tokenRefreshInterceptor(error.config));
    });
  });
};

// --- Helper to get token from localStorage
const getToken = () => {
  try {
    const token = localStorage.getItem("token");
    return token && token !== "null" && token !== "undefined" ? token : null;
  } catch {
    return null;
  }
};

// --- Request Interceptor: Add Authorization Header from localStorage
tokenRefreshInterceptor.interceptors.request.use(
  (config) => {
    const token = getToken();
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
      const refreshResponse = await axios.post(`${BASE_URL}/auth/refresh`, null, {
        withCredentials: true,
      });

      const { accessToken } = refreshResponse.data;

      if (!accessToken) {
        throw new Error("No token received during refresh.");
      }

      // Save new token
      localStorage.setItem("token", accessToken);

      // Retry original request with new token
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      onTokenRefreshed(accessToken);
      isRefreshing = false;

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
