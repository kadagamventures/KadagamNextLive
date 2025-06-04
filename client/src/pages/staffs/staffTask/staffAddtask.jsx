import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProjects } from "../../../redux/slices/projectSlice";
import { fetchStaffs } from "../../../redux/slices/staffSlice";
import { fetchTasks } from "../../../redux/slices/taskSlice";
import { tokenRefreshInterceptor as axiosInstance } from "../../../utils/axiosInstance";
import Select from "react-select";
import { FaEye, FaTrash } from "react-icons/fa";

const TaskForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const dispatch = useDispatch();

  const userId = useSelector((state) => state.staffAuth?.user?._id);


  const { items: tasks } = useSelector((state) => state.tasks);
  const { items: projects, status: projectStatus } = useSelector((state) => state.projects);
  const { items: staffList, status: staffStatus } = useSelector((state) => state.staff);

  const [task, setTask] = useState({
    title: "",
    projects: [],
    assignedTo: "",
    dueDate: "",
    priority: "Medium",
    description: "",
    attachment: null,
    attachmentName: "",
    existingAttachments: [],
  });

  const [allowedPriorities, setAllowedPriorities] = useState(["High", "Medium", "Low"]);

  const projectOptions = projects.map((proj) => ({ value: proj._id, label: proj.name }));
  const staffOptions = staffList.map((staff) => ({
    value: staff._id,
    label: `${staff.name} (${staff.role})`,
  }));

