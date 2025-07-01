import { useEffect, useRef, useState } from "react";
import { FaBell, FaChevronLeft, FaChevronRight, FaTimes, FaTrashAlt } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {
  getNotificationsAPI,
  markAsReadAPI,
  clearAllNotificationsAPI, // make sure this exists in your services
} from "../services/notificationService";
import {
  setNotifications,
  markAsRead,
  clearNotifications,
} from "../redux/slices/notificationSlice";
import { motion, AnimatePresence } from "framer-motion";

const NotificationBell = () => {
  const dispatch = useDispatch();
  const notifications = useSelector(
    (state) => state.notifications?.notifications || []
  );
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const [open, setOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const bellRef = useRef();
  const popupRef = useRef();

  const currentNotif = notifications[currentIndex];

  // Load notifications
  useEffect(() => {
    (async () => {
      try {
        const data = await getNotificationsAPI();
        dispatch(setNotifications(data));
      } catch (err) {
        console.error("🔴 Notification fetch error:", err);
      }
    })();
  }, [dispatch]);

  // Close popup on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setOpen(false);
        setCurrentIndex(0);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll on wheel inside popup
  useEffect(() => {
    if (!popupRef.current) return;

    const handleScroll = (e) => {
      e.preventDefault();
      if (e.deltaY > 0) {
        setCurrentIndex((prev) => Math.min(prev + 1, notifications.length - 1));
      } else {
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
      }
    };

    const el = popupRef.current;
    el.addEventListener("wheel", handleScroll, { passive: false });

    return () => el.removeEventListener("wheel", handleScroll);
  }, [notifications.length]);

  // Mark as read on open
  useEffect(() => {
    if (open && currentNotif && !currentNotif.isRead) {
      (async () => {
        try {
          await markAsReadAPI(currentNotif._id);
          dispatch(markAsRead(currentNotif._id));
        } catch (err) {
          console.error("🔴 Auto mark-as-read failed:", err);
        }
      })();
    }
  }, [open, currentNotif, dispatch]);

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, notifications.length - 1));
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleClose = () => {
    setOpen(false);
    setCurrentIndex(0);
  };

  const handleClearAll = async () => {
    try {
      await clearAllNotificationsAPI();
      dispatch(clearNotifications());
      setCurrentIndex(0);
      setOpen(false);
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  };

  return (
    <div className="relative" ref={bellRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Toggle Notifications"
        title="Toggle Notifications"
        className="relative p-2 rounded-full hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <FaBell className="text-2xl text-gray-700" />
        {unreadCount > 0 && (
          <span
            aria-live="polite"
            aria-atomic="true"
            className="absolute -top-1 -right-1 bg-red-600 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full shadow-md font-semibold select-none"
          >
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && currentNotif && (
          <motion.div
            ref={popupRef}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-3 w-96 max-w-full bg-white text-gray-900 shadow-xl rounded-2xl p-6 z-50 select-none flex flex-col border border-gray-200"
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
            style={{ minWidth: "360px" }}
          >
            {/* Removed rhombus shape */}

            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-semibold leading-tight truncate max-w-[70%]">
                Notifications
              </h3>

              <div className="flex items-center space-x-4">
                <button
                  onClick={handleClearAll}
                  aria-label="Clear all notifications"
                  title="Clear All"
                  className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800 transition focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                >
                  <FaTrashAlt />
                  Clear All
                </button>

                <button
                  onClick={handleClose}
                  aria-label="Close notifications"
                  className="text-gray-400 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full p-1 transition"
                >
                  <FaTimes size={18} />
                </button>
              </div>
            </div>

            <div
              className="flex-grow overflow-y-auto max-h-52 mb-6 pr-2 text-sm leading-relaxed"
              title={currentNotif.message}
            >
              {currentNotif.message.length > 280
                ? currentNotif.message.slice(0, 280) + "..."
                : currentNotif.message}
            </div>

            <div className="text-xs text-right text-gray-500 mb-4 select-text">
              {new Date(currentNotif.createdAt || currentNotif.time).toLocaleString()}
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                aria-label="Previous notification"
                className={`p-2 rounded-full transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  currentIndex === 0
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-indigo-600 hover:bg-indigo-100"
                }`}
              >
                <FaChevronLeft size={18} />
              </button>

              <p className="text-xs text-gray-600 select-none">
                {currentIndex + 1} / {notifications.length}
              </p>

              <button
                onClick={handleNext}
                disabled={currentIndex === notifications.length - 1}
                aria-label="Next notification"
                className={`p-2 rounded-full transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  currentIndex === notifications.length - 1
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-indigo-600 hover:bg-indigo-100"
                }`}
              >
                <FaChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
