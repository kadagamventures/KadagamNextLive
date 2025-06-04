// 📂 redux/slices/notificationSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  notifications: [],
};

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    // Add new notification to top (skip if duplicate _id exists)
    addNotification: (state, action) => {
      const exists = state.notifications.find(n => n._id === action.payload._id);
      if (!exists) {
        state.notifications.unshift(action.payload);
      }
    },

    // Replace full list
    setNotifications: (state, action) => {
      state.notifications = action.payload;
    },

    // Mark one notification as read
    markAsRead: (state, action) => {
      const target = state.notifications.find(n => n._id === action.payload);
      if (target) target.isRead = true;
    },

    // Mark all as read
    markAllAsRead: (state) => {
      state.notifications.forEach(n => (n.isRead = true));
    },

    // Reset all (e.g. on logout)
    clearNotifications: (state) => {
      state.notifications = [];
    }
  },
});

export const {
  addNotification,
  setNotifications,
  markAsRead,
  markAllAsRead,
  clearNotifications,
} = notificationSlice.actions;

export default notificationSlice.reducer;
