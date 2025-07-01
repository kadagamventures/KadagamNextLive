// src/components/StaffSidebar.jsx
import { useEffect, useMemo, useCallback, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaChartPie,
  FaTasks,
  FaSignOutAlt,
  FaCalendarAlt,
  FaComments,
  FaClock,
  FaSync,
  FaUserAltSlash,
  FaAddressCard,
  FaUserTag,
  FaFileSignature,
  FaRegFolderOpen,
  FaClipboardList,
} from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchPermissions,
  fetchOfficeTiming,
  fetchActiveSession,
  startWorkSession,
  endWorkSession,
  setIntervalId,
  clearIntervalId,
  incrementTimer,
} from "../redux/slices/staffSidebarslice";
import { tokenRefreshInterceptor as axiosInstance } from "../utils/axiosInstance";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import logo from "../assets/kadagamlogo.png";

const StaffSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const scrollContainerRef = useRef(null);

  // Redux state with safe defaults
  const {
    permissions,
    isWorking,
    timer = 0,
    intervalId,
    scheduledEndTime,
    officeTiming = {},
  } = useSelector((state) => state.staffSidebar);

  const [loading, setLoading] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);
  const autoTimeoutRef = useRef(null);

  // 1) Initial fetch: permissions, office timing, active session
  useEffect(() => {
    dispatch(fetchPermissions());
    dispatch(fetchOfficeTiming());
    dispatch(fetchActiveSession())
      .unwrap()
      .catch(() => {})
      .finally(() => setSessionLoaded(true));
  }, [dispatch]);

  // 2) Fetch review count if user can review tasks
  useEffect(() => {
    if (permissions.includes("manage_task")) {
      axiosInstance
        .get("/tasks")
        .then(({ data }) => {
          const count = Array.isArray(data)
            ? data.filter((t) => t.status === "Review").length
            : 0;
          setReviewCount(count);
        })
        .catch(() => {});
    }
  }, [permissions]);

  // 3) Check‑in / Check‑out toggle
  const handleAttendanceToggle = useCallback(async () => {
    if (!sessionLoaded) return;
    setLoading(true);
    try {
      if (!isWorking) {
        await dispatch(startWorkSession()).unwrap();
        toast.success("Checked in successfully");
      } else {
        await dispatch(endWorkSession()).unwrap();
        toast.success("Checked out successfully");
      }
    } catch (err) {
      const msg = typeof err === "string" ? err : err.message;
      if (!isWorking && msg.includes("already checked in")) {
        toast.info("Already checked in; syncing state");
        dispatch(fetchActiveSession());
      } else {
        toast.error(`${isWorking ? "Check-out" : "Check-in"} failed: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  }, [dispatch, isWorking, sessionLoaded]);

  // 4) Timer management
  const startTimer = useCallback(() => {
    if (!intervalId) {
      const id = setInterval(() => dispatch(incrementTimer()), 1000);
      dispatch(setIntervalId(id));
    }
  }, [dispatch, intervalId]);

  const stopTimer = useCallback(() => {
    if (intervalId) {
      clearInterval(intervalId);
      dispatch(clearIntervalId());
    }
  }, [dispatch, intervalId]);

  useEffect(() => {
    if (isWorking) startTimer();
    else stopTimer();
  }, [isWorking, startTimer, stopTimer]);

  // 5) Auto‑checkout at scheduled end
  useEffect(() => {
    if (autoTimeoutRef.current) {
      clearTimeout(autoTimeoutRef.current);
    }
    if (isWorking && scheduledEndTime) {
      const msLeft = new Date(scheduledEndTime) - Date.now();
      if (msLeft > 0) {
        autoTimeoutRef.current = setTimeout(handleAttendanceToggle, msLeft);
      }
    }
    return () => clearTimeout(autoTimeoutRef.current);
  }, [isWorking, scheduledEndTime, handleAttendanceToggle]);

  // 6) Persist state to localStorage
  useEffect(() => {
    if (isWorking) {
      localStorage.setItem("isWorking", "true");
      localStorage.setItem("workTimer", String(timer));
      if (scheduledEndTime) {
        localStorage.setItem("scheduledEndTime", scheduledEndTime);
      }
    } else {
      localStorage.removeItem("isWorking");
      localStorage.removeItem("workTimer");
      localStorage.removeItem("scheduledEndTime");
    }
  }, [isWorking, timer, scheduledEndTime]);

  // 7) Persist scroll position
  useEffect(() => {
    const container = scrollContainerRef.current;
    const saved = sessionStorage.getItem("sidebar-scroll");
    if (container && saved) container.scrollTo(0, +saved);
    const onScroll = () =>
      sessionStorage.setItem("sidebar-scroll", container.scrollTop.toString());
    container?.addEventListener("scroll", onScroll);
    return () => container?.removeEventListener("scroll", onScroll);
  }, []);

  // Nav links based on permissions
  const mainLinks = useMemo(() => {
    const links = [];
    if (permissions.includes("manage_project")) {
      links.push({
        path: "/staff/projects/list",
        icon: <FaClipboardList />,
        label: "Projects",
      });
    }
    if (permissions.includes("manage_staff")) {
      links.push(
        { path: "/staff/staffs/list", icon: <FaUserTag />, label: "Staffs" },
        {
          path: "/staff/manage/overview",
          icon: <FaAddressCard />,
          label: "Management Staff",
        },
        { path: "/staff/leave/approval", icon: <FaUserAltSlash />, label: "Leave" }
      );
    }
    if (permissions.includes("manage_task")) {
      links.push(
        { path: "/staff/tasks/list", icon: <FaTasks />, label: "Tasks" },
        { path: "/staff/tasks/update", icon: <FaSync />, label: "Updates" },
        {
          path: "/staff/tasks/review",
          icon: <FaFileSignature />,
          label: `Review${reviewCount ? ` (${reviewCount})` : ""}`,
        }
      );
    }
    links.push({
      path: permissions.includes("manage_task") ? "/staff/chat" : "/staff/chat/staff",
      icon: <FaComments />,
      label: "Chat",
    });
    return links;
  }, [permissions, reviewCount]);

  // Updated Logout: call backend to clear refresh token cookie, then clear localStorage and navigate
  const handleLogout = async () => {
    try {
      await axiosInstance.post("/auth/logout", null);
    } catch (err) {
      console.error("Logout API failed:", err);
    } finally {
      localStorage.clear();
      navigate("/staff/login");
    }
  };

  // Safe timer formatter
  const formatTime = (sec) => {
    const total = typeof sec === "number" ? sec : 0;
    const h = Math.floor(total / 3600).toString().padStart(2, "0");
    const m = Math.floor((total % 3600) / 60).toString().padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // Safe office hours display
  const officeHoursDisplay = useMemo(() => {
    const { startTime, endTime } = officeTiming;
    if (!startTime || !endTime) return "Office: –";
    return `Office: ${startTime} – ${endTime}`;
  }, [officeTiming]);

  // Date/day header
  const { formattedDate, currentDay } = useMemo(() => {
    const now = new Date();
    return {
      formattedDate: now.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      currentDay: now.toLocaleDateString(undefined, { weekday: "long" }),
    };
  }, []);

  return (
    <nav className="bg-white text-black w-16 md:w-64 h-screen fixed top-0 left-0 p-4 flex flex-col shadow-xl z-30">
      <style>{`
        .scrollbar-style::-webkit-scrollbar { width: 2px; }
        .scrollbar-style::-webkit-scrollbar-thumb { background-color: rgba(100,116,139,0.3); border-radius:2px;}
        .scrollbar-style { scrollbar-width: thin; scrollbar-color: rgba(100,116,139,0.3) transparent;}
      `}</style>

      {/* Logo */}
      <div className="flex items-center mb-4 space-x-2">
        <img src={logo} alt="Kadagam Ventures" className="w-10 h-10 md:w-12 md:h-12" />
        <h3 className="hidden md:block font-extrabold">
          <span className="text-red-600">Kadagam</span>{" "}
          <span className="text-blue-600">Ventures</span>
        </h3>
      </div>

      {/* Navigation Links */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pr-2 mb-4 scrollbar-style"
      >
        <ul className="space-y-3">
          <li>
            <Link
              to="/staff/dashboard"
              className={`flex items-center px-3 py-2 rounded-lg transition ${
                location.pathname === "/staff/dashboard"
                  ? "bg-blue-600 text-white"
                  : "hover:text-blue-600"
              }`}
              style={{ fontFamily: "Poppins !important", fontWeight: 500, fontSize: 18 }}
            >
              <FaChartPie className="mr-3" />
              <span className="hidden md:inline">Dashboard</span>
            </Link>
          </li>
          <li>
            <Link
              to="/staff/reports"
              className={`flex items-center px-3 py-2 rounded-lg transition ${
                location.pathname === "/staff/reports"
                  ? "bg-blue-600 text-white"
                  : "hover:text-blue-600"
              }`}
              style={{ fontFamily: "Poppins !important", fontWeight: 500, fontSize: 18 }}
            >
              <FaRegFolderOpen className="mr-3" />
              <span className="hidden md:inline">Reports</span>
            </Link>
          </li>
          {mainLinks.map((link) => (
            <li key={link.path}>
              <Link
                to={link.path}
                className={`flex items-center px-3 py-2 rounded-lg transition ${
                  location.pathname.startsWith(link.path)
                    ? "bg-blue-600 text-white"
                    : "hover:text-blue-600"
                }`}
                style={{ fontFamily: "Poppins !important", fontWeight: 500, fontSize: 18 }}
              >
                {link.icon}
                <span className="hidden md:inline ml-3">{link.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer: date, timer, attendance toggle, logout */}
      <div className="flex-shrink-0">
        <div className="bg-white rounded-lg shadow p-3 text-center mb-3">
          <div className="flex items-center justify-center mb-1">
            <FaCalendarAlt className="text-blue-500 mr-2" />
            <span className="text-lg font-bold">{formattedDate}</span>
          </div>
          <div className="text-sm text-gray-600 mb-2">{currentDay}</div>
          <div className="flex items-center justify-center mb-2 text-sm text-gray-700">
            <FaClock className="mr-1" />
            <span>{officeHoursDisplay}</span>
          </div>
          <div className="text-lg font-bold mb-2">{formatTime(timer)}</div>
          <button
            onClick={handleAttendanceToggle}
            disabled={loading || !sessionLoaded}
            className={`w-full py-2 rounded-lg font-bold transition ${
              !sessionLoaded
                ? "bg-gray-400 cursor-not-allowed"
                : isWorking
                ? "bg-red-500 hover:bg-red-600"
                : "bg-green-500 hover:bg-green-600"
            } text-white disabled:opacity-50`}
          >
            {!sessionLoaded
              ? "Loading..."
              : loading
              ? "Please wait..."
              : isWorking
              ? "Stop Work"
              : "Start Work"}
          </button>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center w-full py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all"
        >
          <FaSignOutAlt className="mr-2" />
          <span className="hidden md:inline">Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default StaffSidebar;
