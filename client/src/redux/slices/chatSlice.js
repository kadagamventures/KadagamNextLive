import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchTaskChatMessages,
  getMyChatTasks,
  getRecentChats,
  getConversationWithUser,
  editMessage,
  deleteMessage,
  searchMessages,
  markMessagesAsRead,
  getUnreadCount,
} from "../../services/chatService";
import { getSocket, initializeChatSocket, emitChatEvent } from "../../websocket/chatSocket";

const normalizeId = (id) =>
  typeof id === "object" && id !== null
    ? id._id?.toString() || id.id?.toString() || id.toString()
    : id?.toString();

let cleanupFunction = null;

export const initializeChatSocketThunk = createAsyncThunk(
  "chat/initializeSocket",
  async (_, { dispatch }) => {
    if (typeof cleanupFunction === "function") {
      cleanupFunction();
      cleanupFunction = null;
    }

    const cleanup = await initializeChatSocket({
      onTaskMessage: (msg) => dispatch(newMessageReceived(msg)),
      onSocketConnected: () => dispatch(setSocketConnected(true)),
      onSocketDisconnected: () => dispatch(setSocketConnected(false)),
      onMessageDelivered: (data) => dispatch(taskMessageDelivered(data)),
      onMessageSeen: (data) => dispatch(taskMessageRead(data)),
    });

    cleanupFunction = cleanup;
    return true;
  }
);

export const cleanupChatSocket = createAsyncThunk("chat/cleanupSocket", async () => {
  if (cleanupFunction) {
    cleanupFunction();
    cleanupFunction = null;
  }
  return true;
});

