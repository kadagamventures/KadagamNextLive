import { useEffect, useState } from "react";
import { tokenRefreshInterceptor as axiosInstance } from "../../../utils/axiosInstance";
import AdminSidebar from "../../../components/sidebar"; // Assuming this is your sidebar component
import LeaveList from "./leaveList"; // Assuming this is your LeaveList component
import { FaSearch } from "react-icons/fa";

const LeaveApproval = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [activeTab, setActiveTab] = useState("approval"); // This tab state is for internal logic, not router tabs

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null); // "approved" or "rejected"
  const [modalId, setModalId] = useState(null);
  const [modalReason, setModalReason] = useState("");

  useEffect(() => {
    const fetchPendingRequests = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get("/leave/pending");
        setLeaveRequests(res.data.leaveRequests || []);
        setError("");
      } catch (err) {
        console.error("Failed to fetch leave requests:", err);
        setError("Failed to fetch leave requests. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === "approval") {
      fetchPendingRequests();
    } else {
      setLeaveRequests([]);
      setLoading(false);
      setError("");
    }
  }, [activeTab]);

  const handleApproval = async (id, status, reason) => {
    setProcessingId(id);
    try {
      const url = status === "approved" ? `/leave/approve/${id}` : `/leave/reject/${id}`;
      await axiosInstance.patch(url, { adminReason: reason });

      setLeaveRequests((prev) => prev.filter((r) => r._id !== id));

      setMessage(`Request ${status} successfully!`);
      setError("");

      setTimeout(() => setMessage(""), 3000);

    } catch (err) {
      console.error(`Failed to ${status} request:`, err);
      setError(`Failed to ${status} request. Please try again.`);
      setMessage("");
    } finally {
      setProcessingId(null);
      closeModal();
    }
  };

  const filtered = leaveRequests.filter((r) => {
    if (!searchTerm) return true;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return (
      r.staff.name.toLowerCase().includes(lowerCaseSearchTerm) ||
      r._id.toLowerCase().includes(lowerCaseSearchTerm) ||
      r.reason.toLowerCase().includes(lowerCaseSearchTerm)
    );
  });

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchTerm("");
    setMessage("");
    setError("");
  };

  const openModal = (id, type) => {
    setModalId(id);
    setModalType(type);
    setModalReason("");
    setError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalReason("");
    setError("");
  };

  const confirmModal = () => {
    if (modalType === "rejected" && !modalReason.trim()) {
      setError("Please provide a reason for rejection.");
      return;
    }
    handleApproval(modalId, modalType, modalReason.trim());
  };

  return (
    <div className="flex min-h-screen ">
      <AdminSidebar />

      <div className="flex-grow p-4 sm:p-6 lg:ml-64 lg:p-8 xl:p-10">
        {/*
          Removed max-w-7xl mx-auto from this div.
          The content inside will now naturally expand to fill the available width
          after accounting for the sidebar and padding.
        */}
        <div className="w-full"> {/* Added w-full to ensure it takes full available width */}

          {activeTab === "approval" && (
            <>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800">
                  Leave Approval
                </h1>
                <div className="relative w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Search by staff, ID, or reason…"
                    className="w-full px-3 py-2 pr-10 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-600" />
                </div>
              </div>

              {message && <div className="mb-4 p-3 rounded bg-green-100 text-center text-green-700">{message}</div>}
              {error && <div className="mb-4 p-3 rounded bg-red-100 text-center text-red-700">{error}</div>}

              {loading ? (
                <div className="text-center text-gray-500 py-10 text-lg">Loading leave requests…</div>
              ) : (
                <div className="bg-white rounded-2xl shadow p-4 sm:p-6 overflow-x-auto">
                  {filtered.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 text-lg">No matching leave requests to approve.</div>
                  ) : (
                    <table className="w-full min-w-[700px] table-auto">
                      <thead>
                        <tr className="text-left text-gray-600 uppercase text-sm bg-gray-50">
                          <th className="px-4 py-3 rounded-tl-lg">Staff</th>
                          <th className="px-4 py-3">Email</th>
                          <th className="px-4 py-3">Start</th>
                          <th className="px-4 py-3">End</th>
                          <th className="px-4 py-3">Reason</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 rounded-tr-lg">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filtered.map((r) => (
                          <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-4 text-gray-800 font-medium">{r.staff.name}</td>
                            <td className="px-4 py-4 text-gray-700 text-sm">{r.staff.email}</td>
                            <td className="px-4 py-4 text-gray-700 text-sm">{new Date(r.startDate).toLocaleDateString()}</td>
                            <td className="px-4 py-4 text-gray-700 text-sm">{new Date(r.endDate).toLocaleDateString()}</td>
                            <td className="px-4 py-4 text-gray-700 text-sm max-w-xs overflow-hidden text-ellipsis whitespace-nowrap">{r.reason}</td>
                            <td className={`px-4 py-4 font-semibold text-sm ${r.status === "approved" ? "text-green-600" : r.status === "rejected" ? "text-red-600" : "text-yellow-600"}`}>
                              {r.status.toUpperCase()}
                            </td>
                            <td className="px-4 py-4">
                              {r.status === "pending" && (
                                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                  <button
                                    onClick={() => openModal(r._id, "approved")}
                                    className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 hover:bg-green-200 transition-colors duration-200"
                                    disabled={processingId === r._id}
                                  >
                                    Approve ✓
                                  </button>
                                  <button
                                    onClick={() => openModal(r._id, "rejected")}
                                    className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-colors duration-200"
                                    disabled={processingId === r._id}
                                  >
                                    Reject –
                                  </button>
                                </div>
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md transform transition-all scale-100 opacity-100 duration-300 ease-out">
            <h3 className="text-xl font-bold mb-4 text-gray-800">{modalType === 'approved' ? 'Confirm Approval' : 'Confirm Rejection'}</h3>
            <p className="mb-4 text-gray-700">{modalType === 'approved' ? 'Optionally, you may provide a reason for approval.' : 'A reason for rejection is required.'}</p>
            <textarea
              rows={4}
              value={modalReason}
              onChange={(e) => setModalReason(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y"
              placeholder={modalType === 'approved' ? 'Enter optional reason for approval...' : 'Enter reason for rejection...'}
            />
            {error && <div className="mt-2 text-red-600 text-sm">{error}</div>}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={closeModal}
                className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal}
                className={`px-5 py-2 rounded-lg text-white font-semibold transition-colors duration-200
                  ${modalType === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                  ${(modalType === 'rejected' && !modalReason.trim()) || processingId ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                disabled={(modalType === 'rejected' && !modalReason.trim()) || processingId}
              >
                {processingId === modalId ? 'Processing...' : (modalType === 'approved' ? 'Approve' : 'Reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveApproval;