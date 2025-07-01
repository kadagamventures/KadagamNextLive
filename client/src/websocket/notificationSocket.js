import { getSocket } from "./chatSocket"; // Make sure this returns the connected socket instance
import { addNotification } from "../redux/slices/notificationSlice";

let initialized = false;

/**
 * Initialize notification socket listeners.
 * 
 * @param {object} store - Redux store to dispatch actions.
 */
export const initializeNotificationSocket = (store) => {
  if (initialized) return;
  initialized = true;

  const socket = getSocket();

  if (!socket) {
    console.warn("[NotificationSocket] Socket not initialized yet.");
    return;
  }

  // Listen for new notifications and dispatch to Redux store
  socket.on("notification:new", (notification) => {
    console.log("🔔 New Notification Received:", notification);
    store.dispatch(addNotification(notification));
  });

  // Log connection state
  socket.on("connect", () => {
    console.log("🟢 Notification Socket Connected");
  });

  socket.on("disconnect", () => {
    console.warn("🔴 Notification Socket Disconnected");
  });
};
