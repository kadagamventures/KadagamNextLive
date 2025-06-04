let dashboardUpdateCooldown = false;

/**
 * ✅ WebSocket Events for Real-Time Leave Management (Multi-Tenant Scoped)
 */
const leaveWebSocket = (io) => {
  const leaveNamespace = io.of("/leaves");

  leaveNamespace.on("connection", (socket) => {
    const { companyId, id: userId, name: staffName } = socket.handshake.auth || {};

    if (!companyId || !userId || !staffName) {
      console.warn("❌ Rejected Leave WS connection: Missing companyId, userId, or staffName");
      return socket.disconnect();
    }

    const room = `leave_${companyId}`;
    socket.join(room);
    console.log(`✅ Leave WebSocket Connected: ${userId} (Company: ${companyId})`);

    // 📅 Leave Requested
    socket.on("leaveRequested", ({ leaveRequest }) => {
      if (!isValidLeavePayload(userId, staffName, leaveRequest)) {
        return emitError(socket, "Invalid leaveRequested payload");
      }

      console.log(`📅 Leave Requested | ${staffName} (${userId}) | Request:`, leaveRequest);
      emitLeaveEvent("leaveRequested", room, { userId, staffName, leaveRequest });
    });

    // ✅ Leave Approved
    socket.on("leaveApproved", ({ leaveDetails }) => {
      if (!isValidLeavePayload(userId, staffName, leaveDetails)) {
        return emitError(socket, "Invalid leaveApproved payload");
      }

      console.log(`✅ Leave Approved | ${staffName} (${userId})`);
      emitLeaveEvent("leaveApproved", room, { userId, staffName, leaveDetails });
    });

    // ❌ Leave Rejected
    socket.on("leaveRejected", ({ reason }) => {
      if (!userId || !staffName || !reason) {
        return emitError(socket, "Invalid leaveRejected payload");
      }

      console.log(`❌ Leave Rejected | ${staffName} (${userId}) | Reason: ${reason}`);
      emitLeaveEvent("leaveRejected", room, { userId, staffName, reason });
    });

    // 🔄 Leave Updated
    socket.on("leaveUpdated", ({ leaveDetails }) => {
      if (!isValidLeavePayload(userId, staffName, leaveDetails)) {
        return emitError(socket, "Invalid leaveUpdated payload");
      }

      console.log(`🔄 Leave Updated | ${staffName} (${userId})`);
      emitLeaveEvent("leaveUpdated", room, { userId, staffName, leaveDetails });
    });

    // 🚫 Leave Canceled
    socket.on("leaveCanceled", ({ leaveId }) => {
      if (!userId || !staffName || !leaveId) {
        return emitError(socket, "Invalid leaveCanceled payload");
      }

      console.log(`🚫 Leave Canceled | ${staffName} (${userId}) | Leave ID: ${leaveId}`);
      emitLeaveEvent("leaveCanceled", room, { userId, staffName, leaveId });
    });

    socket.on("disconnect", () => {
      console.log(`❌ Leave WebSocket Disconnected: ${userId}`);
    });

    socket.on("error", (err) => {
      console.error(`❌ Leave WebSocket Error: ${err.stack || err.message}`);
    });
  });
};

/**
 * 🔄 Emit Event to Company Room and Trigger Dashboard Update
 */
const emitLeaveEvent = (eventName, room, payload) => {
  const io = require("../config/websocketConfig").getIO();
  io.of("/leaves").to(room).emit(eventName, payload);
  updateDashboard(payload.companyId);
};

/**
 * 🛑 Prevent Excessive Dashboard Updates per Tenant
 */
const updateDashboard = (companyId) => {
  if (dashboardUpdateCooldown) return;

  try {
    const { emitDashboardMetricsUpdate } = require("../services/websocketService");
    emitDashboardMetricsUpdate(companyId);
  } catch (err) {
    console.error("❌ Dashboard update error:", err.message);
  }

  dashboardUpdateCooldown = true;
  setTimeout(() => (dashboardUpdateCooldown = false), 5000);
};

/**
 * 🧪 Payload Validation
 */
const isValidLeavePayload = (userId, staffName, details) => {
  return userId && typeof userId === "string" && staffName && details;
};

/**
 * ❌ Emit Standardized Error
 */
const emitError = (socket, message) => {
  console.warn(`⚠️ ${message}`);
  socket.emit("error", { message });
};

module.exports = leaveWebSocket;
