// 📂 config/websocketConfig.js
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const chatHandlers = require("../websockets/chatHandlers");
const notificationHandlers = require("../websockets/notificationHandlers"); // ✅ NEW

// 🔐 Ensure JWT_SECRET exists
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) throw new Error("Missing JWT_SECRET in environment variables");

// ✅ Allowed Origins
const CLIENT_URLS = [
  "https://www.kadagamnext.com",
  "http://localhost:5173",
  "https://main.d37un8iffky11m.amplifyapp.com",
  "https://kadagamnext.com",
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
          console.log("🌐 WebSocket Origin Attempt:", origin);
          if (!origin || CLIENT_URLS.includes(origin)) {
            return callback(null, true);
          } else {
            console.warn("❌ WebSocket CORS blocked:", origin);
            return callback(new Error("WebSocket CORS: Not allowed origin"));
          }
        },
        credentials: true,
        methods: ["GET", "POST"],
      },
      transports: ["websocket", "polling"],
      pingInterval: 25000,
      pingTimeout: 10000,
    });

    // 🛡 JWT Token Middleware
    io.use((socket, next) => {
      let token = socket.handshake.auth?.token;

      if (!token) {
        console.warn("🔒 WebSocket connection rejected: Missing auth token");
        return next(new Error("Missing auth token"));
      }

      if (token.startsWith("Bearer ")) {
        token = token.split(" ")[1];
      }

      try {
        const decoded = jwt.verify(token, jwtSecret);
        socket.user = decoded;
        console.log(`✅ Authenticated WebSocket user: ${decoded.id || "Unknown ID"}`);
        return next();
      } catch (err) {
        console.error("❌ WebSocket JWT error:", err.message);
        return next(new Error("Invalid or expired token"));
      }
    });

    // 📡 WebSocket Events
    io.on("connection", (socket) => {
      const { id: userId, role } = socket.user || {};
      console.log(`[🟢 WebSocket Connected] ${userId} (${role})`);

      // Heartbeat ping
      socket.on("ping", () => {
        socket.emit("pong", "heartbeat-ack");
      });

      // Room management
      socket.on("join", (roomId) => {
        socket.join(roomId);
        console.log(`[📦 Room Join] ${userId} joined ${roomId}`);
      });

      socket.on("leave", (roomId) => {
        socket.leave(roomId);
        console.log(`[📤 Room Leave] ${userId} left ${roomId}`);
      });

      // Chat & Notification Events
      chatHandlers(io, socket);
      notificationHandlers(io, socket);

      // Chat deletion
      socket.on("deleteChat", ({ roomId, taskId }) => {
        io.to(roomId).emit("chatDeleted", { roomId, taskId });
        console.log(`[🧹 Chat Deleted] Room: ${roomId}, Task: ${taskId}`);
      });

      // Disconnect/Error events
      socket.on("disconnect", (reason) => {
        console.warn(`[🔌 WebSocket Disconnected] ${userId} (${reason})`);
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