useEffect(() => {
  if (isEditMode) {
    if (tasks.length === 0) {
      dispatch(fetchTasks());
    } else {
      const existingTask = tasks.find((t) => t._id === id);
      if (existingTask) {
        const assignedId = existingTask.assignedTo?._id || existingTask.assignedTo;

        // ✅ Prevent staff from editing their own assigned task
        if (String(assignedId) === String(userId)) {
          alert("⛔ You are not allowed to update your own assigned task.");
          return navigate("/staff/tasks/list");
        }

        setTask({
          title: existingTask.title,
          projects: existingTask.projects.map((p) => p._id),
          assignedTo: assignedId || "",
          dueDate: existingTask.dueDate?.split("T")[0] || "",
          priority: existingTask.priority,
          description: existingTask.description,
          attachment: null,
          attachmentName: "",
          existingAttachments: existingTask.attachments || [],
        });
      } else {
        alert("Task not found.");
        navigate("/staff/tasks/list");
      }
    }
  }
}, [dispatch, id, isEditMode, tasks, navigate, userId]);



  useEffect(() => {
    if (projects.length === 0 && projectStatus === "idle") dispatch(fetchProjects());
  }, [dispatch, projects.length, projectStatus]);

  useEffect(() => {
    if (staffList.length === 0 && staffStatus === "idle") dispatch(fetchStaffs());
  }, [dispatch, staffList.length, staffStatus]);

  useEffect(() => {
    if (task.dueDate) {
      const today = new Date();
      const due = new Date(task.dueDate);
      const daysLeft = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

      if (daysLeft <= 2) {
        setAllowedPriorities(["High"]);
        if (task.priority !== "High") {
          setTask((prev) => ({ ...prev, priority: "High" }));
          alert("⚠️ Low priority not allowed for near deadlines — auto-set to High.");
        }
      } else if (daysLeft <= 5) {
        setAllowedPriorities(["High", "Medium"]);
        if (task.priority === "Low") {
          setTask((prev) => ({ ...prev, priority: "Medium" }));
          alert("⚠️ Low priority not allowed for deadlines within 5 days — auto-set to Medium.");
        }
      } else {
        setAllowedPriorities(["High", "Medium", "Low"]);
      }
    }
  }, [task.dueDate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTask((prev) => ({ ...prev, [name]: value }));
  };

  const handleProjectSelect = (selectedOptions) => {
    const ids = selectedOptions ? selectedOptions.map((opt) => opt.value) : [];
    setTask((prev) => ({ ...prev, projects: ids }));
  };

  const handleStaffSelect = (selectedOption) => {
    setTask((prev) => ({ ...prev, assignedTo: selectedOption ? selectedOption.value : "" }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const MAX_SIZE_MB = 5;

    if (file) {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        alert(`❌ File too large. Max size is ${MAX_SIZE_MB}MB.`);
        return;
      }

      setTask((prevTask) => ({
        ...prevTask,
        attachment: file,
        attachmentName: file.name,
      }));
    }
  };

  const handleRemoveAttachment = () => {
    setTask((prev) => ({ ...prev, attachment: null, attachmentName: "" }));
  };

  const handleViewAttachment = () => {
    if (task.attachment) {
      window.open(URL.createObjectURL(task.attachment));
    }
  };

  const handleViewExistingAttachment = async (fileUrl) => {
    try {
      const response = await axiosInstance.post(`/tasks/${id}/attachment/url`, { fileUrl });
      const presignedUrl = response.data.url;
      window.open(presignedUrl, "_blank");
    } catch (error) {
      console.error("❌ Error fetching presigned URL:", error);
      alert("Failed to access the attachment.");
    }
  };

  const handleDeleteExistingAttachment = async (fileUrl) => {
    if (!window.confirm("Are you sure you want to delete this attachment?")) return;
    try {
      await axiosInstance.delete(`/tasks/${id}/attachment`, {
        data: { fileUrl },
      });
      setTask((prevTask) => ({
        ...prevTask,
        existingAttachments: prevTask.existingAttachments.filter(
          (attachment) => attachment.fileUrl !== fileUrl
        ),
      }));
      alert("Attachment deleted successfully!");
    } catch (error) {
      console.error("❌ Error deleting attachment:", error);
      alert("Failed to delete attachment.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { title, projects, assignedTo, dueDate, priority, description, attachment } = task;

    if (!title || !projects.length || !assignedTo || !dueDate || !priority || !description) {
      alert("Please fill all required fields.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("assignedTo", assignedTo);
    formData.append("dueDate", dueDate);
    formData.append("priority", priority);
    formData.append("description", description);
    projects.forEach((pid) => formData.append("projects[]", pid));
    if (attachment) formData.append("attachments", attachment, attachment.name);

    try {
      const endpoint = isEditMode ? `/tasks/${id}` : "/tasks";
      const method = isEditMode ? axiosInstance.put : axiosInstance.post;
      const res = await method(endpoint, formData);

      if (res.status === 200 || res.status === 201) {
        alert(`✅ Task ${isEditMode ? "updated" : "created"}!`);
        navigate("/staff/tasks/list");
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Something went wrong.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FB] p-6 pl-64">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          {isEditMode ? "Update Task" : "Add New Task"}
        </h1>
        <div className="flex gap-3 mt-4 md:mt-0">
          <button
            onClick={() => navigate("/staff/tasks/list")}
            className="px-6 py-3 bg-white text-gray-900 border font-semibold border-gray-300 rounded-full hover:text-red-500 transition hover:scale-105"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-700 text-white font-semibold rounded-full hover:shadow-lg transition hover:scale-105"
          >
            {isEditMode ? "Update Task" : "Add Task"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Task Title *</label>
                <input
                  type="text"
                  name="title"
                  value={task.title}
                  onChange={handleChange}
                  placeholder="Enter task title"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Choose Projects *</label>
                <Select
                  isMulti
                  options={projectOptions}
                  value={projectOptions.filter((opt) => task.projects.includes(opt.value))}
                  onChange={handleProjectSelect}
                  placeholder="Select project(s)..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Assign Staff *</label>
                <Select
                  options={staffOptions}
                  value={staffOptions.find((opt) => opt.value === task.assignedTo) || null}
                  onChange={handleStaffSelect}
                  placeholder="Select staff..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Due Date *</label>
                <input
                  type="date"
                  name="dueDate"
                  value={task.dueDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            {/* Right */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Priority *</label>
                <select
                  name="priority"
                  value={task.priority}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                >
                  {allowedPriorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Attachment (optional)</label>
                <input
                  type="file"
                  name="attachment"
                  onChange={handleFileChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                />

                {task.existingAttachments?.length > 0 && (
                  <div className="mt-2 bg-gray-50 p-2 rounded flex flex-col gap-2">
                    {task.existingAttachments.map((attachment, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm text-gray-700 truncate">
                          {attachment.fileUrl.split("/").pop()}
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="text-blue-500 hover:text-blue-700"
                            onClick={() => handleViewExistingAttachment(attachment.fileUrl)}
                          >
                            <FaEye />
                          </button>
                          <button
                            type="button"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteExistingAttachment(attachment.fileUrl)}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {task.attachment && (
                  <div className="mt-2 flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm text-gray-700 truncate">{task.attachmentName}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleViewAttachment}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <FaEye />
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveAttachment}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Task Description *</label>
                <textarea
                  name="description"
                  value={task.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Enter task details"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;
