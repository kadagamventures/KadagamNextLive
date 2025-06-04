const Chat = require('../models/Chat');
const User = require('../models/User');

const MAX_MESSAGE_LENGTH = 1000;
const MESSAGE_RATE_LIMIT = 60;

// ─────────────────────────────────────────────
// 🔵 Create and save a new chat message
// ─────────────────────────────────────────────
async function createMessage({ senderId, receiverId, taskId, message, companyId }) {
  try {
    if (!senderId || !receiverId || !taskId || !companyId) {
      throw new Error("Missing required fields (sender, receiver, task, company).");
    }
    if (!message?.trim()) throw new Error("MESSAGE_REQUIRED");
    if (message.length > MAX_MESSAGE_LENGTH) throw new Error("MESSAGE_TOO_LONG");

    const recentMessages = await Chat.countDocuments({
      senderId,
      companyId: companyId.toString(),
      timestamp: { $gt: new Date(Date.now() - 60000) },
      isDeleted: { $ne: true },
    });
    if (recentMessages >= MESSAGE_RATE_LIMIT) throw new Error("RATE_LIMIT_EXCEEDED");

    const sender = await User.findById(senderId).select("name");
    const senderName = sender ? sender.name : "Unknown";

    const chat = new Chat({
      senderId,
      senderName,
      receiverId,
      taskId,
      companyId: companyId.toString(),
      message: message.trim(),
      timestamp: new Date(),
      read: false,
      delivered: false,
      isDeleted: false,
    });

    return await chat.save();
  } catch (err) {
    console.error("Error creating message:", err.message);
    throw new Error(`MESSAGE_CREATE_FAILED: ${err.message}`);
  }
}

// ─────────────────────────────────────────────
// ✅ Mark a message as delivered
// ─────────────────────────────────────────────
async function markMessageDelivered(messageId) {
  if (!messageId) throw new Error("Message ID is required.");
  try {
    return await Chat.findOneAndUpdate(
      { _id: messageId, isDeleted: { $ne: true } },
      { delivered: true, deliveredAt: new Date() },
      { new: true }
    );
  } catch (err) {
    console.error("Error marking message as delivered:", err.message);
    throw new Error("Failed to mark message as delivered.");
  }
}

// ─────────────────────────────────────────────
// ✅ Mark messages as read (within task & company)
// ─────────────────────────────────────────────
async function markMessagesRead(taskId, userId, companyId) {
  if (!taskId || !userId || !companyId) throw new Error("Task ID, User ID, and Company ID are required.");
  try {
    return await Chat.updateMany(
      {
        taskId,
        receiverId: userId,
        companyId: companyId.toString(),
        read: false,
        isDeleted: { $ne: true }
      },
      { $set: { read: true, readAt: new Date() } }
    );
  } catch (err) {
    console.error("Error marking messages as read:", err.message);
    throw new Error("Failed to mark messages as read.");
  }
}

// ─────────────────────────────────────────────
// ✅ Get messages by task (with tenant context)
// ─────────────────────────────────────────────
async function getMessagesByTask(taskId, companyId) {
  if (!taskId || !companyId) throw new Error("Task ID and Company ID are required.");
  try {
    return await Chat.find({ taskId, companyId: companyId.toString(), isDeleted: { $ne: true } })
      .sort({ timestamp: 1 })
      .lean();
  } catch (err) {
    console.error("Error fetching messages:", err.message);
    throw new Error("Failed to fetch messages for the task.");
  }
}

// ✅ Get all messages for a user (Inbox-style)
async function getUserMessages(userId, companyId) {
  if (!userId || !companyId) throw new Error("User ID and Company ID are required.");
  try {
    return await Chat.find({
      companyId: companyId.toString(),
      isDeleted: { $ne: true },
      $or: [{ senderId: userId }, { receiverId: userId }],
    })
      .sort({ timestamp: 1 })
      .populate("taskId", "title status")
      .lean();
  } catch (err) {
    console.error("Error fetching user messages:", err.message);
    throw new Error("Failed to fetch user messages.");
  }
}

// ✅ Delete all messages of a task (for given company)
async function deleteMessagesByTask(taskId, companyId) {
  if (!taskId || !companyId) throw new Error("Task ID and Company ID are required.");
  try {
    return await Chat.updateMany(
      { taskId, companyId: companyId.toString() },
      { isDeleted: true, deletedAt: new Date() }
    );
  } catch (err) {
    console.error("Error deleting messages:", err.message);
    throw new Error("Failed to delete task messages.");
  }
}

