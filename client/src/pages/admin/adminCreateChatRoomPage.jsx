import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { tokenRefreshInterceptor as axiosInstance } from "../../utils/axiosInstance";
import { UserCircle2, PlusCircle, CheckCircle, Search } from "lucide-react";

const AdminCreateChatRoomPage = () => {
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state.auth.user);

  const [staffList, setStaffList] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [roomName, setRoomName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🔄 Fetch eligible staff from tasks (assigned staff)
  useEffect(() => {
    const fetchEligibleStaff = async () => {
      try {
        const { data } = await axiosInstance.get("/chat/tasks");
        const tasks = Array.isArray(data.tasks) ? data.tasks : [];

        const staffMap = {};
        for (const task of tasks) {
          const staff = task.assignedTo;
          if (staff?._id && staff._id !== currentUser.id) {
            staffMap[staff._id] = staff;
          }
        }

        const uniqueStaff = Object.values(staffMap);
        setStaffList(uniqueStaff);
        setFilteredStaff(uniqueStaff);
      } catch (err) {
        console.error("❌ Failed to load staff:", err.message);
        setError("Failed to load staff list. Please try again.");
      }
    };

    fetchEligibleStaff();
  }, [currentUser.id]);

  // 🔍 Filter by name/email
  useEffect(() => {
    const lower = searchTerm.toLowerCase();
    const result = staffList.filter((s) =>
      `${s.name} ${s.email}`.toLowerCase().includes(lower)
    );
    setFilteredStaff(result);
  }, [searchTerm, staffList]);

  const toggleSelectStaff = (staffId) => {
    setSelectedStaffIds((prev) =>
      prev.includes(staffId)
        ? prev.filter((id) => id !== staffId)
        : [...prev, staffId]
    );
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      setError("Room name is required.");
      return;
    }
    if (selectedStaffIds.length === 0) {
      setError("Select at least one staff member.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        roomName: roomName.trim(),
        members: selectedStaffIds,
      };

      const { data } = await axiosInstance.post("/room-chat", payload);
      if (data?.room?._id) {
        navigate("/admin/chat?tab=chatRooms");
      } else {
        throw new Error("Unexpected response");
      }
    } catch (err) {
      console.error("❌ Room creation failed:", err.message);
      setError(err.response?.data?.message || "Failed to create chat room.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-6 pl-64">
      <div className="w-full max-w-3xl bg-white shadow-xl rounded-3xl p-8 space-y-6">
        <h1 className="text-3xl font-extrabold text-gray-900 text-center">
          Create Chat Room
        </h1>

        {error && (
          <div className="bg-red-100 text-red-600 px-4 py-2 rounded-md text-center">
            {error}
          </div>
        )}

        {/* Room Name */}
        <div>
          <label className="block mb-2 text-lg text-gray-700">Room Name</label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="e.g. Project Alpha Team"
          />
        </div>

        {/* Search + Select Staff */}
        <div>
          <label className="block mb-2 text-lg text-gray-700">
            Select Staff
          </label>

          <div className="relative mb-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full border border-gray-300 rounded-xl px-10 py-2 text-sm focus:outline-none focus:ring focus:border-blue-300"
            />
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          </div>

          {filteredStaff.length === 0 ? (
            <p className="text-sm text-gray-500">No staff match your search.</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              {filteredStaff.map((staff) => (
                <li
                  key={staff._id}
                  onClick={() => toggleSelectStaff(staff._id)}
                  className={`cursor-pointer flex items-center p-3 rounded-xl border transition-all duration-300 ${
                    selectedStaffIds.includes(staff._id)
                      ? "bg-blue-100 border-blue-400 shadow-md"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <UserCircle2 className="w-8 h-8 text-gray-600 mr-3" />
                  <div>
                    <p className="font-semibold text-gray-800">{staff.name}</p>
                    <p className="text-sm text-gray-500">{staff.email}</p>
                  </div>
                  {selectedStaffIds.includes(staff._id) && (
                    <CheckCircle className="w-6 h-6 text-green-500 ml-auto" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Create Room Button */}
        <button
          onClick={handleCreateRoom}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-3 py-3 px-6 rounded-xl text-lg font-semibold transition-transform ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:scale-105"
          }`}
        >
          <PlusCircle className="w-6 h-6" />
          {loading ? "Creating..." : "Create Chat Room"}
        </button>
      </div>
    </div>
  );
};

export default AdminCreateChatRoomPage;
