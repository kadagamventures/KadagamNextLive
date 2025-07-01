import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchProjects, addProject, updateProject } from "../../../redux/slices/projectSlice";

const AddProject = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { items: projects, error: projectsError } = useSelector((state) => state.projects);
  const { user } = useSelector((state) => state.auth);

  const [newProject, setNewProject] = useState({
    name: "",
    relatedTo: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  useEffect(() => {
    if (isEditMode && projects.length > 0) {
      const existing = projects.find((proj) => proj._id === id);
      if (existing) {
        setNewProject({
          name: existing.name,
          relatedTo: existing.relatedTo,
          description: existing.description,
        });
      } else {
        setFormError("Project not found.");
      }
    }
  }, [id, isEditMode, projects]);

  const validateForm = () => {
    if (!newProject.name.trim() || !newProject.relatedTo.trim() || !newProject.description.trim()) {
      setFormError("⚠️ All fields are required!");
      setFormSuccess("");
      return false;
    }
    if (newProject.name.length > 100) {
      setFormError("⚠️ Project name cannot exceed 100 characters.");
      setFormSuccess("");
      return false;
    }
    setFormError("");
    return true;
  };

  const handleInputChange = (e) => {
    setNewProject((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const getCurrentDate = () => new Date().toISOString().split("T")[0];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (!user || !user.id) {
      setFormError("⚠️ User not authenticated. Please log in.");
      setFormSuccess("");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...newProject,
        startDate: getCurrentDate(),
        createdBy: user.id,
      };

      if (isEditMode) {
        await dispatch(updateProject({ id, ...payload })).unwrap();
        setFormSuccess("✅ Project updated successfully!");
        setFormError("");
      } else {
        await dispatch(addProject(payload)).unwrap();
        setFormSuccess("✅ Project added successfully!");
        setFormError("");
        setNewProject({ name: "", relatedTo: "", description: "" });
      }

      await dispatch(fetchProjects());
      navigate("/admin/projects/list");
    } catch (err) {
      setFormError(err.message || "Failed to save project.");
      setFormSuccess("");
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
    <div className="p-6 pl-64 min-h-screen bg-[#F7F8FB]">
      {/* Header + Actions */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          {isEditMode ? "Edit Project" : "Add New Project"}
        </h1>
        <div className="flex gap-4 mt-4 md:mt-0">
          <button
            type="button"
            onClick={() => navigate("/admin/projects/list")}
            className="px-6 py-3 bg-white text-gray-900 border font-semibold border-gray-300 rounded-full shadow hover:text-red-500 transition duration-300 ease-in-out transform hover:scale-105"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className={`px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-700 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition duration-300 ease-in-out transform hover:scale-105 ${
              loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
            disabled={loading}
          >
            {isEditMode ? "Update Project" : "Save Project"}
          </button>
        </div>
      </div>

      {/* Feedback */}
      {formError && <p className="mb-6 text-red-600 font-semibold">{formError}</p>}
      {formSuccess && <p className="mb-6 text-green-600 font-semibold">{formSuccess}</p>}
      {projectsError && <p className="mb-6 text-red-600 font-semibold">{projectsError}</p>}

      {/* Form */}
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md p-6 md:p-8">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Project Name <span className="text-red-500">*</span>
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

            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Project Related to <span className="text-red-500">*</span>
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

            <div className="md:col-span-2 space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Project Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={newProject.description}
                onChange={handleInputChange}
                placeholder="Describe the project scope, goals, and key details..."
                required
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProject;
