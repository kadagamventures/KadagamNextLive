// src/redux/slices/staffSidebarSlice.js

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { tokenRefreshInterceptor } from "../../utils/axiosInstance";

// ─────────────────────────────────────────────
// 🔹 Async Thunks
// ─────────────────────────────────────────────

// 1. Fetch Staff Permissions
export const fetchPermissions = createAsyncThunk(
  "staffSidebar/fetchPermissions",
  async (_, thunkAPI) => {
    try {
      const response = await tokenRefreshInterceptor.get("/staff-permissions/permission");
      const resp = response.data.data || response.data;
      const permissions = resp.permissions;
      if (!Array.isArray(permissions)) throw new Error("Invalid permissions format.");
      return permissions;
    } catch (error) {
      const status = error.response?.status;
      const message =
        status === 401
          ? "Unauthorized - Please login again."
          : status === 403
          ? "Forbidden - No access."
          : error.response?.data?.message || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// 2. Fetch Active Attendance Session
export const fetchActiveSession = createAsyncThunk(
  "staffSidebar/fetchActiveSession",
  async (_, thunkAPI) => {
    try {
      const response = await tokenRefreshInterceptor.get("/attendance/active-session");
      const resp = response.data.data || response.data;
      const isWorking = resp.isWorking ?? false;
      const checkInTime = resp.checkInTime ?? null;
      const scheduledEndTime = resp.scheduledEndTime ?? null;
      const elapsed = checkInTime
        ? Math.floor((Date.now() - new Date(checkInTime)) / 1000)
        : 0;
      return { isWorking, checkInTime, timer: elapsed, scheduledEndTime };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// 3. Start Work (Check‑In)
export const startWorkSession = createAsyncThunk(
  "staffSidebar/startWorkSession",
  async (_, thunkAPI) => {
    try {
      const response = await tokenRefreshInterceptor.post("/attendance/check-in");
      const resp = response.data.data || response.data;
      return {
        isWorking: resp.isWorking ?? true,
        checkInTime: resp.checkInTime ?? null,
        scheduledEndTime: resp.scheduledEndTime ?? null,
      };
    } catch (error) {
      const status = error.response?.status;
      const message =
        status === 400
          ? error.response?.data?.message
          : error.response?.data?.message || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// 4. End Work (Check‑Out)
export const endWorkSession = createAsyncThunk(
  "staffSidebar/endWorkSession",
  async (_, thunkAPI) => {
    try {
      const response = await tokenRefreshInterceptor.post("/attendance/check-out");
      const resp = response.data.data || response.data;
      return { isWorking: resp.isWorking ?? false };
    } catch (error) {
      const status = error.response?.status;
      const message =
        status === 400
          ? error.response?.data?.message
          : error.response?.data?.message || error.message;
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// 5. Fetch Office Timing (Staff View)
export const fetchOfficeTiming = createAsyncThunk(
  "staffSidebar/fetchOfficeTiming",
  async (_, thunkAPI) => {
    try {
      const response = await tokenRefreshInterceptor.get("/office-timing");
      const resp = response.data.data || response.data;
      return resp;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// 6. Admin: Update Office Timing
export const updateOfficeTiming = createAsyncThunk(
  "staffSidebar/updateOfficeTiming",
  async (payload, thunkAPI) => {
    try {
      const response = await tokenRefreshInterceptor.post("/office-timing/admin", payload);
      const resp = response.data.data || response.data;
      return resp;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// ─────────────────────────────────────────────
// 🔹 Initial State
// ─────────────────────────────────────────────
const initialState = {
  permissions: [],
  isLoading: false,
  isWorking: false,
  timer: 0,
  intervalId: null,
  scheduledEndTime: null,
  profileImage: null,
  officeTiming: {
    startTime: null,
    endTime: null,
    graceMinutes: 0,
    fullDayHours: 8,
  },
  error: null,
};

// ─────────────────────────────────────────────
// 🔹 Slice
// ─────────────────────────────────────────────
const staffSidebarSlice = createSlice({
  name: "staffSidebar",
  initialState,
  reducers: {
    setProfileImage(state, action) {
      state.profileImage = action.payload;
    },
    setIsWorking(state, action) {
      state.isWorking = action.payload;
    },
    setTimer(state, action) {
      state.timer = typeof action.payload === "number" ? action.payload : 0;
    },
    incrementTimer(state) {
      state.timer += 1;
    },
    setIntervalId(state, action) {
      state.intervalId = action.payload;
    },
    clearIntervalId(state) {
      if (state.intervalId) clearInterval(state.intervalId);
      state.intervalId = null;
    },
    resetSidebarState() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // Permissions
      .addCase(fetchPermissions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPermissions.fulfilled, (state, { payload }) => {
        state.permissions = payload;
        state.isLoading = false;
      })
      .addCase(fetchPermissions.rejected, (state, { payload }) => {
        state.permissions = [];
        state.error = payload;
        state.isLoading = false;
      })

      // Active Session
      .addCase(fetchActiveSession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchActiveSession.fulfilled, (state, { payload }) => {
        state.isWorking = payload.isWorking;
        state.timer = payload.timer;
        state.scheduledEndTime = payload.scheduledEndTime;
        state.isLoading = false;
      })
      .addCase(fetchActiveSession.rejected, (state, { payload }) => {
        state.isWorking = false;
        state.timer = 0;
        state.scheduledEndTime = null;
        state.error = payload;
        state.isLoading = false;
      })

      // Start Work
      .addCase(startWorkSession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(startWorkSession.fulfilled, (state, { payload }) => {
        state.isWorking = payload.isWorking;
        state.timer = 0;
        state.scheduledEndTime = payload.scheduledEndTime;
        state.isLoading = false;
      })
      .addCase(startWorkSession.rejected, (state, { payload }) => {
        state.isWorking = false;
        state.error = payload;
        state.isLoading = false;
      })

      // End Work
      .addCase(endWorkSession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(endWorkSession.fulfilled, (state, { payload }) => {
        state.isWorking = payload.isWorking;
        state.timer = 0;
        state.scheduledEndTime = null;
        state.isLoading = false;
      })
      .addCase(endWorkSession.rejected, (state, { payload }) => {
        state.error = payload;
        state.isLoading = false;
      })

      // Fetch Office Timing
      .addCase(fetchOfficeTiming.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOfficeTiming.fulfilled, (state, { payload }) => {
        state.officeTiming = {
          startTime: payload.startTime,
          endTime: payload.endTime,
          graceMinutes: payload.graceMinutes ?? 0,
          fullDayHours: payload.fullDayHours ?? 8,
        };
        state.isLoading = false;
      })
      .addCase(fetchOfficeTiming.rejected, (state, { payload }) => {
        state.error = payload;
        state.isLoading = false;
      })

      // Update Office Timing
      .addCase(updateOfficeTiming.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateOfficeTiming.fulfilled, (state, { payload }) => {
        state.officeTiming = {
          startTime: payload.startTime,
          endTime: payload.endTime,
          graceMinutes: payload.graceMinutes ?? 0,
          fullDayHours: payload.fullDayHours ?? 8,
        };
        state.isLoading = false;
      })
      .addCase(updateOfficeTiming.rejected, (state, { payload }) => {
        state.error = payload;
        state.isLoading = false;
      });
  },
});

export const {
  setProfileImage,
  setIsWorking,
  setTimer,
  incrementTimer,
  setIntervalId,
  clearIntervalId,
  resetSidebarState,
} = staffSidebarSlice.actions;

export default staffSidebarSlice.reducer;
