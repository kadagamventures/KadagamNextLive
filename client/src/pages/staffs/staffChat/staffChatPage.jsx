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
  fetchRoomChatHistory,
  joinRoomChat,
  leaveRoomChat,
  clearRoomChat,
  newRoomMessageReceived,
} from "../../../redux/slices/roomChatSlice";
import { tokenRefreshInterceptor as axiosInstance } from "../../../utils/axiosInstance";
import ChatBox from "../../../components/chatBox";
import GroupChatBox from "../../../components/groupChatBox";
import { MessageSquareText, UserCircle2 } from "lucide-react";

const StaffChatPage = () => {
  const dispatch = useDispatch();
  const { taskId: currentTaskId } = useSelector((state) => state.chat);
  const { roomId: currentRoomId } = useSelector((state) => state.roomChat);
  const currentUser = useSelector(
    (state) => state.staffAuth.user || state.auth.user
  );

  const [taskList, setTaskList] = useState([]);
  const [groupRooms, setGroupRooms] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [assigner, setAssigner] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [activeTab, setActiveTab] = useState("taskChats");

  useEffect(() => {
    dispatch(
      initializeChatSocketThunk({
        onTaskMessage: (msg) => dispatch(newMessageReceived(msg)),
        onRoomMessage: (msg) => dispatch(newRoomMessageReceived(msg)),
      })
    );

    return () => {
      if (currentTaskId) {
        dispatch(leaveChatRoom(currentTaskId));
        dispatch(clearChat());
      }
      if (currentRoomId) {
        dispatch(leaveRoomChat(currentRoomId));
        dispatch(clearRoomChat());
      }
      dispatch(cleanupChatSocket());
    };
  }, [dispatch, currentTaskId, currentRoomId]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const { data } = await axiosInstance.get("/chat/my-tasks");
        setTaskList(data.tasks || []);
      } catch (err) {
        console.error("❌ Failed to fetch tasks:", err.message);
      }
    };

    const fetchRooms = async () => {
      try {
        const { data } = await axiosInstance.get("/room-chat");
        setGroupRooms(data.rooms || []);
      } catch (err) {
        console.error("❌ Failed to fetch rooms:", err.message);
      }
    };

    if (activeTab === "taskChats") fetchTasks();
    else fetchRooms();
  }, [activeTab]);

  const handleTaskSelect = useCallback(
    async (task) => {
      if (!task || task._id === currentTaskId) return;

      const creator = task.assignedBy || task.createdBy;
      if (!creator || (!creator._id && !creator.id)) {
        console.warn("⚠️ Task has no assigner or creator");
        return;
      }

      const receiver = {
        ...creator,
        _id: creator._id || creator.id,
      };

      if (currentTaskId) {
        await dispatch(leaveChatRoom(currentTaskId));
        dispatch(clearChat());
      }
      if (currentRoomId) {
        await dispatch(leaveRoomChat(currentRoomId));
        dispatch(clearRoomChat());
        setSelectedRoom(null);
      }

      setSelectedTask(task);
      setAssigner(receiver);
      dispatch(joinChatRoom(task._id));
      dispatch(fetchChatHistory(task._id));
    },
    [dispatch, currentTaskId, currentRoomId]
  );

  const handleRoomSelect = useCallback(
    async (room) => {
      if (!room || room._id === currentRoomId) return;

      if (currentTaskId) {
        await dispatch(leaveChatRoom(currentTaskId));
        dispatch(clearChat());
        setSelectedTask(null);
        setAssigner(null);
      }
      if (currentRoomId) {
        await dispatch(leaveRoomChat(currentRoomId));
        dispatch(clearRoomChat());
      }

      setSelectedRoom(room);
      dispatch(joinRoomChat(room._id));
      dispatch(fetchRoomChatHistory(room._id));
    },
    [dispatch, currentTaskId, currentRoomId]
  );

  return (
    <div className="ml-64 flex h-[calc(100vh-4rem)] bg-gradient-to-br from-gray-100 to-blue-100">
      {/* Sidebar */}
      <aside className="w-[28%] bg-white p-6 border-r border-gray-200 overflow-y-auto shadow-md">
        <h2 className="text-2xl font-semibold text-gray-800 mb-5">
          {activeTab === "taskChats" ? "My Tasks" : "My Chat Rooms"}
        </h2>

        <div className="flex gap-3 mb-5">
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === "taskChats"
                ? "bg-yellow-500 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
            onClick={() => setActiveTab("taskChats")}
          >
            My Task Chats
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === "chatRooms"
                ? "bg-yellow-500 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
            onClick={() => setActiveTab("chatRooms")}
          >
            Chat Rooms
          </button>
        </div>

        {activeTab === "taskChats" ? (
          taskList.length === 0 ? (
            <div className="text-center text-gray-400 mt-32">
              <MessageSquareText className="w-10 h-10 mb-2 animate-bounce mx-auto" />
              <p>No tasks assigned to you</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {taskList.map((task) => {
                const isSelected = selectedTask?._id === task._id;
                return (
                  <li
                    key={task._id}
                    onClick={() => handleTaskSelect(task)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-50 border-blue-400 ring-2 ring-blue-400"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="font-semibold text-gray-800">{task.title}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <UserCircle2 className="w-4 h-4" />
                      {task.assignedBy?.name ||
                        task.createdBy?.name ||
                        "Unknown Assigner"}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {task.lastMessage || "No recent message"}
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        ) : groupRooms.length === 0 ? (
          <div className="text-center text-gray-500 mt-32">No chat rooms found.</div>
        ) : (
          <ul className="space-y-3">
            {groupRooms.map((room) => {
              const isSelected = selectedRoom?._id === room._id;
              return (
                <li
                  key={room._id}
                  onClick={() => handleRoomSelect(room)}
                  className={`p-4 border rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? "bg-blue-50 border-blue-400 ring-2 ring-blue-400"
                      : "hover:bg-gray-100"
                  }`}
                >
                  <h3 className="font-semibold text-gray-800">{room.roomName}</h3>
                  <p className="text-sm text-gray-500">
                    {room.lastMessage || "No recent messages"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* Chat Panel */}
      <main className="flex-1 bg-gradient-to-br from-gray-50 to-gray-200 p-8 flex items-center justify-center">
        <div className="w-full h-full max-w-6xl bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-gray-200 p-6 relative flex flex-col">
          {activeTab === "taskChats" && selectedTask && assigner ? (
            <ChatBox
              taskId={selectedTask._id}
              receiver={assigner}
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
              <div className="bg-yellow-100 text-yellow-600 rounded-full p-4 mb-4 shadow-lg animate-bounce">
                <MessageSquareText className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">No Chat Selected</h3>
              <p className="text-sm text-gray-500">
                Click on a task or chat room from the sidebar to start chatting.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StaffChatPage;
