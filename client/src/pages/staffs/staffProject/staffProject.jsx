import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import bgImage from "../../../assets/bgimage.png";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch projects from backend
    axios
      .get(`${API_BASE_URL}/projects`)
      .then((response) => {
        setProjects(response.data);
      })
      .catch((error) => {
        console.error("Error fetching projects:", error);
        setProjects([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="pl-64 p-8 h-screen flex flex-col">
      {/* Header Section */}
      <div className="mb-4">
        <h1 className="text-3xl md:text-4xl font-bold text-black">
          Welcome to Kadagam Ventures
        </h1>
        <h3 className="text-lg text-black-200 mt-2">
          Manage your organization projects efficiently
        </h3>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xl">Loading projects...</p>
        </div>
      ) : projects.length === 0 ? (
        // Empty State Card
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 max-w-2xl w-full mx-4">
            {/* Centered Content */}
            <div className="flex flex-col items-center">
              <div className="animate-float">
                <img
                  src={bgImage}
                  alt="No projects available"
                  className="w-48 h-48 object-contain opacity-90"
                />
              </div>
              <div className="text-center space-y-3 w-full">
                <h2 className="text-2xl font-semibold text-gray-800 mt-4">
                  No Projects Found
                </h2>
                <p className="text-gray-500">
                  Let’s kickstart by managing your projects!
                </p>
              </div>
              {/* Centered Button */}
              <div className="w-full flex justify-center">
                <button
                  onClick={() =>
                    navigate("/staff/projects/add", { replace: true })
                  }
                  className="mt-6 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all 
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
                  Add Project
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Projects List
        <div className="flex-1 flex flex-col gap-4">
          {projects.map((project) => (
            <div
              key={project.id || project._id}
              className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 max-w-2xl w-full mx-auto"
            >
              <h2 className="text-2xl font-semibold text-gray-800">
                {project.name}
              </h2>
              <p className="text-gray-600 mt-2">{project.relatedTo}</p>
              <p className="text-gray-500 mt-2">{project.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;
