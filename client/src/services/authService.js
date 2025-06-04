import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Create an Axios instance for API requests
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Store & Retrieve Token and User Data
const storeToken = (token) => {
  if (token) localStorage.setItem("token", token);
};

const storeUser = (user) => {
  if (user) localStorage.setItem("user", JSON.stringify(user));
};

const storeRole = (role) => {
  if (role) localStorage.setItem("role", role);
};

const getToken = () => localStorage.getItem("token") || null;

const getUser = () => {
  try {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

const getRole = () => localStorage.getItem("role") || null;

const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
};

// Admin Login
const login = async (userData) => {
  try {
    const response = await api.post("/auth/admin/login", {
      loginId: userData.loginId,
      password: userData.password,
    });

    if (!response.data?.accessToken || !response.data?.user) {
      throw new Error("Invalid response from server.");
    }

    clearSession();
    storeToken(response.data.accessToken);
    storeUser(response.data.user);
    storeRole(response.data.user.role);

    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Login failed");
  }
};

// Admin Logout
const logout = async (navigate) => {
  try {
    await api.post("/auth/admin/logout");
  } catch {}

  clearSession();
  if (navigate) {
    navigate("/admin/login");
  } else {
    window.location.href = "/admin/login";
  }
};

// Get Current Logged-In Admin Details
const getCurrentUser = async () => {
  const token = getToken();
  if (!token) return null;

  try {
    const response = await api.get("/auth/admin/current-user", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch {
    return null;
  }
};

// Axios Interceptor - Automatically refreshes token if expired
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        const refreshResponse = await api.post("/auth/admin/refresh");

        storeToken(refreshResponse.data.accessToken);
        error.config.headers.Authorization = `Bearer ${refreshResponse.data.accessToken}`;
        return api(error.config);
      } catch {
        clearSession();
        window.location.href = "/admin/login";
      }
    }
    return Promise.reject(error);
  }
);

// Export Auth Service
const authService = {
  login,
  logout,
  getCurrentUser,
  storeToken,
  storeUser,
  storeRole,
  getToken,
  getUser,
  getRole,
  clearSession,
};

export default authService;
