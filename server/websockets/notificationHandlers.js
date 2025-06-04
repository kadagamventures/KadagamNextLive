const Notification = require("../models/Notification");

const notificationHandlers = (io, socket) => {
  const userId = socket.user?.id;
  const role = socket.user?.role;
  const companyId = socket.user?.companyId;
  const hasManagePermission = socket.user?.permissions?.includes("manage_task");

  if (!userId || !companyId) {
    console.warn("[⚠️ Notification WS] Missing userId or companyId.");
    return;
  }

  const personalRoom = `notif_${companyId}_${userId}`;
  const adminRoom = `notif_admin_${companyId}`;

  // ✅ Join tenant-scoped personal notification room
  socket.join(personalRoom);
  console.log(`[🔔 Notification] Joined personal room: ${personalRoom}`);

  // ✅ Join tenant-scoped admin notification room (if eligible)
  if (role === "admin" || hasManagePermission) {
    socket.join(adminRoom);
    console.log(`[🔔 Notification] Joined admin room: ${adminRoom}`);
  }

  /**
   * ✅ Mark a specific notification as read
   * Payload: { notificationId }
   */
  socket.on("notification:read", async ({ notificationId }) => {
    if (!notificationId) return;
    try {
      await Notification.findOneAndUpdate(
        { _id: notificationId, staffId: userId, companyId },
        { isRead: true }
      );
      console.log(`✅ Notification marked read: ${notificationId}`);
    } catch (err) {
      console.error("❌ Socket Error (read):", err.message);
    }
  });

  /**
   * ✅ Mark all notifications as read for this user & company
   */
  socket.on("notification:markAllRead", async () => {
    try {
      await Notification.updateMany(
        { staffId: userId, companyId, isRead: false },
        { isRead: true }
      );
      console.log(`✅ All notifications marked read for ${userId} in ${companyId}`);
    } catch (err) {
      console.error("❌ Socket Error (markAllRead):", err.message);
    }
  });

  /**
   * ✅ Get latest 50 notifications
   */
  socket.on("notification:get", async () => {
    try {
      const notifications = await Notification.find({ staffId: userId, companyId })
        .sort({ createdAt: -1 })
        .limit(50);
      socket.emit("notification:list", notifications);
    } catch (err) {
      console.error("❌ Socket Error (get):", err.message);
    }
  });

  // ℹ️ Cleanup and TTL expiry for old notifications are managed by schema
};

module.exports = notificationHandlers;
