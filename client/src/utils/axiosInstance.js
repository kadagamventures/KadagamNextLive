import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const ACCESS_TOKEN_KEY = "accessToken";

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

const tokenRefreshInterceptor = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 30000,
});

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

window.addEventListener("auth:logout", (event) => {
  localStorage.clear();
  if (event?.detail?.reason) {
    alert(event.detail.reason);
  }
  window.location.href = "/admin/login";
});

export { tokenRefreshInterceptor };
