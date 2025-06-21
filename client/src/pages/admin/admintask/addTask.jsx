import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchTasks } from "../../../redux/slices/taskSlice";
import { fetchProjects } from "../../../redux/slices/projectSlice";
import { fetchStaffs } from "../../../redux/slices/staffSlice";
import { tokenRefreshInterceptor as axiosInstance } from "../../../utils/axiosInstance";
import Select from "react-select";
import { FaEye, FaTrash } from "react-icons/fa";

const TaskForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const dispatch = useDispatch();

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
  existingAttachments: [], // Explicitly add this
});


  const projectOptions = projects.map((proj) => ({ value: proj._id, label: proj.name }));
  const staffOptions = staffList.map((staff) => ({
    value: staff._id,
    label: `${staff.name} (${staff.role})`,
  }));

useEffect(() => {
  const fetchTask = async () => {
    try {
      const { data: existingTask } = await axiosInstance.get(`/tasks/${id}`);
      if (existingTask) {
        setTask({
          title: existingTask.title,
          projects: existingTask.projects.map((p) => p._id),
          assignedTo: existingTask.assignedTo?._id || existingTask.assignedTo || "",
          dueDate: existingTask.dueDate?.split("T")[0] || "",
          priority: existingTask.priority,
          description: existingTask.description,
          attachment: null,
          attachmentName: "",
          existingAttachments: existingTask.attachments || [],
        });
      } else {
        alert("Task not found.");
        navigate("/admin/tasks/list");
      }
    } catch (error) {
      console.error("Error fetching task:", error);
      alert("Failed to load task details.");
      navigate("/admin/tasks/list");
    }
  };

  if (isEditMode) fetchTask();
}, [id, isEditMode, navigate]);


  useEffect(() => {
    if (projects.length === 0 && projectStatus === "idle") {
      dispatch(fetchProjects());
    }
  }, [dispatch, projects.length, projectStatus]);

  useEffect(() => {
    if (staffList.length === 0 && staffStatus === "idle") {
      dispatch(fetchStaffs());
    }
  }, [dispatch, staffList.length, staffStatus]);

  const calculateAllowedPriorities = (dueDate) => {
    const daysLeft = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 2) return ["High"];
    if (daysLeft <= 5) return ["High", "Medium"];
    return ["High", "Medium", "Low"];
  };

  useEffect(() => {
    if (task.dueDate) {
      const allowed = calculateAllowedPriorities(task.dueDate);
      if (!allowed.includes(task.priority)) {
        setTask((prev) => ({
          ...prev,
          priority: allowed[0],
        }));
        if (allowed.length === 1) {
          alert("Low priority not allowed for near deadlines — auto-set to High.");
        }
      }
    }
  }, [task.dueDate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTask((prevTask) => ({ ...prevTask, [name]: value }));
  };

  const handleProjectSelect = (selectedOptions) => {
    const selectedIds = selectedOptions ? selectedOptions.map((opt) => opt.value) : [];
    setTask((prevTask) => ({ ...prevTask, projects: selectedIds }));
  };

  const handleStaffSelect = (selectedOption) => {
    setTask((prevTask) => ({
      ...prevTask,
      assignedTo: selectedOption ? selectedOption.value : "",
    }));
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
    setTask((prevTask) => ({
      ...prevTask,
      attachment: null,
      attachmentName: "",
    }));
  };

  const handleViewAttachment = () => {
    if (task.attachment) {
      window.open(URL.createObjectURL(task.attachment));
    }
  };
const handleSubmit = async (e) => {
  e.preventDefault();

  if (
    !task.title ||
    task.projects.length === 0 ||
    !task.assignedTo ||
    !task.dueDate ||
    !task.priority ||
    !task.description
  ) {
    alert("Please fill all required fields.");
    return;
  }

  const formData = new FormData();
  formData.append("title", task.title);
  formData.append("dueDate", task.dueDate);
  formData.append("priority", task.priority);
  formData.append("description", task.description);
  task.projects.forEach((projectId) => formData.append("projects[]", projectId));
  formData.append("assignedTo", task.assignedTo);

  if (task.attachment) {
    formData.append("attachments", task.attachment, task.attachment.name); // ✅ explicitly set filename here
  }

  try {
    if (isEditMode) {
      await axiosInstance.put(`/tasks/${id}`, formData);
      alert("Task updated successfully!");
    } else {
      await axiosInstance.post("/tasks", formData);
      alert("Task added successfully!");
    }
    navigate("/admin/tasks/list");
  } catch (error) {
    console.error("❌ Error:", error);
    alert(error.response?.data?.message || "Something went wrong.");
  }
};



  const allowedPriorities = task.dueDate ? calculateAllowedPriorities(task.dueDate) : ["High", "Medium", "Low"];
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


  return (
    <div className="min-h-screen bg-[#F7F8FB] p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          {isEditMode ? "Update Task" : "Add New Task"}
        </h1>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <button
            onClick={() => navigate("/admin/tasks/list")}
            className="px-6 py-3 bg-white text-gray-900 border font-semibold border-gray-300 rounded-full shadow hover:text-red-500 transition duration-300 ease-in-out transform hover:scale-105"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-700 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition duration-300 ease-in-out transform hover:scale-105"
          >
            {isEditMode ? "Update Task" : "Add Task"}
          </button>
        </div>
      </div>
  
      <div className="bg-white rounded-xl shadow-md p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={task.title}
                  onChange={handleChange}
                  placeholder="Enter task title"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Choose Projects <span className="text-red-500">*</span>
                </label>
                <Select
                  isMulti
                  options={projectOptions}
                  value={projectOptions.filter((opt) => task.projects.includes(opt.value))}
                  onChange={handleProjectSelect}
                  placeholder="Select project(s)..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign Staff <span className="text-red-500">*</span>
                </label>
                <Select
                  options={staffOptions}
                  value={staffOptions.find((opt) => opt.value === task.assignedTo) || null}
                  onChange={handleStaffSelect}
                  placeholder="Select staff..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="dueDate"
                  value={task.dueDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500"
                />
              </div>
            </div>
  
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority <span className="text-red-500">*</span>
                </label>
                <select
                  name="priority"
                  value={task.priority}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500"
                >
                  {allowedPriorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </div>
              <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Attachment (optional)
  </label>
  <input
    type="file"
    name="attachment"
    onChange={handleFileChange}
    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500"
  />

  {/* Clearly show existing attachments */}
{/* Display existing attachments clearly with delete functionality */}
{task.existingAttachments && task.existingAttachments.length > 0 && (
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
            aria-label="View attachment"
            onClick={() => handleViewExistingAttachment(attachment.fileUrl)} // ✅ Use this handler explicitly
          >
            <FaEye />
          </button>
          <button
            type="button"
            className="text-red-500 hover:text-red-700"
            aria-label="Delete attachment"
            onClick={() => handleDeleteExistingAttachment(attachment.fileUrl)}
          >
            <FaTrash />
          </button>
        </div>
      </div>
    ))}
  </div>
)}

  {/* Newly selected attachment preview */}
  {task.attachment && (
    <div className="mt-2 flex items-center justify-between bg-gray-50 p-2 rounded">
      <span className="text-sm text-gray-700 truncate">{task.attachmentName}</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleViewAttachment}
          className="text-blue-500 hover:text-blue-700"
          aria-label="View attachment"
        >
          <FaEye />
        </button>
        <button
          type="button"
          onClick={handleRemoveAttachment}
          className="text-red-500 hover:text-red-700"
          aria-label="Delete attachment"
        >
          <FaTrash />
        </button>
      </div>
    </div>
  )}
</div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={task.description}
                  onChange={handleChange}
                  placeholder="Enter task details"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500"
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
