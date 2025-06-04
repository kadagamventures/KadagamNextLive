/**
 * ✅ WebSocket Events for Real-Time Attendance Management (Multi-Tenant).
 * Handles staff check-in, check-out, and leave status changes.
 */

const activeUsers = new Map(); // socket.id -> { userId, companyId }
let dashboardUpdateCooldown = false;

const attendanceWebSocket = (io, emitDashboardMetricsUpdate) => {
    const attendanceNamespace = io.of("/attendance");

    attendanceNamespace.on("connection", (socket) => {
        console.log(`✅ Attendance WebSocket Connected: ${socket.id}`);

        /**
         * 🔐 Register User with companyId context (initial handshake)
         * Expects { userId, companyId }
         */
        socket.on("registerAttendanceUser", ({ userId, companyId }) => {
            if (!userId || !companyId) {
                console.warn("⚠️ registerAttendanceUser missing userId or companyId");
                return;
            }
            activeUsers.set(socket.id, { userId, companyId });
            socket.join(`tenant:${companyId}`); // ✅ Scoped room per company
            console.log(`👤 Registered user ${userId} to tenant ${companyId}`);
        });

        /**
         * ⏳ Staff Check-In Event
         */
        socket.on("attendanceCheckIn", ({ userId, staffName, status, companyId }) => {
            if (!validatePayload({ userId, staffName, status, companyId })) return;
            console.log(`⏳ Check-in | ${staffName} (${userId}) | ${status} | ${companyId}`);
            attendanceNamespace.to(`tenant:${companyId}`).emit("attendanceCheckIn", { userId, staffName, status });
            updateDashboard(emitDashboardMetricsUpdate);
        });

        /**
         * ✅ Staff Check-Out Event
         */
        socket.on("attendanceCheckOut", ({ userId, staffName, status, companyId }) => {
            if (!validatePayload({ userId, staffName, status, companyId })) return;
            console.log(`✅ Check-out | ${staffName} (${userId}) | ${status} | ${companyId}`);
            attendanceNamespace.to(`tenant:${companyId}`).emit("attendanceCheckOut", { userId, staffName, status });
            updateDashboard(emitDashboardMetricsUpdate);
        });

        /**
         * 🔄 Generic Attendance Update Event
         */
        socket.on("attendanceUpdate", ({ userId, staffName, status, companyId }) => {
            if (!validatePayload({ userId, staffName, status, companyId })) return;
            console.log(`🔄 Update | ${staffName} (${userId}) | ${status} | ${companyId}`);
            attendanceNamespace.to(`tenant:${companyId}`).emit("attendanceUpdated", { userId, staffName, status });
            updateDashboard(emitDashboardMetricsUpdate);
        });

        /**
         * ❌ Handle Disconnect
         */
        socket.on("disconnect", () => {
            const user = activeUsers.get(socket.id);
            if (user) {
                console.log(`❌ Disconnected ${user.userId} from tenant ${user.companyId}`);
                activeUsers.delete(socket.id);
            } else {
                console.log(`❌ Unregistered socket disconnected: ${socket.id}`);
            }
        });

        /**
         * ⚠️ WebSocket Error Handling
         */
        socket.on("error", (err) => {
            console.error(`❌ Attendance WebSocket Error: ${err.stack || err.message}`);
        });
    });
};

/**
 * 🔄 Dashboard Update Cooldown
 */
const updateDashboard = (emitDashboardMetricsUpdate) => {
    if (dashboardUpdateCooldown) return;
    try {
        emitDashboardMetricsUpdate();
    } catch (err) {
        console.error("❌ Error updating dashboard metrics:", err.stack || err.message);
    }
    dashboardUpdateCooldown = true;
    setTimeout(() => (dashboardUpdateCooldown = false), 5000);
};

/**
 * ✅ Payload Validation Utility
 */
const validatePayload = ({ userId, staffName, status, companyId }) => {
    if (!userId || !staffName || !status || !companyId) {
        console.warn("⚠️ Invalid attendance event payload:", { userId, staffName, status, companyId });
        return false;
    }
    return true;
};

module.exports = attendanceWebSocket;
