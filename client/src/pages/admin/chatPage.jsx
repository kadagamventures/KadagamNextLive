import { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchChatHistory,
  joinChatRoom,
  leaveChatRoom,
  clearChat,
  initializeChatSocketThunk,
  cleanupChatSocket,
} from "../../redux/slices/chatSlice";
import {
  fetchRoomChatHistory,
  joinRoomChat,
  leaveRoomChat,
  clearRoomChat,
  removeRoom,
} from "../../redux/slices/roomChatSlice";
import ChatBox from "../../components/chatBox";
import GroupChatBox from "../../components/groupChatBox";
import { tokenRefreshInterceptor as axiosInstance } from "../../utils/axiosInstance";
import { deleteRoom } from "../../services/roomChatService";
import { MessageSquareText, UserCircle2, PlusCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { getSocket } from "../../websocket/chatSocket"; // ✅ important

const ChatPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [chatTasks, setChatTasks] = useState([]);
  const [groupRooms, setGroupRooms] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [activeTab, setActiveTab] = useState("taskChats");

  const { taskId: currentTaskRoomId } = useSelector((state) => state.chat);
  const { roomId: currentGroupRoomId } = useSelector((state) => state.roomChat);
  const currentUser = useSelector((state) => state.auth.user || state.staffAuth.user);

  useEffect(() => {
    dispatch(initializeChatSocketThunk());

    const socket = getSocket();
    if (socket) {
      socket.on("roomDeleted", ({ roomId }) => {
        console.warn("🧹 Room deleted received:", roomId);
        dispatch(removeRoom(roomId));
        setGroupRooms((prev) => prev.filter((r) => r._id !== roomId));
        if (selectedRoom?._id === roomId) {
          setSelectedRoom(null);
          dispatch(clearRoomChat());
        }
      });
    }

    return () => {
      if (currentTaskRoomId) {
        dispatch(leaveChatRoom(currentTaskRoomId));
        dispatch(clearChat());
      }
      if (currentGroupRoomId) {
        dispatch(leaveRoomChat(currentGroupRoomId));
        dispatch(clearRoomChat());
      }
      dispatch(cleanupChatSocket());

      if (socket) {
        socket.off("roomDeleted");
      }
    };
  }, [dispatch, currentTaskRoomId, currentGroupRoomId, selectedRoom]);

  useEffect(() => {
    const tabParam = new URLSearchParams(location.search).get("tab");
    if (tabParam === "chatRooms" || tabParam === "taskChats") {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  const fetchChatTasks = async () => {
    try {
      const res = await axiosInstance.get("/chat/tasks");
      setChatTasks(Array.isArray(res.data.tasks) ? res.data.tasks : []);
    } catch (err) {
      console.error("❌ Error fetching tasks:", err.message);
    }
  };

  const fetchGroupRooms = async () => {
    try {
      const res = await axiosInstance.get("/room-chat");
      const rooms = Array.isArray(res.data.rooms) ? res.data.rooms : [];
      setGroupRooms(rooms);
    } catch (err) {
      console.error("❌ Error fetching rooms:", err.message);
    }
  };

  useEffect(() => {
    if (activeTab === "taskChats") fetchChatTasks();
    else fetchGroupRooms();
  }, [activeTab]);

  const handleTaskClick = useCallback(async (task) => {
    if (!task) return;
    if (currentTaskRoomId && currentTaskRoomId !== task._id) {
      await dispatch(leaveChatRoom(currentTaskRoomId));
      dispatch(clearChat());
    }
    if (currentGroupRoomId) {
      await dispatch(leaveRoomChat(currentGroupRoomId));
      dispatch(clearRoomChat());
      setSelectedRoom(null);
    }
    setSelectedTask(task);
    setSelectedStaff(task.assignedTo || task.assignedBy || {});
    dispatch(joinChatRoom(task._id));
    dispatch(fetchChatHistory(task._id));
  }, [dispatch, currentTaskRoomId, currentGroupRoomId]);

  const handleRoomClick = useCallback(async (room) => {
    if (!room) return;
    if (currentTaskRoomId) {
      await dispatch(leaveChatRoom(currentTaskRoomId));
      dispatch(clearChat());
      setSelectedTask(null);
      setSelectedStaff(null);
    }
    if (currentGroupRoomId && currentGroupRoomId !== room._id) {
      await dispatch(leaveRoomChat(currentGroupRoomId));
      dispatch(clearRoomChat());
    }
    setSelectedRoom(room);
    dispatch(joinRoomChat(room._id));
    dispatch(fetchRoomChatHistory(room._id));
  }, [dispatch, currentTaskRoomId, currentGroupRoomId]);

  const handleDeleteRoom = async (roomId) => {
    const confirmed = window.confirm("Are you sure you want to delete this room?");
    if (!confirmed) return;
    try {
      await deleteRoom(roomId); // soft-delete request
      toast.success("Room delete requested");
    } catch (err) {
      toast.error("Failed to delete room: " + err.message);
    }
  };

  return (
    <div className="ml-64 flex h-[calc(105vh-4rem)] bg-gradient-to-br from-gray-100 to-blue-100">
      <aside className="w-[28%] h-[100%] bg-white p-6 border-r border-gray-200 shadow-xl overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          {/* <MessageSquareText className="w-6 h-6 text-blue-500" /> */}
          {activeTab === "taskChats" ? "Task Conversations" : "Chat Rooms"}
        </h2>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => navigate("/admin/chat?tab=taskChats")}
            className={`px-4 py-2 rounded-full text-sm font-semibold w-[110px] 
      ${activeTab === "taskChats"
                ? "bg-violet-700 text-white border-none"
                : "bg-gray-100 text-black border-[1.5px] border-black"
              }`}>
            Task Chats
          </button>

          <button
            onClick={() => navigate("/admin/chat?tab=chatRooms")}
            className={`px-4 py-2 rounded-full text-sm font-semibold w-[125px] 
      ${activeTab === "chatRooms"
                ? "bg-violet-700 text-white border-none"
                : "bg-white text-black border-[1.5px] border-black"
              }`}>
            Group Rooms
          </button>
        </div>


        {activeTab === "chatRooms" && (
          <button
            onClick={() => navigate("/admin/chat/create-room")}
            className={`mb-4 flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full w-[190px] 
      bg-white text-black border-[1.5px] border-black 
      hover:bg-violet-700 hover:text-white hover:border-none transition-all duration-200`}
          >
            <PlusCircle className="w-5 h-5" />
            Create Chat Room
          </button>
        )}

        {activeTab === "taskChats" ? (
          chatTasks.length === 0 ? (
            <div className="text-center text-gray-400 mt-32">
              <MessageSquareText className="w-10 h-10 mb-2 animate-bounce mx-auto" />
              <p>No active chats found</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {chatTasks.map((task) => {
                const isSelected = selectedTask?._id === task._id;
                return (
                  <motion.li
                    layout
                    key={task._id}
                    onClick={() => handleTaskClick(task)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 ${isSelected
                      ? "bg-blue-50 border-purple-700 shadow-md ring-0.5 ring-purple-700"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                      }`}
                  >
                    <div className="font-semibold text-base">{task.title}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <UserCircle2 className="w-4 h-4" />
                      {task.assignedTo?.name || task.assignedBy?.name || "Unassigned"}
                    </div>
                    <div className="text-xs text-gray-500 truncate mt-1">
                      {task.lastMessage || "No recent message"}
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          )
        ) : groupRooms.length === 0 ? (
          <div className="text-center text-gray-400 mt-32">
            <MessageSquareText className="w-10 h-10 mb-2 animate-bounce mx-auto" />
            <p>No chat rooms found</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {groupRooms.map((room) => (
              <motion.li
                layout
                key={room._id}
                onClick={() => handleRoomClick(room)}
                className={`p-4 border rounded-xl bg-white hover:bg-gray-50 cursor-pointer transition ${selectedRoom?._id === room._id ? "border-violet-700 ring-0.5 ring-violet-700" : "border-gray-200"
                  }`}
              >
                <h3 className="font-semibold text-gray-800">{room.roomName}</h3>
                <p className="text-sm text-gray-500">{room.lastMessage || "No recent messages"}</p>
              </motion.li>
            ))}
          </ul>
        )}
      </aside>

      <main className="flex-1 p-8 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200">
        <div className="w-full h-full max-w-6xl bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border border-gray-200 p-6 flex flex-col">
          {activeTab === "taskChats" && selectedTask && selectedStaff ? (
            <ChatBox
              taskId={selectedTask._id}
              receiver={selectedStaff}
              taskTitle={selectedTask.title}
              currentUser={currentUser}
            />
          ) : activeTab === "chatRooms" && selectedRoom ? (
            <>
              <GroupChatBox
                roomId={selectedRoom._id}
                roomName={selectedRoom.roomName}
                currentUser={currentUser}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center text-gray-600 px-6 max-w-md mx-auto">
              <div className="bg-blue-100 text-blue-600 rounded-full p-4 mb-4 shadow-lg animate-bounce">
                <MessageSquareText className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">No Selection</h3>
              <p className="text-sm text-gray-500">
                Please select a task or group chat room to begin messaging.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ChatPage;
