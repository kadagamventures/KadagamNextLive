import axios from "axios";
import authService from "../services/authService"; // Token & session handling

// ✅ API Base URL for Staff Auth
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/auth/staff";

// ✅ Axios Instance Configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 10000,
});

/**
 * ✅ Staff Login - Email Only (Secure & Multi-Tenant Safe)
 */
const login = async ({ email, password }) => {
  try {
    console.log("🔹 Sending staff login request...", { email });

    const response = await api.post("/login", {
      loginId: email, // backend expects `loginId`
      password,
    });

    console.log("✅ Server Response (Staff Login):", response.data);

    const { accessToken, user } = response.data;
    if (!accessToken || !user) {
      throw new Error("Invalid response from server.");
    }

    authService.storeToken(accessToken);
    authService.storeUser(user);
    authService.storeRole(user.role);

    return response.data;
  } catch (error) {
    console.error("❌ Staff login failed:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Login failed");
  }
};

/**
 * ✅ Staff Logout - Clears Session
 */
const logout = async (navigate) => {
  try {
    console.log("🔹 Sending staff logout request...");
    await api.post("/logout");

    console.log("✅ Logout successful. Clearing session...");
    authService.clearSession?.();

    if (navigate) {
      navigate("/staff/login");
    } else {
      window.location.href = "/staff/login";
    }
  } catch (error) {
    console.error("❌ Logout failed:", error.response?.data || error.message);
  }
};

/**
 * ✅ Get Current Staff Info
 */
const getCurrentUser = async () => {
  const token = authService.getToken?.();
  if (!token) {
    console.warn("⚠️ No token found. Staff is not authenticated.");
    return null;
  }

  try {
    console.log("🔹 Fetching current staff details...");
    const response = await api.get("/current-user", {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("✅ Staff data retrieved:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching staff data:", error.response?.data || error.message);
    return null;
  }
};

/**
 * ✅ Request Password Reset (Email Only)
 */
const requestPasswordReset = async (email) => {
  try {
    console.log(`🔹 Sending password reset request for ${email}...`);
    const response = await api.post("/forgot-password", { email });
    console.log("✅ Password reset email sent:", response.data.message);
    return response.data;
  } catch (error) {
    console.error("❌ Error sending password reset email:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Failed to send reset email.");
  }
};

/**
 * ✅ Reset Password with Token
 */
const resetPassword = async (token, newPassword) => {
  try {
    console.log("🔹 Resetting staff password...");
    const response = await api.post("/reset-password", { token, newPassword });
    console.log("✅ Password reset successful:", response.data.message);
    return response.data;
  } catch (error) {
    console.error("❌ Error resetting password:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Password reset failed.");
  }
};

/**
 * ✅ Auto Refresh Token if Expired
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.warn("⚠️ Token expired. Attempting refresh...");

      try {
        const refreshResponse = await api.post("/refresh");

        const newToken = refreshResponse.data.accessToken;
        console.log("✅ Token refreshed:", newToken);
        authService.storeToken(newToken);

        // Retry original request with new token
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return api(error.config);
      } catch (refreshError) {
        console.error("❌ Token refresh failed. Redirecting to login...");
        authService.clearSession();
        window.location.href = "/staff/login";
      }
    }
    return Promise.reject(error);
  }
);

/**
 * ✅ Export Staff Auth Service
 */
const staffAuthService = {
  login,
  logout,
  getCurrentUser,
  requestPasswordReset,
  resetPassword,
};

export default staffAuthService;
