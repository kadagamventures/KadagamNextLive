const Notification = require("../models/Notification");
const User = require("../models/User");
const { getIO } = require("../config/websocketConfig");

/**
 * 🔔 Emit a real-time WebSocket notification to a specific user
 */
const emitToUser = (staffId, payload) => {
  getIO().to(`notif_${staffId}`).emit("notification:new", payload);
};

/**
 * 🔔 Emit a notification to the admin room (company-wide room)
 */
const emitToAdminRoom = (companyId, payload) => {
  getIO().to(`notif_admin_${companyId}`).emit("notification:new", payload);
};

/**
 * 📌 Create and emit a notification to one or multiple users
 * - If `toAdmin` is true, notify all admins and permissioned staff of the same company.
 * - Otherwise, notify a specific staff user.
 */
const createNotification = async ({ staffId, type, title, message, toAdmin = false, companyId }) => {
  if (!companyId) throw new Error("Missing companyId for notification");

  if (toAdmin) {
    const admins = await User.find({
      companyId,
      $or: [
        { role: "admin" },
        { permissions: { $in: ["manage_task"] } }
      ]
    }).select("_id");

    const notifications = await Promise.all(
      admins.map(async (admin) => {
        const notif = await Notification.create({
          staffId: admin._id,
          type,
          title,
          message,
          companyId,
        });

        emitToUser(admin._id.toString(), {
          _id: notif._id,
          type,
          title,
          message,
          isRead: false,
          createdAt: notif.createdAt,
        });

        return notif;
      })
    );

    // Optionally broadcast to admin dashboard room
    emitToAdminRoom(companyId, {
      type,
      title,
      message,
      isRead: false,
      createdAt: new Date(),
    });

    return notifications[0];
  }

  // 🎯 Single staff notification
  const notification = await Notification.create({
    staffId,
    type,
    title,
    message,
    companyId,
  });

  emitToUser(staffId.toString(), {
    _id: notification._id,
    type,
    title,
    message,
    isRead: false,
    createdAt: notification.createdAt,
  });

  return notification;
};

/**
 * 📥 Get the latest notifications for a user (company filtered)
 */
const getUserNotifications = async (staffId, companyId) => {
  return await Notification.find({ staffId, companyId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
};

/**
 * ✅ Mark a specific notification as read (company safe)
 */
const markAsRead = async (notificationId, companyId) => {
  return await Notification.findOneAndUpdate(
    { _id: notificationId, companyId },
    { isRead: true },
    { new: true }
  ).lean();
};

/**
 * ✅ Mark all of a user's notifications as read
 */
const markAllAsRead = async (staffId, companyId) => {
  return await Notification.updateMany(
    { staffId, companyId, isRead: false },
    { isRead: true }
  );
};

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  emitToUser,
  emitToAdminRoom,
};
