import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchChatHistory,
  joinChatRoom,
  leaveChatRoom,
  clearChat,
  initializeChatSocketThunk,
} from "../../../redux/slices/chatSlice";
import { tokenRefreshInterceptor as axiosInstance } from "../../../utils/axiosInstance";
import ChatBox from "../../../components/chatBox"; // This is the component we'll update
import { MessageSquareText, UserCircle2, AlertCircle } from "lucide-react";

const PermissionedStaffChatPage = () => {
  const dispatch = useDispatch();
  const { taskId: currentTaskId } = useSelector((state) => state.chat);

  const currentUser = useSelector(
    (state) => state.staffAuth.user || state.auth.user
  );

  const [taskList, setTaskList] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [receiver, setReceiver] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    dispatch(initializeChatSocketThunk());
  }, [dispatch]);

  useEffect(() => {
    return () => {
      if (currentTaskId) {
        dispatch(leaveChatRoom(currentTaskId));
        dispatch(clearChat());
      }
    };
  }, [dispatch, currentTaskId]);

  useEffect(() => {
    const fetchMyTasks = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axiosInstance.get("/chat/my-tasks");
        const { data } = response;
        if (data && data.success) {
          setTaskList(data.tasks || []);
        } else {
          setError("Failed to fetch tasks: " + (data?.message || "Unknown error"));
        }
      } catch (err) {
        setError(`Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchMyTasks();
  }, []);

  const handleTaskSelect = useCallback(
    async (task) => {
      if (!task || task._id === currentTaskId) return;

      try {
        const taskCreator = task.assignedBy || task.createdBy;
        if (!taskCreator || (!taskCreator._id && !taskCreator.id)) {
          setError("Cannot start chat: Task has no valid creator");
          return;
        }

        if (currentTaskId) {
          await dispatch(leaveChatRoom(currentTaskId));
          dispatch(clearChat());
        }

        const chatPartner = {
          ...taskCreator,
          _id: taskCreator._id || taskCreator.id,
        };

        setSelectedTask(task);
        setReceiver(chatPartner);
        setError(null);
        dispatch(joinChatRoom(task._id));
        dispatch(fetchChatHistory(task._id));
      } catch (err) {
        setError("Failed to select task: " + err.message);
      }
    },
    [dispatch, currentTaskId]
  );

  return (
    // Set a fixed height for the entire chat container
    // This is the main container that dictates the overall height
    <div className="ml-64 flex h-[620px] bg-gray-100">
      {/* Sidebar */}
      <aside className="w-[28%] bg-white p-6 border-r border-gray-200 overflow-y-auto shadow-md h-full"> {/* 'h-full' makes sidebar take full height of the parent (620px) */}
        <h2 className="text-2xl font-semibold text-gray-800 mb-5">Chats with Task Creators</h2>

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading tasks...</p>
          </div>
        )}

        {error && (
          <div className="text-center text-red-500 bg-red-50 p-4 rounded-lg border border-red-200 my-4">
            <AlertCircle className="h-5 w-5 inline-block mr-2" />
            {error}
          </div>
        )}

        {!loading && !error && taskList.length === 0 ? (
          <div className="text-center text-gray-400 mt-32">
            <MessageSquareText className="w-10 h-10 mb-2 animate-bounce mx-auto" />
            <p>No tasks assigned to you</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {taskList.map((task) => {
              const isSelected = selectedTask?._id === task._id;
              const taskCreator = task.assignedBy || task.createdBy || {};

              return (
                <li
                  key={task._id}
                  onClick={() => handleTaskSelect(task)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${isSelected ? "bg-blue-50 border-violet-700" : "hover:bg-gray-50"
                    }`}
                >
                  <div className="font-semibold text-gray-800">{task.title}</div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <UserCircle2 className="w-4 h-4" />
                    Created by: {taskCreator?.name || "Unknown"}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Status: <span className="font-medium">{task.status}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* Chat Area */}
      <main className="flex-1 bg-gradient-to-br from-gray-50 to-gray-200 p-8 flex items-center justify-center h-full"> {/* 'h-full' makes main take full height of the parent (620px) */}
        <div className="w-full h-full max-w-6xl bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-gray-200 p-6 flex flex-col">
          {selectedTask && receiver ? (
            // Pass the necessary props to ChatBox
            <ChatBox
              taskId={selectedTask._id}
              receiver={receiver}
              taskTitle={selectedTask.title}
              currentUser={currentUser}
            />
          ) : (
            // "No Chat Selected" message block
            <div className="flex flex-col items-center justify-center text-center text-gray-600 px-6 max-w-md mx-auto h-full"> {/* 'h-full' centers content vertically within the fixed height */}
              <div className="bg-yellow-100 text-yellow-600 rounded-full p-4 mb-4 shadow-lg animate-bounce">
                <MessageSquareText className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">No Chat Selected</h3>
              <p className="text-sm text-gray-500">
                Select a task to chat with the staff who created it.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PermissionedStaffChatPage;