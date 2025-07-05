import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { tokenRefreshInterceptor as axiosInstance } from "../../utils/axiosInstance";
import logo from "../../assets/kadagamlogo.png";

const StaffProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [staff, setStaff] = useState({
    profilePic: logo,
    name: "",
    email: "",
    role: "",
    phone: "",
    salary: "",
    staffId: "",
  });

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
        setError("Failed to fetch profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleAskLeave = () => navigate("/staff/ask-leave");
  const handleOfficeRules = () => navigate("/staff/office-rules");

  return (
    <div className="fixed inset-0 bg-gray-50 pl-64 flex items-center justify-center">
      {/* Profile Picture Modal */}
      {modalOpen && (
        <ProfilePicModal
          src={staff.profilePic || logo}
          alt={staff.name || "Profile"}
          onClose={() => setModalOpen(false)}
        />
      )}

      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-3 border-b border-gray-200">
          <h1 className="text-xl font-bold text-purple-700 text-left">
            My Profile
          </h1>
        </div>
        {/* Profile Picture (clickable) */}
        <div className="flex justify-center items-center pt-5 pb-2">
          <button
            className="focus:outline-none"
            onClick={() => setModalOpen(true)}
            title="Click to view full photo"
            tabIndex={0}
            aria-label="View full profile picture"
            style={{ background: "none", border: "none", padding: 0, margin: 0 }}
          >
            <div className="relative w-24 h-24 cursor-zoom-in group">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 p-1 group-hover:shadow-lg transition-all duration-300">
                <img
                  src={staff.profilePic || logo}
                  alt="Profile"
                  className="w-full h-full object-cover rounded-full border-4 border-white shadow-md"
                />
              </div>
              <span className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 rounded-full transition-opacity">
                <span className="text-xs text-white font-semibold">View</span>
              </span>
            </div>
          </button>
        </div>
        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          <div className="space-y-3">
            <DetailItem label="Name" value={staff.name} />
            <DetailItem label="Role" value={staff.role} />
            <DetailItem label="Email" value={staff.email} />
            <DetailItem label="Phone" value={staff.phone} />
            <DetailItem label="Salary" value={`₹${staff.salary}`} />
            <DetailItem label="Staff ID" value={staff.staffId} />
          </div>
        </div>
        {/* Buttons */}
        <div className="flex justify-center space-x-4 pb-4 pt-2">
          <button
            onClick={handleAskLeave}
            className="bg-indigo-600 text-white font-semibold py-2 px-5 rounded-full text-xs transition duration-200 hover:bg-indigo-800"
          >
            Ask Leave
          </button>
          <button
            onClick={handleOfficeRules}
            className="bg-green-600 text-white font-semibold py-2 px-5 rounded-full text-xs transition duration-200 hover:bg-green-800"
          >
            Office Rules
          </button>
        </div>
      </div>
    </div>
  );
};

const DetailItem = ({ label, value }) => (
  <div className="flex flex-col p-2 bg-purple-50 rounded-lg hover:bg-purple-100 transition-all duration-200 min-h-[44px]">
    <span className="text-[11px] text-purple-600 font-semibold uppercase tracking-wide">
      {label}
    </span>
    <span className="text-gray-700 text-[15px] font-medium break-all">
      {value || "N/A"}
    </span>
  </div>
);
DetailItem.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

// Modal component for full profile pic view
function ProfilePicModal({ src, alt, onClose }) {
  const SIDEBAR_WIDTH = 256; // px, same as pl-64

  // Prevent closing when clicking the image/container itself
  const handleInnerClick = (e) => e.stopPropagation();

  return (
    <div
      className="fixed inset-0 bg-black/20 z-50 backdrop-blur-sm"
      onClick={onClose}
      tabIndex={-1}
      style={{
        left: SIDEBAR_WIDTH,
        width: `calc(100vw - ${SIDEBAR_WIDTH}px)`,
      }}
    >
      <div className="w-full h-full flex items-center justify-center">
        <div
          className="bg-transparent rounded-2xl shadow-2xl flex items-center justify-center"
          style={{ maxWidth: '28rem', height: '90vh' }}
          onClick={handleInnerClick}
        >
          <img
            src={src}
            alt={alt}
            className="rounded-2xl object-contain w-full h-full bg-white"
            style={{ maxHeight: '90vh', maxWidth: '100%' }}
          />
        </div>
      </div>
    </div>
  );
}


ProfilePicModal.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

export default StaffProfile;
