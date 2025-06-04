const { redisClient } = require("../config/redisConfig");
const { getIO } = require("../config/websocketConfig");

const taskWebSocket = require("../websockets/taskWebSocket");
const projectWebSocket = require("../websockets/projectWebSocket");
const attendanceWebSocket = require("../websockets/attendanceWebSocket");
const leaveWebSocket = require("../websockets/leaveWebSocket");
const chatHandlers = require("../websockets/chatHandlers");

const taskReportService = require("../services/reportServices/taskReportService");

const userSockets = new Map();    // userId -> socketId
const callCounts = new Map();     // userId -> [timestamps]

/**
 * Initialize all socket event handling on `io`.
 */
const initializeSocketServer = (io) => {
  console.log("🚀 WebSocket Server Running...");

  io.on("connection", (socket) => {
    console.log(`✅ Connected: ${socket.id}`);

    // ─── AUTHENTICATED USER REGISTRATION ─────────────────────────────────────
    socket.on("registerUser", async ({ userId, role, companyId }) => {
      if (!userId || !companyId) return;

      userSockets.set(userId, socket.id);
      socket.join(userId);
      socket.join(`company_${companyId}`);
      if (role === "admin") socket.join(`admin_${companyId}`);

      // Deliver offline notifications
      if (redisClient.isOpen) {
        const key = `offlineNotifications:${companyId}:${userId}`;
        const messages = await redisClient.lrange(key, 0, -1);
        messages.forEach(msg => io.to(userId).emit("notification", JSON.parse(msg)));
        await redisClient.del(key);
      }
    });

    // ─── CHAT HANDLERS (1-on-1 & Group Rooms) ─────────────────────────────────
    chatHandlers(io, socket);

    // ─── GENERIC SEND MESSAGE (fallback) ──────────────────────────────────────
    socket.on("sendMessage", rateLimit(10, 5, ({ roomId, message, senderId }) => {
      if (roomId && message) {
        io.to(roomId).emit("receiveMessage", { roomId, message, senderId });
      }
    }));

    // ─── AUTO-CLEANUP ON CHAT DELETION ────────────────────────────────────────
    socket.on("deleteChat", ({ roomId, taskId }) => {
      if (roomId && taskId) {
        io.to(roomId).emit("chatDeleted", { roomId, taskId });
        console.log(`[🧹 Chat Deleted] Room: ${roomId}, Task: ${taskId}`);
      }
    });

    // ─── LIVE REPORT & DASHBOARD EVENTS ─────────────────────────────────────
    socket.on("taskUpdated", ({ companyId }) => emitTaskReportUpdate(companyId));
    socket.on("requestDashboardUpdate", ({ companyId }) => emitDashboardMetricsUpdate(companyId));

    // ─── STAFF CRUD BROADCASTS ───────────────────────────────────────────────
    socket.on("staffCreated", (data) => handleStaffEvent("staffCreated", data));
    socket.on("staffUpdated", (data) => handleStaffEvent("staffUpdated", data));
    socket.on("staffDeleted", ({ staffId, companyId }) => handleStaffEvent("staffDeleted", { staffId, companyId }));

    // ─── TASK COMPLETED BROADCAST ───────────────────────────────────────────
    socket.on("taskCompleted", ({ taskId, userIds }) => emitTaskCompleted(taskId, userIds));

    // ─── HEARTBEAT ───────────────────────────────────────────────────────────
    socket.on("ping", () => socket.emit("pong", "heartbeat-ack"));

    // ─── DISCONNECT CLEANUP ─────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      for (const [uid, sid] of userSockets.entries()) {
        if (sid === socket.id) {
          userSockets.delete(uid);
          console.log(`❌ Disconnected: ${uid} (${reason})`);
          break;
        }
      }
    });

    socket.on("error", (err) => {
      console.error(`❌ Socket Error: ${err.message}`);
    });
  });

  attachModule(taskWebSocket, io);
  attachModule(projectWebSocket, io);
  attachModule(attendanceWebSocket, io);
  attachModule(leaveWebSocket, io);
};

/** Rate-limit wrapper */
const rateLimit = (maxCalls, perSeconds, fn) => {
  return (args) => {
    const userId = args.senderId || args.userId;
    if (!userId) return;
    const now = Date.now();
    const windowStart = now - perSeconds * 1000;
    const times = (callCounts.get(userId) || []).filter(t => t > windowStart);
    times.push(now);
    if (times.length > maxCalls) return;
    callCounts.set(userId, times);
    fn(args);
  };
};

setInterval(() => {
  const cutoff = Date.now() - 60000;
  for (const [uid, times] of callCounts.entries()) {
    callCounts.set(uid, times.filter(t => t > cutoff));
  }
}, 60000);

/** Emit to specific user or queue in Redis */
const emitNotification = async (companyId, userId, payload) => {
  const io = getIO();
  if (!io) return;

  if (userSockets.has(userId)) {
    io.to(userId).emit("notification", payload);
  } else if (redisClient.isOpen) {
    await redisClient.rpush(`offlineNotifications:${companyId}:${userId}`, JSON.stringify(payload));
  }
};

/** Emit to all admins in the company */
const emitToAdmins = (companyId, payload) => {
  const io = getIO();
  if (io) io.to(`admin_${companyId}`).emit("notification", payload);
};

/** Emit dashboard update to company room */
const emitDashboardMetricsUpdate = async (companyId) => {
  try {
    const io = getIO();
    const stats = await taskReportService.getLiveTaskStats(companyId);
    io.to(`company_${companyId}`).emit("dashboardMetricsUpdate", stats);
  } catch (err) {
    console.error("❌ Dashboard update error:", err.message);
  }
};

/** Emit task update to company */
const emitTaskReportUpdate = async (companyId) => {
  try {
    const io = getIO();
    const stats = await taskReportService.getLiveTaskStats(companyId);
    io.to(`company_${companyId}`).emit("taskReportUpdate", stats);
  } catch (err) {
    console.error("❌ Task report update error:", err.message);
  }
};

/** Handle staff event across company */
const handleStaffEvent = (eventType, data) => {
  const io = getIO();
  const { companyId } = data;
  if (!io || !companyId) return;

  io.to(`company_${companyId}`).emit(eventType, data);
  emitToAdmins(companyId, {
    type: "staff",
    message: `Staff ${eventType}: ${data.name || data.staffId}`,
    timestamp: Date.now(),
  });

  emitDashboardMetricsUpdate(companyId);
};

/** Notify target users */
const emitTaskCompleted = (taskId, userIds = []) => {
  const io = getIO();
  if (!io) return;

  userIds.forEach(uid => io.to(uid).emit("taskCompleted", { taskId }));
};

const attachModule = (moduleFn, io) => {
  if (typeof moduleFn === "function") {
    moduleFn(io);
  } else {
    console.error("❌ Invalid WebSocket module:", moduleFn);
  }
};

module.exports = {
  initializeSocketServer,
  emitNotification,
  emitDashboardMetricsUpdate,
  emitTaskReportUpdate,
  emitTaskCompleted,
};
