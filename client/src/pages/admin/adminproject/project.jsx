import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchProjects } from "../../../redux/slices/projectSlice";
import bgImage from "../../../assets/bgimage.png";

const Projects = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Get projects from Redux store
  const { items: projects = [], fetchStatus, error } = useSelector((state) =>
    state.projects || { items: [], fetchStatus: "idle", error: null }
  );

  const [searchQuery, setSearchQuery] = useState("");

  // Fetch projects when the component mounts
  useEffect(() => {
    if (fetchStatus === "idle") {
      dispatch(fetchProjects());
    }
  }, [dispatch, fetchStatus]);

  // Filter projects based on search query
  const filteredProjects = projects.filter((project) =>
    [project.name, project.relatedTo, project.description]
      .map((val) => (val || "").toLowerCase()) // Ensure values are strings
      .some((val) => val.includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="pl-0 md:pl-64 min-h-screen bg-gradient-to-br from-red-500 to-blue-500 flex flex-col p-8">
      {/* Header Section */}
      <div className="mb-4">
        <h1 className="text-3xl md:text-4xl font-bold text-white">Project Management</h1>
        <h3 className="text-lg text-gray-200 mt-2">Manage your organization&apos;s projects</h3>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md mb-6">
        <input
          type="text"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-4 pr-10 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <svg className="absolute right-3 top-3 text-gray-400 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8 4a4 4 0 000 8h0a4 4 0 100-8zM2 8a6 6 0 1111.62 3.22l4.15 4.15a1 1 0 01-1.42 1.42l-4.15-4.15A6 6 0 012 8z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      {/* Project List */}
      {fetchStatus === "loading" ? (
        <div className="flex-1 flex items-center justify-center text-white text-lg">
          Loading projects...
        </div>
      ) : error ? (
        <div className="text-red-400 text-center">Error: {error}</div>
      ) : filteredProjects.length > 0 ? (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 max-w-4xl w-full mx-auto">
          <ul className="space-y-4">
            {filteredProjects.map((project) => (
              <li key={project._id} className="p-4 bg-gray-100 rounded-lg">
                <h2 className="text-lg font-semibold text-gray-800">{project.name}</h2>
                <p className="text-gray-600"><strong>Related To:</strong> {project.relatedTo || "N/A"}</p>
                <p className="text-gray-500"><strong>Description:</strong> {project.description || "No description provided."}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 max-w-2xl w-full mx-4">
            <div className="animate-float flex justify-center">
              <img
                src={bgImage}
                alt="No projects available"
                className="w-48 h-48 object-contain opacity-90"
              />
            </div>
            <div className="text-center space-y-3 mt-4">
              <h2 className="text-2xl font-semibold text-gray-800">No Projects Found</h2>
              <p className="text-gray-500">Let&apos;s begin by adding your first project!</p>
            </div>
            <div className="flex justify-center mt-6">
              <button
                onClick={() => navigate("/admin/projects/add", { replace: true })}
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
                Add New Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