// ✅ Auto-delete old messages (older than N days for tenant)
async function deleteOldMessages(days = 30, companyId) {
  if (!companyId) throw new Error("Company ID is required.");
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  try {
    return await Chat.updateMany(
      {
        companyId: companyId.toString(),
        timestamp: { $lt: cutoff }
      },
      { isDeleted: true, deletedAt: new Date() }
    );
  } catch (err) {
    console.error("Error deleting old messages:", err.message);
    throw new Error("Failed to delete old messages.");
  }
}

// ✅ Get all active task IDs (for a company)
async function getAllActiveTaskIds(companyId) {
  if (!companyId) throw new Error("Company ID is required.");
  try {
    const results = await Chat.aggregate([
      { $match: { companyId: companyId.toString(), isDeleted: { $ne: true } } },
      { $group: { _id: "$taskId" } },
      { $project: { taskId: "$_id", _id: 0 } }
    ]);
    return results.map(r => r.taskId);
  } catch (err) {
    console.error("Error getting active task IDs:", err.message);
    throw new Error("Failed to fetch active task IDs.");
  }
}

// ✅ Get latest message for a task in tenant context
async function getLatestMessageForTask(taskId, companyId) {
  if (!taskId || !companyId) throw new Error("Task ID and Company ID are required.");
  try {
    return await Chat.findOne({ taskId, companyId: companyId.toString(), isDeleted: { $ne: true } })
      .sort({ timestamp: -1 })
      .lean();
  } catch (err) {
    console.error("Error getting latest message:", err.message);
    throw new Error("Failed to fetch latest message.");
  }
}

// ✅ Get unread message count for a user (in a company)
async function getUnreadCountForUser(userId, companyId) {
  if (!userId || !companyId) throw new Error("User ID and Company ID are required.");
  try {
    return await Chat.countDocuments({
      companyId: companyId.toString(),
      receiverId: userId,
      read: false,
      isDeleted: { $ne: true }
    });
  } catch (err) {
    console.error("Error getting unread count:", err.message);
    throw new Error("Failed to get unread count.");
  }
}

// ✅ Get unread count for a specific task for the user
async function getUnreadCountForTask(taskId, userId, companyId) {
  if (!taskId || !userId || !companyId) throw new Error("Task ID, User ID, and Company ID are required.");
  try {
    return await Chat.countDocuments({
      companyId: companyId.toString(),
      taskId,
      receiverId: userId,
      read: false,
      isDeleted: { $ne: true }
    });
  } catch (err) {
    console.error("Error getting unread count for task:", err.message);
    throw new Error("Failed to get unread count for task/user.");
  }
}

// ✅ Edit a message (only content editable)
async function editMessage(messageId, newText, companyId) {
  if (!messageId || !newText || !companyId) throw new Error("Message ID, text, and Company ID are required.");
  try {
    return await Chat.findOneAndUpdate(
      { _id: messageId, companyId: companyId.toString(), isDeleted: { $ne: true } },
      { message: newText, edited: true },
      { new: true }
    );
  } catch (err) {
    console.error("Error editing message:", err.message);
    throw new Error("Failed to edit message.");
  }
}

// ✅ Delete a message (from a tenant)
async function deleteMessage(messageId, companyId) {
  if (!messageId || !companyId) throw new Error("Message ID and Company ID are required.");
  try {
    await Chat.findOneAndUpdate(
      { _id: messageId, companyId: companyId.toString() },
      { isDeleted: true, deletedAt: new Date() }
    );
    return { success: true };
  } catch (err) {
    console.error("Error deleting message:", err.message);
    throw new Error("Failed to delete message.");
  }
}

// ✅ Search messages globally or within a task (tenant scoped)
async function searchMessages(query, companyId, taskId = null) {
  if (!query || !companyId) throw new Error("Query string and Company ID are required.");
  const filter = {
    companyId: companyId.toString(),
    message: { $regex: query, $options: "i" },
    isDeleted: { $ne: true }
  };
  if (taskId) filter.taskId = taskId;

  try {
    return await Chat.find(filter).sort({ timestamp: -1 }).lean();
  } catch (err) {
    console.error("Error searching messages:", err.message);
    throw new Error("Failed to search messages.");
  }
}

module.exports = {
  createMessage,
  markMessageDelivered,
  markMessagesRead,
  getMessagesByTask,
  getUserMessages,
  deleteMessagesByTask,
  deleteOldMessages,
  getAllActiveTaskIds,
  getLatestMessageForTask,
  getUnreadCountForUser,
  getUnreadCountForTask,
  editMessage,
  deleteMessage,
  searchMessages,
};
