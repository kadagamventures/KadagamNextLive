const { getIO } = require("../config/websocketConfig");
const taskReportService = require("../services/reportServices/taskReportService");
const { redisClient } = require("../config/redisConfig");
const { sendTaskNotification, emitDailyTaskUpdateToAdmin } = require("../notifications/websocketNotifications");

const activeUsers = new Map(); // userId -> socketId
let dashboardUpdateCooldown = false;
const callCounts = new Map(); // Rate-limit tracking

const taskWebSocket = (io) => {
  const taskNamespace = io.of("/tasks");

  taskNamespace.on("connection", (socket) => {
    console.log(`✅ Task WS Connected: ${socket.id}`);

    socket.on("registerUser", (userId, role, companyId) => {
      if (!userId || !companyId) return;

      const companyKey = companyId.toString();

      activeUsers.set(userId, socket.id);
      socket.join(`${companyKey}:${userId}`);
      socket.join(`company:${companyKey}`);
      if (role === "admin") socket.join(`company:${companyKey}:admin`);

      console.log(`👤 Registered: ${userId} under company ${companyKey}`);

      if (redisClient.isOpen) {
        const key = `offlineNotifications:${companyKey}:${userId}`;
        redisClient.lrange(key, 0, -1)
          .then(messages => {
            messages.forEach(msg => socket.emit("notification", JSON.parse(msg)));
            return redisClient.del(key);
          })
          .catch(err => console.error("❌ Offline notif error:", err.message));
      }
    });

    socket.on("sendMessage", rateLimit(10, 5, ({ roomId, message, senderId }) => {
      if (!roomId || !message) return;
      taskNamespace.to(roomId).emit("receiveMessage", { roomId, message, senderId });
    }));

    socket.on("taskCreated", async ({ task, companyId }) => {
      try {
        if (!task || !Array.isArray(task.assignedTo) || !companyId) {
          console.warn("⚠️ Invalid taskCreated payload");
          return;
        }

        const companyKey = companyId.toString();

        task.assignedTo.forEach(uid => {
          const room = `${companyKey}:${uid}`;
          sendTaskNotification(uid, `New Task Assigned: ${task.title}`);
          taskNamespace.to(room).emit("taskCreated", task);
        });

        taskNamespace.to(`company:${companyKey}`).emit("taskCreated", task);
        triggerDashboardUpdate(companyKey, taskNamespace);
      } catch (err) {
        console.error("❌ taskCreated error:", err.message);
        socket.emit("taskError", { message: "Failed to create task." });
      }
    });

    socket.on("taskStatusUpdate", async ({ staffId, staffName, taskId, comment, companyId }) => {
      try {
        if (!staffId || !taskId || !comment || !companyId) {
          console.warn("⚠️ Invalid taskStatusUpdate payload");
          return;
        }

        const companyKey = companyId.toString();

        emitDailyTaskUpdateToAdmin(`Task Update: ${staffName} updated ${taskId}`);
        taskNamespace.to(`${companyKey}:${staffId}`).emit("taskUpdateList", {
          staffId, staffName, taskId, comment, date: new Date()
        });

        triggerDashboardUpdate(companyKey, taskNamespace);
      } catch (err) {
        console.error("❌ taskStatusUpdate error:", err.message);
        socket.emit("taskError", { message: "Failed to update task status." });
      }
    });

    socket.on("taskCompleted", ({ taskId, assignedTo = [], createdBy, companyId }) => {
      try {
        if (!taskId || !companyId) return;

        const companyKey = companyId.toString();
        const participants = [...assignedTo, createdBy].filter(Boolean);
        participants.forEach(uid => {
          taskNamespace.to(`${companyKey}:${uid}`).emit("task_completed", { taskId });
        });

        const ioAll = getIO();
        ioAll.emit("deleteChat", { roomId: `task_${taskId}`, taskId });

        console.log(`✅ taskCompleted + deleteChat emitted for ${taskId}`);
      } catch (err) {
        console.error("❌ taskCompleted error:", err.message);
      }
    });

    socket.on("requestDashboardUpdate", ({ companyId }) => {
      if (companyId) triggerDashboardUpdate(companyId.toString(), taskNamespace);
    });

    socket.on("staffCreated", (staff) => handleStaffEvent("staffCreated", staff));
    socket.on("staffUpdated", (staff) => handleStaffEvent("staffUpdated", staff));
    socket.on("staffDeleted", ({ staffId }) => handleStaffEvent("staffDeleted", { staffId }));

    socket.on("ping", () => {
      socket.emit("pong", "heartbeat-ack");
    });

    socket.on("disconnect", (reason) => {
      for (const [uid, sid] of activeUsers.entries()) {
        if (sid === socket.id) {
          activeUsers.delete(uid);
          console.log(`❌ Disconnected: ${uid} (${reason})`);
          break;
        }
      }
    });

    socket.on("error", (err) => {
      console.error(`❌ Task WS Error: ${err.message}`);
      socket.emit("taskError", { message: "WebSocket error occurred." });
    });
  });
};

/**
 * 🔁 Debounced Dashboard Update (Per Company)
 */
const triggerDashboardUpdate = async (companyId, ioNamespace) => {
  if (dashboardUpdateCooldown) return;

  const companyKey = companyId.toString();

  try {
    const stats = await taskReportService.getLiveTaskStats(companyKey);
    ioNamespace.to(companyKey).emit("taskReportUpdate", stats);

    const ioAll = getIO();
    ioAll.to(companyKey).emit("dashboardMetricsUpdate", stats);
  } catch (err) {
    console.error("❌ Dashboard update failed:", err.message);
  }

  dashboardUpdateCooldown = true;
  setTimeout(() => {
    dashboardUpdateCooldown = false;
  }, 5000);
};

/**
 * 📢 Staff Event + Admin Notify
 */
const handleStaffEvent = (eventType, data) => {
  const io = getIO();
  if (!io) return;

  const companyRoom = data.companyId ? data.companyId.toString() : null;
  if (!companyRoom) return;

  io.to(companyRoom).emit(eventType, data);
  io.to(`${companyRoom}:admin`).emit("notification", {
    type: "staff",
    message: `Staff event: ${eventType} - ${data.name || data.staffId}`,
    timestamp: Date.now(),
  });

  triggerDashboardUpdate(companyRoom, io.of("/tasks"));
};

/**
 * ⏳ Basic Rate Limiter
 */
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

// ✅ Export main handler + standalone emit
module.exports = taskWebSocket;

module.exports.emitTaskCompletedSocket = (taskId, userIds = [], companyId) => {
  try {
    if (!taskId || !companyId) {
      console.warn("⚠️ emitTaskCompletedSocket called without taskId or companyId");
      return;
    }

    const io = getIO();
    if (!io) {
      console.error("❌ Socket IO not initialized");
      return;
    }

    const ns = io.of("/tasks");
    const companyKey = companyId.toString();

    if (!Array.isArray(userIds)) {
      console.warn("⚠️ userIds must be an array");
      userIds = [];
    }

    userIds.forEach(uid => {
      if (uid) ns.to(`${companyKey}:${uid}`).emit("task_completed", { taskId });
    });

    io.to(companyKey).emit("deleteChat", { roomId: `task_${taskId}`, taskId });

    console.log(`📣 Emitted taskCompleted + deleteChat for ${taskId} to ${companyKey}`);
  } catch (err) {
    console.error("❌ emitTaskCompletedSocket failed:", err.message);
  }
};
