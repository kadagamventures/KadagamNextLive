import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { tokenRefreshInterceptor } from "../../utils/axiosInstance";

// 🔹 Safe LocalStorage utilities
const getStoredData = (key, defaultValue) => {
  try {
    const stored = localStorage.getItem(key);
    return stored && stored !== "undefined" ? JSON.parse(stored) : defaultValue;
  } catch (err) {
    console.error(`Error parsing ${key}:`, err);
    return defaultValue;
  }
};

const user = getStoredData("user", null);
const permissions = getStoredData("permissions", []);

const hasPermission = (requiredPermission) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  return permissions.includes(requiredPermission);
};

// 🔹 Async Thunks

export const fetchProjects = createAsyncThunk("projects/fetchProjects", async (_, thunkAPI) => {
  try {
    const { data } = await tokenRefreshInterceptor.get("/projects");
    return data.projects || [];
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const fetchProjectById = createAsyncThunk("projects/fetchProjectById", async (id, thunkAPI) => {
  if (!id) return thunkAPI.rejectWithValue("Invalid project ID.");
  try {
    const { data } = await tokenRefreshInterceptor.get(`/projects/${id}`);
    return data.project;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const addProject = createAsyncThunk("projects/addProject", async (projectData, thunkAPI) => {
  if (!hasPermission("manage_project")) return thunkAPI.rejectWithValue("Access denied.");

  const user = getStoredData("user", null);
  const companyId = user?.companyId;

  if (!companyId) return thunkAPI.rejectWithValue("Missing company ID.");

  const finalProjectData = { ...projectData, companyId };

  try {
    const { data } = await tokenRefreshInterceptor.post("/projects", finalProjectData);
    return data.project;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const updateProject = createAsyncThunk("projects/updateProject", async ({ id, ...projectData }, thunkAPI) => {
  if (!id) return thunkAPI.rejectWithValue("Invalid project ID.");
  if (!hasPermission("manage_project")) return thunkAPI.rejectWithValue("Access denied.");
  try {
    const { data } = await tokenRefreshInterceptor.put(`/projects/${id}`, projectData);
    return data.updatedProject;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const deleteProject = createAsyncThunk("projects/deleteProject", async (id, thunkAPI) => {
  if (!id) return thunkAPI.rejectWithValue("Invalid project ID.");
  if (!hasPermission("manage_project")) return thunkAPI.rejectWithValue("Access denied.");
  try {
    await tokenRefreshInterceptor.delete(`/projects/${id}`);
    return id;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const restoreProject = createAsyncThunk("projects/restoreProject", async (id, thunkAPI) => {
  if (!id) return thunkAPI.rejectWithValue("Invalid project ID.");
  if (!hasPermission("manage_project")) return thunkAPI.rejectWithValue("Access denied.");
  try {
    const { data } = await tokenRefreshInterceptor.put(`/projects/${id}/restore`);
    return data.project;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

// 🔹 Slice

const projectSlice = createSlice({
  name: "projects",
  initialState: {
    items: [],
    selectedProject: null,
    status: "idle",
    error: null,
  },
  reducers: {
    resetStatus: (state) => {
      state.status = "idle";
      state.error = null;
    },
    resetSelectedProject: (state) => {
      state.selectedProject = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // 🔸 Fetch all
      .addCase(fetchProjects.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // 🔸 Fetch one
      .addCase(fetchProjectById.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.selectedProject = action.payload;
      })
      .addCase(fetchProjectById.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // 🔸 Add
      .addCase(addProject.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(addProject.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items.unshift(action.payload);
      })
      .addCase(addProject.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // 🔸 Update
      .addCase(updateProject.fulfilled, (state, action) => {
        state.items = state.items.map((p) =>
          p._id === action.payload._id ? action.payload : p
        );
        if (state.selectedProject && state.selectedProject._id === action.payload._id) {
          state.selectedProject = action.payload;
        }
      })

      // 🔸 Delete
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.items = state.items.filter((p) => p._id !== action.payload);
      })

      // 🔸 Restore
      .addCase(restoreProject.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      });
  },
});

export const { resetStatus, resetSelectedProject } = projectSlice.actions;
export default projectSlice.reducer;
