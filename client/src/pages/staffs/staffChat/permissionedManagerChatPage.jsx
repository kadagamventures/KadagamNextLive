import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchChatHistory,
  joinChatRoom,
  leaveChatRoom,
  clearChat,
  initializeChatSocketThunk,
  cleanupChatSocket,
  newMessageReceived,
} from "../../../redux/slices/chatSlice";

import {
  joinRoomChat,
  leaveRoomChat,
  fetchRoomChatHistory,
  clearRoomChat,
  newRoomMessageReceived,
  removeRoom,
} from "../../../redux/slices/roomChatSlice";

import ChatBox from "../../../components/chatBox";
import GroupChatBox from "../../../components/groupChatBox";
import { tokenRefreshInterceptor as axiosInstance } from "../../../utils/axiosInstance";
import { MessageSquareText, UserCircle2, PlusCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { getSocket } from "../../../websocket/chatSocket"; // ✅ added

const PermissionedManagerChatPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [taskStaffList, setTaskStaffList] = useState([]);
  const [groupRooms, setGroupRooms] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [activeTab, setActiveTab] = useState("taskChats");

  const { taskId: currentTaskRoomId } = useSelector((state) => state.chat);
  const { roomId: currentGroupRoomId } = useSelector((state) => state.roomChat);
  const currentUser = useSelector((state) => state.staffAuth.user || state.auth.user);

  useEffect(() => {
    dispatch(
      initializeChatSocketThunk({
        onTaskMessage: (msg) => dispatch(newMessageReceived(msg)),
        onRoomMessageReceived: (msg) => dispatch(newRoomMessageReceived(msg)),
      })
    );

    const socket = getSocket();
    if (socket) {
      socket.on("roomDeleted", ({ roomId }) => {
        console.warn("🧹 Permissioned Staff: Room deleted received:", roomId);
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
  }, [dispatch, selectedRoom, currentTaskRoomId, currentGroupRoomId]);

  useEffect(() => {
    const tabParam = new URLSearchParams(location.search).get("tab");
    if (tabParam === "chatRooms" || tabParam === "taskChats") {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  useEffect(() => {
    const fetchAssignedTasks = async () => {
      try {
        const res = await axiosInstance.get("/tasks/assigned-by-me");
        setTaskStaffList(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("❌ Error fetching assigned tasks:", err.message);
      }
    };

    const fetchGroupRooms = async () => {
      try {
        const res = await axiosInstance.get("/room-chat");
        setGroupRooms(Array.isArray(res.data?.rooms) ? res.data.rooms : []);
      } catch (err) {
        console.error("❌ Error fetching group rooms:", err.message);
      }
    };

    if (activeTab === "taskChats") fetchAssignedTasks();
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
    setSelectedStaff(task.assignedTo);
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

  return (
    <div className="ml-64 flex h-[calc(100vh-4rem)] bg-gradient-to-br from-gray-100 to-blue-100">
      <aside className="w-[28%] bg-white p-6 border-r border-gray-200 shadow-xl overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <MessageSquareText className="w-6 h-6 text-blue-500" />
          {activeTab === "taskChats" ? "Staff Tasks" : "Group Chat Rooms"}
        </h2>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() =>
              navigate("/staff/chat/permissioned-manager?tab=taskChats")
            }
            className={`px-4 py-2 rounded-md text-sm font-semibold ${
              activeTab === "taskChats"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            Task Chats
          </button>
          <button
            onClick={() =>
              navigate("/staff/chat/permissioned-manager?tab=chatRooms")
            }
            className={`px-4 py-2 rounded-md text-sm font-semibold ${
              activeTab === "chatRooms"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            Group Rooms
          </button>
        </div>

        {activeTab === "chatRooms" && (
          <button
            onClick={() => navigate("/staff/chat/create-room")}
            className="mb-4 flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium"
          >
            <PlusCircle className="w-5 h-5" />
            Create Chat Room
          </button>
        )}

        {activeTab === "taskChats" ? (
          taskStaffList.length === 0 ? (
            <div className="text-center text-gray-400 mt-32">
              <MessageSquareText className="w-10 h-10 mb-2 animate-bounce mx-auto" />
              <p>No assigned tasks found</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {taskStaffList.map((task) => {
                const isSelected = selectedTask?._id === task._id;
                return (
                  <motion.li
                    layout
                    key={task._id}
                    onClick={() => handleTaskClick(task)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 ${
                      isSelected
                        ? "bg-blue-50 border-blue-500 shadow-md ring-2 ring-blue-400"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="font-semibold text-base">{task.title}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <UserCircle2 className="w-4 h-4" />
                      {task.assignedTo?.name || "Unassigned"}
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
                className={`p-4 border rounded-xl bg-white hover:bg-gray-50 cursor-pointer transition ${
                  selectedRoom?._id === room._id
                    ? "border-blue-500 ring-2 ring-blue-400"
                    : "border-gray-200"
                }`}
              >
                <h3 className="font-semibold text-gray-800">{room.roomName}</h3>
                <p className="text-sm text-gray-500">
                  {room.lastMessage || "No recent messages"}
                </p>
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
            <GroupChatBox
              roomId={selectedRoom._id}
              roomName={selectedRoom.roomName}
              currentUser={currentUser}
            />
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

export default PermissionedManagerChatPage;
