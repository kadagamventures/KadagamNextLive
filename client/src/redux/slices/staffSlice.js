import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { tokenRefreshInterceptor } from "../../utils/axiosInstance";

const API_BASE_URL = "/admin/staff";

// Thunks

export const fetchStaffs = createAsyncThunk("staff/fetchStaffs", async (_, thunkAPI) => {
  try {
    const timestamp = Date.now();
    const res = await tokenRefreshInterceptor.get(`${API_BASE_URL}?_=${timestamp}`);
    return res.data.staffList.filter(staff => staff.role !== "admin");
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to fetch staff.");
  }
});

export const addStaff = createAsyncThunk("staff/addStaff", async (formData, thunkAPI) => {
  try {
    const res = await tokenRefreshInterceptor.post(API_BASE_URL, formData);
    return res.data; // { staff, rawPassword }
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to add staff.");
  }
});

// --- Fully robust updateStaff thunk ---
export const updateStaff = createAsyncThunk(
  "staff/updateStaff",
  async ({ id, formData }, thunkAPI) => {
    try {
      const res = await tokenRefreshInterceptor.put(
        `${API_BASE_URL}/${id}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      // Return the updated staff object
      return res.data.updatedStaff || res.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to update staff.");
    }
  }
);

// Delete staff
export const deleteStaff = createAsyncThunk("staff/deleteStaff", async (id, thunkAPI) => {
  try {
    await tokenRefreshInterceptor.delete(`${API_BASE_URL}/${id}`);
    return id;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to delete staff.");
  }
});

// Fetch single staff (for edit view)
export const fetchStaffById = createAsyncThunk("staff/fetchStaffById", async (id, thunkAPI) => {
  try {
    const res = await tokenRefreshInterceptor.get(`${API_BASE_URL}/${id}`);
    return res.data.staff;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to fetch staff details.");
  }
});

// Fetch logged-in user's profile
export const fetchMyProfile = createAsyncThunk("staff/fetchMyProfile", async (_, thunkAPI) => {
  try {
    const res = await tokenRefreshInterceptor.get(`${API_BASE_URL}/my-profile`);
    return res.data.profile;
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data?.message || "Failed to fetch profile.");
  }
});

// --- Slice ---
const staffSlice = createSlice({
  name: "staff",
  initialState: {
    items: [],
    selectedStaff: null,
    myProfile: null,
    rawPassword: null,
    status: "idle",
    error: null,
  },
  reducers: {
    resetStaffStatus: (state) => {
      state.status = "idle";
      state.error = null;
      state.rawPassword = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all
      .addCase(fetchStaffs.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchStaffs.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchStaffs.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Add
      .addCase(addStaff.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items.unshift(action.payload.staff);
        state.rawPassword = action.payload.rawPassword;
      })
      .addCase(addStaff.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Update
      .addCase(updateStaff.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = state.items.map(staff =>
          staff._id === action.payload._id ? { ...staff, ...action.payload } : staff
        );
      })
      .addCase(updateStaff.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Delete
      .addCase(deleteStaff.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = state.items.filter(staff => staff._id !== action.payload);
      })
      .addCase(deleteStaff.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Fetch by ID
      .addCase(fetchStaffById.fulfilled, (state, action) => {
        state.selectedStaff = action.payload;
      })
      .addCase(fetchStaffById.rejected, (state, action) => {
        state.error = action.payload;
      })

      // My profile
      .addCase(fetchMyProfile.fulfilled, (state, action) => {
        state.myProfile = action.payload;
      })
      .addCase(fetchMyProfile.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

// Exports
export const { resetStaffStatus } = staffSlice.actions;
export default staffSlice.reducer;
