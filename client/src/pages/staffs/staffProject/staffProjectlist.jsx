import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { tokenRefreshInterceptor as axiosInstance } from "../../../utils/axiosInstance";
import { FaPencilAlt, FaSearch } from "react-icons/fa";

const ProjectList = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
 

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/projects");
      setProjects(response.data.projects || []);
    } catch {
      setError("Unable to load projects. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleEdit = (id) => {
    navigate(`/staff/projects/edit/${id}`);
  };

;

  const filteredProjects = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        project.relatedTo.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  return (
    <div className="pl-0 md:pl-64 min-h-screen  p-6 md:p-8">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        {/* Title */}
        <div className="mb-4 md:mb-0">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
            Project List
          </h2>

        </div>

        {/* Search & Add Project */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate("/staff/projects/add")}
            className="px-4 py-2 hover:text-black text-gray-600 bg-white font-semibold rounded-lg shadow transition-all"
          >
            + Add New Project
          </button>
          <div className="relative">
            <input
              type="text"
              placeholder="Search Projects..."
              className="block w-full pl-3 pr-3 py-2 bg-white text-sm md:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              
            />
             <FaSearch className="absolute right-3 top-2.5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {loading && (
        <p className="text-gray-700 mb-4 text-base md:text-lg font-medium">
          Loading projects...
        </p>
      )}
      {error && (
        <p className="text-red-500 mb-4 font-semibold">⚠️ {error}</p>
      )}

      {/* Projects Table */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        {filteredProjects.length === 0 ? (
          <p className="text-gray-500 text-center text-base md:text-lg">
            No projects found. Start by adding one!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="p-3 md:p-4 text-sm md:text-base font-semibold">
                    Project Name
                  </th>
                  <th className="p-3 md:p-4 text-sm md:text-base font-semibold">
                    Related To
                  </th>
                  <th className="p-3 md:p-4 text-sm md:text-base font-semibold">
                    Description
                  </th>
                  <th className="p-3 md:p-4 text-sm md:text-base font-semibold ">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProjects.map((project) => (
                  <tr
                    key={project._id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="p-3 md:p-4 text-gray-800 text-sm md:text-base font-medium">
                      {project.name}
                    </td>
                    <td className="p-3 md:p-4 text-gray-600 text-sm md:text-base">
                      {project.relatedTo}
                    </td>
                    <td className="p-3 md:p-4 text-gray-600 text-sm md:text-base max-w-md truncate">
                      {project.description}
                    </td>
                    <td className="p-3 md:p-4 text-center">
                      <div className="flex  gap-2 md:gap-3">
                        {/* UPDATED EDIT BUTTON */}
                        <button
                          onClick={() => handleEdit(project._id)}
                          className="flex items-center gap-1 px-3 py-2 bg-white text-gray-500 border border-gray-300 rounded-full shadow transition hover:bg-green-50"
                        >
                          <FaPencilAlt className="w-6 h-5 text-green-500" />

                          <span>Edit</span>
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

export default ProjectList;
