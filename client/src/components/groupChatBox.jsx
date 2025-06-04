import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchRoomChatHistory,
  newRoomMessageReceived,
  roomMessageDelivered,
  roomMessageRead,
  deleteRoomMessage,
  addOptimisticRoomMessage,
  editRoomChatMessage,
} from "../redux/slices/roomChatSlice";
import { getRoomDetails } from "../services/roomChatService";
import {
  getSocket,
  emitChatEvent,
  joinRoom,
  leaveRoom,
} from "../websocket/chatSocket";
import { UserCircle2, Check, CheckCheck, Trash2, Pencil } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const GroupChatBox = ({ roomId, currentUser }) => {
  const dispatch = useDispatch();
  const scrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const [newMessage, setNewMessage] = useState("");
  const [typing, setTyping] = useState(false);
  const [someoneTyping, setSomeoneTyping] = useState(null); // Changed to object {name}
  const [typingDots, setTypingDots] = useState(".");
  const [roomInfo, setRoomInfo] = useState(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [activeMsgId, setActiveMsgId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState("");

  const { messages } = useSelector((state) => state.roomChat);

  const normalizeId = (id) =>
    typeof id === "object" && id !== null
      ? id._id?.toString() || id.id?.toString() || id.toString()
      : id?.toString();

  const formatDate = (timestamp) =>
    dayjs(timestamp).isSame(dayjs(), "day")
      ? "Today"
      : dayjs(timestamp).isSame(dayjs().subtract(1, "day"), "day")
      ? "Yesterday"
      : dayjs(timestamp).format("DD MMM YYYY");

  const formatTime = (timestamp) => dayjs(timestamp).format("hh:mm A");

  const isRoomCreator = useMemo(() => {
    const creator = roomInfo?.createdBy;
    const creatorId = typeof creator === "object" ? creator?._id : creator;
    const currentId = currentUser?.id || currentUser?._id;
    return String(creatorId) === String(currentId);
  }, [roomInfo, currentUser]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    setSocketConnected(socket.connected);
    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));
    return () => {
      socket.off("connect");
      socket.off("disconnect");
    };
  }, []);

  useEffect(() => {
    if (roomId) {
      dispatch(fetchRoomChatHistory(roomId));
      getRoomDetails(roomId).then(setRoomInfo).catch(console.error);
    }
  }, [dispatch, roomId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !roomId || !currentUser) return;

    joinRoom("room", roomId);

    socket.on("roomMessageReceived", (msg) => {
      dispatch(newRoomMessageReceived(msg));
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    });

    socket.on("roomTyping", ({ userId, userName }) => {
      if (normalizeId(userId) !== normalizeId(currentUser.id || currentUser._id)) {
        setSomeoneTyping(userName || "Someone");
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setSomeoneTyping(null), 3000);
      }
    });

    socket.on("roomMessageDelivered", ({ messageId }) => {
      dispatch(roomMessageDelivered({ messageId }));
    });

    socket.on("roomMessageRead", ({ messageId }) => {
      dispatch(roomMessageRead({ messageId }));
    });

    return () => {
      leaveRoom("room", roomId);
      socket.off("roomMessageReceived");
      socket.off("roomTyping");
      socket.off("roomMessageDelivered");
      socket.off("roomMessageRead");
      clearTimeout(typingTimeoutRef.current);
    };
  }, [dispatch, roomId, currentUser]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!someoneTyping) return;
    const interval = setInterval(() => {
      setTypingDots((prev) => (prev.length >= 3 ? "." : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, [someoneTyping]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        !e.target.closest(".chat-msg-bubble") &&
        !e.target.closest(".chat-msg-action") &&
        !e.target.closest(".chat-msg-confirm")
      ) {
        setActiveMsgId(null);
        setConfirmDeleteId(null);
        setEditingMsgId(null);
        setEditText("");
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleTyping = useCallback(() => {
    if (!socketConnected || typing) return;
    setTyping(true);
    emitChatEvent("roomTyping", {
      roomId,
      userId: currentUser.id || currentUser._id,
      userName: currentUser.name,
    });
    setTimeout(() => setTyping(false), 1500);
  }, [socketConnected, typing, currentUser, roomId]);

  const handleSend = () => {
    const trimmed = newMessage.trim();
    if (!trimmed || !socketConnected || sendingMessage) return;

    setSendingMessage(true);
    const senderId = currentUser.id || currentUser._id;
    const tempId = `temp-${Date.now()}`;

    const optimisticMessage = {
      _id: tempId,
      roomId,
      sender: { _id: senderId, name: currentUser.name },
      text: trimmed,
      timestamp: new Date().toISOString(),
      optimistic: true,
      tempId,
      status: "sending",
    };

    dispatch(addOptimisticRoomMessage(optimisticMessage));

    emitChatEvent("sendRoomMessage", { roomId, message: trimmed, tempId }, (res) => {
      if (res?.success && res.message) {
        dispatch(newRoomMessageReceived(res.message));
      }
    });

    setNewMessage("");
    setSendingMessage(false);
  };

  const handleDelete = async (roomId, messageId) => {
    if (!messageId || messageId.startsWith("temp-")) return;
    try {
      await dispatch(deleteRoomMessage({ roomId, messageId })).unwrap();
    } catch {}
    finally {
      setConfirmDeleteId(null);
      setActiveMsgId(null);
    }
  };

  const handleEditStart = (msg) => {
    setEditingMsgId(msg._id);
    setEditText(msg.text);
  };

  const handleEditSubmit = async () => {
    if (!editText.trim() || !editingMsgId) return;
    try {
      await dispatch(editRoomChatMessage({ roomId, messageId: editingMsgId, newText: editText.trim() })).unwrap();
      setEditingMsgId(null);
      setEditText("");
      setActiveMsgId(null);
    } catch {}
  };

  const handleEditCancel = () => {
    setEditingMsgId(null);
    setEditText("");
  };

  const handleDeleteRoom = () => {
    const confirmed = window.confirm("Are you sure you want to delete this room?");
    if (confirmed) emitChatEvent("deleteRoomEntity", { roomId });
  };

  let lastDate = "";
  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-lg border overflow-hidden">
      {/* HEADER */}
      <div className="p-4 bg-blue-700 text-white flex justify-between items-center gap-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <UserCircle2 className="w-8 h-8" />
          <div>
            <h2 className="text-md font-semibold">{roomInfo?.roomName || "Group Chat"}</h2>
            <p className="text-xs text-blue-100 truncate">
              {roomInfo?.members?.map((m) => m.name || m.email).join(", ") || "Loading..."}
            </p>
          </div>
        </div>
        {isRoomCreator && (
          <button
            onClick={handleDeleteRoom}
            className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded-md text-sm text-white"
          >
            Delete Room
          </button>
        )}
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto px-4 py-3 bg-gray-50 space-y-2">
        {messages.map((msg, idx) => {
          const senderId = normalizeId(msg.sender?._id || msg.senderId);
          const currentId = normalizeId(currentUser.id);
          const isMine = senderId === currentId;
          const messageKey = msg._id || msg.tempId || `fallback-${idx}`;
          const isActive = activeMsgId === messageKey;
          const showDate = formatDate(msg.timestamp) !== lastDate;
          if (showDate) lastDate = formatDate(msg.timestamp);

          return (
            <div key={messageKey} className="flex flex-col max-w-full">
              {showDate && (
                <div className="text-center text-xs text-gray-400 my-1">{lastDate}</div>
              )}
              <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1`}>
                <div className="relative max-w-xs flex flex-col items-end">
                  {/* Sender name */}
                  {!isMine && (
                    <div className="text-xs text-gray-600 font-semibold mb-1">
                      {msg.sender?.name || "Unknown"}
                    </div>
                  )}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMsgId(isActive ? null : messageKey);
                    }}
                    className={`chat-msg-bubble px-4 py-2 rounded-2xl shadow-md cursor-pointer break-words ${
                      isMine
                        ? "bg-blue-500 text-white"
                        : "bg-white text-gray-900 border"
                    }`}
                  >
                    {editingMsgId === msg._id ? (
                      <div className="flex flex-col gap-2">
                        <input
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="px-2 py-1 text-sm rounded border"
                          autoFocus
                        />
                        <div className="flex gap-2 text-xs justify-end">
                          <button
                            className="text-green-600 hover:underline"
                            onClick={handleEditSubmit}
                          >
                            Save
                          </button>
                          <button
                            className="text-gray-500 hover:underline"
                            onClick={handleEditCancel}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {msg.text || "[no content]"}
                        {msg.edited && (
                          <span className="ml-2 text-[10px] italic text-gray-200">
                            (edited)
                          </span>
                        )}
                      </div>
                    )}
                    <div className="mt-1 flex justify-between text-xs">
                      <span>{formatTime(msg.timestamp)}</span>
                      {isMine && (
                        <span>
                          {msg.status === "read" ? (
                            <CheckCheck className="w-4 h-4" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {isMine && isActive && (
                    <div className="chat-msg-action mt-1 flex gap-2 text-gray-400">
                      <button title="Edit" onClick={() => handleEditStart(msg)}>
                        <Pencil className="w-4 h-4 hover:text-blue-500" />
                      </button>
                      <button title="Delete" onClick={() => setConfirmDeleteId(messageKey)}>
                        <Trash2 className="w-4 h-4 hover:text-red-500" />
                      </button>
                    </div>
                  )}

                  {confirmDeleteId === messageKey && (
                    <div className="chat-msg-confirm mt-2 bg-white border rounded shadow-lg p-4 w-64 z-50">
                      <p className="text-sm text-gray-700 mb-3">
                        Are you sure you want to delete this message?
                      </p>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-gray-600 hover:underline"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={!msg._id || msg.optimistic}
                          onClick={() => handleDelete(roomId, msg._id)}
                          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          Yes, Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {someoneTyping && (
          <div className="text-sm text-gray-500 animate-pulse">
            {someoneTyping} is typing{typingDots}
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* INPUT */}
      <div className="p-3 border-t bg-white flex items-center gap-3">
        <input
          type="text"
          placeholder={socketConnected ? "Type a message..." : "Reconnecting..."}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleTyping}
          onKeyUp={(e) => e.key === "Enter" && handleSend()}
          className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-green-400"
          disabled={!socketConnected || sendingMessage}
        />
        <button
          onClick={handleSend}
          disabled={!newMessage.trim() || !socketConnected || sendingMessage}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full disabled:opacity-50"
        >
          {sendingMessage ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
};

export default GroupChatBox;
