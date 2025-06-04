import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import bgImage from "../../../assets/bgimage.png";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const Staffs = () => {
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/staffs`)
      .then((response) => {
        setStaff(response.data);
      })
      .catch((error) => {
        console.error("Error fetching staff:", error);
        setStaff([]);
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
          Staff Management
        </h1>
        <h3 className="text-lg text-black-200 mt-2">
          Manage your organization's staff members
        </h3>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xl">Loading staff...</p>
        </div>
      ) : staff.length > 0 ? (
        // Display staff list if available
        <div className="flex-1">
          <ul className="divide-y divide-gray-200">
            {staff.map((member) => (
              <li
                key={member._id}
                className="p-4 flex items-center justify-between bg-white rounded-xl shadow-sm mb-4"
              >
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {member.name}
                  </h2>
                  <p className="text-gray-600">{member.role}</p>
                </div>
                <button
                  onClick={() =>
                    navigate(`/staff/staffs/view/${member._id}`)
                  }
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  View Details
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        // Empty State Card
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
                Lets begin by adding your first team member!
              </p>
            </div>
            <div className="flex justify-center mt-6">
              <button
                onClick={() =>
                  navigate("/staff/staffs/add", { replace: true })
                }
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
