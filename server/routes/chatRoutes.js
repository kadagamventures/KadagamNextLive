const express = require("express");
const router = express.Router();

const {
  getChatHistory,
  getUserChats,
  sendMessage,
  deleteChatHistory,
  getChatTasks,
  getMyChatTasks,
  markMessagesAsRead,
  getUnreadCount,
  getConversationWithUser,
  searchMessages,
  getRecentChats,
  editMessage,
  deleteMessage,
  cleanupOldChats
} = require("../controllers/chatController");

const { verifyToken } = require("../middlewares/authMiddleware");
const checkPermissions = require("../middlewares/permissionsMiddleware");
const Task = require("../models/Task");

// 🔐 All routes below require JWT Auth
router.use(verifyToken);

// ─────────────────────────────────────────────
// ✅ List My Own Inbox (1:1 Task Chats Only)
// GET /api/chat/user
router.get("/user", getUserChats);

// ✅ List All Tasks With Recent Messages (Admin or manage_task)
// GET /api/chat/tasks
router.get("/tasks", checkPermissions("manage_task"), getChatTasks);

// ✅ My Assigned Tasks (Normal Staff Inbox View)
// GET /api/chat/my-tasks
router.get("/my-tasks", getMyChatTasks);

// ✅ Get Latest Message from Each Active Task
// GET /api/chat/recent
router.get("/recent", getRecentChats);

// ✅ Fetch Direct Conversation with Another User
// GET /api/chat/conversation/:userId
router.get("/conversation/:userId", getConversationWithUser);

// ✅ Count Unread Messages (Per User Scope)
// GET /api/chat/unread
router.get("/unread", getUnreadCount);

// ✅ Mark Messages in Task as Read
// POST /api/chat/mark-read
router.post("/mark-read", markMessagesAsRead);

// ✅ Search Messages (within task or global)
// GET /api/chat/search?query=...&taskId=...
router.get("/search", searchMessages);

// ✅ Edit a Chat Message (Only if in Tenant Scope)
// PUT /api/chat/message/:id
router.put("/message/:id", editMessage);

// ✅ Delete a Chat Message (Only if in Tenant Scope)
// DELETE /api/chat/message/:id
router.delete("/message/:id", deleteMessage);

// ✅ Clean Up Old Messages (Admin/Manager Only)
// DELETE /api/chat/cleanup/old/:days
router.delete(
  "/cleanup/old/:days",
  checkPermissions("manage_task"),
  cleanupOldChats
);

// ─────────────────────────────────────────────
// 🛡️ Custom Access Middleware to Verify Task-Scoped Access
async function canAccessChat(req, res, next) {
  const user = req.user;
  const { taskId } = req.params;
  const companyId = req.user.companyId?.toString();

  if (!taskId || !companyId) {
    return res
      .status(400)
      .json({ message: "Task ID and company ID are required." });
  }

  try {
    // Ensure the task exists within this tenant and is not soft-deleted
    const task = await Task.findOne({
      _id: taskId,
      companyId,
      isDeleted: { $ne: true },
    }).lean();

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    const userId = user.id?.toString();
    const assignedTo = task.assignedTo?.toString();
    const createdBy = task.createdBy?.toString();

    const isAdmin = user.role === "admin";
    const canManage = user.permissions?.includes("manage_task");
    const isAssignee = assignedTo === userId;
    const isCreator = createdBy === userId;

    if (isAdmin || canManage || isAssignee || isCreator) {
      return next();
    }

    return res
      .status(403)
      .json({ message: "Unauthorized: No chat access to this task." });
  } catch (err) {
    console.error("❌ Chat Access Check Failed:", err);
    return res
      .status(500)
      .json({ message: "Internal server error." });
  }
}

// ─────────────────────────────────────────────
// ✅ Core Chat Routes Per Task (Access Controlled)
// GET /api/chat/:taskId — Fetch messages for a task
router.get("/:taskId", canAccessChat, getChatHistory);

// POST /api/chat/:taskId — Send message in a task chat
router.post("/:taskId", canAccessChat, sendMessage);

// DELETE /api/chat/:taskId — Delete all messages for a task
router.delete("/:taskId", checkPermissions("manage_task"), deleteChatHistory);

module.exports = router;
