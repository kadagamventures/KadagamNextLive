const Task = require("../models/Task");
const Project = require("../models/Project");
const taskFileService = require("./taskFileService");
const { extractFileKey } = require("../utils/fileUtils");
const cron = require("node-cron");
const { emitTaskCompletedSocket } = require("../websockets/taskWebSocket");
const emailService = require("../services/emailService");

// ✅ Create Task
const createTask = async (
  taskData,
  userId,
  file = null,
  userRole,
  userPermissions,
  companyId
) => {
  if (!taskData.assignedTo)
    throw new Error("Task must be assigned to one staff member.");

  // 🛑 Prevent assigning task to self if not admin
  if (
    userRole !== "admin" &&
    (userPermissions.includes("manage_task") || userPermissions.includes("manage_staff")) &&
    taskData.assignedTo.toString() === userId.toString()
  ) {
    throw new Error("You are not allowed to assign a task to yourself.");
  }

  taskData.createdBy = userId;
  taskData.assignedDate = new Date();
  taskData.attachments = [];

  // 🔐 Ensure companyId is a string
  taskData.companyId = typeof companyId === "string" ? companyId : String(companyId);

  if (file) {
    const uploaded = await taskFileService.uploadTaskAttachment(file, taskData.companyId);
    taskData.attachments.push({
      fileUrl: uploaded.fileUrl,
      fileType: uploaded.fileType,
    });
  }

  const task = await Task.create(taskData);

  await Project.updateMany(
    { _id: { $in: taskData.projects }, companyId: taskData.companyId },
    { $addToSet: { tasks: task._id } }
  );

  return task;
};



// ✅ Get All Tasks (Admin or permissioned staff can fetch all tasks in company)
const getAllTasks = async (userRole, userPermissions, userId, companyId) => {
  const query = { companyId };

  if (userRole !== "admin" && !userPermissions.includes("manage_task")) {
    query.assignedTo = userId;
  }

  return Task.find(query)
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email")
    .populate("projects", "name")
    .lean();
};

// ✅ Get Task By ID (with access check)
const getTaskById = async (taskId, userId, userRole, userPermissions, companyId) => {
  const query = { _id: taskId, companyId };

  if (userRole !== "admin" && !userPermissions.includes("manage_task")) {
    query.assignedTo = userId;
  }

  const task = await Task.findOne(query)
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email")
    .populate("projects", "name")
    .lean();

  if (!task) throw new Error("Task not found or unauthorized access.");

  if (task.createdBy._id.toString() !== userId.toString()) {
    delete task.dailyUpdates;
  }

  return task;
};

// ✅ Get Tasks By Staff ID (used in reports, etc.)
const getTasksByStaffId = async (staffId, companyId) => {
  return Task.find({ assignedTo: staffId, companyId })
    .populate("projects", "name")
    .populate("assignedTo", "name email")
    .lean();
};

// ✅ Update Task
const updateTask = async (
  taskId,
  updateData,
  userId,
  userRole,
  userPermissions,
  companyId
) => {
  const task = await Task.findOne({ _id: taskId, companyId });
  if (!task) throw new Error("Task not found.");

  // ✅ Block if not the creator (only creator or admin can edit)
  if (userRole !== "admin" && task.createdBy.toString() !== userId.toString()) {
    throw new Error("You can only update tasks that you created.");
  }

  // ✅ Prevent permissioned staff from editing tasks assigned to themselves
  if (
    task.assignedTo.toString() === userId.toString() &&
    userPermissions.includes("manage_task")
  ) {
    throw new Error("You are not allowed to update a task assigned to yourself.");
  }

  // ✅ Prevent completed tasks from moving back to other statuses
  if (
    task.status === "Completed" &&
    updateData.status &&
    updateData.status !== "Completed"
  ) {
    throw new Error("Completed task cannot be moved to other sections.");
  }

  // ✅ Allow task to move to Completed ONLY after review & approval
  if (
    updateData.status === "Completed" &&
    (!task.review?.isUnderReview || task.review?.status !== "approved")
  ) {
    throw new Error("Only reviewed and approved tasks can move to Completed.");
  }

  // ✅ Handle new attachment upload
  if (updateData.newAttachmentFile) {
    if (task.attachments?.length) {
      for (const file of task.attachments) {
        const fileKey = extractFileKey(file.fileUrl);
        if (fileKey) await taskFileService.deleteTaskAttachment(fileKey);
      }
    }

    const uploaded = await taskFileService.uploadTaskAttachment(
      updateData.newAttachmentFile,
      companyId
    );

    task.attachments = [{
      fileUrl: uploaded.fileUrl,
      fileType: uploaded.fileType,
    }];
  }

  // ✅ Assign other fields
  const excludedFields = ["attachments", "newAttachmentFile"];
  for (const key in updateData) {
    if (!excludedFields.includes(key)) {
      task[key] = updateData[key];
    }
  }

  // ✅ Emit socket if task is completed
  if (updateData.status === "Completed") {
    emitTaskCompletedSocket(task._id.toString(), [
      task.assignedTo.toString(),
      task.createdBy.toString(),
    ]);
  }

  await task.save();
  await task.populate([
    { path: "projects", select: "name" },
    { path: "assignedTo", select: "name email" },
    { path: "createdBy", select: "name email" },
  ]);

  return task;
};

