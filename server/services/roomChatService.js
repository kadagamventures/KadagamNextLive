const RoomChat = require("../models/RoomChat");

const MAX_MESSAGE_LENGTH = 1000;
const MESSAGE_RATE_LIMIT = 60;
const MAX_ROOM_MEMBERS = 50;

// 🏗️ Create a new chat room scoped to company
async function createRoom({ roomName, members = [], createdBy, companyId }) {
  if (!roomName || !createdBy || !companyId) {
    throw new Error("ROOM_NAME_CREATOR_COMPANY_REQUIRED");
  }

  const cid = companyId.toString();
  if (roomName.length < 3 || roomName.length > 50) {
    throw new Error("ROOM_NAME_INVALID_LENGTH");
  }
  if (members.length > MAX_ROOM_MEMBERS) {
    throw new Error("ROOM_MEMBER_LIMIT_EXCEEDED");
  }

  const uniqueMembers = new Set(members.map(String));
  uniqueMembers.add(String(createdBy));

  const room = new RoomChat({
    roomName: roomName.trim(),
    members: Array.from(uniqueMembers),
    createdBy: String(createdBy),
    companyId: cid,
    messages: [],
    isDeleted: false,
  });

  return await room.save();
}

// 🔍 Get room by ID (tenant-safe)
async function getRoomById(roomId, companyId) {
  if (!roomId || !companyId) throw new Error("ROOM_AND_COMPANY_ID_REQUIRED");
  const cid = companyId.toString();

  const room = await RoomChat.findOne({
    _id: roomId,
    companyId: cid,
    isDeleted: { $ne: true }
  })
    .populate("members", "name email")
    .populate("createdBy", "name email")
    .lean();

  if (!room) throw new Error("ROOM_NOT_FOUND");
  return room;
}

// 📜 Get all rooms for a user (within their company)
async function getRoomsForUser(userId, companyId) {
  if (!userId || !companyId) throw new Error("USER_AND_COMPANY_REQUIRED");
  const cid = companyId.toString();

  return await RoomChat.find({
    members: String(userId),
    companyId: cid,
    isDeleted: { $ne: true }
  })
    .populate("createdBy", "name email")
    .lean();
}

// ❌ Hard delete a room (creator + company check)
async function deleteRoom(roomId, userId, companyId) {
  if (!roomId || !userId || !companyId) throw new Error("ROOM_USER_COMPANY_REQUIRED");
  const cid = companyId.toString();

  const room = await RoomChat.findOne({ _id: roomId, companyId: cid });
  if (!room || room.isDeleted) throw new Error("ROOM_NOT_FOUND");
  if (String(room.createdBy) !== String(userId)) {
    throw new Error("ONLY_CREATOR_CAN_DELETE_ROOM");
  }

  await RoomChat.findByIdAndUpdate(
    roomId,
    { isDeleted: true, deletedAt: new Date() }
  );
  return { roomId, status: "deleted" };
}

// 💬 Add a new message to room
async function createRoomMessage({ senderId, roomId, message, companyId }) {
  if (!senderId || !roomId || !message?.trim() || !companyId) {
    throw new Error("ALL_FIELDS_REQUIRED_FOR_MESSAGE");
  }
  const cid = companyId.toString();

  const room = await RoomChat.findOne({ _id: roomId, companyId: cid, isDeleted: { $ne: true } });
  if (!room) throw new Error("ROOM_NOT_FOUND");
  if (!room.members.map(String).includes(String(senderId))) {
    throw new Error("SENDER_NOT_IN_ROOM");
  }

  const recentMessages = room.messages.filter(
    msg =>
      String(msg.sender) === String(senderId) &&
      msg.timestamp > new Date(Date.now() - 60000)
  ).length;
  if (recentMessages >= MESSAGE_RATE_LIMIT) {
    throw new Error("RATE_LIMIT_EXCEEDED");
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new Error("MESSAGE_TOO_LONG");
  }

  const newMessage = {
    sender: String(senderId),
    text: message.trim(),
    timestamp: new Date(),
  };
  room.messages.push(newMessage);
  await room.save();

  const saved = room.messages[room.messages.length - 1];
  return {
    _id: saved._id.toString(),
    roomId,
    sender: saved.sender,
    text: saved.text,
    timestamp: saved.timestamp,
  };
}

// 📦 Get all messages of a room (tenant-safe)
async function getMessagesByRoom(roomId, companyId) {
  if (!roomId || !companyId) throw new Error("ROOM_AND_COMPANY_REQUIRED");
  const cid = companyId.toString();

  const room = await RoomChat.findOne({
    _id: roomId,
    companyId: cid,
    isDeleted: { $ne: true }
  })
    .populate("messages.sender", "name email")
    .lean();

  if (!room) throw new Error("ROOM_NOT_FOUND");
  return room.messages || [];
}

// 🧹 Delete all messages in a room
async function deleteRoomMessages(roomId, companyId) {
  if (!roomId || !companyId) throw new Error("ROOM_AND_COMPANY_REQUIRED");
  const cid = companyId.toString();

  const room = await RoomChat.findOne({ _id: roomId, companyId: cid, isDeleted: { $ne: true } });
  if (!room) throw new Error("ROOM_NOT_FOUND");

  const count = room.messages.length;
  room.messages = [];
  await room.save();
  return { roomId, messageCount: count };
}

// 🗑️ Delete a specific message
async function deleteSingleRoomMessage(roomId, messageId, userId, companyId) {
  if (!roomId || !messageId || !userId || !companyId) {
    throw new Error("REQUIRED_ROOM_MESSAGE_USER_COMPANY");
  }
  const cid = companyId.toString();

  const room = await RoomChat.findOne({ _id: roomId, companyId: cid, isDeleted: { $ne: true } });
  if (!room) throw new Error("ROOM_NOT_FOUND");

  const index = room.messages.findIndex(m => String(m._id) === String(messageId));
  if (index === -1) throw new Error("MESSAGE_NOT_FOUND");
  if (String(room.messages[index].sender) !== String(userId)) {
    throw new Error("NOT_ALLOWED_TO_DELETE_THIS_MESSAGE");
  }

  room.messages.splice(index, 1);
  await room.save();
  return { roomId, messageId };
}

// ✏️ Edit a message (check tenant and sender)
async function editRoomMessage(roomId, messageId, newText, userId, companyId) {
  if (!roomId || !messageId || !newText || !userId || !companyId) {
    throw new Error("REQUIRED_ROOM_MESSAGE_TEXT_USER_COMPANY");
  }
  const cid = companyId.toString();

  const room = await RoomChat.findOne({ _id: roomId, companyId: cid, isDeleted: { $ne: true } });
  if (!room) throw new Error("ROOM_NOT_FOUND");

  const msg = room.messages.find(m => String(m._id) === String(messageId));
  if (!msg) throw new Error("MESSAGE_NOT_FOUND");
  if (String(msg.sender) !== String(userId)) {
    throw new Error("NOT_ALLOWED_TO_EDIT_THIS_MESSAGE");
  }

  msg.text = newText.trim();
  msg.edited = true;
  msg.editedAt = new Date();

  await room.save();
  return {
    _id: msg._id.toString(),
    roomId,
    sender: msg.sender,
    text: msg.text,
    timestamp: msg.timestamp,
    edited: true,
    editedAt: msg.editedAt,
  };
}

module.exports = {
  createRoom,
  getRoomById,
  getRoomsForUser,
  deleteRoom,
  createRoomMessage,
  getMessagesByRoom,
  deleteRoomMessages,
  deleteSingleRoomMessage,
  editRoomMessage,
};
