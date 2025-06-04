import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import bgImage from "../../../assets/bgimage.png";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const Task = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/tasks`);
        setTasks(response.data);
      } catch (err) {
        console.error("Error fetching tasks:", err);
        setError("Error fetching tasks");
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  return (
    <div className="pl-64 p-8 h-screen bg-gradient-to-br from-red-500 to-blue-500 flex flex-col">
      {/* Header Section */}
      <div className="mb-4">
        <h1 className="text-3xl md:text-4xl font-bold text-white">
          Task Details Page
        </h1>
        <h3 className="text-lg text-gray-200 mt-2">
          You can manage your organization
        </h3>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white text-lg">Loading tasks...</p>
        </div>
      ) : error || tasks.length === 0 ? (
        // Empty State Card if error occurs or no tasks found
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 max-w-2xl w-full mx-4">
            <div className="animate-float flex justify-center">
              <img
                src={bgImage}
                alt="No tasks available"
                className="w-48 h-48 object-contain opacity-90"
              />
            </div>
            <div className="text-center space-y-3 mt-4">
              <h2 className="text-2xl font-semibold text-gray-800">
                Nothing found, no tasks are here
              </h2>
              <p className="text-gray-500">
                Lets begin by adding your first Task
              </p>
            </div>
            <div className="flex justify-center mt-6">
              <button
                onClick={() =>
                  navigate("/admin/tasks/add", { replace: true })
                }
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all 
                        duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-500/30
                        shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Add New Task
              </button>
            </div>
          </div>
        </div>
      ) : (
        // If tasks exist, display them in a list
        <div className="flex-1 flex flex-col space-y-4 overflow-y-auto">
          {tasks.map((task) => (
            <div
              key={task.id || task._id}
              className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 max-w-2xl w-full mx-auto"
            >
              <h2 className="text-2xl font-semibold text-gray-800">
                {task.name}
              </h2>
              <p className="text-gray-600 mt-2">{task.description}</p>
              {/* Add more task details here if needed */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() =>
                    navigate(`/admin/tasks/${task.id || task._id}`)
                  }
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition duration-300 shadow-md"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Task;
