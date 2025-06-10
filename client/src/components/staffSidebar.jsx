import { useEffect, useMemo, useCallback, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaChartPie,
  FaTasks,
  FaProjectDiagram,
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
} from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchPermissions,
  fetchOfficeTiming,
  fetchActiveSession,
  startWorkSession,
  endWorkSession,
  setIsWorking,
  setTimer,
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

  const {
    permissions = [],
    isWorking = false,
    timer = 0,
    intervalId = null,
    scheduledEndTime = null,
    officeTiming = {},
  } = useSelector((state) => state.staffSidebar);

  const [loading, setLoading] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);
  const autoTimeoutRef = useRef(null);

  // --- Start: Reordered function definitions for 'handleAttendanceToggle' ---

  const handleAttendanceToggle = useCallback(async () => {
    setLoading(true);

    if (!isWorking) {
      dispatch(setIsWorking(true));
      dispatch(setTimer(0)); // Reset timer on check-in attempt

      try {
        await dispatch(startWorkSession()).unwrap();
        toast.success("Checked in successfully");
      } catch (err) {
        const msg = err || ""; // Ensure err is a string for message
        if (msg.includes("already checked in")) {
          toast.info("You’re already checked in today");
          // Re-fetch active session to sync UI state if already checked in
          dispatch(fetchActiveSession())
            .unwrap()
            .then((payload) => {
              if (payload.isWorking) {
                dispatch(setIsWorking(true));
                dispatch(setTimer(payload.timer));
              }
            })
            .catch(() => { /* handle error if session fetch fails */ });
        } else {
          dispatch(setIsWorking(false)); // Revert UI state if check-in fails
          dispatch(setTimer(0));
          toast.error("Check-in failed: " + msg);
        }
      }
    } else {
      // If currently working, attempt to end session
      dispatch(setIsWorking(false)); // Optimistic update
      dispatch(setTimer(0)); // Reset timer on checkout attempt

      try {
        await dispatch(endWorkSession()).unwrap();
        toast.success("Checked out successfully");
      } catch (err) {
        const msg = err || ""; // Ensure err is a string for message
        toast.error("Check-out failed: " + msg);
        dispatch(setIsWorking(true)); // Revert UI state if check-out fails
      }
    }
    setLoading(false);
  }, [isWorking, dispatch]); // Dependencies for useCallback

  // --- End: Reordered function definitions for 'handleAttendanceToggle' ---


  useEffect(() => {
    const container = scrollContainerRef.current;
    const saved = sessionStorage.getItem("sidebar-scroll");
    if (container && saved) {
      container.scrollTo({ top: +saved, behavior: "auto" });
    }
    const onScroll = () => {
      sessionStorage.setItem("sidebar-scroll", container.scrollTop.toString());
    };
    container?.addEventListener("scroll", onScroll);
    return () => container?.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    dispatch(fetchPermissions());
    dispatch(fetchOfficeTiming());

    dispatch(fetchActiveSession())
      .unwrap()
      .then((payload) => {
        if (payload.isWorking) {
          dispatch(setIsWorking(true));
          dispatch(setTimer(payload.timer));
          localStorage.setItem("isWorking", "true");
          localStorage.setItem("workTimer", payload.timer.toString());
        } else {
          dispatch(setIsWorking(false));
          dispatch(setTimer(0));
          localStorage.removeItem("isWorking");
          localStorage.removeItem("workTimer");
        }
      })
      .catch(() => {
        // Handle initial fetchActiveSession error, e.g., if no session exists
        // No need to set isWorking to false here as initial state is already false
      });

    if (permissions.includes("manage_task")) {
      (async () => {
        try {
          const { data } = await axiosInstance.get("/tasks");
          setReviewCount(data.filter((t) => t.status === "Review").length);
        } catch (error) {
          console.error("Failed to fetch review tasks:", error);
        }
      })();
    }

  }, [dispatch, permissions]); // Added permissions to dependency array for clarity

  useEffect(() => {
    const storedTimer = localStorage.getItem("workTimer");
    if (!isNaN(+storedTimer)) dispatch(setTimer(+storedTimer));
    if (localStorage.getItem("isWorking") === "true") {
      dispatch(setIsWorking(true));
    }
  }, [dispatch]);

  const startTimer = useCallback(() => {
    if (!intervalId) {
      const id = setInterval(() => {
        dispatch(incrementTimer());
      }, 1000);
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

  useEffect(() => {
    if (autoTimeoutRef.current) {
      clearTimeout(autoTimeoutRef.current);
      autoTimeoutRef.current = null;
    }
    if (isWorking && scheduledEndTime) {
      const msLeft = new Date(scheduledEndTime) - Date.now();
      if (msLeft > 0) {
        autoTimeoutRef.current = setTimeout(() => {
          handleAttendanceToggle();
        }, msLeft);
      }
    }
    return () => {
      if (autoTimeoutRef.current) clearTimeout(autoTimeoutRef.current);
    };
  }, [isWorking, scheduledEndTime, handleAttendanceToggle]); // handleAttendanceToggle is a dependency

  useEffect(() => {
    localStorage.setItem("workTimer", timer.toString());
  }, [timer]);


  // Reordered links as per your requirement
  const mainLinks = useMemo(() => {
    const links = [];

    // 1. Dashboard (Handled separately below as it's a fixed link)
    // 2. Reports (Handled separately below as it's a fixed link)

    // 3. Projects
    if (permissions.includes("manage_project")) {
      links.push({
        path: "/staff/projects/list",
        icon: <FaProjectDiagram />,
        label: "Projects",
      });
    }

    // 4. Staff
    if (permissions.includes("manage_staff")) {
      links.push({ path: "/staff/staffs/list", icon: <FaUserTag />, label: "Staffs" });
    }

    // 5. Management Staff
    if (permissions.includes("manage_staff")) {
      links.push({
        path: "/staff/manage/overview",
        icon: <FaAddressCard />,
        label: "Management Staff",
      });
    }

    // 6. Leave
    if (permissions.includes("manage_staff")) {
      links.push({ path: "/staff/leave/approval", icon: <FaUserAltSlash />, label: "Leave" });
    }

    // 7. Tasks
    if (permissions.includes("manage_task")) {
      links.push({ path: "/staff/tasks/list", icon: <FaTasks />, label: "Tasks" });
    }

    // 8. Task Updates
    if (permissions.includes("manage_task")) {
      links.push({ path: "/staff/tasks/update", icon: <FaSync />, label: "Task Updates" });
    }

    // 9. Review Tasks
    if (permissions.includes("manage_task")) {
      links.push({
        path: "/staff/tasks/review",
        icon: <FaFileSignature />,
        label: `Review Tasks${reviewCount > 0 ? ` (${reviewCount})` : ""}`,
      });
    }

    // 10. Chat
    links.push({
      path: permissions.includes("manage_task")
        ? "/staff/chat"
        : "/staff/chat/staff",
      icon: <FaComments />,
      label: "Chat",
    });

    return links;
  }, [permissions, reviewCount]);


  const handleLogout = () => {
    localStorage.clear();
    navigate("/staff/login");
  };

  const formatTime = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatOfficeHours = useCallback(() => {
    const { startHour, startMinute, endHour, endMinute } = officeTiming;
    if (
      startHour == null ||
      startMinute == null ||
      endHour == null ||
      endMinute == null
    ) {
      return "Office Hours: –";
    }
    const fmt = (h, m) => {
      const ampm = h >= 12 ? "PM" : "AM";
      const hh = ((h + 11) % 12) + 1; // Convert 24hr to 12hr (12 for 0 and 12)
      return `${hh.toString().padStart(2, "00")}:${m
        .toString()
        .padStart(2, "00")} ${ampm}`;
    };
    return `Office: ${fmt(startHour, startMinute)} – ${fmt(endHour, endMinute)}`;
  }, [officeTiming]);

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

      <div className="flex items-center mb-4 space-x-2">
        <img src={logo} alt="Logo" className="w-10 h-10 md:w-12 md:h-12" />
        <h3 className="hidden md:block font-extrabold">
          <span className="text-red-600">Kadagam</span>{" "}
          <span className="text-blue-600">Ventures</span>
        </h3>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pr-2 mb-4 scrollbar-style"
      >
        <ul className="space-y-3">
          {/* 1. Dashboard (Fixed Link) */}
          <li>
            <Link
              to="/staff/dashboard"
              className={`flex items-center px-3 py-2 rounded-lg transition-all ${location.pathname === "/staff/dashboard"
                ? "bg-blue-600 text-white"
                : "hover:text-blue-600"
                }`}
              style={{
                fontFamily: "Poppins !important", // Corrected 'font' to 'fontFamily'
                fontWeight: "500",
                fontSize: "18px"
              }}>
              <FaChartPie className="mr-3" />
              <span className="hidden md:inline">Dashboard</span>
            </Link>
          </li>
          {/* 2. Reports (Fixed Link) */}
          <li>
            <Link
              to="/staff/reports"
              className={`flex items-center px-3 py-2 rounded-lg transition-all ${location.pathname === "/staff/reports"
                ? "bg-blue-600 text-white"
                : "hover:text-blue-600"
                }`}
              style={{
                fontFamily: "Poppins !important", // Corrected 'font' to 'fontFamily'
                fontWeight: "500",
                fontSize: "18px"
              }}>
              <FaRegFolderOpen className="mr-3" />
              <span className="hidden md:inline">Reports</span>
            </Link>
          </li>
          {/* Dynamically generated links in the specified order (from mainLinks memo) */}
          {mainLinks.map((link) => (
            <li key={link.path}>
              <Link
                to={link.path}
                className={`flex items-center px-3 py-2 rounded-lg transition-all ${location.pathname.startsWith(link.path)
                  ? "bg-blue-600 text-white"
                  : "hover:text-blue-600"
                  }`}
                style={{
                  fontFamily: "Poppins !important", // Corrected 'font' to 'fontFamily'
                  fontWeight: "500",
                  fontSize: "18px"
                }}>
                {link.icon}
                <span className="hidden md:inline ml-3">{link.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-shrink-0">
        <div className="bg-white rounded-lg shadow p-3 text-center mb-3">
          <div className="flex items-center justify-center mb-1">
            <FaCalendarAlt className="text-blue-500 mr-2" />
            <span className="text-lg font-bold">{formattedDate}</span>
          </div>
          <div className="text-sm text-gray-600 mb-2">{currentDay}</div>
          <div className="flex items-center justify-center mb-2 text-sm text-gray-700">
            <FaClock className="mr-1" />
            <span>{formatOfficeHours()}</span>
          </div>
          <div className="text-lg font-bold mb-2">{formatTime(timer)}</div>
          <button
            onClick={handleAttendanceToggle}
            disabled={loading}
            className={`w-full py-2 rounded-lg font-bold transition ${isWorking
              ? "bg-red-500 hover:bg-red-600"
              : "bg-green-500 hover:bg-green-600"
              } text-white disabled:opacity-50`}
          >
            {loading ? "Please wait..." : isWorking ? "Stop Work" : "Start Work"}
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