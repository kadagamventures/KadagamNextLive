import axios from "axios";
import authService from "../services/authService"; // Token Management Service

// Use the VITE_API_URL or fallback to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Create an Axios instance with credentials
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Ensures cookies (for authentication)
});

/**
 * Admin Login - Authenticates the admin
 */
const login = async (userData) => {
  try {
    const response = await api.post("/auth/admin/login", {
      loginId: userData.loginId,
      password: userData.password,
    });

    // Ensure response contains required data
    if (!response.data?.accessToken || !response.data?.user) {
      throw new Error("Invalid response from server.");
    }

    // Clear old session before storing new login session
    if (authService.clearSession) {
      authService.clearSession();
    }

    authService.storeToken(response.data.accessToken);
    authService.storeUser(response.data.user);
    authService.storeRole(response.data.user.role); // Store role for access control

    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Login failed");
  }
};

/**
 * Admin Logout - Clears session
 */
const logout = async (navigate) => {
  try {
    await api.post("/auth/logout");

    if (authService.clearSession) authService.clearSession();

    // Use navigate if available, otherwise fallback to window.location
    if (navigate) {
      navigate("/admin/login");
    } else {
      window.location.href = "/admin/login";
    }
  } catch (error) {
    console.error("Logout failed:", error.response?.data || error.message);
  }
};

/**
 * Get Current Logged-In User
 */
const getCurrentUser = async () => {
  const token = authService.getToken?.();

  if (!token) {
    return null;
  }

  try {
    const response = await api.get("/auth/current-user", {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data;
  } catch (error) {
    return null;
  }
};

/**
 * Export Admin Auth Service
 */
const adminAuthService = {
  login,
  logout,
  getCurrentUser,
};

export default adminAuthService;
