import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Select from "react-select";
import { debounce } from "lodash";
import { addStaff, updateStaff, fetchStaffById } from "../../../redux/slices/staffSlice";
import { fetchProjects } from "../../../redux/slices/projectSlice";
import { tokenRefreshInterceptor as axiosInstance } from "../../../utils/axiosInstance";
import { FaEye, FaTrashAlt } from "react-icons/fa";

const API_BASE_URL =
  (import.meta.env.VITE_API_URL || "http://localhost:5000/api") + "/admin/staff";

// Permission options with matching display labels
const permissionOptions = [
  "All Permission", 
  "manage_project",  
  "manage_task",     
  "manage_staff",    
  "No Permission",
];

const StaffForm = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { selectedStaff } = useSelector((state) => state.staff);
  const { items: projectsList } = useSelector((state) => state.projects);

  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    phone: "",
    salary: "",
    role: "",
    assignedTeam: "",
    assignedProjects: [],
    permissions: [],
    profilePic: null,
    resume: null,
    staffId: "",
  });

  const [profilePicKey, setProfilePicKey] = useState(Date.now());
  const [resumeKey, setResumeKey] = useState(Date.now());
  const [staffIdValid, setStaffIdValid] = useState(null);
  const [suggestedStaffId, setSuggestedStaffId] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Modal state for image preview
  const [modalVisible, setModalVisible] = useState(false);
  const [modalImage, setModalImage] = useState("");

  // Fetch projects if not loaded
  useEffect(() => {
    if (!projectsList.length) {
      dispatch(fetchProjects());
    }
  }, [dispatch, projectsList.length]);

  // If editing, fetch staff data
  useEffect(() => {
    if (isEditMode) {
      dispatch(fetchStaffById(id));
    }
  }, [isEditMode, id, dispatch]);

  // Populate form if editing
  useEffect(() => {
    if (isEditMode && selectedStaff && selectedStaff._id === id) {
      setNewStaff({
        _id: selectedStaff._id,
        name: selectedStaff.name || "",
        email: selectedStaff.email || "",
        phone: selectedStaff.phone || "",
        salary: selectedStaff.salary || "",
        role: selectedStaff.role || "",
        assignedTeam: selectedStaff.team|| "",
        assignedProjects: selectedStaff.assignedProjects?.map(p => p._id) || [],
        permissions: selectedStaff.permissions || [],
        profilePic: selectedStaff.profilePic || null,
        resume: selectedStaff.resume || null,
        staffId: selectedStaff.staffId || "",
      });
      setStaffIdValid(true);
    }
  }, [isEditMode, id, selectedStaff]);
  

  // Debounced staff ID validation
  const validateStaffId = useCallback(
    debounce(async (staffId) => {
      if (!staffId.trim()) {
        setStaffIdValid(null);
        setSuggestedStaffId("");
        return;
      }
      try {
        const res = await axiosInstance.get(`${API_BASE_URL}/check-id?staffId=${staffId}`);
        setStaffIdValid(res.data.valid);
        setSuggestedStaffId("");
      } catch (error) {
        setStaffIdValid(false);
        setSuggestedStaffId(error.response?.data?.suggestedId || "");
      }
    }, 500),
    []
  );

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === "file") {
      const file = files[0];
      if (file) {
        file.preview = URL.createObjectURL(file);
      }
      setNewStaff((prev) => ({ ...prev, [name]: file }));
      return;
    }
    if (name === "permissions") {
      setNewStaff((prev) => {
        let updatedPermissions = checked
          ? [...prev.permissions, value]
          : prev.permissions.filter((perm) => perm !== value);
        if (value === "All Permission" && checked) {
          updatedPermissions = ["manage_staff", "manage_project", "manage_task"];
        }
        if (value === "No Permission" && checked) {
          updatedPermissions = ["No Permission"];
        } else {
          updatedPermissions = updatedPermissions.filter((perm) => perm !== "No Permission");
        }
        return { ...prev, permissions: updatedPermissions };
      });
      return;
    }
    if (name === "staffId") {
      setNewStaff((prev) => ({ ...prev, staffId: value }));
      validateStaffId(value);
      return;
    }
    setNewStaff((prev) => ({ ...prev, [name]: value }));
  };

  const handleProjectChange = (selectedOptions) => {
    const selectedProjectIds = selectedOptions.map((option) => option.value);
    setNewStaff((prev) => ({ ...prev, assignedProjects: selectedProjectIds }));
  };

  // Delete file handler
 // Add this helper inside StaffForm component
