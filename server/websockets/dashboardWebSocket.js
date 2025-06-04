const adminDashboardService = require("../services/adminDashboardService");

const dashboardWebSocket = (io) => {
  io.of("/dashboard").on("connection", (socket) => {
    const { companyId, id: userId, role } = socket.handshake.auth || {};

    if (!companyId || !userId || !role) {
      console.warn("❌ Connection rejected: Missing required auth fields.");
      socket.disconnect();
      return;
    }

    const companyIdStr = companyId.toString(); // ✅ Ensure string type
    console.log(`📊 Dashboard WebSocket Connected: User ${userId} (Company: ${companyIdStr})`);

    // Join tenant-specific room
    const room = `dashboard_${companyIdStr}`;
    socket.join(room);

    /**
     * Send scoped dashboard data on connection or update trigger
     */
    const sendDashboardUpdate = async () => {
      try {
        const overviewData = await adminDashboardService.getOverviewData(companyIdStr);
        io.of("/dashboard").to(room).emit("dashboardUpdate", overviewData);
      } catch (err) {
        console.error("❌ Failed to fetch/send dashboard data:", err.message);
      }
    };

    // 1️⃣ Initial update
    sendDashboardUpdate();

    // 2️⃣ Client manually requests refresh
    socket.on("updateDashboard", sendDashboardUpdate);

    // 3️⃣ Cleanup
    socket.on("disconnect", () => {
      console.log(`❌ Dashboard WebSocket Disconnected: ${userId}`);
    });
  });
};

module.exports = dashboardWebSocket;
