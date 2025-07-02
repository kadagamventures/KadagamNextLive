const taskService = require("../services/taskService");
const taskFileService = require("../services/taskFileService");
const { createNotification } = require("../services/notificationService");
const Task = require("../models/Task");
const { extractFileKey } = require("../utils/fileUtils");

// ✅ Create Task
const createTask = async (req, res, next) => {
  try {
    if (Array.isArray(req.body.assignedTo)) {
      return res.status(400).json({ message: "Task must be assigned to one staff member only." });
    }

    if (
      req.user.role !== "admin" &&
      (req.user.permissions.includes("manage_task") || req.user.permissions.includes("manage_staff")) &&
      req.body.assignedTo.toString() === req.user.id.toString()
    ) {
      return res.status(403).json({ message: "You are not allowed to assign a task to yourself." });
    }

    const task = await taskService.createTask(
      req.body,
      req.user.id,
      req.file,
      req.user.role,
      req.user.permissions,
      req.user.companyId?.toString()  // 🔄 ensure string type
    );

    await createNotification({
  staffId: task.assignedTo.toString(),
  type: "TASK_ASSIGNED",
  title: "New Task Assigned",
  message: `You have been assigned a new task: "${task.title}".`,
  companyId: task.companyId.toString(),  // 🔥 FIX: Add this line
});


    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
};

// ✅ Get All Tasks (Scoped)
const getAllTasks = async (req, res, next) => {
  try {
    const tasks = await taskService.getAllTasks(
      req.user.role,
      req.user.permissions,
      req.user.id,
      req.user.companyId
    );
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};


// ✅ Get Task By ID (Scoped)
const getTaskById = async (req, res, next) => {
  try {
    const task = await taskService.getTaskById(
      req.params.id,
      req.user.id,
      req.user.role,
      req.user.permissions,
      req.user.companyId
    );
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.status(200).json(task);
  } catch (error) {
    next(error);
  }
};

// ✅ Get Tasks By Staff ID (Scoped)
const getTasksByStaffId = async (req, res, next) => {
  try {
    const tasks = await taskService.getTasksByStaffId(req.params.userId, req.user.companyId);
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

// ✅ Update Task (Scoped)
const updateTaskController = async (req, res, next) => {
  try {
    const { id: taskId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const userPermissions = req.user.permissions;

    if (Array.isArray(req.body.assignedTo)) {
      return res.status(400).json({ message: "Task can only be assigned to one staff member." });
    }

    if (
      userRole !== "admin" &&
      (userPermissions.includes("manage_task") || userPermissions.includes("manage_staff")) &&
      req.body.assignedTo &&
      req.body.assignedTo.toString() === userId.toString()
    ) {
      return res.status(403).json({ message: "You are not allowed to assign a task to yourself." });
    }

    const updatePayload = {
      ...req.body,
      newAttachmentFile: req.file || null,
    };

    const updatedTask = await taskService.updateTask(
      taskId,
      updatePayload,
      userId,
      userRole,
      userPermissions,
      req.user.companyId
    );

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found." });
    }

    const staffId = updatedTask.assignedTo._id
      ? updatedTask.assignedTo._id.toString()
      : updatedTask.assignedTo.toString();

    await createNotification({
  staffId,
  type: "TASK_UPDATED",
  title: "Task Updated",
  message: `Task "${updatedTask.title}" has been updated.`,
  companyId: updatedTask.companyId?.toString(),  // ✅ Add this line
});


    res.status(200).json(updatedTask);
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};
// ✅ Delete Task Attachment (Scoped)
const deleteTaskAttachment = async (req, res, next) => {
  try {
    const { id: taskId } = req.params;
    const { fileUrl } = req.body;

    const task = await Task.findOne({ _id: taskId, companyId: req.user.companyId });
    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    const fileKey = extractFileKey(fileUrl);
    if (fileKey) {
      await taskFileService.deleteTaskAttachment(fileKey);
    } else {
      return res.status(400).json({ message: "Invalid attachment URL." });
    }

    task.attachments = task.attachments.filter((att) => att.fileUrl !== fileUrl);
    await task.save();

    res.status(200).json({ message: "Attachment deleted successfully." });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// ✅ Staff Status Update (Scoped)
const updateTaskStatusByStaff = async (req, res, next) => {
  try {
    const updatedTask = await taskService.updateTaskStatusByStaff(
      req.params.taskId,
      req.body,
      req.user.id,
      req.user.role,
      req.user.companyId
    );
    res.status(200).json(updatedTask);
  } catch (error) {
    next(error);
  }
};

// ✅ Hard Delete Task (Scoped)
const deleteTask = async (req, res, next) => {
  try {
    const result = await taskService.deleteTask(req.params.id, req.user.companyId);
    if (!result) {
      return res.status(404).json({ message: "Task not found or already deleted." });
    }
    res.status(200).json({ message: "Task deleted successfully!", taskId: req.params.id });
  } catch (error) {
    next(error);
  }
};

// ✅ Add Daily Comment (Scoped)
// ✅ Add Daily Comment (Scoped)
const addDailyComment = async (req, res, next) => {
  try {
    const { comment } = req.body;
    const file = req.file || null;
    const taskId = req.params.id;

    // Allow either comment or file — but at least one must exist
    if (!comment && !file) {
      return res.status(400).json({ message: "Comment or file is required." });
    }

    await taskService.addDailyComment(
      req.user.id,
      taskId,
      comment,
      file,
      req.user.companyId
    );

    res.status(200).json({ message: "Daily comment added successfully" });
  } catch (error) {
    console.error("❌ Error in addDailyComment:", error);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

const submitDailyComment = addDailyComment;


// ✅ Auto Adjust Task Priorities (Scoped)
const autoAdjustTaskPriorities = async (req, res, next) => {
  try {
    await taskService.autoAdjustTaskPriorities(req.user.companyId);
    res.status(200).json({ message: "Task priorities auto-adjusted" });
  } catch (error) {
    next(error);
  }
};

// ✅ Get Daily Comments (Scoped)
const getDailyComments = async (req, res, next) => {
  try {
    const comments = await taskService.getDailyComments(req.user.companyId) || [];
    res.status(200).json(comments);
  } catch (error) {
    next(error);
  }
};

// ✅ Get Tasks for Kanban View (Scoped)
const getTasksForKanban = async (req, res, next) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

    const kanbanTasks = await taskService.getTasksForKanban(
      req.user.id,
      req.user.companyId
    );

    res.status(200).json(kanbanTasks);
  } catch (error) {
    next(error);
  }
};

// ✅ Auto Delete Completed Tasks (Scoped)
const autoDeleteTasks = async (req, res, next) => {
  try {
    await taskService.autoDeleteCompletedTasks(req.user.companyId);
    res.status(200).json({ message: "Expired tasks auto-deleted successfully." });
  } catch (error) {
    next(error);
  }
};

// ✅ Move Task to Review (Scoped)
const moveToReview = async (req, res, next) => {
  try {
    const file = req.file || null;
    const updatedTask = await taskService.moveToReview(
      req.params.taskId,
      req.user.id,
      file,
      req.user.companyId
    );

    const taskCreatorId = updatedTask.createdBy?._id?.toString() || updatedTask.createdBy?.toString();
    const currentUserId = req.user.id;
    const notifyTargets = new Set();

    if (taskCreatorId && taskCreatorId !== currentUserId) {
      notifyTargets.add(taskCreatorId);
    }

    if (req.user.permissions?.includes("manage_task")) {
      const User = require("../models/User");
      const admins = await User.find({ role: "admin", companyId: req.user.companyId }).select("_id");
      admins.forEach((admin) => notifyTargets.add(admin._id.toString()));
    }

    const title = "Task Review Pending";
    const message = `Task "${updatedTask.title}" was submitted for review.`;

    await Promise.all(
      Array.from(notifyTargets).map((staffId) =>
      createNotification({
  staffId,
  type: "REVIEW_PENDING",
  title,
  message,
  companyId: req.user.companyId?.toString(), // ✅ Fix applied
})

      )
    );

    return res.status(200).json({ message: "Task moved to Review", task: updatedTask });
  } catch (error) {
    next(error);
  }
};

// ✅ Handle Review Decision (Scoped)
const handleReviewDecision = async (req, res, next) => {
  try {
    const { decision, comment, newDueDate, newPriority } = req.body;
    const { taskId } = req.params;

    const updatedTask = await taskService.handleReviewDecision({
      taskId,
      decision,
      comment,
      reviewerId: req.user.id,
      newDueDate,
      newPriority,
      companyId: req.user.companyId,
    });

    const notifyTargets = new Set();
    const assignedId = updatedTask.assignedTo?._id?.toString() || updatedTask.assignedTo?.toString();
    const creatorId = updatedTask.createdBy?._id?.toString() || updatedTask.createdBy?.toString();

    if (assignedId) notifyTargets.add(assignedId);
    if (creatorId && creatorId !== assignedId) notifyTargets.add(creatorId);

    const notifTitle = `Task Review ${decision === "approved" ? "Approved" : "Rejected"}`;
    const notifMessage = `Your task "${updatedTask.title}" was ${decision}.`;

    await Promise.all(
      Array.from(notifyTargets).map((staffId) =>
        createNotification({
          staffId,
          type: decision === "approved" ? "REVIEW_APPROVED" : "REVIEW_REJECTED",
          title: notifTitle,
          message: notifMessage,
          companyId: req.user.companyId?.toString(), // ✅ FIXED LINE
        })
      )
    );

    res.status(200).json({ message: `Task ${decision}`, task: updatedTask });
  } catch (error) {
    next(error);
  }
};


// ✅ Get Tasks Created By Me (Scoped)
const getTasksAssignedByMe = async (req, res, next) => {
  try {
    const tasks = await taskService.getTasksAssignedByMe(req.user.id, req.user.companyId);
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

// ✅ Get Task Attachment Presigned URL
const getTaskAttachmentPresignedUrl = async (req, res, next) => {
  try {
    const { fileUrl } = req.body;
    const fileKey = extractFileKey(fileUrl);
    const presignedUrl = await taskFileService.getTaskAttachmentUrl(fileKey);
    res.status(200).json({ url: presignedUrl });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// ✅ Get My Daily Comments (Scoped to creator)
const getDailyCommentsByCreatorHandler = async (req, res, next) => {
  try {
    const updates = await taskService.getDailyCommentsByCreator(req.user.id, req.user.companyId);
    return res.status(200).json(updates);
  } catch (err) {
    console.error("❌ Server error in /tasks/my-daily-comments:", err);
    return res.status(500).json({
      message: "Server error while fetching your daily comments.",
      error: err.message,
    });
  }
};


module.exports = {
  createTask,
  getAllTasks,
  getTaskById,
  getTasksByStaffId,
  updateTaskController,
  updateTaskStatusByStaff,
  deleteTask,
  addDailyComment,
  submitDailyComment,
  autoAdjustTaskPriorities,
  getDailyComments,
  getTasksForKanban,
  autoDeleteTasks,
  moveToReview,
  handleReviewDecision,
  getTasksAssignedByMe,
  deleteTaskAttachment,
  getTaskAttachmentPresignedUrl,
  getDailyCommentsByCreatorHandler
};

