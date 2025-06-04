const chatService = require("../services/chatService");
const roomChatService = require("../services/roomChatService");
const chatRedis = require("../utils/chatRedisUtil");
const { waitForRedis } = require("../config/redisConfig");

const connectedUsers = new Map(); // userId -> [socketIds]

module.exports = (io, socket) => {
  const userId = socket.user.id;
  const userName = socket.user.name;
  const companyId = socket.user.companyId; // ✅ Multi-tenant
  const { role, permissions } = socket.user;

  if (!connectedUsers.has(userId)) connectedUsers.set(userId, []);
  connectedUsers.get(userId).push(socket.id);
  chatRedis.setOnline(userId);

  // ──────────────────────────────
  // 🔹 Task-based 1-on-1 Chat
  // ──────────────────────────────

  socket.on("joinTaskRoom", async (taskId) => {
    const room = `task_${taskId}_${companyId}`; // ✅ Scoped by tenant
    socket.join(room);

    try {
      const history = await chatService.getMessagesByTask(taskId, companyId);
      socket.emit("chatHistory", history.map(msg => ({
        _id: msg._id?.toString(),
        senderId: msg.senderId?.toString(),
        senderName: msg.senderName,
        receiverId: msg.receiverId?.toString(),
        taskId: msg.taskId?.toString(),
        message: msg.message,
        timestamp: msg.timestamp,
        delivered: msg.delivered,
        read: msg.read,
        edited: msg.edited || false,
      })));

      for (const msg of history) {
        if (msg.receiverId?.toString() === userId.toString() && !msg.delivered) {
          await chatService.markMessageDelivered(msg._id);
          socket.emit("messageDelivered", { messageId: msg._id });
        }
      }
    } catch (err) {
      console.error("❌ Error fetching task chat:", err.message);
      socket.emit("error", "Failed to load chat history");
    }
  });

  socket.on("sendMessage", async ({ taskId, receiverId, message, tempId }) => {
    if (!taskId || !receiverId || !message?.trim()) {
      return socket.emit("error", "Invalid message payload");
    }

    try {
      const savedMessage = await chatService.createMessage({
        senderId: userId,
        senderName: userName,
        receiverId,
        taskId,
        message,
        companyId, // ✅ Important for tenant scoping
      });

      const payload = {
        _id: savedMessage._id?.toString(),
        senderId: savedMessage.senderId?.toString(),
        senderName: savedMessage.senderName,
        receiverId: savedMessage.receiverId?.toString(),
        taskId: savedMessage.taskId?.toString(),
        message: savedMessage.message,
        timestamp: savedMessage.timestamp,
        delivered: savedMessage.delivered,
        read: savedMessage.read,
        tempId: tempId || null,
        edited: savedMessage.edited || false,
      };

      const room = `task_${taskId}_${companyId}`;
      io.to(room).emit("messageReceived", payload);

      const receivers = await io.in(room).fetchSockets();
      const isReceiverOnline = receivers.some((s) => s.user.id === receiverId);

      if (isReceiverOnline) {
        await chatService.markMessageDelivered(savedMessage._id);
        io.to(room).emit("messageDelivered", { messageId: savedMessage._id });
      }
    } catch (err) {
      console.error("❌ Error sending task message:", err.message);
      socket.emit("error", "Failed to send task message");
    }
  });

  socket.on("typing", ({ taskId }) => {
    chatRedis.setTyping(taskId, userId)
      .then(() => socket.to(`task_${taskId}_${companyId}`).emit("typing", { userId }))
      .catch((err) => console.error("❌ Typing indicator error:", err.message));
  });

  socket.on("markRead", async ({ taskId }) => {
    try {
      await chatService.markMessagesRead(taskId, userId, companyId);
      io.to(`task_${taskId}_${companyId}`).emit("messageSeen", { taskId, userId });
    } catch (err) {
      console.error("❌ Mark read error:", err.message);
    }
  });

  socket.on("editMessage", async ({ messageId, newText }, callback) => {
    try {
      const updated = await chatService.editMessage(messageId, newText, companyId);
      const payload = {
        _id: updated._id.toString(),
        taskId: updated.taskId.toString(),
        message: updated.message,
        edited: true,
        timestamp: updated.timestamp,
      };
      io.to(`task_${updated.taskId}_${companyId}`).emit("messageEdited", payload);
      callback?.({ success: true, message: payload });
    } catch (err) {
      console.error("❌ Failed to edit message:", err.message);
      callback?.({ success: false, error: err.message });
    }
  });

    // ──────────────────────────────
  // 🔹 Group Room Chat
  // ──────────────────────────────

  socket.on("joinRoomChat", (roomId) => {
    const roomKey = `room_${roomId}_${companyId}`;
    socket.join(roomKey);
  });

  socket.on("leaveRoomChat", (roomId) => {
    const roomKey = `room_${roomId}_${companyId}`;
    socket.leave(roomKey);
  });

  socket.on("sendRoomMessage", async ({ roomId, message, tempId }, callback) => {
    try {
      const savedMessage = await roomChatService.createRoomMessage({
        senderId: userId,
        senderName: userName,
        roomId,
        companyId, // ✅ Tenant scoped
        message,
      });

      const payload = {
        _id: savedMessage._id.toString(),
        senderId: userId,
        senderName: userName,
        roomId,
        text: savedMessage.text,
        timestamp: savedMessage.timestamp,
        tempId: tempId || null,
      };

      const roomKey = `room_${roomId}_${companyId}`;
      io.to(roomKey).emit("roomMessageReceived", payload);
      callback?.({ success: true, message: payload });
    } catch (err) {
      console.error("❌ Failed to send group message:", err.message);
      callback?.({ success: false, error: err.message });
    }
  });

  socket.on("editRoomMessage", async ({ roomId, messageId, newText }, callback) => {
    try {
      const room = await roomChatService.getRoomById(roomId, companyId);
      const msg = room.messages.find(m => m._id.toString() === messageId);
      if (!msg || msg.sender.toString() !== userId) {
        return callback?.({ success: false, error: "Unauthorized or message not found" });
      }

      msg.text = newText;
      msg.edited = true;
      msg.timestamp = new Date();
      await roomChatService.saveRoom(room, companyId);

      const updatedMsg = {
        _id: messageId,
        roomId,
        text: newText,
        timestamp: msg.timestamp,
        edited: true,
      };

      const roomKey = `room_${roomId}_${companyId}`;
      io.to(roomKey).emit("roomMessageEdited", updatedMsg);
      callback?.({ success: true, message: updatedMsg });
    } catch (err) {
      console.error("❌ Failed to edit room message:", err.message);
      callback?.({ success: false, error: err.message });
    }
  });

  socket.on("markRoomMessageDelivered", ({ roomId, messageId }) => {
    const roomKey = `room_${roomId}_${companyId}`;
    io.to(roomKey).emit("roomMessageDelivered", { roomId, messageId, userId });
  });

  socket.on("markRoomMessageRead", async ({ roomId, messageId }) => {
    try {
      const redis = await waitForRedis();
      await redis.set(`read:${roomId}:${companyId}:${userId}:${messageId}`, Date.now().toString());
      const roomKey = `room_${roomId}_${companyId}`;
      io.to(roomKey).emit("roomMessageRead", {
        roomId, messageId, userId, timestamp: Date.now(),
      });
    } catch (err) {
      console.error("❌ Room mark read error:", err.message);
    }
  });

  socket.on("roomTyping", ({ roomId }) => {
    const roomKey = `room_${roomId}_${companyId}`;
    socket.to(roomKey).emit("roomTyping", { userId });
  });

  // 🔹 Admin Join All Tasks
  socket.on("adminJoinAllTasks", async () => {
    if (role !== "admin" && !(permissions || []).includes("manage_task")) {
      return socket.emit("error", "Unauthorized for admin task join");
    }

    try {
      const taskIds = await chatService.getAllActiveTaskIds(companyId);
      taskIds.forEach((id) => socket.join(`task_${id}_${companyId}`));
      socket.emit("joinedAllTasks", taskIds);
    } catch (err) {
      console.error("❌ Admin join error:", err.message);
      socket.emit("error", "Failed to join all tasks");
    }
  });

  // 🔄 Cleanup on task completion
  socket.on("task_completed", async ({ taskId }) => {
    try {
      await chatService.deleteMessagesByTask(taskId, companyId);
      const roomKey = `task_${taskId}_${companyId}`;
      io.to(roomKey).emit("chatAutoDeleted", { taskId });

      const sockets = await io.in(roomKey).fetchSockets();
      sockets.forEach((s) => s.leave(roomKey));
    } catch (err) {
      console.error("❌ Task cleanup error:", err.message);
    }
  });

  // 🔥 Delete room messages
  socket.on("deleteRoom", async ({ roomId }) => {
    try {
      await roomChatService.deleteRoomMessages(roomId, companyId);
      const roomKey = `room_${roomId}_${companyId}`;
      io.to(roomKey).emit("roomDeleted", { roomId });

      const sockets = await io.in(roomKey).fetchSockets();
      sockets.forEach((s) => s.leave(roomKey));
    } catch (err) {
      console.error("❌ Room cleanup error:", err.message);
    }
  });

  // 🔥 Delete full room (creator only)
  socket.on("deleteRoomEntity", async ({ roomId }) => {
    try {
      const room = await roomChatService.deleteRoom(roomId, userId, companyId);
      if (!room) throw new Error("ROOM_NOT_FOUND_OR_UNAUTHORIZED");

      const roomKey = `room_${roomId}_${companyId}`;
      io.to(roomKey).emit("roomDeleted", { roomId });

      const sockets = await io.in(roomKey).fetchSockets();
      sockets.forEach((s) => s.leave(roomKey));
      console.log(`✅ Room ${roomId} deleted.`);
    } catch (err) {
      console.error("❌ Failed to delete room entity:", err.message);
      socket.emit("error", "Failed to delete room.");
    }
  });

  // 🔌 Disconnect cleanup
  socket.on("disconnect", async () => {
    const sockets = connectedUsers.get(userId) || [];
    const remaining = sockets.filter((id) => id !== socket.id);

    if (remaining.length === 0) {
      connectedUsers.delete(userId);
      await chatRedis.setOffline(userId);
    } else {
      connectedUsers.set(userId, remaining);
    }

    console.log(`[🔌 Disconnected] ${userId} (${socket.id})`);
  });
};

