// 📂 src/redux/slices/leaveRequestSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { tokenRefreshInterceptor } from "../../utils/axiosInstance"; // ✅ Use the correct axios instance

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ─────────────────────────────────────────────
// 🔄 Async Thunks
// ─────────────────────────────────────────────

// Submit a leave or work-from-home request
export const submitLeaveRequest = createAsyncThunk(
  "leaveRequest/submitLeaveRequest",
  async (payload, thunkAPI) => {
    try {
      const response = await tokenRefreshInterceptor.post(
        `${API_BASE_URL}/leave`,
        payload
      );
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to submit leave request";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// ─────────────────────────────────────────────
// 📦 Leave Request Slice
// ─────────────────────────────────────────────

const leaveRequestSlice = createSlice({
  name: "leaveRequest",
  initialState: {
    loading: false,
    error: null,
    success: false,
    request: null,
  },
  reducers: {
    clearLeaveRequestState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
      state.request = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitLeaveRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
      })
      .addCase(submitLeaveRequest.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.request = action.payload;
      })
      .addCase(submitLeaveRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.success = false;
      });
  },
});

// ─────────────────────────────────────────────
// ✅ Exports
// ─────────────────────────────────────────────

export const { clearLeaveRequestState } = leaveRequestSlice.actions;
export default leaveRequestSlice.reducer;
