// 📂 src/redux/slices/authSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { tokenRefreshInterceptor } from "../../utils/axiosInstance";

// ✅ WebSocket: reconnect on login
import { disconnectChatSocket, initializeChatSocket } from "../../websocket/chatSocket";

// Safe LocalStorage retrieval
const safeGetItem = (key, isJSON = false) => {
  try {
    const value = localStorage.getItem(key);
    if (!value || value === "undefined" || value === "null") return null;
    return isJSON ? JSON.parse(value) : value;
  } catch {
    return null;
  }
};

// Initial Auth State
const initialState = {
  user: safeGetItem("user", true),
  role: safeGetItem("role"),
  isAuthenticated: !!safeGetItem("user"),
  status: "idle",
  error: null,
  resetStatus: null,
};

// ─────────────────────────────────────────────
// 🔐 Thunks for API calls
// ─────────────────────────────────────────────

// Admin Login
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ loginId, password }, thunkAPI) => {
    try {
      const { data } = await tokenRefreshInterceptor.post("/auth/admin/login", { loginId, password });

      if (!data?.user || !data?.accessToken) {
        return thunkAPI.rejectWithValue("Invalid response from server.");
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("token", data.accessToken);

      return { user: data.user, role: data.user.role };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || "Login failed.");
    }
  }
);

// Admin Logout
export const logoutUser = createAsyncThunk("auth/logoutUser", async () => {
  await tokenRefreshInterceptor.post("/auth/admin/logout");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
  localStorage.removeItem("token");
  return null;
});

// Forgot Password
export const forgotPassword = createAsyncThunk(
  "auth/forgotPassword",
  async ({ email, remember }, thunkAPI) => {
    try {
      const { data } = await tokenRefreshInterceptor.post("/auth/forgot-password", { email });
      
      if (remember) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      return data.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to send reset link.");
    }
  }
);


// Reset Password
export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async ({ token, newPassword }, thunkAPI) => {
    try {
      const { data } = await tokenRefreshInterceptor.post("/auth/reset-password", { token, newPassword });
      return data.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || "Failed to reset password.");
    }
  }
);

// ─────────────────────────────────────────────
// 📦 Auth Slice (Admin Login Only)
// ─────────────────────────────────────────────
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    resetAuthState: (state) => {
      state.user = null;
      state.role = null;
      state.isAuthenticated = false;
      state.status = "idle";
      state.error = null;
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      localStorage.removeItem("token");
      disconnectChatSocket(); // ✅ also disconnect on manual reset
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "success";
        state.user = action.payload.user;
        state.role = action.payload.role;
        state.isAuthenticated = true;

        // ✅ Reconnect WebSocket on login
        disconnectChatSocket();     // clear any stale socket
        initializeChatSocket();     // use new token from localStorage
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.role = null;
        state.isAuthenticated = false;
        state.status = "idle";

        // ✅ Disconnect socket on logout
        disconnectChatSocket();
      })
      .addCase(forgotPassword.pending, (state) => {
        state.resetStatus = "loading";
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.resetStatus = "success";
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.resetStatus = "failed";
        state.error = action.payload;
      })
      .addCase(resetPassword.pending, (state) => {
        state.resetStatus = "loading";
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.resetStatus = "success";
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.resetStatus = "failed";
        state.error = action.payload;
      });
  },
});

export const { resetAuthState } = authSlice.actions;
export default authSlice.reducer;