// ✅ Delete Task (with attachment cleanup)
const deleteTask = async (taskId, companyId) => {
  const task = await Task.findOne({ _id: taskId, companyId });
  if (!task) return null;

  // Delete attachments
  if (task.attachments?.length) {
    for (const file of task.attachments) {
      const fileKey = extractFileKey(file.fileUrl);
      if (fileKey) await taskFileService.deleteTaskAttachment(fileKey);
    }
  }

  // Delete daily update attachments
  if (task.dailyUpdates?.length) {
    for (const update of task.dailyUpdates) {
      if (update.attachment?.fileUrl) {
        const fileKey = extractFileKey(update.attachment.fileUrl);
        if (fileKey) await taskFileService.deleteTaskAttachment(fileKey);
      }
    }
  }

  // Delete review files
  if (task.review?.reviewAttachments?.length) {
    for (const file of task.review.reviewAttachments) {
      const fileKey = extractFileKey(file.fileUrl);
      if (fileKey) await taskFileService.deleteTaskAttachment(fileKey);
    }
  }

  await Task.findByIdAndDelete(taskId);
  return { message: "Task hard-deleted", taskId };
};

// ✅ Add Daily Comment (Scoped)
// ✅ Add Daily Comment (Scoped)
const addDailyComment = async (staffId, taskId, comment, file = null, companyId) => {
  const task = await Task.findOne({ _id: taskId, companyId });
  if (!task) throw new Error("Task not found.");

  if (!comment && !file) {
    throw new Error("Comment or file is required.");
  }

  const dailyUpdate = {
    staffId,
    comment: comment || "",
    date: new Date(),
  };

  if (file) {
    const { buffer, originalname, mimetype } = file;

    // Only proceed with file upload if all file data is valid
    if (buffer && originalname && mimetype) {
      const uploaded = await taskFileService.uploadDailyUpdateAttachment(
        buffer,
        originalname,
        mimetype,
        taskId,
        companyId
      );

      dailyUpdate.attachment = {
        fileUrl: uploaded.fileUrl,
        fileType: uploaded.fileType,
        fileName: uploaded.fileName || originalname,
      };
    }
  }

  task.dailyUpdates.push(dailyUpdate);
  await task.save();
};


// ✅ Auto Adjust Priorities (Per Company)
const autoAdjustTaskPriorities = async (companyId) => {
  const now = new Date();
  const tasks = await Task.find({
    status: { $in: ["To Do", "Ongoing"] },
    isDeleted: false,
    companyId
  });

  for (const task of tasks) {
    const daysLeft = Math.ceil((new Date(task.dueDate) - now) / (1000 * 60 * 60 * 24));
    const allowed =
      daysLeft <= 2
        ? ["High"]
        : daysLeft <= 5
        ? ["High", "Medium"]
        : ["High", "Medium", "Low"];

    if (!allowed.includes(task.priority)) {
      task.priority = "High";
      await task.save();
    }
  }
};

// ✅ Get Daily Comments (All with updates)
const getDailyComments = async (companyId) => {
  return Task.find({ "dailyUpdates.0": { $exists: true }, companyId })
    .select("title dailyUpdates")
    .populate("dailyUpdates.staffId", "name email")
    .lean();
};

