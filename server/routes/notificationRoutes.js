const express = require("express");
const {
  fetchMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  createManualNotification,
} = require("../controllers/notificationController");

const { verifyToken } = require("../middlewares/authMiddleware");

const router = express.Router();

// 🔐 Protect all notification routes
router.use(verifyToken);

/**
 * ====================================
 * 🚨 NOTIFICATION ROUTES (Multi-Tenant)
 * Base: /api/notifications
 * ====================================
 */

// 📥 Get all notifications for logged-in user
router.get("/", fetchMyNotifications);

// ✅ Mark a specific notification as read
router.put("/:id/read", markNotificationRead);

// ✅ Mark all notifications for current user as read
router.put("/read-all", markAllNotificationsRead);

// 🚀 Create a notification manually (admin use, optional)
router.post("/", createManualNotification);

module.exports = router;
