import { useEffect, useState, useRef } from "react";
import { tokenRefreshInterceptor as axiosInstance } from "../../utils/axiosInstance";
import StaffSidebar from "../../components/staffSidebar";
import { FaFileAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import NotificationBell from "../../components/notificationBell";

const statusColors = {
  todo: "bg-white border border-blue-200",
  ongoing: "bg-white border border-orange-200",
  review: "bg-white border border-purple-200",
  completed: "bg-white border border-pink-200",
};

const StaffDashboard = () => {
  const fileInputRef = useRef(null);
  const [kanbanTasks, setKanbanTasks] = useState({
    todo: [],
    ongoing: [],
    review: [],
    completed: [],
  });

  const [dailyModal, setDailyModal] = useState({
    open: false,
    task: null,
    comment: "",
    file: null,
    previewUrl: "",
  });
  const [reviewModal, setReviewModal] = useState({
    open: false,
    taskId: null,
    taskTitle: "",
    file: null,
  });
  const [profile, setProfile] = useState({
    name: "",
    company: "",
    photoUrl: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
    fetchKanbanTasks();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axiosInstance.get("/staff/my-profile");
      const { name, company, profilePic } = res.data.staff || {};
      const safePhotoUrl = profilePic?.trim()
        ? profilePic
        : "/default-profile.png";
      setProfile({ name, company, photoUrl: safePhotoUrl });
    } catch (err) {
      console.error(err);
    }
  };

  const fetchKanbanTasks = async () => {
    try {
      const { data } = await axiosInstance.get("/tasks/kanban");
      const sortedTodo = [...(data.todo || [])].sort((a, b) => {
        const isOverdueA = new Date(a.dueDate) < new Date();
        const isOverdueB = new Date(b.dueDate) < new Date();
        if (isOverdueA && !isOverdueB) return -1;
        if (!isOverdueA && isOverdueB) return 1;
        const priorityOrder = { High: 0, Medium: 1, Low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(a.dueDate) - new Date(b.dueDate);
      });

      setKanbanTasks({
        todo: sortedTodo,
        ongoing: data.ongoing || [],
        review: data.review || [],
        completed: data.completed || [],
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDragStart = (e, task) => {
    e.dataTransfer.setData("text/plain", JSON.stringify(task));
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    const task = JSON.parse(e.dataTransfer.getData("text/plain"));
    if (task.status === "Completed")
      return alert("Cannot move completed task.");
    if (newStatus === "completed")
      return alert("Only admin can approve completion.");
    if (newStatus === "review") {
      setReviewModal({
        open: true,
        taskId: task._id,
        taskTitle: task.title,
        file: null,
      });
    } else {
      updateTaskStatus(task._id, newStatus);
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      const statusMap = {
        todo: "To Do",
        ongoing: "Ongoing",
        review: "Review",
        completed: "Completed",
      };

      const formattedStatus = statusMap[status.toLowerCase()];
      if (!formattedStatus) return alert("Invalid status");

      await axiosInstance.put(`/tasks/staff/${taskId}`, {
        status: formattedStatus,
      });
      fetchKanbanTasks();
    } catch (err) {
      console.error(err);
      alert("❌ Failed to update task status.");
    }
  };
  const submitMoveToReview = async () => {
    const formData = new FormData();
    if (reviewModal.file) formData.append("reviewAttachment", reviewModal.file);
    try {
      await axiosInstance.put(
        `/tasks/staff/${reviewModal.taskId}/review`,
        formData
      );
      setReviewModal({ open: false, taskId: null, taskTitle: "", file: null });
      fetchKanbanTasks();
      alert("✅ Task moved to Review!");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to move task to review.");
    }
  };

  const fetchPresignedUrls = async (attachments) => {
    const previewUrls = [];

    for (const file of attachments) {
      const key =
        file.key ||
        (file.fileUrl
          ? decodeURIComponent(new URL(file.fileUrl).pathname.slice(1))
          : "");
      try {
        const { data } = await axiosInstance.get(
          `/files/presigned-url?key=${encodeURIComponent(key)}`
        );
        previewUrls.push(data.url);
      } catch (err) {
        console.error("❌ Presigned URL fetch failed:", err);
        previewUrls.push("");
      }
    }

    return previewUrls;
  };

  const handleOpenDailyModal = async (task) => {
    const attachments = task.attachments || [];
    const previewUrls = await fetchPresignedUrls(attachments);

    setDailyModal({
      open: true,
      task,
      comment: "",
      file: null,
      previewUrls,
    });
  };

  const renderTaskCard = (task, status) => {
    const isOverdue = new Date(task.dueDate) < new Date();
    return (
      <div
        key={task._id}
        draggable
        onDragStart={(e) => handleDragStart(e, task)}
        className="p-6 mb-4 rounded-3xl bg-white shadow-lg transition hover:scale-105 cursor-pointer"
      >
        <h4 className="text-lg font-semibold mb-2">{task.title}</h4>
        <p className="text-sm text-gray-600 mb-1">
          Priority:{" "}
          <span
            className={
              task.priority === "High"
                ? "text-red-600"
                : task.priority === "Medium"
                ? "text-yellow-500"
                : "text-green-600"
            }
          >
            {task.priority}
          </span>
          {isOverdue && (
            <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
              ⚠️ Overdue
            </span>
          )}
        </p>
        <p className="text-sm text-gray-600 mb-1">
          Due: {new Date(task.dueDate).toLocaleDateString()}
        </p>
        <p className="text-sm text-gray-600 mb-3">
          Project:{" "}
          <span className="font-medium">
            {task.projects?.[0]?.name || "N/A"}
          </span>
        </p>

        {status === "ongoing" && (
          <>
            <input
              type="text"
              readOnly
              className="border p-3 w-full rounded-xl text-sm mb-2 placeholder-gray-400 cursor-pointer"
              placeholder="Click to update..."
              onClick={() => handleOpenDailyModal(task)}
            />
            <button
              onClick={() => handleOpenDailyModal(task)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 font-bold rounded-full shadow-md mb-2"
            >
              Update Status
            </button>
          </>
        )}

        {status === "ongoing" && task.review?.reason && (
          <div className="mt-3 bg-red-100 p-3 rounded-xl text-xs text-red-700">
            <p>
              <strong>Rejection Reason:</strong> {task.review.reason}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen pl-64 flex-col bg-gray-50 relative">
      <StaffSidebar />
      <div className="flex-grow p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            {profile.photoUrl && (
              <img
                onClick={() => navigate("/staff/profile")}
                src={profile.photoUrl}
                alt="Profile"
                className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 cursor-pointer"
              />
            )}

            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Welcome, {profile.name || "Loading..."}
              </h1>
              <p className="text-sm text-gray-500">{profile.company}</p>
            </div>
          </div>
          <NotificationBell />
        </div>

        {/* Task Board */}
        <h2 className="text-3xl font-bold text-gray-800 mb-6">My Tasks</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Object.entries(kanbanTasks).map(([status, tasks]) => (
            <div
              key={status}
              onDrop={(e) => handleDrop(e, status)}
              onDragOver={(e) => e.preventDefault()}
              className={`p-6 rounded-3xl shadow-xl ${statusColors[status]}`}
            >
              <h3 className="text-xl font-semibold mb-4 capitalize">
                {status}
              </h3>
              {tasks.length > 0 ? (
                tasks.map((task) => renderTaskCard(task, status))
              ) : (
                <p className="text-gray-400 text-center text-sm">No tasks</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Review Modal */}
      {reviewModal.open && (
        <div className="fixed inset-0 backdrop-blur-xs bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md text-center space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Move to Review</h2>
            <p className="text-gray-600 text-sm">
              Task: <strong>{reviewModal.taskTitle}</strong>
            </p>
            <input
              type="file"
              className="w-full text-xs"
              onChange={(e) => {
                const file = e.target.files[0];
                const MAX_SIZE_MB = 5;

                if (file && file.size > MAX_SIZE_MB * 1024 * 1024) {
                  alert(
                    `❌ File too large. Maximum allowed size is ${MAX_SIZE_MB}MB.`
                  );
                  return;
                }

                setReviewModal((m) => ({ ...m, file }));
              }}
            />
            <p className="text-xs text-gray-500 mt-1">Max size: 5MB</p>

            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={submitMoveToReview}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-2 rounded-full"
              >
                Submit
              </button>
              <button
                onClick={() =>
                  setReviewModal({
                    open: false,
                    taskId: null,
                    taskTitle: "",
                    file: null,
                  })
                }
                className="bg-gray-400 hover:bg-gray-500 text-white font-semibold px-6 py-2 rounded-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Update Modal */}
      {dailyModal.open && (
        <div
          className="fixed inset-0 bg-opacity-50 backdrop-blur-xs flex items-center justify-center z-50"
          onClick={() => setDailyModal((m) => ({ ...m, open: false }))}
        >
          <div
            className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col md:flex-row gap-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Side: Task Details */}
            <div className="w-full md:w-1/2">
              <h3 className="text-lg font-semibold mb-2">Task Description</h3>
              <p className="text-sm text-gray-700 mb-4">
                {dailyModal.task.description || "No description provided."}
              </p>
              <h4 className="text-md font-medium mb-2">Attachment Preview</h4>
              {dailyModal.task.attachments?.length > 0 ? (
                <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                  {dailyModal.task.attachments.map((att, i) => {
                    const url = att?.fileUrl || "";
                    const fileName = decodeURIComponent(url.split("/").pop());
                    const previewUrl = dailyModal.previewUrls?.[i] || "";
                    const isImage = /\.(png|jpe?g|gif|webp)$/i.test(fileName);

                    return (
                      <div
                        key={i}
                        className="bg-gray-100 p-3 rounded-xl text-center"
                      >
                        {isImage ? (
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-full h-32 object-cover rounded mb-2"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-32 bg-gray-200 rounded mb-2">
                            <FaFileAlt className="text-3xl text-gray-500" />
                          </div>
                        )}
                        {previewUrl && (
                          <a
                            href={previewUrl}
                            download
                            className="inline-block px-4 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-full"
                          >
                            Download
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center bg-gray-100 rounded text-gray-400">
                  No attachments
                </div>
              )}
            </div>

            {/* Right side: Comment Input */}
            <div className="w-full md:w-1/2">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Daily Comment
              </h2>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Upload File
                </label>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                  ref={fileInputRef}
                  className="block w-full text-sm border border-dashed border-gray-300 p-2 rounded-lg"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    const MAX_SIZE_MB = 5;
                    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
                      alert(`❌ File too large. Max ${MAX_SIZE_MB}MB.`);
                      return;
                    }

                    const hasValidName = file.name && file.name.includes(".");
                    const isValidType =
                      file.type && file.type !== "application/octet-stream";

                    if (hasValidName && isValidType) {
                      setDailyModal((m) => ({ ...m, file }));
                    } else {
                      const guessedExt = isValidType
                        ? file.type.split("/").pop()
                        : "bin";
                      const fallbackName = `attachment-${Date.now()}.${guessedExt}`;
                      const safeFile = new File([file], fallbackName, {
                        type: file.type,
                      });
                      setDailyModal((m) => ({ ...m, file: safeFile }));
                    }
                  }}
                />

                {/* ✅ Show selected file name with delete option */}
                {dailyModal.file && (
                  <div className="mt-2 flex items-center justify-between bg-gray-100 border border-gray-300 rounded-md px-3 py-2">
                    <span className="text-sm text-gray-800 truncate">
                      {dailyModal.file.name}
                    </span>
                    <button
                      onClick={() =>
                        setDailyModal((m) => ({ ...m, file: null }))
                      }
                      className="text-red-500 text-sm font-bold px-2 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Daily Status Update
                </label>
                <textarea
                  rows={4}
                  className="w-full p-3 border rounded-lg text-sm resize-none border-violet-700 hover:border-violet-700 focus:outline-none focus:ring-1 focus:ring-violet-700"
                  placeholder="Enter your update..."
                  value={dailyModal.comment}
                  onChange={(e) =>
                    setDailyModal((m) => ({ ...m, comment: e.target.value }))
                  }
                />
              </div>

              <div className="flex justify-end mt-4 gap-2">
                <button
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-sm font-medium rounded-full"
                  onClick={() => setDailyModal((m) => ({ ...m, open: false }))}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-full"
                  onClick={async () => {
                    const { task, comment, file } = dailyModal;
                    if (!comment.trim() && !file) {
                      alert("Please add a comment or file.");
                      return;
                    }

                    const formData = new FormData();
                    if (comment.trim()) {
                      formData.append("comment", comment.trim());
                    }
                    if (file) {
                      const ext = file.name?.split(".").pop() || "bin";
                      const fallbackName = `attachment-${Date.now()}.${ext}`;
                      const finalName = file.name || fallbackName;
                      const cleanFile = new File([file], finalName, {
                        type: file.type,
                      });
                      formData.append("attachment", cleanFile, finalName);
                    }

                    try {
                      await axiosInstance.post(
                        `/tasks/${task._id}/daily-comment`,
                        formData,
                        {
                          headers: { "Content-Type": "multipart/form-data" },
                        }
                      );
                      setDailyModal((m) => ({ ...m, open: false }));
                      fetchKanbanTasks();
                      alert("✅ Daily update submitted!");
                    } catch (err) {
                      console.error("❌ Upload failed:", err);
                      alert("❌ Update failed.");
                    }
                  }}
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
