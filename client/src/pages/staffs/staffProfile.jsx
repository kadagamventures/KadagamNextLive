import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { tokenRefreshInterceptor as axiosInstance } from "../../utils/axiosInstance";
import logo from "../../assets/kadagamlogo.png";

const StaffProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Staff state initialized
  const [staff, setStaff] = useState({
    profilePic: logo, // Default Profile Picture
    name: "",
    email: "",
    role: "",
    phone: "",
    salary: "",
    staffId: "",
  });

  // ✅ Fetch Staff Profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axiosInstance.get("/staff/my-profile");
        if (response.data?.success) {
          setStaff(response.data.staff);
        } else {
          throw new Error(response.data.message || "Failed to load profile");
        }
      } catch (error) {
        console.error("❌ Error fetching profile:", error);
        setError("Failed to fetch profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // ✅ Navigate to Leave Request Form
  const handleAskLeave = () => {
    navigate("/staff/ask-leave");
  };

  // ✅ Navigate to Office Rules Page
  const handleOfficeRules = () => {
    navigate("/staff/office-rules");
  };

  return (
    <div className="min-h-screen bg-gray-50 pl-64 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg mx-auto">
        {loading ? (
          <div className="text-center py-10">
            <p className="text-lg text-gray-600">⏳ Loading profile...</p>
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-red-600 font-bold">{error}</p>
          </div>
        ) : (
          <>
            {/* Card Header with "My Profile" aligned left */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-purple-700 text-left">
                My Profile
              </h1>
            </div>
            {/* Profile Picture at the Top with Gradient Border Glow on Hover */}
            <div className="flex justify-center items-center p-6 group">
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 p-1 group-hover:shadow-lg transition-all duration-300">
                  <img
                    src={staff.profilePic || logo}
                    alt="Profile"
                    className="w-full h-full object-cover rounded-full border-4 border-white shadow-md"
                  />
                </div>
              </div>
            </div>
            {/* Profile Details */}
            <div className="px-6 pb-6 space-y-6">
              {/* Other Details */}
              <div className="space-y-4">
                <DetailItem label="Name" value={staff.name} />
                <DetailItem label="Role" value={staff.role} />
                <DetailItem label="Email" value={staff.email} />
                <DetailItem label="Phone" value={staff.phone} />
                <DetailItem label="Salary" value={`₹${staff.salary}`} />
                <DetailItem label="Staff ID" value={staff.staffId} />
              </div>
              {/* Action Buttons: Ask Leave and Office Rules */}
              <div className="flex justify-center space-x-6 pt-4">
                <button
                  onClick={handleAskLeave}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-8 rounded-lg text-sm transition duration-200 transform hover:scale-105"
                >
                  Ask Leave
                </button>
                <button
                  onClick={handleOfficeRules}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-8 rounded-lg text-sm transition duration-200 transform hover:scale-105"
                >
                  Office Rules
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ✅ Reusable DetailItem Component with updated styling
const DetailItem = ({ label, value }) => (
  <div className="flex flex-col p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-all duration-200">
    <span className="text-xs text-purple-600 font-semibold uppercase tracking-wide">
      {label}
    </span>
    <span className="text-gray-700 text-sm font-medium">
      {value || "N/A"}
    </span>
  </div>
);
DetailItem.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default StaffProfile;

