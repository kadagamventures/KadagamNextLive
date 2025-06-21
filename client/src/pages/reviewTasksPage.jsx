import { useEffect, useState } from "react";
import { tokenRefreshInterceptor as axiosInstance } from "../utils/axiosInstance";
import { FaCheck, FaTimes, FaSpinner, FaFileAlt, FaDownload } from "react-icons/fa";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ReviewTasksPage = () => {
  const [reviewTasks, setReviewTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [taskReasons, setTaskReasons] = useState({});

  const { user } = useSelector((state) => state.staffAuth);

  useEffect(() => {
    fetchReviewTasks();
  }, []);

  const fetchReviewTasks = async () => {
    try {
      let response;
      if (user?.role === "admin") {
        response = await axiosInstance.get("/tasks");
      } else if (user?.permissions?.includes("manage_task")) {
        response = await axiosInstance.get("/tasks/assigned-by-me");
      } else {
        return;
      }

      const reviewTasksOnly = response.data.filter((task) => task.status === "Review");
      setReviewTasks(reviewTasksOnly);
      setFetchError(false);
    } catch (error) {
      console.error("Error fetching review tasks:", error);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePriorityChange = (taskId, newPriority) => {
    setReviewTasks((prev) =>
      prev.map((task) => (task._id === taskId ? { ...task, priority: newPriority } : task))
    );
  };

  const handleDueDateChange = (taskId, newDate) => {
    setReviewTasks((prev) =>
      prev.map((task) => (task._id === taskId ? { ...task, dueDate: newDate } : task))
    );
  };

  const handleReasonChange = (taskId, reasonText) => {
    setTaskReasons((prev) => ({ ...prev, [taskId]: reasonText }));
  };

  const submitReviewDecision = async (task, decision) => {
    const reason = taskReasons[task._id]?.trim() || "";

    if (decision === "rejected") {
      if (!reason) {
        toast.error("Please enter a reason for rejection.");
        return;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(task.dueDate) < today) {
        toast.error("Due date must be in the future.");
        return;
      }
    }

    try {
      if (decision === "rejected") {
        await axiosInstance.put(`/tasks/${task._id}`, {
          priority: task.priority,
          dueDate: task.dueDate,
        });
      }
      await axiosInstance.put(`/tasks/review/${task._id}`, {
        decision,
        comment: reason,
        newDueDate: task.dueDate,
        newPriority: task.priority,
      });

      setReviewTasks((prev) => prev.filter((t) => t._id !== task._id));
      toast.success(`Task ${decision === "approved" ? "approved" : "rejected"} successfully!`);
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Failed to submit review. Please try again.");
    }
  };

  const downloadReviewAttachment = async (fileUrl) => {
    try {
      const urlObj = new URL(fileUrl);
      const fileKey = decodeURIComponent(urlObj.pathname.substring(1));
      const { data } = await axiosInstance.get(`/files/presigned-url?key=${encodeURIComponent(fileKey)}`);

      const response = await fetch(data.url);
      const blob = await response.blob();

      const downloadLink = document.createElement("a");
      downloadLink.href = window.URL.createObjectURL(blob);
      downloadLink.download = fileKey.split("/").pop();
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file.");
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Review Tasks</h2>
      </div>

      <div className="grid gap-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center mt-20 text-gray-500">
            <FaSpinner className="text-6xl animate-spin mb-4" />
            <h3 className="text-xl font-semibold">Loading tasks...</h3>
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center mt-20 text-gray-500">
            <FaFileAlt className="text-6xl mb-4" />
            <h3 className="text-xl font-semibold">Failed to load tasks</h3>
            <p className="text-sm">Please check your network or permissions.</p>
          </div>
        ) : reviewTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 text-gray-500">
            <FaFileAlt className="text-6xl mb-4" />
            <h3 className="text-xl font-semibold">No Review Tasks Found</h3>
            <p className="text-sm">No tasks available for review.</p>
          </div>
        ) : (
          reviewTasks.map((task) => (
            <div key={task._id} className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Re-Work</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1">Assigned To</p>
                  <p className="text-base text-gray-700">{task.assignedTo?.name || "N/A"}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1">Review Attachment</p>
                  {task.review?.reviewAttachments?.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={task.review.reviewAttachments[0].originalName || "File.pdf"}
                        className="border rounded-lg p-2 text-sm flex-1"
                      />
                      <button
                        onClick={() => downloadReviewAttachment(task.review.reviewAttachments[0].fileUrl)}
                        className="flex items-center gap-1 px-3 py-1.5 border border-purple-500 text-purple-600 rounded-full text-sm hover:bg-purple-100"
                      >
                        <FaDownload className="h-4 w-4" />
                        <span>Download</span>
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No attachments</p>
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1">Due Date</p>
                  <input
                    type="date"
                    value={new Date(task.dueDate).toISOString().split("T")[0]}
                    onChange={(e) => handleDueDateChange(task._id, e.target.value)}
                    className="border p-2 rounded-lg w-full text-sm"
                  />
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1">Priority</p>
                  <select
                    value={task.priority}
                    onChange={(e) => handlePriorityChange(task._id, e.target.value)}
                    className="border p-2 rounded-lg w-full text-sm"
                  >
                    {["High", "Medium", "Low"].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-500 mb-1">Project Description</p>
                <textarea
                  placeholder="Describe the project scope, goal and key details..."
                  value={taskReasons[task._id] || ""}
                  onChange={(e) => handleReasonChange(task._id, e.target.value)}
                  className="w-full border p-3 rounded-lg text-sm"
                  rows={3}
                />
              </div>

              <div className="flex justify-center gap-4 mt-6">
                <button
                  onClick={() => submitReviewDecision(task, "approved")}
                  className="flex items-center gap-2 bg-green-100 border border-green-400 text-green-600 px-6 py-2 rounded-full hover:bg-green-200 text-sm"
                >
                  Approval <FaCheck />
                </button>

                <button
                  onClick={() => submitReviewDecision(task, "rejected")}
                  className="flex items-center gap-2 bg-red-100 border border-red-400 text-red-600 px-6 py-2 rounded-full hover:bg-red-200 text-sm"
                >
                  Rejected <FaTimes />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReviewTasksPage;
