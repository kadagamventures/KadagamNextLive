const chatService = require('../services/chatService');
const Task = require('../models/Task');
const Chat = require('../models/Chat');
const User = require('../models/User');
const { createNotification } = require("../services/notificationService");

// GET /chat/:taskId
exports.getChatHistory = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const companyId = req.user.companyId?.toString();
    if (!taskId || !companyId) throw new Error("Task ID and company ID required.");

    const messages = await chatService.getMessagesByTask(taskId, companyId);
    res.status(200).json({ success: true, messages });
  } catch (err) {
    console.error("Error in getChatHistory:", err.message);
    next(err);
  }
};

// GET /chat/user
exports.getUserChats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.companyId?.toString();
    const messages = await chatService.getUserMessages(userId, companyId);
    res.status(200).json({ success: true, messages });
  } catch (err) {
    console.error("Error in getUserChats:", err.message);
    next(err);
  }
};

// GET /chat/tasks
exports.getChatTasks = async (req, res, next) => {
  try {
    const companyId = req.user.companyId?.toString();
    const tasks = await Task.find({ companyId, assignedTo: { $ne: null }, isDeleted: { $ne: true } })
      .populate('assignedTo', 'name email')
      .sort('-updatedAt');

    const taskIds = tasks.map(t => t._id);
    const lastMessages = await Chat.aggregate([
      { $match: { taskId: { $in: taskIds }, companyId, isDeleted: { $ne: true } } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$taskId',
          lastMessage: { $first: '$message' },
          lastTimestamp: { $first: '$timestamp' },
        },
      },
    ]);

    const messageMap = new Map(
      lastMessages.map(m => [
        m._id.toString(),
        { message: m.lastMessage, timestamp: m.lastTimestamp }
      ])
    );

    const enrichedTasks = tasks.map(task => ({
      _id: task._id,
      title: task.title,
      assignedTo: task.assignedTo,
      lastMessage: messageMap.get(task._id.toString())?.message || null,
      lastTimestamp: messageMap.get(task._id.toString())?.timestamp || null,
    }));

    res.status(200).json({ success: true, tasks: enrichedTasks });
  } catch (err) {
    console.error("Error in getChatTasks:", err.message);
    next(err);
  }
};

// GET /chat/my-tasks
exports.getMyChatTasks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.companyId?.toString();

    const tasks = await Task.find({ companyId, assignedTo: userId, isDeleted: { $ne: true } })
      .populate('createdBy', 'name email role id _id')
      .select('title _id status createdBy createdAt updatedAt')
      .lean();

    res.status(200).json({
      success: true,
      tasks: tasks.map(task => ({
        ...task,
        assignedBy: task.createdBy
          ? { ...task.createdBy, _id: task.createdBy._id || task.createdBy.id }
          : null,
      }))
    });
  } catch (err) {
    console.error("Error in getMyChatTasks:", err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch your tasks.', error: err.message });
  }
};

// POST /chat/:taskId
exports.sendMessage = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { receiverId, message } = req.body;
    const senderId = req.user.id;
    const companyId = req.user.companyId?.toString();

    const chat = await chatService.createMessage({
      senderId,
      receiverId,
      taskId,
      message,
      companyId,
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`task_${taskId}`).emit("messageReceived", {
        taskId,
        message: chat.message,
        senderId: chat.senderId,
        senderName: chat.senderName || "Unknown",
        receiverId: chat.receiverId,
        timestamp: chat.timestamp,
        _id: chat._id,
      });
    }

    await createNotification({
  staffId: receiverId,
  type: "CHAT",
  title: "New Chat Message",
  message: `You have a new message from ${chat.senderName || "a colleague"}.`,
  companyId: companyId.toString()
});


    res.status(201).json({ success: true, chat });
  } catch (err) {
    console.error("Error in sendMessage:", err.message);
    next(err);
  }
};

// DELETE /chat/:taskId
exports.deleteChatHistory = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const companyId = req.user.companyId?.toString();
    const result = await chatService.deleteMessagesByTask(taskId, companyId);
    res.status(200).json({ success: true, result });
  } catch (err) {
    console.error("Error in deleteChatHistory:", err.message);
    next(err);
  }
};

// DELETE /chat/cleanup/old/:days
exports.cleanupOldChats = async (req, res, next) => {
  try {
    const days = parseInt(req.params.days, 10) || 30;
    const companyId = req.user.companyId?.toString();
    const result = await chatService.deleteOldMessages(days, companyId);
    res.status(200).json({ success: true, result });
  } catch (err) {
    console.error("Error in cleanupOldChats:", err.message);
    next(err);
  }
};

// GET /chat/recent
exports.getRecentChats = async (req, res, next) => {
  try {
    const companyId = req.user.companyId?.toString();
    const taskIds = await chatService.getAllActiveTaskIds(companyId);
    const messages = await Promise.all(
      taskIds.map(taskId => chatService.getLatestMessageForTask(taskId, companyId))
    );
    res.status(200).json({ success: true, chats: messages.filter(Boolean) });
  } catch (err) {
    console.error("Error in getRecentChats:", err.message);
    next(err);
  }
};

// GET /chat/conversation/:userId
exports.getConversationWithUser = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;
    const companyId = req.user.companyId?.toString();

    const messages = await Chat.find({
      companyId,
      isDeleted: { $ne: true },
      $or: [
        { senderId: currentUserId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: currentUserId }
      ]
    })
      .sort({ timestamp: 1 })
      .populate('senderId', 'name email')
      .populate('receiverId', 'name email')
      .lean();

    res.status(200).json({ success: true, messages });
  } catch (err) {
    console.error("Error in getConversationWithUser:", err.message);
    next(err);
  }
};

// GET /chat/unread
exports.getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.companyId?.toString();
    const count = await chatService.getUnreadCountForUser(userId, companyId);
    res.status(200).json({ success: true, unreadCount: count });
  } catch (err) {
    console.error("Error in getUnreadCount:", err.message);
    next(err);
  }
};

// POST /chat/mark-read
exports.markMessagesAsRead = async (req, res, next) => {
  try {
    const { taskId } = req.body;
    const userId = req.user.id;
    const companyId = req.user.companyId?.toString();

    await chatService.markMessagesRead(taskId, userId, companyId);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error in markMessagesAsRead:", err.message);
    next(err);
  }
};

// GET /chat/search
exports.searchMessages = async (req, res, next) => {
  try {
    const { query, taskId } = req.query;
    const companyId = req.user.companyId?.toString();
    const messages = await chatService.searchMessages(query, companyId, taskId);
    res.status(200).json({ success: true, messages });
  } catch (err) {
    console.error("Error in searchMessages:", err.message);
    next(err);
  }
};

// PUT /chat/message/:id
exports.editMessage = async (req, res, next) => {
  try {
    const companyId = req.user.companyId?.toString();
    const updated = await chatService.editMessage(req.params.id, req.body.message, companyId);
    res.status(200).json({ success: true, message: updated });
  } catch (err) {
    console.error("Error in editMessage:", err.message);
    next(err);
  }
};

// DELETE /chat/message/:id
exports.deleteMessage = async (req, res, next) => {
  try {
    const companyId = req.user.companyId?.toString();
    await chatService.deleteMessage(req.params.id, companyId);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error in deleteMessage:", err.message);
    next(err);
  }
};
