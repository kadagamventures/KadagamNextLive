const {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  clearNotifications,
} = require("../services/notificationService");

/**
 * 🔔 [GET] Get notifications for the logged-in user (company scoped)
 */
const fetchMyNotifications = async (req, res) => {
  try {
    const staffId = req.user.id;
    const companyId = req.user.companyId;

    const notifications = await getUserNotifications(staffId, companyId);
    return res.status(200).json({ success: true, data: notifications });
  } catch (err) {
    console.error("[Notification Fetch Error]", err.message);
    return res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
};

/**
 * ✅ [PUT] Mark a single notification as read (company scoped)
 */
const markNotificationRead = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const companyId = req.user.companyId;

    const updated = await markAsRead(notificationId, companyId);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Notification not found or unauthorized" });
    }

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error("[Mark Notification Read Error]", err.message);
    return res.status(500).json({ success: false, message: "Failed to mark notification as read" });
  }
};

/**
 * ✅ [PUT] Mark all of a user's notifications as read (company scoped)
 */
const markAllNotificationsRead = async (req, res) => {
  try {
    const staffId = req.user.id;
    const companyId = req.user.companyId;

    await markAllAsRead(staffId, companyId);
    return res.status(200).json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    console.error("[Mark All Notifications Read Error]", err.message);
    return res.status(500).json({ success: false, message: "Failed to mark all notifications as read" });
  }
};

/**
 * 🗑️ [DELETE] Clear all notifications for a user (company scoped)
 */
const clearAllNotifications = async (req, res) => {
  try {
    const staffId = req.user.id;
    const companyId = req.user.companyId;

    await clearNotifications(staffId, companyId);
    return res.status(200).json({ success: true, message: "All notifications cleared" });
  } catch (err) {
    console.error("[Clear All Notifications Error]", err.message);
    return res.status(500).json({ success: false, message: "Failed to clear notifications" });
  }
};

/**
 * 🚀 [POST] Create a manual notification
 * - Supports single-user or admin-wide broadcast within tenant
 */
const createManualNotification = async (req, res) => {
  try {
    const { staffId, type, title, message, toAdmin } = req.body;
    const companyId = req.user.companyId;

    if (!type || !title || !message) {
      return res.status(400).json({ success: false, message: "Title, type, and message are required" });
    }

    const notif = await createNotification({
      staffId,
      type,
      title,
      message,
      toAdmin: toAdmin === true,
      companyId,
    });

    return res.status(201).json({ success: true, data: notif });
  } catch (err) {
    console.error("[Create Manual Notification Error]", err.message);
    return res.status(500).json({ success: false, message: "Failed to create notification" });
  }
};

module.exports = {
  fetchMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearAllNotifications,
  createManualNotification,
};
