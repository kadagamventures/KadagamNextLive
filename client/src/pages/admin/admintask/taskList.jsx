import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchTasks, deleteTask } from "../../../redux/slices/taskSlice";
import { FaTrash, FaSearch, FaPencilAlt } from "react-icons/fa";

const TaskList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const { items: tasks = [], status, error } = useSelector((state) => state.tasks);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchTasks());
    }
  }, [dispatch, status]);

  const handleAddTask = useCallback(
    () => navigate("/admin/tasks/add"),
    [navigate]
  );
  const handleEdit = useCallback(
    (id) => navigate(`/admin/tasks/edit/${id}`),
    [navigate]
  );

  const confirmDelete = useCallback((id) => {
    setSelectedId(id);
    setShowModal(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedId) return;
    setDeletingId(selectedId);
    try {
      await dispatch(deleteTask(selectedId)).unwrap();
      setShowModal(false);
    } catch {
      alert("❌ Failed to delete task. Please try again."); // optional fallback
    } finally {
      setDeletingId(null);
      setSelectedId(null);
    }
  }, [dispatch, selectedId]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) =>
      task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.projects?.some((proj) =>
        proj.name?.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      task.assignedTo?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [tasks, searchTerm]);

  return (
    <div className="min-h-screen p-6 md:p-8 relative">
      {/* Delete Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs">
          <div className="bg-white rounded-lg p-6 w-[90%] max-w-md shadow-lg text-center">
            <h3 className="text-lg font-semibold mb-3">Confirm Delete</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this task?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded"
                disabled={deletingId === selectedId}
              >
                {deletingId === selectedId ? "Deleting..." : "Yes, Delete"}
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedId(null);
                }}
                className="px-4 py-2 text-sm font-medium bg-gray-200 hover:bg-gray-300 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
          Task Dashboard
        </h2>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <button
            onClick={handleAddTask}
            className="px-4 py-2 hover:text-black text-gray-600 bg-white font-semibold rounded-full shadow transition-all"
          >
            <span className="text-violet-600 text-2xl">+</span> Add New Task
          </button>
          <div className="relative">
            <input
              type="text"
              placeholder="Search tasks..."
              className="block w-full pl-3 pr-10 py-2 bg-white text-sm md:text-base border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <FaSearch className="absolute right-3 top-2.5 text-violet-600" />
          </div>
        </div>
      </div>

      {error && <p className="text-red-500 mb-4 text-center">⚠️ {error}</p>}

      <div className="bg-white rounded-xl p-4 md:p-6 shadow">
        {status === "loading" ? (
          <p className="text-gray-500 text-center animate-pulse">
            Loading tasks...
          </p>
        ) : filteredTasks.length === 0 ? (
          <p className="text-gray-500 text-center">
            No tasks found. Start by adding one!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "Task Name",
                    "Projects",
                    "Assigned Staff",
                    "Assigned Date",
                    "Due Date",
                    "Priority",
                    "Action",
                  ].map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2 text-center text-xs font-medium text-gray-600 whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTasks.map((task) => (
                  <tr key={task._id} className="hover:bg-gray-50">
                    <td
                      className="px-3 py-2 text-sm text-gray-700 font-medium max-w-sm truncate text-center"
                      title={task.title}
                    >
                      {task.title}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap text-center">
                      {task.projects?.length
                        ? task.projects.map((p) => p.name).join(", ")
                        : "N/A"}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap text-center">
                      {task.assignedTo?.name || "N/A"}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap text-center">
                      {task.assignedDate && !isNaN(new Date(task.assignedDate))
                        ? new Date(task.assignedDate).toLocaleDateString("en-CA")
                        : "N/A"}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap text-center">
                      {task.dueDate?.split("T")[0] || "N/A"}
                    </td>
                    <td className="px-3 py-2 text-sm whitespace-nowrap text-center">
                      <span
                        className={`font-semibold ${
                          task.priority === "High"
                            ? "text-red-500"
                            : task.priority === "Medium"
                            ? "text-yellow-500"
                            : "text-green-500"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm whitespace-nowrap text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleEdit(task._id)}
                          className="flex items-center gap-1 px-2 py-1 bg-white text-gray-500 border border-gray-300 rounded-full shadow transition hover:bg-green-50 text-xs"
                        >
                          Edit <FaPencilAlt className="text-green-500" />
                        </button>
                        <button
                          onClick={() => confirmDelete(task._id)}
                          disabled={deletingId === task._id}
                          className={`flex items-center gap-1 px-2 py-1 bg-white text-gray-500 border border-gray-300 rounded-full shadow transition text-xs ${
                            deletingId === task._id
                              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                              : "hover:bg-red-50"
                          }`}
                        >
                          {deletingId === task._id ? (
                            "Deleting..."
                          ) : (
                            <>
                              Delete <FaTrash className="text-red-500" />
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskList;