const handleDeleteFile = async (fieldName) => {
  try {
    // Only attempt server delete if the current field is a URL string (already uploaded)
    if (typeof newStaff[fieldName] === "string" && newStaff[fieldName].startsWith("http")) {
      const url = new URL(newStaff[fieldName]);
      const fileKey = url.pathname.substring(1); // remove leading slash

      // Call backend to delete file by key
      await axiosInstance.post("/admin/staff/file/delete", { fileKey });
    }
    // Clear file locally
    setNewStaff((prev) => ({ ...prev, [fieldName]: null }));

    // Reset file input to allow re-upload
    if (fieldName === "profilePic") setProfilePicKey(Date.now());
    else if (fieldName === "resume") setResumeKey(Date.now());
  } catch (err) {
    console.error("Failed to delete file:", err);
    alert("Failed to delete file on server.");
  }
};


  const handleAddOrUpdateStaff = async () => {
    if (!newStaff.name.trim() || !newStaff.email.trim()) return;
    if (!newStaff.staffId.trim() || staffIdValid === false) return;
  
    const formData = new FormData();
    formData.append("name", newStaff.name);
    formData.append("email", newStaff.email);
    formData.append("phone", newStaff.phone);
    formData.append("salary", newStaff.salary);
    formData.append("role", newStaff.role);
    formData.append("assignedTeam", newStaff.assignedTeam);
    formData.append("staffId", newStaff.staffId);
    formData.append("assignedProjects", JSON.stringify(newStaff.assignedProjects));
    formData.append("permissions", JSON.stringify(newStaff.permissions));
  
    if (newStaff.profilePic instanceof File) {
      formData.append("profilePic", newStaff.profilePic);
    } else if (typeof newStaff.profilePic === "string") {
      formData.append("profilePic", newStaff.profilePic);
    }
  
    if (newStaff.resume instanceof File) {
      formData.append("resume", newStaff.resume);
    } else if (typeof newStaff.resume === "string") {
      formData.append("resume", newStaff.resume);
    }
  
    try {
      const resultAction = await dispatch(
        isEditMode
          ? updateStaff({ id: newStaff._id || id, formData })
          : addStaff(formData)
      );
  
      if (resultAction.meta.requestStatus === "fulfilled") {
        const message = isEditMode
          ? "Staff updated successfully!"
          : "Staff created successfully! The temporary password has been sent to the staff's email.";
        setSuccessMessage(message);
  
        // Delay briefly to show success message before navigation (optional)
        setTimeout(() => {
          navigate("/admin/staffs/list");
        }, 1000);
      }
    } catch (error) {
      console.error("❌ Error saving staff:", error);
    }
  };
  
  

  // Open modal to preview full image
  const openImageModal = (imgSrc) => {
    setModalImage(imgSrc);
    setModalVisible(true);
  };

  // Close modal
  const closeModal = () => {
    setModalVisible(false);
    setModalImage("");
  };

  return (
    <div className="min-h-screen bg-[#F7F8FB] p-6 pl-64">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            {isEditMode ? "Update Staff" : "Add New Staff"}
          </h1>

        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <button
            onClick={() => navigate("/admin/staffs/list")}
            className="px-6 py-3 bg-white text-gray-900 border font-semibold border-gray-300 rounded-full shadow hover:text-red-500 transition duration-300 ease-in-out transform hover:scale-105"
          >
            Cancel
          </button>
          <button
            onClick={handleAddOrUpdateStaff}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-700 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition duration-300 ease-in-out transform hover:scale-105"
          >
            {isEditMode ? "Update Staff" : "Add Staff"}
          </button>
        </div>
      </div>

      {/* Main Card with 3 Columns */}
      <div className="bg-white rounded-xl shadow-md p-6">
        {successMessage && (
          <div className="mb-4 p-4 bg-green-100 text-green-700 rounded">
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Column 1: Personal Information */}
          <div className="space-y-12">
            <h3 className="text-lg font-semibold text-gray-800 pb-2">
              Personal Information
            </h3>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Name</label>
              <input
                type="text"
                name="name"
                value={newStaff.name}
                onChange={handleInputChange}
                placeholder="Enter Staff Name"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={newStaff.email}
                onChange={handleInputChange}
                placeholder="Enter Staff Email"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Phone No</label>
              <input
                type="text"
                name="phone"
                value={newStaff.phone}
                onChange={handleInputChange}
                placeholder="Enter Phone Number"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Salary</label>
              <input
                type="number"
                name="salary"
                value={newStaff.salary}
                onChange={handleInputChange}
                placeholder="Enter Employee Salary"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Column 2: Role, Team, Projects & Staff ID */}
          <div className="space-y-12">
            <h3 className="text-lg font-semibold text-gray-800 pb-2">
              Role & Team
            </h3>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Role</label>
              <input
                type="text"
                name="role"
                value={newStaff.role}
                onChange={handleInputChange}
                placeholder="Enter Role"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Team</label>
              <input
                type="text"
                name="assignedTeam"
                value={newStaff.assignedTeam}
                onChange={handleInputChange}
                placeholder="Enter Team"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">
                Assigned Projects
              </label>
              <Select
                isMulti
                name="assignedProjects"
                options={projectsList.map((project) => ({
                  value: project._id,
                  label: project.name,
                }))}
                value={projectsList
                  .filter((project) => newStaff.assignedProjects.includes(project._id))
                  .map((project) => ({
                    value: project._id,
                    label: project.name,
                  }))}
                onChange={handleProjectChange}
                className="w-full"
                styles={{
                  control: (base) => ({
                    ...base,
                    borderColor: "#d1d5db",
                    borderRadius: "0.375rem",
                    padding: "2px",
                    boxShadow: "none",
                  }),
                  multiValue: (base) => ({
                    ...base,
                    backgroundColor: "#3B82F6",
                    color: "white",
                    borderRadius: "4px",
                  }),
                  multiValueLabel: (base) => ({
                    ...base,
                    color: "white",
                  }),
                  multiValueRemove: (base) => ({
                    ...base,
                    color: "white",
                    ":hover": { backgroundColor: "#2563EB" },
                  }),
                }}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Staff ID</label>
              <input
                type="text"
                name="staffId"
                value={newStaff.staffId}
                onChange={handleInputChange}
                placeholder="Enter Staff ID"
                className={`w-full px-4 py-2 border rounded-md focus:ring-blue-500 ${staffIdValid === false ? "border-red-500" : "border-gray-300"
                  }`}
              />
              {staffIdValid === false && suggestedStaffId && (
                <p className="text-red-500 text-sm mt-1">
                  Staff ID is taken. Try:{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setNewStaff((prev) => ({ ...prev, staffId: suggestedStaffId }));
                      setStaffIdValid(true);
                    }}
                    className="ml-1 text-blue-600 underline"
                  >
                    {suggestedStaffId}
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* Column 3: Documents & Permissions */}
          <div className="space-y-6">
            {/* Documents Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 pb-2">Documents</h3>
              {/* Profile Picture Upload */}
<div>
  <label className="block text-sm text-gray-500 mb-1">
    Profile Picture (Optional)
  </label>
  <input
    key={profilePicKey}
    type="file"
    name="profilePic"
    onChange={handleInputChange}
    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500"
  />
  {newStaff.profilePic && (
    <div className="mt-2 flex items-center gap-2">
      <span className="text-sm text-gray-600 truncate max-w-[140px]" title={
        newStaff.profilePic instanceof File
          ? newStaff.profilePic.name
          : newStaff.profilePic
      }>
        {newStaff.profilePic instanceof File
          ? newStaff.profilePic.name
          : newStaff.profilePic.split("/").pop()}
      </span>
      <button
        onClick={() =>
          openImageModal(
            newStaff.profilePic instanceof File
              ? newStaff.profilePic.preview
              : newStaff.profilePic
          )
        }
        className="p-1 bg-white rounded-full"
      >
        <FaEye className="w-4 h-4 text-blue-600" />
      </button>
      <button
        onClick={() => handleDeleteFile("profilePic")}
        className="p-1 bg-white rounded-full"
      >
        <FaTrashAlt className="w-4 h-4 text-red-600" />
      </button>
    </div>
  )}
</div>

{/* ✅ Resume Section */}
<div>
  <label className="block text-sm text-gray-500 mb-1">
    Resume (Optional)
  </label>
  <input
    key={resumeKey}
    type="file"
    name="resume"
    onChange={handleInputChange}
    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500"
  />
  {newStaff.resume && (
    <div className="mt-2 flex items-center gap-2">
      <span
        className="text-sm text-gray-600 truncate max-w-[140px]"
        title={newStaff.resume instanceof File ? newStaff.resume.name : newStaff.resume}
      >
        {newStaff.resume instanceof File
          ? newStaff.resume.name
          : newStaff.resume.split("/").pop()}
      </span>
      <button
        onClick={() =>
          window.open(
            newStaff.resume instanceof File
              ? newStaff.resume.preview || URL.createObjectURL(newStaff.resume)
              : newStaff.resume,
            "_blank"
          )
        }
        className="p-1 bg-white rounded-full"
      >
        <FaEye className="w-4 h-4 text-blue-600" />
      </button>
      <button
        onClick={() => handleDeleteFile("resume")}
        className="p-1 bg-white rounded-full"
      >
        <FaTrashAlt className="w-4 h-4 text-red-600" />
      </button>
    </div>
  )}
</div>

            </div>
            {/* Permissions Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 pb-2">Permissions</h3>
              <div className="flex flex-col gap-2">
                {permissionOptions.map((perm) => {
                  let displayLabel = perm;
                  if (perm === "manage_project") displayLabel = "Project Creation";
                  if (perm === "manage_task") displayLabel = "Task Creation";
                  if (perm === "manage_staff") displayLabel = "Staff Management";
                  return (
                    <label
                      key={perm}
                      className={`flex items-center p-2 border rounded-lg cursor-pointer ${newStaff.permissions.includes(perm)
                        ? "border-violet-500 bg-violet-50"
                        : "border-gray-200 hover:border-violet-300"
                        }`}
                    >
                      <input
                        type="checkbox"
                        name="permissions"
                        value={perm}
                        checked={newStaff.permissions.includes(perm)}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-violet-600"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {displayLabel === "All Permission"
                          ? "All Permission"
                          : displayLabel === "No Permission"
                            ? "No Permission"
                            : displayLabel}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal for Full Preview with Blurred Background */}
      {modalVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
          <div className="relative bg-white p-4 rounded-md">
            <img src={modalImage} alt="Full Preview" className="max-w-full max-h-screen" />
            <button
              onClick={closeModal}
              className="absolute top-2 right-2 p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffForm;
