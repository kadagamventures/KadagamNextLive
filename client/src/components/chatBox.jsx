import { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchChatHistory,
  joinChatRoom,
  leaveChatRoom,
  newMessageReceived,
  deleteChatMessage,
  editChatMessage,
} from "../redux/slices/chatSlice";
import { getSocket, emitChatEvent, joinRoom, leaveRoom } from "../websocket/chatSocket";
import { UserCircle2, Check, CheckCheck, Trash2, Pencil, Save, X, Smile } from "lucide-react";
import ConfirmPopup from "./confirmPopup";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Picker } from "emoji-mart";
import "emoji-mart/css/emoji-mart.css"; 

dayjs.extend(relativeTime);

const ChatBox = ({ taskId, receiver, taskTitle, currentUser: passedUser }) => {
  const dispatch = useDispatch();
  const scrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  const [newMessage, setNewMessage] = useState("");
  const [typing, setTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [typingDots, setTypingDots] = useState(".");
  const [socketConnected, setSocketConnected] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [activeMsgId, setActiveMsgId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [editMsgId, setEditMsgId] = useState(null);
  const [editText, setEditText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerPosition, setEmojiPickerPosition] = useState({ left: 0 });

  const { messages } = useSelector((state) => state.chat);
  const fallbackUser = useSelector((state) => state.auth.user || state.staffAuth.user);
  const currentUser = passedUser || fallbackUser;

  const normalizeId = (id) =>
    typeof id === "object" && id !== null
      ? id._id?.toString() || id.id?.toString() || id.toString()
      : id?.toString();

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
    if (taskId) dispatch(fetchChatHistory(taskId));
  }, [dispatch, taskId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !taskId || !currentUser) return;

    dispatch(joinChatRoom(taskId));
    joinRoom("task", taskId);

    const handleIncomingMessage = (msg) => {
      dispatch(newMessageReceived(msg));
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleTyping = ({ userId }) => {
      if (normalizeId(userId) !== normalizeId(currentUser.id || currentUser._id)) {
        setOtherUserTyping(true);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setOtherUserTyping(false), 3000);
      }
    };

    socket.on("messageReceived", handleIncomingMessage);
    socket.on("typing", handleTyping);

    return () => {
      dispatch(leaveChatRoom(taskId));
      leaveRoom("task", taskId);
      socket.off("messageReceived", handleIncomingMessage);
      socket.off("typing", handleTyping);
      clearTimeout(typingTimeoutRef.current);
    };
  }, [dispatch, taskId, currentUser]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!otherUserTyping) return;
    const interval = setInterval(() => {
      setTypingDots((prev) => (prev.length >= 3 ? "." : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, [otherUserTyping]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        !e.target.closest(".chat-msg") &&
        !e.target.closest(".chat-msg-action") &&
        !e.target.closest(".chat-msg-confirm") &&
        !e.target.closest(".emoji-mart") && // Prevent closing when clicking emoji picker
        !e.target.closest(".emoji-btn")
      ) {
        setActiveMsgId(null);
        setConfirmDeleteId(null);
        setEditMsgId(null);
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleTyping = useCallback(() => {
    if (!socketConnected || typing || !currentUser || !taskId) return;
    setTyping(true);
    emitChatEvent("typing", { taskId, userId: currentUser.id || currentUser._id });
    setTimeout(() => setTyping(false), 1500);
  }, [typing, currentUser, taskId, socketConnected]);

  const handleSend = async () => {
    const trimmed = newMessage.trim();
    if (!trimmed || !receiver?._id || !taskId || !socketConnected || sendingMessage) return;

    setSendingMessage(true);
    const senderId = currentUser.id || currentUser._id;
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      senderId,
      senderName: currentUser.name,
      receiverId: receiver._id,
      taskId,
      message: trimmed,
      timestamp: new Date().toISOString(),
      optimistic: true,
      delivered: false,
      read: false,
      tempId,
    };

    dispatch(newMessageReceived(optimisticMessage));

    try {
      const success = emitChatEvent("sendMessage", {
        message: trimmed,
        receiverId: receiver._id,
        taskId,
        tempId,
      });
      if (!success) throw new Error("WebSocket emit failed");
      setNewMessage("");
    } catch (error) {
      console.error("❌ Failed to send message:", error);
    }

    setSendingMessage(false);
  };

  const handleEdit = async (messageId, newText) => {
    try {
      await dispatch(editChatMessage({ messageId, newText })).unwrap();
      setEditMsgId(null);
      setEditText("");
    } catch (err) {
      console.error("❌ Edit failed:", err.message || err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await dispatch(deleteChatMessage(id)).unwrap();
      setConfirmDeleteId(null);
      setActiveMsgId(null);
    } catch (err) {
      console.error("❌ Failed to delete message.");
    }
  };

  const formatDate = (timestamp) =>
    dayjs(timestamp).isSame(dayjs(), "day")
      ? "Today"
      : dayjs(timestamp).isSame(dayjs().subtract(1, "day"), "day")
        ? "Yesterday"
        : dayjs(timestamp).format("DD MMM YYYY");

  const formatTime = (timestamp) => dayjs(timestamp).format("hh:mm A");

  // Insert emoji at current cursor position
  const handleEmojiSelect = (emoji) => {
    if (inputRef.current) {
      const { selectionStart, selectionEnd } = inputRef.current;
      const text =
        newMessage.slice(0, selectionStart) +
        emoji.native +
        newMessage.slice(selectionEnd);
      setNewMessage(text);
      // Move cursor after emoji
      setTimeout(() => {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(
          selectionStart + emoji.native.length,
          selectionStart + emoji.native.length
        );
      }, 0);
    } else {
      setNewMessage((msg) => msg + emoji.native);
    }
    setShowEmojiPicker(false);
  };

  let lastDate = "";

  return (
    <div className="chat-box flex flex-col bg-white rounded-xl shadow-lg border overflow-hidden h-full">
      <div className="p-4 bg-violet-700 text-white flex items-center gap-3 sticky top-0 z-10">
        <UserCircle2 className="w-8 h-8" />
        <div className="flex-1">
          <h2 className="text-md font-semibold">{receiver?.name}</h2>
          <p className="text-xs text-blue-200 truncate">{taskTitle}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 bg-gray-50 space-y-3">
        {messages
          .filter((m) => m.taskId === taskId)
          .map((msg, idx) => {
            const isMine = normalizeId(msg.senderId) === normalizeId(currentUser.id);
            const showDate = formatDate(msg.timestamp) !== lastDate;
            if (showDate) lastDate = formatDate(msg.timestamp);
            const isActive = activeMsgId === msg._id;
            const isEditing = editMsgId === msg._id;

            return (
              <div key={msg._id || msg.tempId || `fallback-${idx}`}>
                {showDate && <div className="text-center text-xs text-gray-400">{lastDate}</div>}
                <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`group chat-msg max-w-[75%] cursor-pointer relative shadow-md
                      ${isMine ? "bg-violet-200 text-black" : "bg-gray-100 text-gray-900"}
                      px-4 py-2
                      ${isMine ? "rounded-tr-none rounded-2xl chat-tail-mine" : "rounded-tl-none rounded-2xl chat-tail-other"}
                    `}
                    onClick={() => setActiveMsgId(isActive ? null : msg._id)}
                  >
                    {isEditing ? (
                      <div className="flex flex-col gap-1">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full text-sm text-gray-900 p-2 rounded resize-none"
                        />
                        <div className="flex justify-end gap-2 mt-1">
                          <button
                            onClick={() => handleEdit(msg._id, editText)}
                            className="text-green-600 hover:underline"
                          >
                            <Save className="inline w-4 h-4 mr-1" />
                            Save
                          </button>
                          <button
                            onClick={() => setEditMsgId(null)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X className="inline w-4 h-4 mr-1" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="whitespace-pre-wrap break-words">{msg.message}</div>
                        <div className="mt-1 flex justify-between text-xs">
                          <span>{formatTime(msg.timestamp)}</span>
                          {isMine && (
                            <span className="flex gap-2">
                              {msg.read ? <CheckCheck className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                            </span>
                          )}
                        </div>
                      </>
                    )}

                    {isMine && isActive && !isEditing && (
                      <div className="chat-msg-action absolute -left-12 top-1 flex flex-col gap-2 items-center text-gray-400 z-30">
                        <button
                          className="hover:text-blue-500"
                          title="Edit"
                          onClick={() => {
                            setEditMsgId(msg._id);
                            setEditText(msg.message);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          className="hover:text-red-500"
                          title="Delete"
                          onClick={() => setConfirmDeleteId(msg._id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {confirmDeleteId === msg._id && (
                      <ConfirmPopup
                        message="Are you sure you want to delete this message?"
                        onConfirm={() => handleDelete(msg._id)}
                        onCancel={() => setConfirmDeleteId(null)}
                        className="absolute right-0 top-full mt-2 z-50"
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        {otherUserTyping && <div className="text-sm text-gray-500 animate-pulse">Typing{typingDots}</div>}
        <div ref={scrollRef} />
      </div>
      <div className="p-3 border-t bg-white flex items-center gap-2 relative">
        {/* Emoji Button */}
        <button
          className="emoji-btn px-2 text-2xl hover:bg-gray-100 rounded-full"
          type="button"
          onClick={(e) => {
            const rect = e.target.getBoundingClientRect();
            setEmojiPickerPosition({ left: rect.left });
            setShowEmojiPicker((v) => !v);
          }}
          tabIndex={-1}
          aria-label="Add emoji"
        >
          <Smile className="w-6 h-6" />
        </button>
        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div
            className="absolute bottom-14 left-0 z-50"
            style={{ left: 0 }}
          >
            <Picker
              data={undefined} // For v5+, remove if not needed
              theme="light"
              onEmojiSelect={handleEmojiSelect}
              onSelect={handleEmojiSelect}
              showPreview={false}
              showSkinTones={false}
              locale="en"
            />
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          placeholder={socketConnected ? "Type a message..." : "Reconnecting..."}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleTyping}
          onKeyUp={(e) => e.key === "Enter" && handleSend()}
          className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-600 transition"
          disabled={!socketConnected || sendingMessage}
        />
        <button
          onClick={handleSend}
          disabled={!newMessage.trim() || !socketConnected || sendingMessage}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full transition disabled:opacity-50"
        >
          {sendingMessage ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
