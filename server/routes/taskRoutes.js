const express = require("express");
const router = express.Router();

const {
  createTask,
  updateTaskController,
  deleteTask,
  getAllTasks,
  getTaskById,
  getTasksByStaffId,
  getDailyComments,
  getTasksForKanban,
  updateTaskStatusByStaff,
  autoAdjustTaskPriorities,
  moveToReview,
  handleReviewDecision,
  getTasksAssignedByMe,
  addDailyComment,
  deleteTaskAttachment,
  getTaskAttachmentPresignedUrl,
  getDailyCommentsByCreatorHandler,
} = require("../controllers/taskController");

const { verifyToken, requireAdmin } = require("../middlewares/authMiddleware");
const checkPermissions = require("../middlewares/permissionsMiddleware");
const { errorHandler } = require("../middlewares/errorMiddleware");
const taskService = require("../services/taskService");

const {
  uploadDailyUpdateFile,
  uploadSingleTaskAttachment,
  requireFileOrComment,  // <-- Import here!
} = require("../middlewares/fileUploadMiddleware");

// 🔒 Protect all task routes
router.use(verifyToken);

// ==============================
// ✅ Staff Routes
// ==============================

router.get("/staff-tasks/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (req.user.role === "admin" || req.user.id === userId) {
      await getTasksByStaffId(req, res, next);
    } else {
      return res.status(403).json({ message: "Unauthorized to access these tasks." });
    }
  } catch (error) {
    next(error);
  }
});

router.get("/kanban", async (req, res, next) => {
  if (req.user.role === "admin") {
    return res.status(403).json({ message: "Admin Kanban not available." });
  }
  await getTasksForKanban(req, res, next);
});

router.put("/staff/:taskId", updateTaskStatusByStaff);

router.put("/staff/:taskId/review", uploadDailyUpdateFile("reviewAttachment"), moveToReview);

// ==============================
// ✅ Permissioned Routes
// ==============================

router.get("/assigned-by-me", (req, res, next) => {
  if (req.user.role === "admin" || req.user.permissions.includes("manage_task")) {
    return getTasksAssignedByMe(req, res, next);
  }
  return res.status(403).json({ message: "Access denied." });
});

router.put("/review/:taskId", checkPermissions("manage_task"), handleReviewDecision);

router.post("/adjust-priorities", checkPermissions("manage_task"), autoAdjustTaskPriorities);

// ==============================
// ✅ Daily Comments
// ==============================

router.get("/my-daily-comments", checkPermissions("manage_task"), getDailyCommentsByCreatorHandler);
router.get("/daily-comments", checkPermissions("manage_task"), getDailyComments);

// ✅ Use the new middleware for comment-or-file-required!
router.post(
  "/:id/daily-comment",
  uploadDailyUpdateFile("attachment"),
  requireFileOrComment,         // <--- Ensures comment or file is required
  addDailyComment
);

// ==============================
// ✅ CRUD Core Routes
// ==============================

router.get("/", (req, res, next) => {
  if (req.user.role === "admin" || req.user.permissions.includes("manage_task")) {
    return getAllTasks(req, res, next);
  }
  return res.status(403).json({ message: "Admin or manage_task access required." });
});

router.post(
  "/",
  checkPermissions("manage_task"),
  uploadSingleTaskAttachment("attachments"),
  createTask
);

router.put(
  "/:id",
  checkPermissions("manage_task"),
  uploadSingleTaskAttachment("attachments"),
  async (req, res, next) => {
    try {
      const taskObj = await taskService.getTaskById(
        req.params.id,
        req.user.id,
        req.user.role,
        req.user.permissions,
        req.user.companyId
      );

      if (!taskObj) {
        return res.status(404).json({ message: "Task not found." });
      }

      if (
        req.user.role !== "admin" &&
        taskObj.assignedTo &&
        taskObj.assignedTo._id.toString() === req.user.id
      ) {
        return res.status(403).json({ message: "You cannot edit a task assigned to yourself." });
      }

      return updateTaskController(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.get("/:id", checkPermissions("manage_task"), getTaskById);

router.post("/:id/attachment/url", checkPermissions("manage_task"), getTaskAttachmentPresignedUrl);

router.delete("/:id/attachment", checkPermissions("manage_task"), deleteTaskAttachment);

router.delete("/:id", requireAdmin, deleteTask);

// ✅ Global error handler for task routes
router.use(errorHandler);

module.exports = router;
