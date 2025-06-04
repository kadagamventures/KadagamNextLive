import { useEffect, useRef, useState } from "react";
import { FaBell } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {
  getNotificationsAPI,
  markAsReadAPI,
} from "../services/notificationService";
import {
  setNotifications,
  markAsRead,
} from "../redux/slices/notificationSlice";

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

  // ⏬ Load notifications
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

  // 🧱 Close popup on outside click
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

  // 🧭 Scroll on hover over popup
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

  // 📍 Mark as read on open
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

  const handleClick = () => {
    setCurrentIndex((prev) =>
      Math.min(prev + 1, notifications.length - 1)
    );
  };

  const handleDoubleClick = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  return (
    <div className="relative" ref={bellRef}>
      <button
        onClick={() => {
          setOpen((prev) => !prev);
          setCurrentIndex(0);
        }}
        className="relative p-2 rounded-full hover:bg-gray-100 transition"
      >
        <FaBell className="text-2xl text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full shadow">
            {unreadCount}
          </span>
        )}
      </button>

      {open && currentNotif && (
        <div
          ref={popupRef}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          className="absolute top-[110%] right-0 w-80 bg-blue-500 text-white shadow-xl rounded-2xl p-4 z-50 cursor-pointer select-none"
        >
          {/* Tail pointing to bell */}
          <div className="absolute -top-2 right-4 w-4 h-4 bg-blue-500 rotate-45 z-[-1]" />

          <div className="text-sm font-medium leading-snug whitespace-pre-wrap">
            {currentNotif.message}
          </div>
          <div className="text-[11px] text-right mt-2 opacity-80">
            {new Date(currentNotif.createdAt || currentNotif.time).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
