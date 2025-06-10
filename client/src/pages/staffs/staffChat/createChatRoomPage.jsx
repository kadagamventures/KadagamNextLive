import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { tokenRefreshInterceptor as axiosInstance } from "../../../utils/axiosInstance";
import { useNavigate } from "react-router-dom";
import { UserCircle2, PlusCircle, CheckCircle, Search } from "lucide-react";

const CreateChatRoomPage = () => {
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state.auth.user);

  const [staffList, setStaffList] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [roomName, setRoomName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🔄 Fetch assigned staff from /tasks/assigned-by-me
  useEffect(() => {
    const fetchAssignedStaff = async () => {
      try {
        const res = await axiosInstance.get("/tasks/assigned-by-me");
        const tasks = Array.isArray(res.data) ? res.data : [];

        const uniqueMap = {};
        tasks.forEach((task) => {
          const staff = task.assignedTo;
          if (staff && staff._id) {
            uniqueMap[staff._id] = staff;
          }
        });

        const uniqueStaff = Object.values(uniqueMap);
        setStaffList(uniqueStaff);
        setFilteredStaff(uniqueStaff);
      } catch (err) {
        console.error("❌ Staff fetch failed:", err.message);
        setError("Failed to load your assigned team members.");
      }
    };

    fetchAssignedStaff();
  }, []);

  // 🔍 Filter staff based on search term
  useEffect(() => {
    const lower = searchTerm.toLowerCase();
    const filtered = staffList.filter((staff) =>
      `${staff.name} ${staff.email}`.toLowerCase().includes(lower)
    );
    setFilteredStaff(filtered);
  }, [searchTerm, staffList]);

  const toggleStaffSelection = (staffId) => {
    setSelectedStaffIds((prev) =>
      prev.includes(staffId)
        ? prev.filter((id) => id !== staffId)
        : [...prev, staffId]
    );
  };

  // ✅ Create new chat room
  const handleCreateRoom = async () => {
    if (!roomName.trim()) return setError("Room name is required.");
    if (selectedStaffIds.length === 0) return setError("Please select at least one staff member.");

    setLoading(true);
    setError("");

    try {
      const payload = {
        roomName: roomName.trim(),
        members: selectedStaffIds,
      };

      await axiosInstance.post("/room-chat", payload);
      navigate("/staff/chat/permissioned-manager?tab=chatRooms");
    } catch (err) {
      console.error("❌ Room creation failed:", err.message);
      setError("Room creation failed. Please try again.");
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
          <label className="block mb-2 text-lg text-gray-700">Chat Room Name</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-1 focus:ring-violet-700"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Enter a chat room name"
          />
        </div>

        {/* Search and Team Selection */}
        <div>
          <label className="block mb-2 text-lg text-gray-700">Select Team Members</label>

          <div className="relative mb-3">
            <input
              type="text"
              className="w-full border border-gray-300 rounded-xl px-10 py-2 focus:outline-none focus:ring-1 focus:ring-violet-700"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          </div>

          {filteredStaff.length === 0 ? (
            <p className="text-gray-500 text-sm">No matching staff found.</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              {filteredStaff.map((staff) => (
                <li
                  key={staff._id}
                  onClick={() => toggleStaffSelection(staff._id)}
                  className={`cursor-pointer flex items-center p-3 rounded-xl border transition-all duration-300 ${selectedStaffIds.includes(staff._id)
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

        {/* Submit */}
        <button
          onClick={handleCreateRoom}
          disabled={loading || !roomName.trim() || selectedStaffIds.length === 0}
          className={`w-80 flex items-center justify-center gap-3 py-3 px-6 rounded-full text-lg font-semibold mx-auto ${ // Added mx-auto here for centering
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-800 hover:to-indigo-800" // Changed hover for gradient
            }`}
        >
          <PlusCircle className="w-6 h-6" />
          {loading ? "Creating Room..." : "Create Chat Room"}
        </button>
      </div>
    </div>
  );
};

export default CreateChatRoomPage;
