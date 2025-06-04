// 📂 src/redux/slices/staffAuthSlice.js

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { tokenRefreshInterceptor as axiosInstance } from "../../utils/axiosInstance";
import { disconnectChatSocket } from "../../websocket/chatSocket";

// 🔐 Safe LocalStorage parse
const safeParse = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    if (!item || item === "undefined" || item === "null") return defaultValue;
    return JSON.parse(item);
  } catch (error) {
    console.warn(`⚠️ Error parsing LocalStorage key "${key}":`, error);
    return defaultValue;
  }
};

// 🔹 Async Thunks

// 🔐 Login Staff (multi-tenant: email + companyId)
export const loginStaff = createAsyncThunk(
  "staffAuth/loginStaff",
  async ({ email, password, companyId }, thunkAPI) => {
    try {
      const response = await axiosInstance.post("/auth/staff/login", {
        loginId: email,
        password,
        companyId,
      });

      const { accessToken, user } = response.data;
      if (!accessToken || !user) throw new Error("Invalid server response");

      localStorage.setItem("token", accessToken);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("role", user.role);
      localStorage.setItem("permissions", JSON.stringify(user.permissions || []));
      localStorage.setItem("companyId", user.companyId);

      return { user, token: accessToken };
    } catch (error) {
      const message = error.response?.data?.message || "Login failed";
      console.warn("🛑 Login error:", message);
      if (error.response?.status === 401) localStorage.clear();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// 🔓 Logout Staff
export const logoutStaff = createAsyncThunk("staffAuth/logoutStaff", async () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
  localStorage.removeItem("permissions");
  localStorage.removeItem("companyId");

  disconnectChatSocket(); // ✅ WebSocket cleanup
  return null;
});

// 🔹 Initial State
const initialState = {
  user: safeParse("user", null),
  token: localStorage.getItem("token") || null,
  role: localStorage.getItem("role") || null,
  permissions: safeParse("permissions", []),
  loading: false,
  error: null,
};

// 🔹 Slice
const staffAuthSlice = createSlice({
  name: "staffAuth",
  initialState,
  reducers: {
    resetStaffState(state) {
      state.user = null;
      state.token = null;
      state.role = null;
      state.permissions = [];
      state.loading = false;
      state.error = null;
      localStorage.clear();
      disconnectChatSocket();
    },
  },
  extraReducers: (builder) => {
    builder
      // 🔄 Login Staff
      .addCase(loginStaff.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginStaff.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.role = action.payload.user.role;
        state.permissions = action.payload.user.permissions || [];
        state.error = null;
      })
      .addCase(loginStaff.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.role = null;
        state.permissions = [];
        state.error = action.payload || "Login failed.";
      })
      // 🔄 Logout Staff
      .addCase(logoutStaff.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.role = null;
        state.permissions = [];
        state.loading = false;
        state.error = null;
      });
  },
});

// 🔹 Exports
export const { resetStaffState } = staffAuthSlice.actions;
export default staffAuthSlice.reducer;
