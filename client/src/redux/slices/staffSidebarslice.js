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
      const { data } = await tokenRefreshInterceptor.get(
        "/staff-permissions/permission"
      );
      const permissions = data?.permissions;
      if (!Array.isArray(permissions)) {
        throw new Error("Invalid permissions format.");
      }
      return permissions;
    } catch (error) {
      const status = error.response?.status;
      const message =
        status === 401
          ? "Unauthorized - Please login again."
          : status === 403
          ? "Forbidden - No access."
          : error.response?.data?.message || "Failed to fetch permissions.";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// 2. Fetch Active Attendance Session (used on sidebar load/resume)
export const fetchActiveSession = createAsyncThunk(
  "staffSidebar/fetchActiveSession",
  async (_, thunkAPI) => {
    try {
      const { data } = await tokenRefreshInterceptor.get(
        "/attendance/active-session"
      );

      const isWorking = data?.isWorking ?? false;
      const checkInTime = data?.checkInTime;
      const scheduledEndTime = data?.scheduledEndTime; // if returned by backend
      const elapsed = checkInTime
        ? Math.floor((Date.now() - new Date(checkInTime)) / 1000)
        : 0;

      return {
        isWorking,
        checkInTime,
        timer: elapsed,
        scheduledEndTime: scheduledEndTime || null,
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

// 3. Start Work (Check-In)
export const startWorkSession = createAsyncThunk(
  "staffSidebar/startWorkSession",
  async (_, thunkAPI) => {
    try {
      const { data } = await tokenRefreshInterceptor.post(
        "/attendance/check-in"
      );
      const resp = data.data || {};
      return {
        isWorking: resp.isWorking ?? true,
        checkInTime: resp.checkInTime,
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

// 4. End Work (Check-Out)
export const endWorkSession = createAsyncThunk(
  "staffSidebar/endWorkSession",
  async (_, thunkAPI) => {
    try {
      const { data } = await tokenRefreshInterceptor.post(
        "/attendance/check-out"
      );
      const resp = data.data || {};
      return {
        isWorking: resp.isWorking ?? false,
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

// 5. Fetch Office Timing (sidebar footer)
export const fetchOfficeTiming = createAsyncThunk(
  "staffSidebar/fetchOfficeTiming",
  async (_, thunkAPI) => {
    try {
      const { data } = await tokenRefreshInterceptor.get("/office-time");
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

// 6. Admin update office time
export const updateOfficeTiming = createAsyncThunk(
  "staffSidebar/updateOfficeTiming",
  async (payload, thunkAPI) => {
    try {
      const { data } = await tokenRefreshInterceptor.post(
        "/admin/office-time",
        payload
      );
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
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
    startHour: null,
    startMinute: null,
    endHour: null,
    endMinute: null,
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
      if (state.intervalId) {
        clearInterval(state.intervalId);
      }
      state.intervalId = null;
    },
    resetSidebarState() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Permissions
    builder
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
      });

    // Active Session
    builder
      .addCase(fetchActiveSession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchActiveSession.fulfilled, (state, { payload }) => {
        state.isWorking = payload.isWorking;
        state.timer = payload.timer;
        state.scheduledEndTime = payload.scheduledEndTime;
        state.isLoading = false;
        localStorage.setItem("isWorking", payload.isWorking.toString());
        localStorage.setItem("workTimer", payload.timer.toString());
        if (payload.scheduledEndTime) {
          localStorage.setItem("scheduledEndTime", payload.scheduledEndTime);
        }
      })
      .addCase(fetchActiveSession.rejected, (state, { payload }) => {
        state.isWorking = false;
        state.timer = 0;
        state.error = payload;
        state.isLoading = false;
      });

    // Start Work (Check-In)
    builder
      .addCase(startWorkSession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(startWorkSession.fulfilled, (state, { payload }) => {
        state.isWorking = payload.isWorking;
        state.timer = 0;
        state.scheduledEndTime = payload.scheduledEndTime;
        state.isLoading = false;
        localStorage.setItem("isWorking", payload.isWorking.toString());
        localStorage.setItem("workTimer", "0");
        if (payload.scheduledEndTime) {
          localStorage.setItem("scheduledEndTime", payload.scheduledEndTime);
        }
      })
      .addCase(startWorkSession.rejected, (state, { payload }) => {
        state.isWorking = false;
        state.error = payload;
        state.isLoading = false;
      });

    // End Work (Check-Out)
    builder
      .addCase(endWorkSession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(endWorkSession.fulfilled, (state, { payload }) => {
        state.isWorking = payload.isWorking;
        state.timer = 0;
        state.scheduledEndTime = null;
        state.isLoading = false;
        localStorage.setItem("isWorking", payload.isWorking.toString());
        localStorage.removeItem("scheduledEndTime");
        localStorage.setItem("workTimer", "0");
      })
      .addCase(endWorkSession.rejected, (state, { payload }) => {
        state.error = payload;
        state.isLoading = false;
      });

    // Office Timing
    builder
      .addCase(fetchOfficeTiming.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOfficeTiming.fulfilled, (state, { payload }) => {
        state.officeTiming = {
          startHour: payload.startHour,
          startMinute: payload.startMinute,
          endHour: payload.endHour,
          endMinute: payload.endMinute,
          graceMinutes: payload.graceMinutes ?? state.officeTiming.graceMinutes,
          fullDayHours: payload.fullDayHours ?? state.officeTiming.fullDayHours,
        };
        state.isLoading = false;
      })
      .addCase(fetchOfficeTiming.rejected, (state, { payload }) => {
        state.error = payload;
        state.isLoading = false;
      });

    // Update Office Timing
    builder
      .addCase(updateOfficeTiming.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateOfficeTiming.fulfilled, (state, { payload }) => {
        state.officeTiming = {
          startHour: payload.startHour,
          startMinute: payload.startMinute,
          endHour: payload.endHour,
          endMinute: payload.endMinute,
          graceMinutes: payload.graceMinutes ?? state.officeTiming.graceMinutes,
          fullDayHours: payload.fullDayHours ?? state.officeTiming.fullDayHours,
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
