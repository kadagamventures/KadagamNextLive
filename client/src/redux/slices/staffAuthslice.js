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

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("role", user.role);
      localStorage.setItem("permissions", JSON.stringify(user.permissions || []));
      localStorage.setItem("companyId", user.companyId);

      return { user, accessToken }; // Return with accessToken key
    } catch (error) {
      const message = error.response?.data?.message || "Login failed";
      if (error.response?.status === 401) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        localStorage.removeItem("role");
        localStorage.removeItem("permissions");
        localStorage.removeItem("companyId");
      }
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const logoutStaff = createAsyncThunk("staffAuth/logoutStaff", async () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
  localStorage.removeItem("permissions");
  localStorage.removeItem("companyId");
  disconnectChatSocket();
  return null;
});

// 🔹 Initial State
const initialState = {
  user: safeParse("user", null),
  accessToken: localStorage.getItem("accessToken") || null, // Consistent key
  role: localStorage.getItem("role") || null,
  permissions: safeParse("permissions", []),
  isAuthenticated: !!localStorage.getItem("user") && !!localStorage.getItem("accessToken"),
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
      state.accessToken = null;
      state.role = null;
      state.permissions = [];
      state.loading = false;
      state.error = null;
      state.isAuthenticated = false;
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      localStorage.removeItem("permissions");
      localStorage.removeItem("companyId");
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
        state.accessToken = action.payload.accessToken;
        state.role = action.payload.user.role;
        state.permissions = action.payload.user.permissions || [];
        state.isAuthenticated = !!action.payload.user && !!action.payload.accessToken;
        state.error = null;
      })
      .addCase(loginStaff.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.accessToken = null;
        state.role = null;
        state.permissions = [];
        state.isAuthenticated = false;
        state.error = action.payload || "Login failed.";
      })
      // 🔄 Logout Staff
      .addCase(logoutStaff.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.role = null;
        state.permissions = [];
        state.loading = false;
        state.error = null;
        state.isAuthenticated = false;
      });
  },
});

// 🔹 Exports
export const { resetStaffState } = staffAuthSlice.actions;
export default staffAuthSlice.reducer;
