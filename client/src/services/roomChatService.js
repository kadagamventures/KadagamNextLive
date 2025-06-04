import { tokenRefreshInterceptor as axiosInstance } from "../utils/axiosInstance";

const ROOM_CHAT_BASE = "/room-chat";

// ✅ Utility to validate MongoDB ObjectId
const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

/**
 * 🔹 Fetch all messages from a group chat room
 */
export const fetchRoomMessages = async (roomId) => {
  if (!isValidObjectId(roomId)) throw new Error("Invalid roomId format");
  try {
    const { data } = await axiosInstance.get(`${ROOM_CHAT_BASE}/${roomId}/messages`);
    return data?.messages || [];
  } catch (error) {
    console.error("❌ fetchRoomMessages:", error);
    throw new Error(error.response?.data?.message || error.message);
  }
};

/**
 * 💬 Send a message to a room
 */
export const createRoomMessage = async ({ roomId, message }) => {
  if (!isValidObjectId(roomId)) throw new Error("Invalid roomId format");
  if (!message || typeof message !== "string") throw new Error("Message must be a non-empty string");
  try {
    const { data } = await axiosInstance.post(`${ROOM_CHAT_BASE}/${roomId}/message`, { message });
    return data?.message || data;
  } catch (error) {
    console.error("❌ createRoomMessage:", error);
    throw new Error(error.response?.data?.message || error.message);
  }
};

/**
 * 🏗 Create a new room (with members)
 */
export const createChatRoom = async ({ roomName, members }) => {
  if (!roomName || typeof roomName !== "string") throw new Error("Room name must be a valid string");
  if (!Array.isArray(members) || members.some((id) => !isValidObjectId(id))) {
    throw new Error("Members must be an array of valid ObjectIds");
  }

  try {
    const { data } = await axiosInstance.post(`${ROOM_CHAT_BASE}`, { roomName, members });
    return data?.room || data;
  } catch (error) {
    console.error("❌ createChatRoom:", error);
    throw new Error(error.response?.data?.message || error.message);
  }
};

/**
 * 📄 Get metadata of a specific room
 */
export const getRoomDetails = async (roomId) => {
  if (!isValidObjectId(roomId)) throw new Error("Invalid roomId format");

  try {
    const { data } = await axiosInstance.get(`${ROOM_CHAT_BASE}/${roomId}`);
    return data?.room || {};
  } catch (error) {
    console.error("❌ getRoomDetails:", error);
    throw new Error(error.response?.data?.message || error.message);
  }
};

/**
 * 📂 Fetch all rooms the current user belongs to
 */
export const getUserRooms = async () => {
  try {
    const { data } = await axiosInstance.get(`${ROOM_CHAT_BASE}`);
    return data?.rooms || [];
  } catch (error) {
    console.error("❌ getUserRooms:", error);
    throw new Error(error.response?.data?.message || error.message);
  }
};

/**
 * ❌ Delete a room (only allowed by creator)
 */
export const deleteRoom = async (roomId) => {
  if (!isValidObjectId(roomId)) throw new Error("Invalid roomId format");

  try {
    await axiosInstance.delete(`${ROOM_CHAT_BASE}/${roomId}`);
    return { success: true };
  } catch (error) {
    console.error("❌ deleteRoom:", error);
    throw new Error(error.response?.data?.message || error.message);
  }
};

/**
 * 🧹 Clear all messages in a group chat
 */
export const deleteRoomMessages = async (roomId) => {
  if (!isValidObjectId(roomId)) throw new Error("Invalid roomId format");

  try {
    const { data } = await axiosInstance.delete(`${ROOM_CHAT_BASE}/${roomId}/messages`);
    return data;
  } catch (error) {
    console.error("❌ deleteRoomMessages:", error);
    throw new Error(error.response?.data?.message || error.message);
  }
};

/**
 * 🗑️ Delete a single message from a room
 */
export const deleteSingleRoomMessage = async ({ roomId, messageId }) => {
  if (!isValidObjectId(roomId) || !isValidObjectId(messageId)) {
    throw new Error("Invalid roomId or messageId format");
  }

  try {
    const { data } = await axiosInstance.delete(`${ROOM_CHAT_BASE}/${roomId}/messages/${messageId}`);
    return data?.success;
  } catch (error) {
    console.error("❌ deleteSingleRoomMessage:", error);
    throw new Error(error.response?.data?.message || error.message);
  }
};

/**
 * ✏️ Edit a single message in a room
 */
export const editRoomMessage = async ({ roomId, messageId, newText }) => {
  if (!isValidObjectId(roomId) || !isValidObjectId(messageId)) {
    throw new Error("Invalid roomId or messageId format");
  }
  if (!newText || typeof newText !== "string") {
    throw new Error("newText must be a non-empty string");
  }

  try {
    const { data } = await axiosInstance.put(`${ROOM_CHAT_BASE}/${roomId}/messages/${messageId}`, {
      text: newText,
    });
    return data?.message || data;
  } catch (error) {
    console.error("❌ editRoomMessage:", error);
    throw new Error(error.response?.data?.message || error.message);
  }
};
