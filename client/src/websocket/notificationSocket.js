import { getSocket } from "./chatSocket"; // or your global socket setup
import { addNotification } from "../redux/slices/notificationSlice"; // adjust path if needed

let initialized = false;

export const initializeNotificationSocket = (store) => {
  if (initialized) return;
  initialized = true;

  const socket = getSocket(); // should already be connected and authenticated

  if (!socket) {
    console.warn("[NotificationSocket] Socket not initialized yet.");
    return;
  }

  // ✅ Listen for incoming notifications
  socket.on("notification:new", (notification) => {
    console.log("🔔 New Notification Received:", notification);
    store.dispatch(addNotification(notification));
  });

  // Optional: connection feedback
  socket.on("connect", () => {
    console.log("🟢 Notification Socket Connected");
  });

  socket.on("disconnect", () => {
    console.warn("🔴 Notification Socket Disconnected");
  });
};
