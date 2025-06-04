const express = require("express");
const router = express.Router();

const roomChatController = require("../controllers/roomChatController");
const { verifyToken } = require("../middlewares/authMiddleware");

// 🔐 Protect all routes with JWT auth
router.use(verifyToken);

/**
 * ================================================
 * 🌐 ROOM CHAT ROUTES — Base: /api/room-chat
 * Supports Multi-Tenant via companyId in req.user
 * ================================================
 */

/**
 * 🔹 POST /api/room-chat/
 * Create a new room
 * Body: { roomName: string, members: [userId1, userId2, ...] }
 */
router.post("/", roomChatController.createRoom);

/**
 * 🔹 GET /api/room-chat/
 * Get all rooms the current user belongs to
 */
router.get("/", roomChatController.getUserRooms);

/**
 * 🔹 GET /api/room-chat/:roomId
 * Get a room's metadata (must be a member)
 */
router.get("/:roomId", roomChatController.getRoomDetails);

/**
 * 🔹 DELETE /api/room-chat/:roomId
 * Delete room (only creator can delete)
 */
router.delete("/:roomId", roomChatController.deleteRoom);

/**
 * 🔹 POST /api/room-chat/:roomId/message
 * Send a new message to a room
 * Body: { message: string }
 */
router.post("/:roomId/message", roomChatController.sendRoomMessage);

/**
 * 🔹 GET /api/room-chat/:roomId/messages
 * Fetch all messages from a room
 */
router.get("/:roomId/messages", roomChatController.getRoomMessages);

/**
 * 🔹 DELETE /api/room-chat/:roomId/messages
 * Delete all messages from a room (creator only)
 */
router.delete("/:roomId/messages", roomChatController.deleteRoomMessages);

/**
 * 🔹 DELETE /api/room-chat/:roomId/messages/:messageId
 * Delete a specific message from a room
 * Only sender can delete their message
 */
router.delete("/:roomId/messages/:messageId", roomChatController.deleteSingleRoomMessage);

/**
 * 🔹 PUT /api/room-chat/:roomId/messages/:messageId
 * Edit a specific message in a room
 * Only sender can edit
 * Body: { text: string }
 */
router.put("/:roomId/messages/:messageId", roomChatController.editRoomMessage);

module.exports = router;
