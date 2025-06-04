import { tokenRefreshInterceptor as axiosInstance } from "../utils/axiosInstance";

const CHAT_BASE = "/chat";
const TASK_BASE = "/tasks";

const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

// 🔹 Fetch tasks for current user (staff)
export const getMyChatTasks = async () => {
  try {
    const { data } = await axiosInstance.get(`${CHAT_BASE}/my-tasks`);
    return { success: true, tasks: data.tasks || [] };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// 🔹 Fetch messages for a task
export const fetchTaskChatMessages = async (taskId) => {
  try {
    const { data } = await axiosInstance.get(`${CHAT_BASE}/${taskId}`);
    return { success: true, messages: data.messages || [] };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// 🔹 Fallback for sending plain text messages
export const sendTaskMessageFallback = async (taskId, message, receiverId) => {
  try {
    const res = await axiosInstance.post(`${CHAT_BASE}/${taskId}`, {
      message,
      receiverId,
    });
    return { success: true, message: res.data };
  } catch (err) {
    throw {
      success: false,
      error: err.response?.data?.message || err.message,
      status: err.response?.status,
    };
  }
};

// 🔹 Send message (text + attachments)
export const sendMessage = async (taskId, { message, receiverId, attachments = [] }) => {
  try {
    const formData = new FormData();
    formData.append("message", message);
    formData.append("receiverId", receiverId);
    attachments.forEach(file => formData.append("attachments", file));

    const { data } = await axiosInstance.post(`${CHAT_BASE}/${taskId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return { success: true, message: data.message };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// 🔹 Delete all messages for a task
export const deleteTaskMessages = async (taskId) => {
  try {
    const { data } = await axiosInstance.delete(`${CHAT_BASE}/${taskId}`);
    return data;
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// 🔹 Get recent chats (inbox style)
export const getRecentChats = async () => {
  try {
    const { data } = await axiosInstance.get(`${CHAT_BASE}/recent`);
    return { success: true, chats: data };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// 🔹 Get messages with a user (1:1 conversation)
export const getConversationWithUser = async (userId) => {
  try {
    const { data } = await axiosInstance.get(`${CHAT_BASE}/conversation/${userId}`);
    return { success: true, messages: data };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// 🔹 Search within task chat
export const searchMessages = async (query, taskId) => {
  try {
    const params = new URLSearchParams({ query });
    if (taskId) params.append("taskId", taskId);

    const { data } = await axiosInstance.get(`${CHAT_BASE}/search?${params.toString()}`);
    return { success: true, messages: data.messages };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// 🔹 Get unread count for the logged-in user
export const getUnreadCount = async () => {
  try {
    const { data } = await axiosInstance.get(`${CHAT_BASE}/unread`);
    return { success: true, count: data.unreadCount };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// 🔹 Mark messages as read for a task/user
export const markMessagesAsRead = async (params) => {
  try {
    await axiosInstance.post(`${CHAT_BASE}/mark-read`, params);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// 🔹 Edit a sent message
export const editMessage = async (messageId, newText) => {
  try {
    const { data } = await axiosInstance.put(`${CHAT_BASE}/message/${messageId}`, {
      message: newText,
    });
    return { success: true, message: data.message }; // ✅ returns updated message
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// 🔹 Delete a single message
export const deleteMessage = async (messageId) => {
  try {
    await axiosInstance.delete(`${CHAT_BASE}/message/${messageId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// 🔹 Upload an attachment to chat (S3/file store)
export const uploadAttachment = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await axiosInstance.post(`${CHAT_BASE}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return { success: true, fileUrl: data.fileUrl };
  } catch (err) {
    return { success: false, error: err.message };
  }
};
