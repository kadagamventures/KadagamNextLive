const roomChatService = require("../services/roomChatService");
const { createNotification } = require("../services/notificationService");

/**
 * 🏗️ Create a new chat room (creator is auto-added).
 */
exports.createRoom = async (req, res) => {
  try {
    const { roomName, members = [] } = req.body;
    const createdBy = req.user.id;
    const companyId = req.user.companyId?.toString();

    const room = await roomChatService.createRoom({
      roomName: roomName.trim(),
      members: Array.isArray(members) ? members : [],
      createdBy,
      companyId,
    });

    return res.status(201).json({ success: true, room });
  } catch (err) {
    const error = err.message || "UNKNOWN_ERROR";

    if (error === "ROOM_NAME_INVALID_LENGTH") {
      return res.status(400).json({
        success: false,
        message: "Room name must be between 3 and 50 characters",
        error,
      });
    }

    if (error === "ROOM_MEMBER_LIMIT_EXCEEDED") {
      return res.status(400).json({
        success: false,
        message: "Room cannot have more than 50 members",
        error,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create room",
      error,
    });
  }
};

/**
 * 📦 Get a specific room's metadata.
 */
exports.getRoomDetails = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const companyId = req.user.companyId?.toString();

    const room = await roomChatService.getRoomById(roomId, companyId);
    return res.status(200).json({ success: true, room });
  } catch (err) {
    next(err);
  }
};

/**
 * 👤 Get all rooms the logged-in user is part of.
 */
exports.getUserRooms = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.companyId?.toString();

    const rooms = await roomChatService.getRoomsForUser(userId, companyId);
    return res.status(200).json({ success: true, rooms });
  } catch (err) {
    next(err);
  }
};

/**
 * ❌ Delete a room (only creator allowed).
 */
exports.deleteRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const companyId = req.user.companyId?.toString();

    await roomChatService.deleteRoom(roomId, userId, companyId);
    return res.status(200).json({
      success: true,
      message: "Room deleted successfully"
    });
  } catch (err) {
    const error = err.message || "UNKNOWN_ERROR";

    if (error === "ONLY_CREATOR_CAN_DELETE_ROOM") {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this room",
        error,
      });
    }

    if (error === "ROOM_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Room not found",
        error,
      });
    }

    next(err);
  }
};

/**
 * 💬 Send a message to a room.
 */
exports.sendRoomMessage = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { message } = req.body;
    const senderId = req.user.id;
    const companyId = req.user.companyId?.toString();

    const msg = await roomChatService.createRoomMessage({
      senderId,
      roomId,
      message,
      companyId,
    });

    // 🔔 Notify other room members, passing companyId as string
    const room = await roomChatService.getRoomById(roomId, companyId);
    const senderName = req.user.name || "Someone";

    await Promise.all(
      room.members
        .filter(memberId => memberId.toString() !== senderId.toString())
        .map(memberId =>
          createNotification({
            staffId: memberId.toString(),
            type: "CHAT",
            title: `New message in ${room.roomName}`,
            message: `${senderName} sent a new message in room: "${room.roomName}"`,
            companyId,                     // now a string
          })
        )
    );

    return res.status(201).json({ success: true, message: msg });
  } catch (err) {
    const error = err.message || "UNKNOWN_ERROR";

    if (error === "MESSAGE_TOO_LONG") {
      return res.status(400).json({
        success: false,
        message: "Message exceeds max length (1000 characters)",
        error,
      });
    }

    if (error === "RATE_LIMIT_EXCEEDED") {
      return res.status(429).json({
        success: false,
        message: "Rate limit exceeded. Try again shortly.",
        error,
      });
    }

    if (error === "SENDER_NOT_IN_ROOM") {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this room",
        error,
      });
    }

    if (error === "ROOM_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Room not found",
        error,
      });
    }

    next(err);
  }
};

/**
 * 📜 Get all messages from a room.
 */
exports.getRoomMessages = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const companyId = req.user.companyId?.toString();

    const messages = await roomChatService.getMessagesByRoom(roomId, companyId);
    return res.status(200).json({ success: true, messages });
  } catch (err) {
    next(err);
  }
};

/**
 * 🧹 Clear all messages from a room.
 */
exports.deleteRoomMessages = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const companyId = req.user.companyId?.toString();

    const result = await roomChatService.deleteRoomMessages(roomId, companyId);
    return res.status(200).json({
      success: true,
      message: "Room messages deleted successfully",
      room: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 🗑️ Delete a specific message from a room
 */
exports.deleteSingleRoomMessage = async (req, res, next) => {
  try {
    const { roomId, messageId } = req.params;
    const userId = req.user.id;
    const companyId = req.user.companyId?.toString();

    if (!roomId || !messageId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    const result = await roomChatService.deleteSingleRoomMessage(
      roomId,
      messageId,
      userId,
      companyId
    );

    return res.status(200).json({
      success: true,
      message: "Message deleted successfully",
      result,
    });
  } catch (err) {
    const error = err.message || "UNKNOWN_ERROR";

    if (error === "MESSAGE_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Message not found"
      });
    }

    if (error === "NOT_ALLOWED_TO_DELETE_THIS_MESSAGE") {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this message"
      });
    }

    if (error === "ROOM_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Room not found"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error
    });
  }
};

/**
 * ✏️ Edit a specific message in a room
 */
exports.editRoomMessage = async (req, res, next) => {
  try {
    const { roomId, messageId } = req.params;
    const { text } = req.body;
    const userId = req.user.id;
    const companyId = req.user.companyId?.toString();

    if (!roomId || !messageId || !text || !userId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    const updated = await roomChatService.editRoomMessage(
      roomId,
      messageId,
      text,
      userId,
      companyId
    );

    return res.status(200).json({
      success: true,
      message: updated
    });
  } catch (err) {
    const error = err.message || "UNKNOWN_ERROR";

    if (error === "ROOM_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Room not found",
        error
      });
    }

    if (error === "MESSAGE_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Message not found",
        error
      });
    }

    if (error === "NOT_ALLOWED_TO_EDIT_THIS_MESSAGE") {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to edit this message",
        error
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to edit message",
      error
    });
  }
};
