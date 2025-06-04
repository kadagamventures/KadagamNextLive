import { createSlice } from "@reduxjs/toolkit";

const presenceSlice = createSlice({
  name: "presence",
  initialState: {
    onlineUsers: [], // List of userIds who are online
  },
  reducers: {
    setUserOnline: (state, action) => {
      const userId = typeof action.payload === "object" ? action.payload.id : action.payload;
      if (userId && !state.onlineUsers.includes(userId)) {
        state.onlineUsers.push(userId);
      }
    },
    setUserOffline: (state, action) => {
      const userId = typeof action.payload === "object" ? action.payload.id : action.payload;
      state.onlineUsers = state.onlineUsers.filter(id => id !== userId);
    },
    setOnlineUsersList: (state, action) => {
      const userIds = Array.isArray(action.payload) ? action.payload : [];
      state.onlineUsers = [...new Set(userIds)]; // Unique users only
    },
    clearPresence: (state) => {
      state.onlineUsers = [];
    }
  }
});

export const { setUserOnline, setUserOffline, clearPresence, setOnlineUsersList } = presenceSlice.actions;
export default presenceSlice.reducer;
