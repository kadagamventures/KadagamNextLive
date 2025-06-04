// 📂 src/redux/slices/dataSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { tokenRefreshInterceptor } from "../../utils/axiosInstance"; // ✅ Always use the correct axios with token refresh

// ─────────────────────────────────────────────
// 🔄 Async Thunks
// ─────────────────────────────────────────────

// Fetch protected data
export const fetchData = createAsyncThunk(
  "data/fetchData",
  async (_, thunkAPI) => {
    try {
      const response = await tokenRefreshInterceptor.get("/data"); // Hits /api/data
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch data";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// ─────────────────────────────────────────────
// 📦 Data Slice
// ─────────────────────────────────────────────

const dataSlice = createSlice({
  name: "data",
  initialState: {
    items: [],
    status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  reducers: {
    resetDataState: (state) => {
      state.items = [];
      state.status = "idle";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchData.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchData.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload || [];
      })
      .addCase(fetchData.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message || "Unknown error";
      });
  },
});

// ─────────────────────────────────────────────
// ✅ Exports
// ─────────────────────────────────────────────

export const { resetDataState } = dataSlice.actions;
export default dataSlice.reducer;
