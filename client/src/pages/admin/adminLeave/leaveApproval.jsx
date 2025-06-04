import { useEffect, useState } from "react";
import { tokenRefreshInterceptor as axiosInstance } from "../../../utils/axiosInstance";
import AdminSidebar from "../../../components/sidebar";
import LeaveList from "./leaveList";

const LeaveApproval = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [activeTab, setActiveTab] = useState("approval");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null); // "approved" or "rejected"
  const [modalId, setModalId] = useState(null);
  const [modalReason, setModalReason] = useState("");

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
    setProcessingId(id);
    try {
      const url = status === "approved" ? `/leave/approve/${id}` : `/leave/reject/${id}`;
      await axiosInstance.patch(url, { adminReason: reason });
      setLeaveRequests((prev) =>
        prev.map((r) => (r._id === id ? { ...r, status } : r))
      );
      setMessage(`Request ${status} successfully!`);
      setError("");
    } catch {
      setError(`Failed to ${status} request. Please try again.`);
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
    setLoading(true);
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
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-grow p-6 ml-64">
        <div className="max-w-6xl mx-auto">
          {/* Tabs */}
          

          {activeTab === "approval" && (
            <>
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800">
                  Leave Approval
                </h1>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by staff or ID…"
                    className="w-full sm:w-64 px-3 py-2 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <span className="absolute right-2 top-2 text-purple-600">🔍</span>
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
                    <table className="w-full table-auto">
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
                              {r.status === "pending" && (
                                <div className="flex space-x-2">
                                  <button onClick={() => openModal(r._id, "approved")} className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-700 hover:bg-green-200">Approve ✓</button>
                                  <button onClick={() => openModal(r._id, "rejected")} className="px-3 py-1 rounded-full text-sm bg-red-100 text-red-700 hover:bg-red-200">Reject –</button>
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
        <div className="fixed inset-0 bg-opacity-50 flex backdrop-blur-md items-center justify-center z-30">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{modalType === 'approved' ? 'Confirm Approval' : 'Confirm Rejection'}</h3>
            <p className="mb-4">{modalType === 'approved' ? 'Optionally, you may provide a reason for approval.' : 'A reason for rejection is required.'}</p>
            <textarea rows={4} value={modalReason} onChange={(e) => setModalReason(e.target.value)} className="w-full p-2 border rounded" placeholder="Enter reason..." />
            {error && <div className="mb-2 text-red-600">{error}</div>}
            <div className="flex justify-end space-x-3">
              <button onClick={closeModal} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
              <button onClick={confirmModal} className={`px-4 py-2 rounded text-white ${modalType === 'approved' ? 'bg-green-600' : 'bg-red-600'}`} disabled={modalType === 'rejected' && !modalReason.trim()}>{modalType === 'approved' ? 'Approve' : 'Reject'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveApproval;
