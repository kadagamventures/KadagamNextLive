import PropTypes from "prop-types";

const ConfirmPopup = ({
  title = "Are you sure?",
  message = "This action cannot be undone.",
  onConfirm,
  onCancel,
  confirmLabel = "Yes, Delete",
  cancelLabel = "Cancel",
  confirmColor = "bg-red-600 hover:bg-red-700",
  className = "",
  confirmDisabled = false,
}) => {
  return (
    <div
      className={`absolute top-full mt-1 right-0 z-50 bg-white border border-gray-300 shadow-lg rounded-xl p-4 w-64 text-sm ${className}`}
      role="dialog"
      aria-modal="true"
    >
      <div className="text-gray-800 font-semibold mb-2">{title}</div>
      {message && <p className="text-gray-600 mb-4">{message}</p>}
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1 rounded-md border text-gray-600 hover:bg-gray-100 transition"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          disabled={confirmDisabled}
          className={`px-3 py-1 text-white rounded-md transition ${confirmColor} ${confirmDisabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
};

ConfirmPopup.propTypes = {
  title: PropTypes.string,
  message: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  confirmLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
  confirmColor: PropTypes.string,
  className: PropTypes.string,
  confirmDisabled: PropTypes.bool,
};

export default ConfirmPopup;
