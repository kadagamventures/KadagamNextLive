import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { tokenRefreshInterceptor } from "../../utils/axiosInstance";

// 🔹 Async Thunks

export const fetchTasks = createAsyncThunk("tasks/fetchTasks", async (_, thunkAPI) => {
  try {
    const { data } = await tokenRefreshInterceptor.get("/tasks");
    return data || [];
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const fetchTasksAssignedByMe = createAsyncThunk("tasks/fetchTasksAssignedByMe", async (_, thunkAPI) => {
  try {
    const { data } = await tokenRefreshInterceptor.get("/tasks/assigned-by-me");
    return data || [];
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const fetchTasksCreatedByMe = createAsyncThunk("tasks/fetchTasksCreatedByMe", async (_, thunkAPI) => {
  try {
    const { data } = await tokenRefreshInterceptor.get("/tasks/my-daily-comments");
    return data || [];
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const fetchStaffTasks = createAsyncThunk("tasks/fetchStaffTasks", async (userId, thunkAPI) => {
  try {
    const { data } = await tokenRefreshInterceptor.get(`/tasks/staff-tasks/${userId}`);
    return data || [];
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const addTask = createAsyncThunk("tasks/addTask", async (formData, thunkAPI) => {
  try {
    const { data } = await tokenRefreshInterceptor.post("/tasks", formData);
    return data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const updateTask = createAsyncThunk("tasks/updateTask", async ({ id, formData }, thunkAPI) => {
  try {
    const { data } = await tokenRefreshInterceptor.put(`/tasks/${id}`, formData);
    return data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const updateTaskStatusAction = createAsyncThunk(
  "tasks/updateTaskStatus",
  async ({ id, status, priority }, thunkAPI) => {
    try {
      const validStatuses = ["To Do", "Ongoing", "Review", "Completed"];
      const correctedStatus = validStatuses.find(
        (s) => s.toLowerCase() === status?.toLowerCase()
      ) || status;
      const { data } = await tokenRefreshInterceptor.put(`/tasks/staff/${id}`, {
        status: correctedStatus,
        priority,
      });
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// ✅ IMPROVED: Only append fields if present (prevents 400 on empty)
export const submitDailyTaskUpdate = createAsyncThunk(
  "tasks/submitDailyUpdate",
  async ({ id, comment, attachment }, thunkAPI) => {
    try {
      const formData = new FormData();
      if (comment && comment.trim()) {
        formData.append("comment", comment.trim());
      }
      if (attachment) {
        formData.append("attachment", attachment);
      }
      // If neither present, block request
      if (!formData.has("comment") && !formData.has("attachment")) {
        return thunkAPI.rejectWithValue("Please add a comment or attachment.");
      }
      const { data } = await tokenRefreshInterceptor.post(
        `/tasks/${id}/daily-comment`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const deleteTask = createAsyncThunk("tasks/deleteTask", async (id, thunkAPI) => {
  try {
    await tokenRefreshInterceptor.delete(`/tasks/${id}`);
    return id;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const fetchKanbanTasksForStaff = createAsyncThunk("tasks/fetchKanbanTasksForStaff", async (_, thunkAPI) => {
  try {
    const { data } = await tokenRefreshInterceptor.get("/tasks/kanban");
    return data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const markOverdueTasks = createAsyncThunk("tasks/markOverdueTasks", async (_, thunkAPI) => {
  try {
    const { data } = await tokenRefreshInterceptor.post("/tasks/mark-overdue");
    return data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const moveToReview = createAsyncThunk("tasks/moveToReview", async ({ taskId, reviewAttachment }, thunkAPI) => {
  try {
    const formData = new FormData();
    if (reviewAttachment) {
      formData.append("reviewAttachment", reviewAttachment);
    }
    const { data } = await tokenRefreshInterceptor.put(`/tasks/staff/${taskId}/review`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const handleReviewDecision = createAsyncThunk(
  "tasks/handleReviewDecision",
  async ({ taskId, decision, comment, newDueDate, newPriority }, thunkAPI) => {
    try {
      const payload = { decision, comment };
      if (newDueDate) payload.newDueDate = newDueDate;
      if (newPriority) payload.newPriority = newPriority;
      const { data } = await tokenRefreshInterceptor.put(`/tasks/review/${taskId}`, payload);
      return data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// 🔹 Slice

const taskSlice = createSlice({
  name: "tasks",
  initialState: {
    items: [],
    staffTasks: [],
    assignedByMeTasks: [],
    createdDailyCommentTasks: [],
    kanbanTasks: { todo: [], ongoing: [], review: [], completed: [] },
    status: "idle",
    error: null,
  },
  reducers: {
    resetStatus: (state) => {
      state.status = "idle";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      .addCase(fetchTasksAssignedByMe.fulfilled, (state, action) => {
        state.assignedByMeTasks = action.payload;
      })

      .addCase(fetchTasksCreatedByMe.fulfilled, (state, action) => {
        state.createdDailyCommentTasks = action.payload;
      })

      .addCase(fetchStaffTasks.fulfilled, (state, action) => {
        state.staffTasks = action.payload;
      })

      .addCase(addTask.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })

      .addCase(updateTask.fulfilled, (state, action) => {
        const idx = state.items.findIndex((t) => t._id === action.payload._id);
        if (idx !== -1) state.items[idx] = action.payload;
      })

      .addCase(updateTaskStatusAction.fulfilled, (state, action) => {
        const idx = state.items.findIndex((t) => t._id === action.payload._id);
        if (idx !== -1) state.items[idx] = action.payload;
      })

      .addCase(deleteTask.fulfilled, (state, action) => {
        state.items = state.items.filter((t) => t._id !== action.payload);
      })

      .addCase(fetchKanbanTasksForStaff.fulfilled, (state, action) => {
        state.kanbanTasks = action.payload;
      })

      .addCase(markOverdueTasks.fulfilled, (state, action) => {
        state.items = action.payload;
      })

      .addCase(moveToReview.fulfilled, (state, action) => {
        const idx = state.items.findIndex((t) => t._id === action.payload._id);
        if (idx !== -1) state.items[idx] = action.payload;
      })

      .addCase(handleReviewDecision.fulfilled, (state, action) => {
        const idx = state.items.findIndex((t) => t._id === action.payload._id);
        if (idx !== -1) state.items[idx] = action.payload;
      })

      .addCase(submitDailyTaskUpdate.fulfilled, (state) => {
        state.status = "succeeded";
      })

      .addMatcher(
        (action) => action.type.startsWith("tasks/") && action.type.endsWith("/rejected"),
        (state, action) => {
          state.status = "failed";
          state.error = action.payload;
        }
      );
  },
});

export const { resetStatus } = taskSlice.actions;
export default taskSlice.reducer;
