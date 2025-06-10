import { useState, useEffect, useRef, useCallback } from "react";
import { tokenRefreshInterceptor as axiosInstance } from "../../utils/axiosInstance";
import PropTypes from "prop-types";
import AdminSidebar from "../../components/sidebar";
import { FaDownload, FaSearch } from "react-icons/fa";

// Detailed Description Popup Component
const DetailedDescriptionPopup = ({ update, onClose }) => {
  const popupRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex justify-center items-center rounded-lg p-4">
      <div
        ref={popupRef}
        className="bg-white rounded-xl p-6 shadow-2xl w-full max-w-md"
      >
        <h2 className="text-lg font-semibold mb-4">Daily Update Details</h2>
        <div className="mb-4">
          <p className="mb-2">
            <span className="font-semibold">Staff Name:</span>{" "}
            {update?.staffName || "N/A"}
          </p>
          <p className="mb-2">
            <span className="font-semibold">Task Name:</span>{" "}
            {update?.taskTitle || "N/A"}
          </p>
          <div>
            <span className="font-semibold">Comment:</span>
            <p className="whitespace-normal break-words mt-1">
              {update?.dailyStatus || "No comment provided."}
            </p>
          </div>
          {update?.fileUrl && (
            <div className="mt-4">
              <p className="font-semibold">Attachment:</p>
              <p className="text-sm text-gray-600">
                {update.fileName || update.fileUrl.split("/").pop()}
              </p>
              <p className="text-sm text-gray-600">{update.fileType || "Unknown Type"}</p>
            </div>
          )}
        </div>
        <p className="mb-4">
          <span className="font-semibold">Date & Time:</span>{" "}
          {update?.date
            ? new Date(update.date)
              .toLocaleString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })
              .replace(",", " ")
            : "N/A"}
        </p>
        <div className="flex justify-end gap-4 mt-4">
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
};

DetailedDescriptionPopup.propTypes = {
  update: PropTypes.shape({
    staffName: PropTypes.string,
    taskTitle: PropTypes.string,
    dailyStatus: PropTypes.string,
    date: PropTypes.string,
    fileName: PropTypes.string,
    fileUrl: PropTypes.string,
    fileType: PropTypes.string,
  }),
  onClose: PropTypes.func.isRequired,
};

// Main Component
const DailyStatusDashboard = () => {
  const [dailyUpdates, setDailyUpdates] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedUpdate, setSelectedUpdate] = useState(null);

  useEffect(() => {
    const fetchDailyComments = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axiosInstance.get("/tasks/daily-comments");
        const tasks = response.data;

        const flattenedUpdates = [];
        tasks.forEach((task) => {
          if (task.dailyUpdates?.length > 0) {
            task.dailyUpdates.forEach((update) => {
              flattenedUpdates.push({
                id: `${task._id}-${update._id}`,
                staffName: update.staffId?.name || "N/A",
                taskId: task._id,
                taskTitle: task.title || "Untitled Task",
                dailyStatus: update.comment,
                date: update.date,
                fileUrl: update.attachment?.fileUrl || null,
                fileType: update.attachment?.fileType || null,
                fileName: update.attachment?.fileName || null, // ✅ added filename
              });
            });
          }
        });

        flattenedUpdates.sort((a, b) => new Date(b.date) - new Date(a.date));
        setDailyUpdates(flattenedUpdates);
      } catch (err) {
        console.error("❌ Error fetching daily comments:", err);
        setError("Failed to load daily comments. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDailyComments();
  }, []);

  const filteredUpdates = dailyUpdates.filter((update) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      update.staffName.toLowerCase().includes(searchLower) ||
      update.taskTitle.toLowerCase().includes(searchLower) ||
      update.dailyStatus.toLowerCase().includes(searchLower)
    );
  });

  const openDescriptionPopup = (update) => setSelectedUpdate(update);
  const closeDescriptionPopup = useCallback(() => setSelectedUpdate(null), []);
  const shortenComment = (comment, maxLength = 25) =>
    comment.length > maxLength ? `${comment.substring(0, maxLength)}...` : comment;

  const handleDownload = async (taskId, fileUrl) => {
    if (!fileUrl) return alert("No attachment available.");

    try {
      const s3Key = decodeURIComponent(new URL(fileUrl).pathname.slice(1));
      const encodedKey = encodeURIComponent(s3Key);

      const { data } = await axiosInstance.get(`/files/presigned-url?key=${encodedKey}`);
      if (data?.url) {
        const fileName = s3Key.split("/").pop().split("-").slice(1).join("-");

        const link = document.createElement("a");
        link.href = data.url;
        link.setAttribute("download", fileName); // 👈 Ensures proper name and extension
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert("Failed to generate download link.");
      }
    } catch (err) {
      console.error("❌ File download failed:", err);
      alert("Download failed. Please try again.");
    }
  };


  const handlePopupDownload = useCallback(() => {
    if (selectedUpdate) {
      handleDownload(selectedUpdate.taskId, selectedUpdate.fileUrl);
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
                className="w-64 px-3 py-2 pr-10 rounded-full border border-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className="absolute right-2 top-2 text-gray-400">
                <FaSearch className="h-5 w-5" />
              </button>
            </div>
          </div>

          {loading && (
            <div className="text-center py-4 text-gray-600">Loading daily updates...</div>
          )}
          {error && <div className="text-center py-4 text-red-500">{error}</div>}

          {!loading && !error && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full table-auto border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Staff Name</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Task Name</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Comment</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Date & Time</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUpdates.map((update, index) => (
                    <tr key={`${update.taskId}-${index}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500">{update.staffName}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{update.taskTitle}</td>
                      <td
                        className="px-6 py-4 text-sm text-gray-500 cursor-pointer"
                        onClick={() => openDescriptionPopup(update)}
                        title={update.dailyStatus}
                      >
                        {shortenComment(update.dailyStatus)}
                        {update.fileName && (
                          <span className="block text-xs text-gray-400 mt-1">
                            {update.fileName}
                          </span>
                        )}
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
                          onClick={() => handleDownload(update.taskId, update.fileUrl)}
                          disabled={!update.fileUrl}
                          className={`flex items-center gap-1 px-3 py-2 rounded-full border border-gray-400 hover:bg-gray-200  text-purple-600 hover:text-purple-800 transition ${!update.fileUrl ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                          title={!update.fileUrl ? "No attachment" : "Download"}
                        >
                          <FaDownload className="h-5 w-3.5" />
                          <span className="text-sm font-medium text-black">Download</span>
                        </button>

                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUpdates.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No updates found. Try adjusting your search terms.</p>
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
