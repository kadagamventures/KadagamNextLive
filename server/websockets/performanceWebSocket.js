const performanceService = require("../services/performanceService");

const performanceWebSocket = (io) => {
  const performanceNamespace = io.of("/performance"); // Scoped namespace

  performanceNamespace.on("connection", (socket) => {
    const user = socket.user || {};
    const { id: userId, companyId, role } = user;

    if (!userId || !companyId) {
      console.warn("❌ Invalid WebSocket connection — missing userId or companyId.");
      socket.disconnect();
      return;
    }

    console.log(`✅ Performance WebSocket Connected: ${socket.id} (Company: ${companyId})`);

    // Join rooms
    socket.join(`performance_${companyId}_${userId}`);
    if (role === "admin") {
      socket.join(`performance_admin_${companyId}`);
    }

    /**
     * 📊 Admin requests live performance summary
     */
    socket.on("requestPerformanceSummary", async () => {
      try {
        const summary = await performanceService.getLivePerformanceSummary(companyId);
        socket.emit("performanceSummary", summary);
      } catch (error) {
        handleError(socket, "Failed to fetch performance data.", error);
      }
    });

    /**
     * 🔄 Performance data update triggered after report generation
     */
    socket.on("performanceUpdated", async ({ month, year }) => {
      if (!isValidPerformanceUpdatePayload(month, year)) {
        return emitError(socket, "Invalid performanceUpdated payload");
      }

      try {
        console.log(`🔄 Performance Updated for ${month}/${year} (${companyId})`);
        const summary = await performanceService.getLivePerformanceSummary(companyId);
        performanceNamespace.to(`performance_admin_${companyId}`).emit("performanceSummary", summary);

        try {
          const { emitDashboardMetricsUpdate } = require("../services/websocketService");
          emitDashboardMetricsUpdate(); // optional broadcast across shared dashboard
        } catch (dashboardError) {
          console.error("❌ Dashboard update error:", dashboardError.stack);
        }
      } catch (err) {
        handleError(socket, "Failed to update performance data", err);
      }
    });

    /**
     * 📩 Notify staff about performance report availability
     */
    socket.on("performanceReportGenerated", ({ staffId, reportUrl }) => {
      if (!isValidPerformanceReportPayload(staffId, reportUrl)) {
        return emitError(socket, "Invalid performance report payload");
      }

      performanceNamespace
        .to(`performance_${companyId}_${staffId}`)
        .emit("performanceReportReady", { reportUrl });
    });

    socket.on("disconnect", () => {
      console.log(`❌ Performance WS Disconnected: ${socket.id}`);
    });

    socket.on("error", (err) => {
      console.error("❌ Performance WebSocket Error:", err.message);
    });
  });
};

// Helpers

const isValidPerformanceUpdatePayload = (month, year) => {
  return month && typeof month === "string" && year && Number.isInteger(year);
};

const isValidPerformanceReportPayload = (staffId, reportUrl) => {
  return staffId && typeof staffId === "string" && !!reportUrl;
};

const emitError = (socket, message) => {
  console.warn(`⚠️ ${message}`);
  socket.emit("error", { message });
};

const handleError = (socket, userMessage, error) => {
  console.error(`❌ ${userMessage}:`, error.stack || error.message);
  socket.emit("error", { message: userMessage });
};

module.exports = performanceWebSocket;
