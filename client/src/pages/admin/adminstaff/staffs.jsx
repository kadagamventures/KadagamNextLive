import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import bgImage from "../../../assets/bgimage.png";

// Use this if you're using Create React App:
// const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// If you're using Vite, uncomment the next line and comment above:
// const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const Staffs = () => {
  const navigate = useNavigate();
  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaffs = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/staffs`); // API endpoint now uses the API_BASE_URL
        const data = await response.json();
        setStaffs(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching staff members:", error);
        setStaffs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchStaffs();
  }, []);

  return (
    <div className="pl-64 p-8 h-screen bg-gradient-to-br from-red-500 to-blue-500 flex flex-col">
      {/* Header Section */}
      <div className="mb-4">
        <h1 className="text-3xl md:text-4xl font-bold text-white">
          Staff Management
        </h1>
        <h3 className="text-lg text-gray-200 mt-2">
          Manage your organization&apos;s staff members
        </h3>
      </div>

      {/* Staff List */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-white text-lg">
          Loading staff members...
        </div>
      ) : staffs.length > 0 ? (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 max-w-4xl w-full mx-auto">
          <ul className="space-y-4">
            {staffs.map((staff) => (
              <li
                key={staff._id}
                className="p-4 bg-gray-100 rounded-lg flex justify-between items-center"
              >
                <span className="text-gray-800 font-medium">
                  {staff.name} - {staff.role}
                </span>
                <button
                  onClick={() => navigate(`/admin/staffs/view/${staff._id}`)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  View Details
                </button>
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
                alt="No staff available"
                className="w-48 h-48 object-contain opacity-90"
              />
            </div>
            <div className="text-center space-y-3 mt-4">
              <h2 className="text-2xl font-semibold text-gray-800">
                No Staff Members Found
              </h2>
              <p className="text-gray-500">
                Let&apos;s begin by adding your first team member!
              </p>
            </div>
            <div className="flex justify-center mt-6">
              <button
                onClick={() => navigate("/admin/staffs/add", { replace: true })}
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
                Add New Staff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Staffs;
