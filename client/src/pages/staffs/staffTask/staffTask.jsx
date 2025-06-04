import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import bgImage from "../../../assets/bgimage.png";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const StaffTask = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/tasks`)
      .then((response) => {
        setTasks(response.data);
      })
      .catch((error) => {
        console.error("Error fetching tasks:", error);
        setTasks([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pl-64 p-8 h-screen flex flex-col">
      {/* Header Section */}
      <div className="mb-4">
        <h1 className="text-3xl md:text-4xl font-bold text-black">
          Task Details Page
        </h1>
        <h3 className="text-lg text-black-200 mt-2">
          You can manage your tasks here
        </h3>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xl">Loading tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        // Empty State Card
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
                Let&apos;s begin by adding your first Task
              </p>
            </div>
            <div className="flex justify-center mt-6">
              <button
                onClick={() => navigate("/staff/tasks/add", { replace: true })}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-500/30 shadow-md hover:shadow-lg flex items-center gap-2"
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
        // Tasks List
        <div className="flex-1">
          <ul className="divide-y divide-gray-200">
            {tasks.map((task) => (
              <li
                key={task.id || task._id}
                className="p-4 flex justify-between items-center bg-white rounded-xl shadow-sm mb-4"
              >
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {task.name}
                  </h2>
                  <p className="text-gray-600">{task.description}</p>
                </div>
                <button
                  onClick={() =>
                    navigate(`/staff/tasks/view/${task.id || task._id}`)
                  }
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  View Details
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default StaffTask;
