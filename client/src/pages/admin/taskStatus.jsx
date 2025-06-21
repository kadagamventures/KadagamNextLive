import { useState, useEffect, useRef, useCallback } from "react";
import { tokenRefreshInterceptor as axiosInstance } from "../../utils/axiosInstance";
import PropTypes from "prop-types";
import AdminSidebar from "../../components/sidebar";
import { FaDownload, FaSearch } from "react-icons/fa";

// Detailed Description Popup Component
const DetailedDescriptionPopup = ({ update, onClose }) => {
  const popupRef = useRef(null);

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
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div ref={popupRef} className="bg-white rounded-xl p-6 shadow-2xl w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Daily Update Details</h2>
        <div className="mb-4 space-y-2">
          <p>
            <span className="font-semibold">Staff Name:</span>{" "}
            {update?.staffName || "N/A"}
          </p>
          <p>
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
            <div>
              <p className="font-semibold">Attachment:</p>
              <p className="text-sm text-gray-600">
                {update.fileName || update.fileUrl.split("/").pop()}
              </p>
              <p className="text-sm text-gray-600">
                {update.fileType || "Unknown Type"}
              </p>
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
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Close
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
        const { data: tasks } = await axiosInstance.get("/tasks/daily-comments");
        const flat = [];
        tasks.forEach((task) =>
          task.dailyUpdates?.forEach((u) =>
            flat.push({
              id: `${task._id}-${u._id}`,
              staffName: u.staffId?.name || "N/A",
              taskId: task._id,
              taskTitle: task.title || "Untitled Task",
              dailyStatus: u.comment,
              date: u.date,
              fileUrl: u.attachment?.fileUrl || null,
              fileType: u.attachment?.fileType || null,
              fileName: u.attachment?.fileName || null,
            })
          )
        );
        flat.sort((a, b) => new Date(b.date) - new Date(a.date));
        setDailyUpdates(flat);
      } catch {
        setError("Failed to load daily comments. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchDailyComments();
  }, []);

  const filteredUpdates = dailyUpdates.filter((upd) => {
    const q = searchTerm.toLowerCase();
    return (
      upd.staffName.toLowerCase().includes(q) ||
      upd.taskTitle.toLowerCase().includes(q) ||
      upd.dailyStatus.toLowerCase().includes(q)
    );
  });

  const openPopup = (upd) => setSelectedUpdate(upd);
  const closePopup = useCallback(() => setSelectedUpdate(null), []);
  const shorten = (txt, len = 25) =>
    txt.length > len ? `${txt.slice(0, len)}...` : txt;

  const handleDownload = async (taskId, fileUrl) => {
    if (!fileUrl) return alert("No attachment available.");
    try {
      const s3Key = decodeURIComponent(new URL(fileUrl).pathname.slice(1));
      const { data } = await axiosInstance.get(
        `/files/presigned-url?key=${encodeURIComponent(s3Key)}`
      );
      if (data.url) {
        const name = s3Key.split("/").pop().split("-").slice(1).join("-");
        const a = document.createElement("a");
        a.href = data.url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        alert("Failed to generate download link.");
      }
    } catch {
      alert("Download failed. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />

      {/* Full-width container */}
      <main className="flex-grow p-6 md:p-8">
        <div className="w-full">
          {/* Header + Search */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">
              Daily Task Updates
            </h1>
            <div className="relative w-full max-w-sm">
              <input
                type="text"
                placeholder="Search Staff, Task, or Comment..."
                className="w-full px-3 py-2 pr-10 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {/* Loading / Error */}
          {loading ? (
            <p className="text-center py-4 text-gray-600">Loading...</p>
          ) : error ? (
            <p className="text-center py-4 text-red-500">{error}</p>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full max-w-full table-auto divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {[
                        "Staff Name",
                        "Task Name",
                        "Comment",
                        "Date & Time",
                        "Actions",
                      ].map((col) => (
                        <th
                          key={col}
                          className="px-6 py-3 text-center text-sm md:text-base font-medium text-gray-700 whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUpdates.map((upd) => (
                      <tr key={upd.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-center text-sm md:text-base text-gray-600">
                          {upd.staffName}
                        </td>
                        <td className="px-6 py-4 text-center text-sm md:text-base text-gray-600">
                          {upd.taskTitle}
                        </td>
                        <td
                          className="px-6 py-4 text-center text-sm md:text-base text-gray-600 cursor-pointer"
                          onClick={() => openPopup(upd)}
                          title={upd.dailyStatus}
                        >
                          {shorten(upd.dailyStatus)}
                        </td>
                        <td className="px-6 py-4 text-center text-sm md:text-base text-gray-600 whitespace-nowrap">
                          {new Date(upd.date).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleDownload(upd.taskId, upd.fileUrl)}
                            disabled={!upd.fileUrl}
                            className={`inline-flex justify-center items-center gap-2 px-3 py-2 rounded-full border transition ${upd.fileUrl
                                ? "border-gray-400 hover:bg-gray-100 text-purple-600 hover:text-purple-800"
                                : "border-gray-300 text-gray-400 cursor-not-allowed"
                              }`}
                            title={upd.fileUrl ? "Download" : "No file"}
                          >
                            <FaDownload className="h-5 w-5" />
                            <span className="text-sm md:text-base">
                              Download
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUpdates.length === 0 && (
                  <p className="text-center py-8 text-gray-500">No updates found.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {selectedUpdate && (
        <DetailedDescriptionPopup update={selectedUpdate} onClose={closePopup} />
      )}
    </div>
  );
};

export default DailyStatusDashboard;
