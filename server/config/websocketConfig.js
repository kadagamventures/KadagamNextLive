// 📂 config/websocketConfig.js
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const chatHandlers = require("../websockets/chatHandlers");
const notificationHandlers = require("../websockets/notificationHandlers"); // ✅ NEW

// 🔐 Ensure JWT_SECRET exists
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) throw new Error("Missing JWT_SECRET in environment variables");

const CLIENT_URLS = [
  "https://kadagamnextglobal.vercel.app",
  "http://localhost:5173",
];

let io;

/**
 * 🔌 Initialize WebSocket server with JWT authentication
 */
const initializeWebSocket = (server) => {
  if (io) {
    console.warn("[WebSocket] Already initialized. Restarting...");
    io.close();
    io = null;
  }

  try {
    io = new Server(server, {
      cors: {
        origin: (origin, callback) => {
          if (!origin || CLIENT_URLS.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error("❌ WebSocket CORS: Not allowed origin"));
          }
        },
        credentials: true,
        methods: ["GET", "POST"],
      },
      transports: ["websocket", "polling"],
      pingInterval: 25000,
      pingTimeout: 10000,
    });

    /**
     * 🔐 WebSocket JWT Auth Middleware
     * Accepts plain tokens or "Bearer <token>" style
     */
    io.use((socket, next) => {
      let token = socket.handshake.auth?.token;

      if (!token) return next(new Error("Missing auth token"));

      // Handle Bearer tokens
      if (token.startsWith("Bearer ")) {
        token = token.split(" ")[1];
      }

      try {
        const decoded = jwt.verify(token, jwtSecret);
        socket.user = decoded;
        return next();
      } catch (err) {
        console.error("[WebSocket Auth Error]:", err.message);
        return next(new Error("Invalid or expired token"));
      }
    });

    /**
     * 📡 On successful WebSocket connection
     */
    io.on("connection", (socket) => {
      const { id: userId, role } = socket.user || {};
      console.log(`[🟢 Connected] ${userId} (${role})`);

      // Heartbeat
      socket.on("ping", () => {
        socket.emit("pong", "heartbeat-ack");
      });

      // Dynamic room support
      socket.on("join", (roomId) => {
        socket.join(roomId);
        console.log(`[📦 Room Join] ${userId} joined ${roomId}`);
      });

      socket.on("leave", (roomId) => {
        socket.leave(roomId);
        console.log(`[📤 Room Leave] ${userId} left ${roomId}`);
      });

      // ✅ Task & room chat handlers
      chatHandlers(io, socket);

      // ✅ Notification handlers (NEW)
      notificationHandlers(io, socket);

      // Notify deletion
      socket.on("deleteChat", ({ roomId, taskId }) => {
        io.to(roomId).emit("chatDeleted", { roomId, taskId });
        console.log(`[🧹 Chat Deleted] Room: ${roomId}, Task: ${taskId}`);
      });

      // Disconnection & Errors
      socket.on("disconnect", (reason) => {
        console.warn(`[🔌 Disconnected] ${userId} (${reason})`);
      });

      socket.on("error", (err) => {
        console.error(`[❌ Socket Error]: ${err.message}`);
      });
    });

    console.log("[✅ WebSocket] Server Initialized");
    return io;

  } catch (err) {
    console.error("[❌ WebSocket Init Error]:", err.message);
    io = null;
  }
};

/**
 * 📦 Export active socket.io instance
 */
const getIO = () => {
  if (!io) throw new Error("[WebSocket] Not initialized! Call initializeWebSocket(server) first.");
  return io;
};

module.exports = { initializeWebSocket, getIO };