// ✅ Auto Delete Old Daily Comments (Older than 2 days)
const autoDeleteOldDailyComments = async (companyId) => {
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const tasks = await Task.find({ "dailyUpdates.0": { $exists: true }, companyId });

  for (const task of tasks) {
    const oldUpdates = task.dailyUpdates.filter((update) => update.date <= twoDaysAgo);
    for (const update of oldUpdates) {
      if (update.attachment?.fileUrl) {
        const fileKey = extractFileKey(update.attachment.fileUrl);
        if (fileKey) await taskFileService.deleteTaskAttachment(fileKey);
      }
    }
    task.dailyUpdates = task.dailyUpdates.filter((update) => update.date > twoDaysAgo);
    await task.save();
  }
};

// ✅ Auto Delete Completed Tasks (Older than 4 days)
const autoDeleteCompletedTasks = async (companyId) => {
  const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
  const tasks = await Task.find({
    status: "Completed",
    updatedAt: { $lt: fourDaysAgo },
    companyId
  });

  for (const task of tasks) {
    if (task.attachments?.length) {
      for (const file of task.attachments) {
        const fileKey = extractFileKey(file.fileUrl);
        if (fileKey) await taskFileService.deleteTaskAttachment(fileKey);
      }
    }

    if (task.dailyUpdates?.length) {
      for (const update of task.dailyUpdates) {
        if (update.attachment?.fileUrl) {
          const fileKey = extractFileKey(update.attachment.fileUrl);
          if (fileKey) await taskFileService.deleteTaskAttachment(fileKey);
        }
      }
    }

    if (task.review?.reviewAttachments?.length) {
      for (const file of task.review.reviewAttachments) {
        const fileKey = extractFileKey(file.fileUrl);
        if (fileKey) await taskFileService.deleteTaskAttachment(fileKey);
      }
    }

    await Task.findByIdAndDelete(task._id);
  }
};
// ✅ Get Kanban Tasks (Assigned to a staff)
const getTasksForKanban = async (staffId, companyId) => {
  const tasks = await Task.find({ assignedTo: staffId, companyId })
    .select("title status priority dueDate description projects attachments review")
    .populate("projects", "name");

  const now = new Date();
  const kanbanData = { todo: [], ongoing: [], review: [], completed: [] };

  for (let task of tasks) {
    const dueDate = new Date(task.dueDate);
    const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

    const allowedPriorities =
      daysLeft <= 2
        ? ["High"]
        : daysLeft <= 5
        ? ["High", "Medium"]
        : ["High", "Medium", "Low"];

    if (!allowedPriorities.includes(task.priority)) {
      task.priority = "High";
      await task.save();
    }

    const key = (task.status || "").toLowerCase().replace(/\s+/g, "");
    if (["todo", "ongoing", "review", "completed"].includes(key)) {
      kanbanData[key].push(task.toObject());
    }
  }

  return kanbanData;
};

// ✅ Move Task to Review
const moveToReview = async (taskId, staffId, file, companyId) => {
  const task = await Task.findOne({ _id: taskId, companyId }).populate("createdBy", "email name");
  if (!task || task.assignedTo?.toString() !== staffId.toString()) {
    throw new Error("Task not found or not authorized.");
  }

  task.status = "Review";
  task.review = task.review || {};
  task.review.isUnderReview = true;
  task.review.status = "pending";
  task.review.reviewAttachments = task.review.reviewAttachments || [];

  if (file) {
    const uploadResult = await taskFileService.uploadTaskReviewAttachment(file, taskId, companyId);
    task.review.reviewAttachments.push({
      fileUrl: uploadResult.fileUrl,
      fileType: uploadResult.fileType,
    });
  }

  if (task.createdBy?.email) {
    await emailService.sendReviewNotificationMail(task.createdBy.email, task.title);
  }

  await task.save();
  return task;
};

