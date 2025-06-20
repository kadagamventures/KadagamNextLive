import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";

const ReportTabs = () => {
  const tabs = useMemo(() => [
    { name: "Overview", path: "/admin/reports" },
    { name: "Attendance", path: "attendance" },
    { name: "Task", path: "tasks" },
    { name: "Project", path: "Projects" },
    { name: "Staff", path: "staffs" },
    { name: "Staffs Info", path: "staffinfo" },
  ], []);

  const [hoveredTabIndex, setHoveredTabIndex] = useState(null);
  const [activeTabIndex, setActiveTabIndex] = useState(0); 
  const navigate = useNavigate();
  const location = useLocation();

  // Update activeTabIndex based on the route
  useEffect(() => {
    const activePath = location.pathname;
    const index = tabs.findIndex(tab => tab.path === activePath);
    if (index !== -1) {
      setActiveTabIndex(index);
    }
  }, [location.pathname, tabs]);

  const handleTabClick = (path, index) => {
    navigate(path);
    setHoveredTabIndex(null);
    setActiveTabIndex(index); // Update active tab index on click
  };

  return (
    <div className="pl-64 pr-8 min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Fixed Report Tabs */}
      <div className="fixed top-0 left-64 right-8 bg-white  z-50 p-5">
        <nav className="flex justify-center space-x-6">
          {tabs.map((tab, index) => (
            <NavLink
              key={index}
              to={tab.path}
              className={() => {
                let classes =
                  "px-4 py-2 text-sm font-medium border-b-2 transition-all duration-300 cursor-pointer";

                if (activeTabIndex === index) {
                  classes += " border-violet-600 text-violet-600";
                } else if (hoveredTabIndex === index) {
                  classes += " border-violet-300 text-gray-700";
                } else {
                  classes += " border-transparent text-gray-600";
                }

                return classes;
              }}
              onMouseEnter={() => setHoveredTabIndex(index)}
              onMouseLeave={() => setHoveredTabIndex(null)}
              onClick={() => handleTabClick(tab.path, index)}
            >
              {tab.name}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Content Section with Offset for Fixed Tabs */}
      <div className="mt-20  p-8 rounded-2xl ">
        <Outlet key={location.pathname} />
      </div>
    </div>
  );
};

export default ReportTabs;