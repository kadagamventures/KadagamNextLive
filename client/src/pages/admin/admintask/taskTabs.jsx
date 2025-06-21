import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";

const TaskTabs = () => {
  const tabs = useMemo(
    () => [
      { name: "Tasks", path: "/admin/tasks/list" },
      { name: "Task Updates", path: "/admin/tasks/daily-status" },
      { name: "Task Review", path: "/admin/tasks/review" },
    ],
    []
  );

  const [hovered, setHovered] = useState(null);
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const idx = tabs.findIndex((t) => pathname.startsWith(t.path));
    if (idx >= 0) setActive(idx);
  }, [pathname, tabs]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed top bar inside content area (offset on md+) */}
      <div
        className="
          fixed top-0 left-0 right-0
          md:left-64 md:right-0
          bg-white shadow-sm
          flex justify-center items-center
          px-6 py-4
          z-50
        "
      >
        <nav className="flex space-x-8">
          {tabs.map((tab, i) => {
            const base =
              "pb-2 border-b-2 transition-colors duration-200 cursor-pointer";
            const classes =
              active === i
                ? `${base} border-violet-600 text-violet-600`
                : hovered === i
                ? `${base} border-violet-300 text-gray-700`
                : `${base} border-transparent text-gray-600`;

            return (
              <span
                key={tab.path}
                className={classes}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => navigate(tab.path)}
              >
                {tab.name}
              </span>
            );
          })}
        </nav>
      </div>

      {/* Push routed content below the bar, and over by same sidebar offset */}
      <div className="pt-20 md:pl-64">
        <Outlet />
      </div>
    </div>
  );
};

export default TaskTabs;
