import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaChartPie,
  FaTasks,
  
  FaSignOutAlt,
  FaComments,
  FaMoneyCheck,
  FaCalendarCheck,
  FaUserTag,
  FaUserAltSlash,
  FaRegFolderOpen,
  FaClipboardList,
} from "react-icons/fa";
import kadagamLogo from "../assets/kadagamlogo.png";

const AdminSidebar = () => {
  const location = useLocation();
  const scrollRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/admin/login";
  };

  const menuItems = [
    { path: "/admin/dashboard", label: "Dashboard", icon: FaChartPie },
    { path: "/admin/projects/list", label: "Projects", icon: FaClipboardList },
    { path: "/admin/staffs/list", label: "Staff", icon: FaUserTag },
    { path: "/admin/tasks/list", label: "Tasks", icon: FaTasks },
    { path: "/admin/set-attendnce", label: "Set Attendence", icon: FaCalendarCheck },
    // { path: "/admin/tasks/review", label: "Review Tasks", icon: FaFileAlt },
    { path: "/admin/chat", label: "Chat", icon: FaComments },
    { path: "/admin/reports", label: "Reports", icon: FaRegFolderOpen },
    { path: "/admin/leave", label: "Leave", icon: FaUserAltSlash }, // This is the base path for Leave
    { path: "/admin/paymentstatus", label: "PaymentStatus", icon: FaMoneyCheck },
    // { path: "/admin/daily-status", label: "Task Updates", icon: FaSyncAlt },
  ];

  // Scroll persistence and smooth scroll styling
  useEffect(() => {
    const container = scrollRef.current;
    const saved = sessionStorage.getItem("admin-sidebar-scroll");
    if (container && saved) {
      container.scrollTo({ top: parseInt(saved, 10), behavior: "auto" });
    }

    const saveScroll = () => {
      sessionStorage.setItem("admin-sidebar-scroll", container.scrollTop.toString());
    };

    container?.addEventListener("scroll", saveScroll);
    return () => container?.removeEventListener("scroll", saveScroll);
  }, [location.pathname]);

  return (
    <nav className="bg-white text-gray-500 w-16 md:w-64 h-screen fixed top-0 left-0 p-4 md:p-6 flex flex-col shadow-lg">
      <style>
        {`
          .scrollbar-style::-webkit-scrollbar {
            width: 2px;
          }
          .scrollbar-style::-webkit-scrollbar-track {
            background: transparent;
          }
          .scrollbar-style::-webkit-scrollbar-thumb {
            background-color: rgba(100, 116, 139, 0.3);
            border-radius: 2px;
            transition: background-color 0.2s ease;
          }
          .scrollbar-style::-webkit-scrollbar-thumb:hover {
            background-color: rgba(30, 64, 175, 0.5);
          }
          .scrollbar-style {
            scrollbar-width: thin;
            scrollbar-color: rgba(100,116,139,0.3) transparent;
            scroll-behavior: smooth;
          }
        `}
      </style>

      {/* Header */}
      <div className="p-1 md:p-1 mb-5">
        <div className="flex items-center mb-3 whitespace-nowrap">
          <img
            src={kadagamLogo}
            alt="Logo"
            className="w-10 h-10 md:w-12 md:h-12 mr-7 md:mr-0"
          />
          <h3 className="hidden md:block font-extrabold text-red-600">
            Kadagam <span className="text-blue-600">Ventures</span>
          </h3>
        </div>
      </div>

      {/* Scrollable Menu */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto mb-4 pr-1 scrollbar-style"
      >
        <ul className="space-y-4">
          {menuItems.map(({ path, label, icon: Icon }) => {
            // Check if the current location path starts with the menu item's path
            // This handles nested routes like /admin/leave/apply, /admin/leave/history
            const isActive = location.pathname.startsWith(path);

            return (
              <li key={path}>
                <Link
                  to={path}
                  className={`flex items-center px-3 py-3 rounded-lg transition-all duration-500 ${isActive
                      ? "bg-blue-800 text-white shadow-md"
                      : "hover:text-blue-800"
                    }`}
                >
                  <Icon className="text-lg transition-transform duration-300" />
                  <span className="hidden md:inline ml-3 font-medium">
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Bottom Logout */}
      <div className="p-4 md:p-6">
        <button
          onClick={handleLogout}
          className="flex items-center px-3 py-3 w-full rounded-lg transition-all duration-500 bg-red-500 hover:bg-gradient-to-r hover:from-red-500 hover:to-blue-500 text-white shadow-md hover:shadow-lg"
        >
          <FaSignOutAlt className="text-lg transition-transform duration-300 hover:rotate-[-10deg]" />
          <span className="hidden md:inline ml-3 font-medium">Logout</span>
        </button>
      </div>
    </nav>
  );
};
export default AdminSidebar;