// src/components/UploadModal.jsx
import { useState, useRef } from "react";
import { FaTimes, FaDownload, FaTrashAlt, FaUpload, FaCommentDots } from "react-icons/fa";
import PropTypes from "prop-types";

export default function UploadModal({
  isOpen,
  task,
  onClose,
  onFileSubmit,
  onGeneratePdf,
  onDeleteAttachment,
  onDailyUpdateSubmit,
  onStatusUpdate,
}) {
  const [newStatusText, setNewStatusText] = useState("");
  const [dailyComment, setDailyComment] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen || !task) return null;

  // Trigger hidden file input
  const handleFileClick = () => fileInputRef.current?.click();

  // Store file in state for submission
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
  };

  // Submit the stored file
  const handleFileSubmit = () => {
    if (selectedFile) {
      onFileSubmit(task._id, selectedFile);
      setSelectedFile(null);
    }
  };

  // Submit daily update
  const handleDailySubmit = () => {
    if (dailyComment.trim()) {
      onDailyUpdateSubmit(task._id, dailyComment.trim());
      setDailyComment("");
    }
  };

  // Submit status update
  const handleStatusSubmit = () => {
    if (newStatusText.trim()) {
      onStatusUpdate(task._id, newStatusText.trim());
      setNewStatusText("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-3xl p-6 shadow-xl relative flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-6">
        {/* Close button */}
        <button
          className="absolute top-4 right-4 text-gray-600 hover:text-red-600"
          onClick={onClose}
        >
          <FaTimes size={18} />
        </button>

        {/* Left: Preview + PDF */}
        <div className="w-full md:w-1/2 space-y-4">
          {task.attachments?.length ? (
            <div className="relative">
              <img
                src={task.attachments[0].url}
                alt="Preview"
                className="rounded-xl border border-gray-200 w-full h-64 object-contain"
              />
              <button
                className="absolute top-2 right-2 bg-white p-1 rounded-full shadow hover:text-red-600"
                onClick={() => onDeleteAttachment(task._id, task.attachments[0]._id)}
              >
                <FaTrashAlt size={16} />
              </button>
            </div>
          ) : (
            <div className="h-64 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
              No Preview
            </div>
          )}
          <button
            className="flex items-center justify-center bg-purple-600 text-white px-6 py-2 rounded-full hover:bg-purple-700 shadow"
            onClick={() => onGeneratePdf(task._id)}
          >
            <FaDownload className="mr-2" /> Download PDF
          </button>

          {/* Hidden file input + selected file info + submit */}
          <div>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              className="flex items-center bg-green-600 text-white px-4 py-2 rounded-full hover:bg-green-700 shadow"
              onClick={handleFileClick}
            >
              <FaUpload className="mr-2" /> {selectedFile ? selectedFile.name : 'Choose File'}
            </button>
            {selectedFile && (
              <button
                className="ml-2 bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 shadow"
                onClick={handleFileSubmit}
              >
                Submit Upload
              </button>
            )}
          </div>
        </div>

        {/* Right: Task info, daily & status updates */}
        <div className="w-full md:w-1/2 space-y-6">
          <h2 className="text-xl font-semibold">{task.title}</h2>
          <p className="text-sm text-gray-600">
            Priority:{' '}
            <span
              className={
                {
                  High: 'text-red-500',
                  Medium: 'text-yellow-500',
                  Low: 'text-green-500',
                }[task.priority]
              }
            >
              {task.priority}
            </span>
          </p>
          <p className="text-sm text-gray-600">Due: {new Date(task.dueDate).toLocaleDateString()}</p>

          <div>
            <label className="block text-sm font-medium mb-1">Daily Update</label>
            <div className="flex space-x-2 items-start">
              <FaCommentDots className="mt-2 text-gray-500" size={20} />
              <textarea
                rows={3}
                value={dailyComment}
                onChange={(e) => setDailyComment(e.target.value)}
                placeholder="Enter update..."
                className="flex-1 border border-gray-300 p-2 rounded-lg text-sm focus:outline-none"
              />
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 shadow"
                onClick={handleDailySubmit}
              >
                Submit
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Update Status</label>
            <textarea
              rows={4}
              value={newStatusText}
              onChange={(e) => setNewStatusText(e.target.value)}
              placeholder="Enter new status or notes..."
              className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:outline-none"
            />
            <button
              className="mt-2 w-full bg-indigo-600 text-white py-2 rounded-full hover:bg-indigo-700 shadow"
              onClick={handleStatusSubmit}
            >
              Update Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

UploadModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  task: PropTypes.shape({
    _id: PropTypes.string,
    title: PropTypes.string,
    priority: PropTypes.oneOf(["High", "Medium", "Low"]),
    dueDate: PropTypes.string,
    attachments: PropTypes.arrayOf(
      PropTypes.shape({ _id: PropTypes.string, url: PropTypes.string })
    ),
  }),
  onClose: PropTypes.func.isRequired,
  onFileSubmit: PropTypes.func.isRequired,
  onGeneratePdf: PropTypes.func.isRequired,
  onDeleteAttachment: PropTypes.func.isRequired,
  onDailyUpdateSubmit: PropTypes.func.isRequired,
  onStatusUpdate: PropTypes.func.isRequired,
};
