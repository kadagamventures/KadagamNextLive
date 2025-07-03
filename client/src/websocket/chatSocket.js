import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000/";

let socket = null;
let socketInitialized = false;
let pendingHandlers = {};
let reconnectionAttempts = 0;
const MAX_RECONNECTION_ATTEMPTS = 10;

// 🔌 Initialize Chat Socket
export const initializeChatSocket = async (handlers = {}) => {
  if (socket && socket.connected) {
    registerHandlers(socket, handlers);
    return () => cleanupSocket(socket, handlers);
  }

  pendingHandlers = { ...pendingHandlers, ...handlers };

  if (socketInitialized) {
    return () => {};
  }

  socketInitialized = true;

  try {
    // Always use "accessToken" for consistency with your app
    const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
    if (!token) throw new Error("No authentication token found.");

    socket = io(SOCKET_URL, { auth: { token } });

    socket.on("connect", () => {
      reconnectionAttempts = 0;
      handlers.onSocketConnected?.();
      registerHandlers(socket, pendingHandlers);
      pendingHandlers = {};
    });

    socket.on("disconnect", () => {
      handlers.onSocketDisconnected?.();
    });

    socket.on("connect_error", (err) => {
      reconnectionAttempts++;
      if (err?.message?.toLowerCase().includes("jwt expired")) {
        handlers.onJwtExpired?.();
      }
      if (reconnectionAttempts >= MAX_RECONNECTION_ATTEMPTS) {
        socket.disconnect();
        socketInitialized = false;
        socket = null;
      }
    });

    registerHandlers(socket, handlers);
    return () => cleanupSocket(socket, handlers);
  } catch {
    socketInitialized = false;
    socket = null;
    return () => {};
  }
};

// 🔁 Register Event Handlers
const registerHandlers = (socket, handlers) => {
  if (!socket) return;
  cleanupSocket(socket, handlers);

  Object.entries(handlers).forEach(([event, handler]) => {
    if (["onSocketConnected", "onSocketDisconnected", "onJwtExpired"].includes(event)) return;
    socket.on(event, handler);
  });

  socket.on("messageReceived", (msg) => {
    notifyIfTabHidden(msg);
    handlers.onTaskMessage?.(msg);
  });

  socket.on("roomMessageReceived", (msg) => {
    notifyIfTabHidden(msg);
    handlers.onRoomMessageReceived?.(msg);
  });

  socket.on("messageDelivered", (data) => {
    handlers.onMessageDelivered?.(data);
  });

  socket.on("messageSeen", (data) => {
    handlers.onMessageSeen?.(data);
  });

  socket.on("userOnline", ({ userId }) => {
    handlers.onUserOnline?.(userId);
  });

  socket.on("userOffline", ({ userId }) => {
    handlers.onUserOffline?.(userId);
  });

  socket.on("typing", (data) => {
    handlers.onTyping?.(data);
  });

  socket.on("roomTyping", (data) => {
    handlers.onRoomTyping?.(data);
  });

  socket.on("roomDeleted", ({ roomId }) => {
    handlers.onRoomDeleted?.({ roomId });
  });

  socket.on("messageEdited", (msg) => {
    handlers.onMessageEdited?.(msg);
  });

  socket.on("roomMessageEdited", (msg) => {
    handlers.onRoomMessageEdited?.(msg);
  });
};

// 🧼 Cleanup Handlers
const cleanupSocket = (socket, handlers) => {
  if (!socket) return;

  Object.keys(handlers).forEach((event) => {
    if (["onSocketConnected", "onSocketDisconnected", "onJwtExpired"].includes(event)) return;
    socket.off(event);
  });

  socket.off("messageReceived");
  socket.off("roomMessageReceived");
  socket.off("messageDelivered");
  socket.off("messageSeen");
  socket.off("userOnline");
  socket.off("userOffline");
  socket.off("typing");
  socket.off("roomTyping");
  socket.off("roomDeleted");
  socket.off("messageEdited");
  socket.off("roomMessageEdited");
};

// 📤 Emit Chat Event
export const emitChatEvent = (event, payload, callback) => {
  if (!socket || !socket.connected) {
    return false;
  }
  try {
    if (typeof callback === "function") {
      socket.emit(event, payload, callback);
    } else {
      socket.emit(event, payload);
    }
    return true;
  } catch {
    return false;
  }
};

// ⚡ Get Current Socket
export const getSocket = () => {
  if (!socket) {
    return null;
  }
  return socket;
};

// 🛑 Disconnect Socket
export const disconnectChatSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    socketInitialized = false;
    pendingHandlers = {};
  }
};

// 📥 Room Join
export const joinRoom = (roomType, id) => {
  if (!socket || !id) return;
  const event = roomType === "task" ? "joinTaskRoom" : "joinRoomChat";
  socket.emit(event, id);
};

// 📤 Room Leave
export const leaveRoom = (roomType, id) => {
  if (!socket || !id) return;
  const event = roomType === "task" ? "leaveTaskRoom" : "leaveRoomChat";
  socket.emit(event, id);
};

// 🔔 Show Notification
const notifyIfTabHidden = (msg) => {
  if (
    typeof document !== "undefined" &&
    document.hidden &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    new Notification(`New message from ${msg?.senderName || "Someone"}`, {
      body: msg?.text || msg?.message || "New message received",
      icon: "/chat-icon.png",
    });
  }
};

// 🔓 Request Notification Permission
if (
  typeof window !== "undefined" &&
  "Notification" in window &&
  Notification.permission !== "granted"
) {
  Notification.requestPermission();
}
