import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { tokenRefreshInterceptor } from "../../utils/axiosInstance";
import {
  disconnectChatSocket,
  initializeChatSocket,
} from "../../websocket/chatSocket";

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

const user = safeGetItem("user", true);
const token = safeGetItem("accessToken"); // <-- UPDATED

const initialState = {
  user,
  role: safeGetItem("role"),
  token,
  isAuthenticated: !!user && !!token,
  status: "idle",
  error: null,
  resetStatus: null,
  subscriptionStatus: safeGetItem("subscriptionStatus"),
  nextBillingDate: safeGetItem("nextBillingDate"),
};

// ──────────────
// Thunks
// ──────────────

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ loginId, password }, thunkAPI) => {
    try {
      const { data } = await tokenRefreshInterceptor.post(
        "/auth/admin/login",
        { loginId, password }
      );

      // DEBUG: Log the response
      console.log("LOGIN RESPONSE:", data);

      // Validate presence of required fields
      if (!data?.user || !data?.accessToken) {
        return thunkAPI.rejectWithValue({ message: "Invalid response from server." });
      }

      // Save all auth details in localStorage
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("accessToken", data.accessToken); // <-- UPDATED
      localStorage.setItem("subscriptionStatus", data.subscriptionStatus);
      localStorage.setItem("nextBillingDate", data.nextBillingDate ?? "");

      return {
        user: data.user,
        role: data.user.role,
        token: data.accessToken,
        subscriptionStatus: data.subscriptionStatus,
        nextBillingDate: data.nextBillingDate,
      };
    } catch (error) {
      const body = error.response?.data || {};
      return thunkAPI.rejectWithValue({
        code: body.code,
        message: body.message || "Login failed.",
        ...body,
      });
    }
  }
);

export const logoutUser = createAsyncThunk("auth/logoutUser", async () => {
  await tokenRefreshInterceptor.post("/auth/logout");

  // Clear all relevant auth data from localStorage
  localStorage.removeItem("user");
  localStorage.removeItem("role");
  localStorage.removeItem("accessToken"); // <-- UPDATED
  localStorage.removeItem("subscriptionStatus");
  localStorage.removeItem("nextBillingDate");

  return null;
});

// Password reset thunks remain the same as your previous code
export const forgotPassword = createAsyncThunk(
  "auth/forgotPassword",
  async ({ email, remember }, thunkAPI) => {
    try {
      const { data } = await tokenRefreshInterceptor.post(
        "/auth/forgot-password",
        { email }
      );
      if (remember) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }
      return data.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to send reset link."
      );
    }
  }
);

export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async ({ token, newPassword }, thunkAPI) => {
    try {
      const { data } = await tokenRefreshInterceptor.post(
        "/auth/reset-password",
        { token, newPassword }
      );
      return data.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to reset password."
      );
    }
  }
);

export const refreshSubscription = createAsyncThunk(
  "auth/refreshSubscription",
  async (_, thunkAPI) => {
    try {
      const { data } = await tokenRefreshInterceptor.get("/auth/subscription");
      localStorage.setItem("subscriptionStatus", data.subscriptionStatus);
      localStorage.setItem("nextBillingDate", data.nextBillingDate ?? "");
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue("Failed to refresh subscription.");
    }
  }
);

// ──────────────
// Slice
// ──────────────

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    resetAuthState: (state) => {
      state.user = null;
      state.role = null;
      state.token = null;
      state.isAuthenticated = false;
      state.status = "idle";
      state.error = null;
      state.subscriptionStatus = null;
      state.nextBillingDate = null;

      localStorage.removeItem("user");
      localStorage.removeItem("role");
      localStorage.removeItem("accessToken"); // <-- UPDATED
      localStorage.removeItem("subscriptionStatus");
      localStorage.removeItem("nextBillingDate");

      disconnectChatSocket();
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        const { user, role, token, subscriptionStatus, nextBillingDate } =
          action.payload;
        state.status = "success";
        state.user = user;
        state.role = role;
        state.token = token;
        state.isAuthenticated = true;
        state.subscriptionStatus = subscriptionStatus;
        state.nextBillingDate = nextBillingDate;

        disconnectChatSocket();
        initializeChatSocket();
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        state.isAuthenticated = false;
      })

      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.role = null;
        state.token = null;
        state.isAuthenticated = false;
        state.status = "idle";
        state.subscriptionStatus = null;
        state.nextBillingDate = null;

        disconnectChatSocket();
      })

      // Forgot Password
      .addCase(forgotPassword.pending, (state) => {
        state.resetStatus = "loading";
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.resetStatus = "success";
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.resetStatus = "failed";
        state.error = action.payload;
      })

      // Reset Password
      .addCase(resetPassword.pending, (state) => {
        state.resetStatus = "loading";
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.resetStatus = "success";
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.resetStatus = "failed";
        state.error = action.payload;
      })

      // Refresh Subscription
      .addCase(refreshSubscription.fulfilled, (state, action) => {
        state.subscriptionStatus = action.payload.subscriptionStatus;
        state.nextBillingDate = action.payload.nextBillingDate;
      })
      .addCase(refreshSubscription.rejected, (state) => {
        // handle or ignore
      });
  },
});

export const { resetAuthState } = authSlice.actions;
export default authSlice.reducer;