export const fetchChatHistory = createAsyncThunk(
  "chat/fetchHistory",
  async (taskId, { rejectWithValue }) => {
    try {
      const response = await fetchTaskChatMessages(taskId);
      if (!response.success) throw new Error(response.error);
      return response.messages || [];
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const joinChatRoom = createAsyncThunk("chat/joinRoom", async (taskId) => taskId);
export const leaveChatRoom = createAsyncThunk("chat/leaveRoom", async (taskId) => taskId);

export const sendMessage = createAsyncThunk(
  "chat/sendMessage",
  async ({ message, receiverId, taskId }, { getState, dispatch, rejectWithValue }) => {
    try {
      const socket = getSocket();
      if (!socket?.connected) throw new Error("WebSocket not connected.");

      const state = getState();
      const sender = state.staffAuth.user || state.auth.user;
      const senderId = sender.id || sender._id;
      const tempId = `temp-${Date.now()}`;

      const optimisticMessage = {
        _id: tempId,
        senderId,
        senderName: sender.name,
        receiverId,
        taskId,
        message,
        timestamp: new Date().toISOString(),
        optimistic: true,
        delivered: false,
        read: false,
        tempId,
      };

      dispatch(addOptimisticMessage(optimisticMessage));

      const emitted = emitChatEvent("sendMessage", {
        message,
        receiverId,
        taskId,
        tempId,
      });

      if (!emitted) {
        dispatch(markMessageAsFailed(tempId));
        throw new Error("WebSocket emit failed.");
      }

      return optimisticMessage;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteChatMessage = createAsyncThunk("chat/deleteMessage", async (messageId, { rejectWithValue }) => {
  const res = await deleteMessage(messageId);
  return res.success ? messageId : rejectWithValue(res.error);
});

export const editChatMessage = createAsyncThunk("chat/editMessage", async ({ messageId, newText }, { rejectWithValue }) => {
  const res = await editMessage(messageId, newText);
  return res.success ? res.message : rejectWithValue(res.error);
});

export const fetchAssignedTasksByMe = createAsyncThunk("chat/fetchAssignedTasksByMe", async (_, { rejectWithValue }) => {
  try {
    const res = await getMyChatTasks();
    if (!res.success) throw new Error(res.error);
    return res.tasks || [];
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const fetchRecentChats = createAsyncThunk("chat/fetchRecentChats", async (_, { rejectWithValue }) => {
  try {
    const res = await getRecentChats();
    if (!res.success) throw new Error(res.error);
    return res.chats || [];
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const fetchConversation = createAsyncThunk("chat/fetchConversation", async (userId, { rejectWithValue }) => {
  try {
    const res = await getConversationWithUser(userId);
    if (!res.success) throw new Error(res.error);
    return res.messages || [];
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const searchTaskMessages = createAsyncThunk("chat/searchMessages", async ({ query, taskId }, { rejectWithValue }) => {
  try {
    const res = await searchMessages(query, taskId);
    if (!res.success) throw new Error(res.error);
    return res.messages || [];
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const markChatAsRead = createAsyncThunk("chat/markAsRead", async (params, { rejectWithValue }) => {
  const res = await markMessagesAsRead(params);
  return res.success ? params : rejectWithValue(res.error);
});

export const fetchUnreadChatCount = createAsyncThunk("chat/fetchUnreadCount", async (_, { rejectWithValue }) => {
  try {
    const res = await getUnreadCount();
    if (!res.success) throw new Error(res.error);
    return res.count || 0;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    taskId: null,
    messages: [],
    assignedTasks: [],
    recentChats: [],
    unreadCount: 0,
    socketConnected: false,
    socketInitialized: false,
    loading: false,
    error: null,
  },
  reducers: {
    clearChat: (state) => {
      state.taskId = null;
      state.messages = [];
      state.error = null;
    },
    setTaskId: (state, action) => {
      state.taskId = action.payload;
    },
    setSocketConnected: (state, action) => {
      state.socketConnected = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    newMessageReceived: (state, action) => {
      const msg = {
        ...action.payload,
        senderId: normalizeId(action.payload.senderId),
        receiverId: normalizeId(action.payload.receiverId),
      };

      if (!msg.taskId || msg.taskId !== state.taskId) return;

      if (msg.tempId) {
        const index = state.messages.findIndex((m) => m.tempId && m.tempId === msg.tempId);
        if (index !== -1) {
          state.messages[index] = { ...msg, optimistic: false };
        } else {
          const exists = state.messages.some((m) => m._id === msg._id);
          if (!exists) state.messages.push({ ...msg, optimistic: false });
        }
      } else {
        const exists = state.messages.some((m) => m._id === msg._id);
        if (!exists) state.messages.push({ ...msg, optimistic: false });
      }

      state.messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },
    addOptimisticMessage: (state, action) => {
      const msg = action.payload;
      if (msg && msg.taskId === state.taskId && !state.messages.some((m) => m._id === msg._id)) {
        state.messages.push(msg);
        state.messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      }
    },
    markMessageAsFailed: (state, action) => {
      const msg = state.messages.find((m) => m._id === action.payload);
      if (msg) msg.failed = true;
    },
    taskMessageDelivered: (state, action) => {
      const msg = state.messages.find((m) => m._id === action.payload.messageId);
      if (msg) msg.delivered = true;
    },
    taskMessageRead: (state, action) => {
      const msg = state.messages.find((m) => m._id === action.payload.messageId);
      if (msg) msg.read = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChatHistory.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchChatHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.messages = action.payload.map((m) => ({
          ...m,
          senderId: normalizeId(m.senderId),
          receiverId: normalizeId(m.receiverId),
          optimistic: false,
        }));
      })
      .addCase(fetchChatHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteChatMessage.fulfilled, (state, action) => {
        state.messages = state.messages.filter((m) => m._id !== action.payload);
      })
      .addCase(editChatMessage.fulfilled, (state, action) => {
        const index = state.messages.findIndex((m) => m._id === action.payload._id);
        if (index !== -1) {
          state.messages[index] = {
            ...state.messages[index],
            message: action.payload.message,
            edited: true,
          };
        }
      })
      .addCase(joinChatRoom.fulfilled, (state, action) => {
        state.taskId = action.payload;
      })
      .addCase(fetchAssignedTasksByMe.fulfilled, (state, action) => {
        state.assignedTasks = action.payload;
      })
      .addCase(fetchRecentChats.fulfilled, (state, action) => {
        state.recentChats = action.payload;
      })
      .addCase(fetchUnreadChatCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })
      .addCase(searchTaskMessages.fulfilled, (state, action) => {
        state.searchResults = action.payload;
      })
      .addCase(initializeChatSocketThunk.fulfilled, (state) => {
        state.socketInitialized = true;
      })
      .addCase(initializeChatSocketThunk.rejected, (state, action) => {
        state.socketInitialized = false;
        state.error = action.error.message;
      });
  },
});

export const {
  clearChat,
  setTaskId,
  setSocketConnected,
  setError,
  newMessageReceived,
  addOptimisticMessage,
  markMessageAsFailed,
  taskMessageDelivered,
  taskMessageRead,
} = chatSlice.actions;

export default chatSlice.reducer;