// ✅ Handle Review Decision
const handleReviewDecision = async ({
  taskId,
  decision,
  comment,
  reviewerId,
  newDueDate,
  newPriority,
  companyId
}) => {
  const task = await Task.findOne({ _id: taskId, companyId }).populate("assignedTo createdBy");

  if (!task || task.status !== "Review" || !task.review?.isUnderReview) {
    throw new Error("Task not found or not under review.");
  }

  task.review = task.review || {};
  task.review.reviewHistory = task.review.reviewHistory || [];

  task.review.reviewHistory.push({
    by: reviewerId,
    decision,
    comment,
    date: new Date(),
  });

  task.review.reason = comment;
  task.review.reviewedBy = reviewerId;
  task.review.isUnderReview = false;

  if (decision === "approved") {
    task.status = "Completed";

    const assignedToId = task.assignedTo?._id?.toString?.() || task.assignedTo?.toString?.();
    const createdById = task.createdBy?._id?.toString?.() || task.createdBy?.toString?.();

    if (assignedToId && createdById && companyId) {
      emitTaskCompletedSocket(task._id.toString(), [assignedToId, createdById], companyId.toString());
    }

    await emailService.sendApprovalEmail(task, comment);
  } else if (decision === "rejected") {
    task.status = "Ongoing";

    if (newDueDate) task.dueDate = new Date(newDueDate);
    if (newPriority) task.priority = newPriority;

    await emailService.sendRejectionEmail(task, comment);
  } else {
    throw new Error("Invalid review decision.");
  }

  if (
    Array.isArray(task.review.reviewAttachments) &&
    task.review.reviewAttachments.length
  ) {
    for (const attachment of task.review.reviewAttachments) {
      const fileKey = extractFileKey(attachment.fileUrl);
      if (fileKey) await taskFileService.deleteTaskAttachment(fileKey);
    }
    task.review.reviewAttachments = [];
  }

  await task.save();
  return task;
};

// ✅ Tasks Created By Me
const getTasksAssignedByMe = async (staffId, companyId) => {
  return Task.find({ createdBy: staffId, companyId })
    .populate("assignedTo", "name email")
    .populate("projects", "name")
    .lean();
};

// ✅ Staff Status Update
const updateTaskStatusByStaff = async (taskId, updateData, staffId, userRole, companyId) => {
  const query = { _id: taskId, companyId };
  if (userRole !== "admin") query.assignedTo = staffId;

  const task = await Task.findOne(query).populate("assignedTo createdBy");
  if (!task) throw new Error("Task not found.");

  if (updateData.status) {
    task.status = updateData.status;

    if (updateData.status === "Completed") {
      const assignedToId = task.assignedTo?._id?.toString?.() || task.assignedTo?.toString?.();
      const createdById  = task.createdBy?._id?.toString?.() || task.createdBy?.toString?.();

      if (assignedToId && createdById && companyId) {
        emitTaskCompletedSocket(task._id.toString(), [assignedToId, createdById], companyId.toString());
      }
    }
  }

  await task.save();
  return task;
};


// ✅ Daily Comments by Creator
const getDailyCommentsByCreator = async (userId, companyId) => {
  const tasks = await Task.find({ createdBy: userId, companyId })
    .select("title dailyUpdates")
    .populate("dailyUpdates.staffId", "name email")
    .lean();

  const updates = [];

  for (const task of tasks) {
    if (Array.isArray(task.dailyUpdates)) {
      for (const update of task.dailyUpdates) {
        updates.push({
          taskId: task._id,
          taskTitle: task.title || "Untitled Task",
          staffName: update?.staffId?.name || "N/A",
          comment: update?.comment || "",
          date: update?.date || null,
          fileUrl: update?.attachment?.fileUrl || null,
          fileName: update?.attachment?.fileName || null,
          fileType: update?.attachment?.fileType || null,
          fileKey: update?.attachment?.fileUrl
            ? update.attachment.fileUrl.split(".com/")[1]
            : null,
        });
      }
    }
  }

  return updates.sort((a, b) => new Date(b.date) - new Date(a.date));
};

// ✅ CRON
cron.schedule("0 1 * * *", autoDeleteOldDailyComments);
cron.schedule("30 1 * * *", autoDeleteCompletedTasks);

module.exports = {
  createTask,
  getAllTasks,
  getTaskById,
  getTasksByStaffId,
  updateTask,
  deleteTask,
  addDailyComment,
  autoAdjustTaskPriorities,
  getDailyComments,
  autoDeleteOldDailyComments,
  autoDeleteCompletedTasks,
  getTasksForKanban,
  updateTaskStatusByStaff,
  moveToReview,
  handleReviewDecision,
  getTasksAssignedByMe,
  getDailyCommentsByCreator,
};
