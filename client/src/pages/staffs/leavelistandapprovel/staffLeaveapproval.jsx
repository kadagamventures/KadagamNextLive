import { useEffect, useState } from "react";
import { tokenRefreshInterceptor as axiosInstance } from "../../../utils/axiosInstance";
import AdminSidebar from "../../../components/staffSidebar";
import LeaveList from "../../staffs/leavelistandapprovel/staffLeavelist";
import { FaSearch } from "react-icons/fa";

const LeaveApproval = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [setProcessingId] = useState(null); // This useState setter is unused, consider removing or using it.
  const [activeTab, setActiveTab] = useState("approval");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null); // "approved" or "rejected"
  const [modalId, setModalId] = useState(null);
  const [modalReason, setModalReason] = useState("");

  const loggedInUserId = JSON.parse(localStorage.getItem("user"))?.id;

  useEffect(() => {
    if (activeTab === "approval") {
      (async () => {
        setLoading(true);
        try {
          const res = await axiosInstance.get("/leave/pending");
          setLeaveRequests(res.data.leaveRequests || []);
        } catch {
          setError("Failed to fetch leave requests. Please try again.");
        } finally {
          setLoading(false);
        }
      })();
    } else {
      setLeaveRequests([]);
      setLoading(false);
      setError("");
    }
  }, [activeTab]);

  const handleApproval = async (id, status, reason) => {
    // If setProcessingId is intended to be used, use it here, e.g., setLoading(true) for this specific ID.
    // For now, I'll keep it as it is in your original code but mark it for review.
    setProcessingId(id); // <--- Unused state setter, consider removing or integrating its logic
    try {
      const url = status === "approved" ? `/leave/approve/${id}` : `/leave/reject/${id}`;
      await axiosInstance.patch(url, { adminReason: reason });
      // Filter out the approved/rejected request instead of mapping to avoid showing it in 'pending' list
      setLeaveRequests((prev) => prev.filter((r) => r._id !== id));
      setMessage(`Request ${status} successfully!`);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${status} request. Please try again.`);
      setMessage("");
    } finally {
      setProcessingId(null);
      closeModal();
    }
  };

  const filtered =
    activeTab === "approval"
      ? leaveRequests.filter((r) => {
          if (!searchTerm) return true;
          return (
            r.staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r._id.toLowerCase().includes(searchTerm.toLowerCase())
          );
        })
      : [];

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchTerm("");
    setMessage("");
    setError("");
    // When switching tabs, reset loading and then let the useEffect handle loading for the new tab.
    setLoading(true);
  };

  const openModal = (id, type) => {
    setModalId(id);
    setModalType(type);
    setModalReason("");
    setIsModalOpen(true);
    setError(""); // Clear previous errors when opening modal
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalReason("");
    setModalId(null);
    setModalType(null);
    setError(""); // Clear error when closing modal
  };

  const confirmModal = () => {
    if (modalType === "rejected" && !modalReason.trim()) {
      setError("Rejection reason is required.");
      return;
    }
    handleApproval(modalId, modalType, modalReason.trim());
  };

  return (
    <div className="flex min-h-screen bg-white">
      <AdminSidebar />
      <div className="flex-grow p-6 ml-64">
        {/* Remove max-w-6xl from here if you want the table to span wider than 6xl on zoom out */}
        {/* If you remove it, the table will take the full available width of the main content area */}
        {/* You might consider adding a max-width to the container of the table specifically if needed. */}
        <div className="w-full"> {/* Changed from max-w-6xl mx-auto to w-full */}
          {/* Tabs */}
          <div className="bg-white rounded-lg mb-6">
            <nav className="flex justify-center h-20 space-x-8">
              {["approval", "list"].map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`relative pb-2 text-sm font-medium transition-colors duration-200 ${isActive ? "text-purple-600" : "text-gray-600 hover:text-gray-800"
                      }`}
                  >
                    {tab === "approval" ? "Leave Approval" : "Leave List"}
                    {/* Active underline */}
                    {isActive && (
                      <span className="absolute left-0 bottom-0 w-full h-0.5 mb-7 bg-purple-600 rounded-full" />
                    )}
                    {/* Hover underline (only if not active) */}
                    {!isActive && (
                      <span className="absolute left-0 bottom-0 w-full h-0.5 bg-gray-300 rounded-full scale-x-0 hover:scale-x-100 transition-transform origin-left duration-200" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {activeTab === "approval" && (
            <>
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Leave Approval</h1>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by staff or ID…"
                    className="w-full sm:w-64 px-3 py-2 pr-10 rounded-full border border-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <FaSearch className="absolute right-3 top-2.5 text-violet-600" />
                </div>
              </div>

              {message && <div className="mb-4 text-center text-green-600">{message}</div>}
              {error && <div className="mb-4 text-center text-red-600">{error}</div>}

              {loading ? (
                <div className="text-center text-gray-500 py-6">Loading leave requests…</div>
              ) : (
                <div className="bg-white rounded-2xl shadow p-6 overflow-x-auto">
                  {filtered.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No matching leave requests.</div>
                  ) : (
                    <table className="w-full table-auto"> {/* w-full and table-auto are good here */}
                      <thead>
                        <tr className="text-left text-gray-600 uppercase text-sm">
                          <th className="px-4 py-3">Staff</th>
                          <th className="px-4 py-3">Email</th>
                          <th className="px-4 py-3">Start</th>
                          <th className="px-4 py-3">End</th>
                          <th className="px-4 py-3">Reason</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filtered.map((r) => (
                          <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-4 text-gray-800">{r.staff.name}</td>
                            <td className="px-4 py-4 text-gray-800">{r.staff.email}</td>
                            <td className="px-4 py-4 text-gray-800">{new Date(r.startDate).toLocaleDateString()}</td>
                            <td className="px-4 py-4 text-gray-800">{new Date(r.endDate).toLocaleDateString()}</td>
                            <td className="px-4 py-4 text-gray-800">{r.reason}</td>
                            <td className={`px-4 py-4 font-semibold ${r.status === "approved" ? "text-green-600" : r.status === "rejected" ? "text-red-600" : "text-yellow-600"}`}>{r.status.toUpperCase()}</td>
                            <td className="px-4 py-4">
                              {r.status === "pending" && r.staff._id !== loggedInUserId ? (
                                <div className="flex space-x-2">
                                  <button onClick={() => openModal(r._id, "approved")} className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-700 hover:bg-green-200">Approve ✓</button>
                                  <button onClick={() => openModal(r._id, "rejected")} className="px-3 py-1 rounded-full text-sm bg-red-100 text-red-700 hover:bg-red-200">Reject –</button>
                                </div>
                              ) : (
                                <span className="text-gray-600">{r.status}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === "list" && <LeaveList />}
        </div>
      </div>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-opacity-50 flex backdrop-blur-md items-center justify-center z-30">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">
              {modalType === "approved" ? "Confirm Approval" : "Confirm Rejection"}
            </h3>
            <p className="mb-4">
              {modalType === "approved"
                ? "You can optionally add a reason for approval."
                : "Please provide a reason for rejection:"}
            </p>
            <textarea
              rows={4}
              value={modalReason}
              onChange={(e) => setModalReason(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-purple-700"
              placeholder="Enter reason..."
            />
            {error && <div className="text-red-600 mb-2">{error}</div>}
            <div className="flex justify-end space-x-3">
              <button onClick={closeModal} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">Cancel</button>
              <button
                onClick={confirmModal}
                className={`px-4 py-2 rounded text-white ${modalType === "approved" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
                disabled={modalType === "rejected" && !modalReason.trim()}
              >
                {modalType === "approved" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveApproval;