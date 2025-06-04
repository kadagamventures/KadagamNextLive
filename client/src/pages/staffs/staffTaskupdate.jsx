import { useState, useEffect, useCallback } from "react";
import { tokenRefreshInterceptor as axiosInstance } from "../../utils/axiosInstance";
import PropTypes from "prop-types";
import AdminSidebar from "../../components/staffSidebar";
import { FaDownload, FaSearch } from "react-icons/fa";

// 🔹 Popup Component
const DetailedDescriptionPopup = ({ update, onClose, onDownload }) => (
  <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex justify-center items-center z-50">
    <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-md">
      <h2 className="text-lg font-semibold mb-4">Daily Update Details</h2>
      <div className="mb-4">
        <p className="mb-2">
          <span className="font-semibold">Staff Name:</span> {update?.staffName || "N/A"}
        </p>
        <p className="mb-2">
          <span className="font-semibold">Task Name:</span> {update?.taskTitle || "N/A"}
        </p>
        <div>
          <span className="font-semibold">Comment:</span>
          <p className="whitespace-normal break-words mt-1">{update?.comment || "No comment provided."}</p>
        </div>
        {update?.fileName && (
          <div className="mt-4">
            <p className="text-sm text-gray-600"><strong>Attachment:</strong> {update.fileName}</p>
            <p className="text-sm text-gray-600">{update.fileType || "Unknown Type"}</p>
          </div>
        )}
      </div>
      <p className="mb-4">
        <span className="font-semibold">Date & Time:</span>{" "}
        {update?.date
          ? new Date(update.date).toLocaleString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }).replace(",", " ")
          : "N/A"}
      </p>
      <div className="flex justify-end gap-4 mt-4">
        <button
          onClick={onDownload}
          disabled={!update?.fileKey}
          className={`px-4 py-2 ${update?.fileKey ? "bg-purple-600 hover:bg-purple-700" : "bg-gray-400 cursor-not-allowed"} text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500`}
        >
          Download
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
);

DetailedDescriptionPopup.propTypes = {
  update: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
};

const DailyStatusDashboard = () => {
  const [dailyUpdates, setDailyUpdates] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedUpdate, setSelectedUpdate] = useState(null);

useEffect(() => {
  const fetchDailyComments = async () => {
    setLoading(true);
    try {
      console.log("⚡ Frontend: calling /tasks/my-daily-comments");
      const { data } = await axiosInstance.get("/tasks/my-daily-comments");
      setDailyUpdates(data);
    } catch (err) {
      console.error("❌ Frontend fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  fetchDailyComments();
}, []);


  const filteredUpdates = dailyUpdates.filter((u) => {
    const search = searchTerm.toLowerCase();
    return (
      u.staffName.toLowerCase().includes(search) ||
      u.taskTitle.toLowerCase().includes(search) ||
      u.comment.toLowerCase().includes(search)
    );
  });

  const openDescriptionPopup = (update) => setSelectedUpdate(update);
  const closeDescriptionPopup = useCallback(() => setSelectedUpdate(null), []);

  const shortenComment = (text, len = 25) => text.length > len ? `${text.slice(0, len)}...` : text;

  const handleDownload = useCallback(async (fileKey) => {
    if (!fileKey) return alert("No attachment available.");
    try {
      const { data } = await axiosInstance.get(`/files/presigned-url?key=${encodeURIComponent(fileKey)}`);
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        alert("Failed to generate download link.");
      }
    } catch (err) {
      console.error("❌ File download failed:", err);
      alert("Download failed. Please try again.");
    }
  }, []);

  const handlePopupDownload = useCallback(() => {
    if (selectedUpdate?.fileKey) {
      handleDownload(selectedUpdate.fileKey);
      closeDescriptionPopup();
    }
  }, [selectedUpdate, handleDownload, closeDescriptionPopup]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-grow p-6 ml-64">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-800">Daily Task Updates</h1>
            <div className="relative">
              <input
                type="text"
                placeholder="Search Staff, Task, or Comment..."
                className="w-64 px-3 py-2 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <FaSearch className="absolute right-3 top-3 text-purple-600" />
            </div>
          </div>

          {loading && <p className="text-center py-4 text-gray-600">Loading updates...</p>}
          {error && <p className="text-center py-4 text-red-500">{error}</p>}

          {!loading && !error && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full table-auto border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    {["Staff Name", "Task Name", "Comment", "Date & Time", "Actions"].map((h) => (
                      <th
                        key={h}
                        className={`px-6 py-4 text-left text-sm font-medium text-gray-700 ${h === "Actions" ? "text-right" : ""}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUpdates.map((update) => (
                    <tr key={`${update.taskId}-${update.date}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500">{update.staffName}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{update.taskTitle}</td>
                      <td
                        className="px-6 py-4 text-sm text-gray-500 cursor-pointer"
                        onClick={() => openDescriptionPopup(update)}
                        title={update.comment}
                      >
                        {shortenComment(update.comment)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {new Date(update.date).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        }).replace(",", " ")}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <button
                          disabled={!update.fileKey}
                          onClick={() => handleDownload(update.fileKey)}
                          className={`text-purple-600 hover:text-purple-800 ${!update.fileKey ? "opacity-30 cursor-not-allowed" : ""}`}
                          title={update.fileKey ? "Download attachment" : "No attachment"}
                        >
                          <FaDownload className="h-5 w-5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUpdates.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No updates found. Try adjusting your search terms.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedUpdate && (
        <DetailedDescriptionPopup
          update={selectedUpdate}
          onClose={closeDescriptionPopup}
          onDownload={handlePopupDownload}
        />
      )}
    </div>
  );
};

export default DailyStatusDashboard;
