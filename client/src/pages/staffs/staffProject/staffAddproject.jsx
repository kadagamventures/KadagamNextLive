import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchProjects, addProject, updateProject } from "../../../redux/slices/projectSlice";

const AddProject = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { items: projects, error } = useSelector((state) => state.projects);
  const { user } = useSelector((state) => state.auth);

  const [newProject, setNewProject] = useState({
    name: "",
    relatedTo: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  useEffect(() => {
    if (isEditMode) {
      const existing = projects.find((proj) => proj._id === id);
      if (existing) {
        setNewProject({
          name: existing.name,
          relatedTo: existing.relatedTo,
          description: existing.description,
        });
      }
    }
  }, [id, isEditMode, projects]);

  const validateForm = () => {
    if (!newProject.name.trim() || !newProject.relatedTo.trim() || !newProject.description.trim()) {
      setFormError("⚠️ All fields are required!");
      return false;
    }
    if (newProject.name.length > 100) {
      setFormError("⚠️ Project name cannot exceed 100 characters.");
      return false;
    }
    setFormError("");
    return true;
  };

  const handleInputChange = (e) => {
    setNewProject({ ...newProject, [e.target.name]: e.target.value });
  };

  const getCurrentDate = () => new Date().toISOString().split("T")[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    const projectPayload = {
      ...newProject,
      startDate: getCurrentDate(),
      createdBy: user.id,
    };

    try {
      if (isEditMode) {
        await dispatch(updateProject({ id, ...projectPayload })).unwrap();
        setFormError("✅ Project updated successfully!");
      } else {
        await dispatch(addProject(projectPayload)).unwrap();
        setFormError("✅ Project added successfully!");
        setNewProject({ name: "", relatedTo: "", description: "" });
      }

      await dispatch(fetchProjects());
      navigate("/staff/projects/list");
    } catch (err) {
      setFormError(err.message || "Failed to save project.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg font-medium">Saving...</p>
      </div>
    );
  }

  return (
    <div className="p-4 pl-64 min-h-screen">
      {/* Header + Action Buttons */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            {isEditMode ? "Edit Project" : "Add New Project"}
          </h1>

        </div>
        <div className="flex gap-4 mt-4 md:mt-0">
          <button
            type="button"
            onClick={() => navigate("/staff/projects/list")}
            className="px-6 py-3 bg-white text-gray-900 border font-semibold border-gray-300 rounded-full shadow hover:text-red-500 transition duration-300 ease-in-out transform hover:scale-105"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className={`px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-700 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition duration-300 ease-in-out transform hover:scale-105 ${loading
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
              }`}
            disabled={loading}
          >
            {isEditMode ? "Update Project" : "Save Project"}
          </button>
        </div>
      </div>

      {/* Form Card */}
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md p-6 md:p-8">
        {/* Error / Success Messages */}
        {formError && (
          <p
            className={`mb-4 ${formError.includes("✅") ? "text-green-500" : "text-red-500"
              }`}
          >
            {formError}
          </p>
        )}
        {error && <p className="text-red-500 mb-4">{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Project Name<span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={newProject.name}
                onChange={handleInputChange}
                placeholder="Enter project name"
                maxLength={100}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Project Related To */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Project Related to<span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                name="relatedTo"
                value={newProject.relatedTo}
                onChange={handleInputChange}
                placeholder="E.g. Marketing, Development, Design"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Project Description */}
            <div className="md:col-span-2 space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Project Description<span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                name="description"
                value={newProject.description}
                onChange={handleInputChange}
                placeholder="Describe the project scope, goals, and key details..."
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y min-h-[120px]"
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProject;
