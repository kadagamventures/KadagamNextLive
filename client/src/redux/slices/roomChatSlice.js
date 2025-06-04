import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchRoomMessages,
  getUserRooms,
  deleteSingleRoomMessage,
  editRoomMessage, // ✅ New import
} from "../../services/roomChatService";
import {
  getSocket,
  emitChatEvent,
  joinRoom,
  leaveRoom,
} from "../../websocket/chatSocket";

const normalizeId = (id) =>
  typeof id === "object" && id !== null
    ? id._id?.toString() || id.id?.toString() || id.toString()
    : id?.toString();

// ───── Async Thunks ─────

export const fetchRoomChatHistory = createAsyncThunk(
  "roomChat/fetchRoomChatHistory",
  async (roomId, { rejectWithValue }) => {
    try {
      const messages = await fetchRoomMessages(roomId);
      return { roomId, messages: Array.isArray(messages) ? messages : [] };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const joinRoomChat = createAsyncThunk(
  "roomChat/joinRoomChat",
  async (roomId, { dispatch, rejectWithValue }) => {
    try {
      joinRoom("room", roomId);
      dispatch(setActiveRoom(roomId));
      return roomId;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const leaveRoomChat = createAsyncThunk(
  "roomChat/leaveRoomChat",
  async (roomId, { dispatch, rejectWithValue }) => {
    try {
      leaveRoom("room", roomId);
      dispatch(clearRoomChat());
      return roomId;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const sendRoomMessage = createAsyncThunk(
  "roomChat/sendRoomMessage",
  async ({ roomId, message }, { getState, dispatch, rejectWithValue }) => {
    try {
      const socket = getSocket();
      if (!socket?.connected) throw new Error("Socket not connected");

      const state = getState();
      const sender = state.auth.user || state.staffAuth.user;
      if (!sender) throw new Error("User not authenticated");

      const senderId = normalizeId(sender.id || sender._id);
      const tempId = `temp-${Date.now()}`;

      const optimisticMessage = {
        _id: tempId,
        roomId,
        sender: { _id: senderId, name: sender.name },
        text: message,
        timestamp: new Date().toISOString(),
        optimistic: true,
        tempId,
        status: "sending",
      };

      dispatch(addOptimisticRoomMessage(optimisticMessage));

      emitChatEvent("sendRoomMessage", { roomId, message, tempId }, (response) => {
        if (response?.success && response.message) {
          dispatch(newRoomMessageReceived(response.message));
        } else {
          console.error("Socket ack failed", response);
        }
      });

    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchUserRooms = createAsyncThunk(
  "roomChat/fetchUserRooms",
  async (_, { rejectWithValue }) => {
    try {
      const rooms = await getUserRooms();
      return Array.isArray(rooms) ? rooms : [];
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteRoomMessage = createAsyncThunk(
  "roomChat/deleteRoomMessage",
  async ({ roomId, messageId }, { rejectWithValue }) => {
    try {
      await deleteSingleRoomMessage({ roomId, messageId });
      return { messageId };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ✅ New: Edit Room Message
export const editRoomChatMessage = createAsyncThunk(
  "roomChat/editRoomMessage",
  async ({ roomId, messageId, newText }, { rejectWithValue }) => {
    try {
      const updated = await editRoomMessage({ roomId, messageId, newText });
      return { roomId, message: updated };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ───── Slice ─────

const roomChatSlice = createSlice({
  name: "roomChat",
  initialState: {
    roomId: null,
    messages: [],
    rooms: [],
    status: "idle",
    error: null,
    roomsStatus: "idle",
    roomsError: null,
  },
  reducers: {
    newRoomMessageReceived(state, action) {
      const msg = action.payload;
      if (!msg || !msg.roomId || msg.roomId !== state.roomId) return;

      const tempMatchIndex = state.messages.findIndex((m) => m.tempId === msg.tempId);

      if (tempMatchIndex !== -1) {
        state.messages[tempMatchIndex] = {
          ...msg,
          optimistic: false,
          status: msg.status || "sent",
        };
      } else {
        const exists = state.messages.some((m) => normalizeId(m._id) === normalizeId(msg._id));
        if (!exists) {
          state.messages.push({
            ...msg,
            optimistic: false,
            status: msg.status || "sent",
          });
        }
      }

      state.messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },

    addOptimisticRoomMessage(state, action) {
      const msg = action.payload;
      if (!msg || msg.roomId !== state.roomId) return;

      const exists = state.messages.some((m) => m._id === msg._id || m.tempId === msg.tempId);
      if (!exists) {
        state.messages.push(msg);
        state.messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      }
    },

    roomMessageDelivered(state, action) {
      const { messageId } = action.payload;
      const msg = state.messages.find((m) => normalizeId(m._id) === normalizeId(messageId));
      if (msg && msg.status !== "read") msg.status = "delivered";
    },

    roomMessageRead(state, action) {
      const { messageId } = action.payload;
      const msg = state.messages.find((m) => normalizeId(m._id) === normalizeId(messageId));
      if (msg) msg.status = "read";
    },

    clearRoomChat(state) {
      state.roomId = null;
      state.messages = [];
      state.status = "idle";
      state.error = null;
    },

    setActiveRoom(state, action) {
      state.roomId = action.payload;
    },

    removeRoom(state, action) {
      const roomId = normalizeId(action.payload);
      state.rooms = state.rooms.filter((room) => normalizeId(room._id) !== roomId);
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchRoomChatHistory.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchRoomChatHistory.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.roomId = action.payload.roomId;
        state.messages = (action.payload.messages || [])
          .map((m) => ({
            ...m,
            optimistic: false,
            status: m.status || "sent",
          }))
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      })
      .addCase(fetchRoomChatHistory.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(sendRoomMessage.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(joinRoomChat.fulfilled, (state, action) => {
        state.roomId = action.payload;
      })
      .addCase(joinRoomChat.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(leaveRoomChat.fulfilled, (state) => {
        state.roomId = null;
        state.messages = [];
      })
      .addCase(leaveRoomChat.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(fetchUserRooms.pending, (state) => {
        state.roomsStatus = "loading";
      })
      .addCase(fetchUserRooms.fulfilled, (state, action) => {
        state.roomsStatus = "succeeded";
        state.rooms = action.payload;
      })
      .addCase(fetchUserRooms.rejected, (state, action) => {
        state.roomsStatus = "failed";
        state.roomsError = action.payload;
      })
      .addCase(deleteRoomMessage.fulfilled, (state, action) => {
        const deletedId = normalizeId(action.payload.messageId);
        state.messages = state.messages.filter((m) => normalizeId(m._id) !== deletedId);
      })
      // ✅ New: Handle edited room message update
      .addCase(editRoomChatMessage.fulfilled, (state, action) => {
        const { message } = action.payload;
        const idx = state.messages.findIndex((m) => normalizeId(m._id) === normalizeId(message._id));
        if (idx !== -1) {
          state.messages[idx] = {
            ...state.messages[idx],
            text: message.text,
            edited: true,
          };
        }
      });
  },
});

export const {
  newRoomMessageReceived,
  addOptimisticRoomMessage,
  roomMessageDelivered,
  roomMessageRead,
  clearRoomChat,
  setActiveRoom,
  removeRoom,
} = roomChatSlice.actions;

export default roomChatSlice.reducer;
