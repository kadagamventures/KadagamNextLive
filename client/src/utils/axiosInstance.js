// 📂 src/utils/axiosInstance.js
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Create Axios instance
const tokenRefreshInterceptor = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 30000,
});

// --- Token Refresh Logic
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

const onTokenRefreshed = (token) => {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
};

const retryFailedRequest = (error) => {
  return new Promise((resolve) => {
    subscribeTokenRefresh((token) => {
      error.config.headers['Authorization'] = `Bearer ${token}`;
      resolve(axios(error.config));
    });
  });
};

// --- Request Interceptor
tokenRefreshInterceptor.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Response Interceptor
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
      const refreshResponse = await axios.get(`${BASE_URL}/auth/refresh-token`, { withCredentials: true });
      const { accessToken } = refreshResponse.data;

      if (!accessToken) {
        throw new Error('No token received during refresh.');
      }

      localStorage.setItem('token', accessToken);
      tokenRefreshInterceptor.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;

      onTokenRefreshed(accessToken);
      isRefreshing = false;

      return tokenRefreshInterceptor(originalRequest);

    } catch (refreshError) {
      console.error("🔴 Token refresh failed:", refreshError.message);
      isRefreshing = false;
      refreshSubscribers = [];

      localStorage.removeItem('token');
      window.dispatchEvent(new CustomEvent('auth:logout'));

      return Promise.reject(refreshError);
    }
  }
);

export { tokenRefreshInterceptor };
