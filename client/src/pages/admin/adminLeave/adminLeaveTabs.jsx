import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";

const LeaveTabs = () => {
    const tabs = useMemo(() => [
        { name: "Leave Approval", path: "approval" },
        { name: "Leave List", path: "list" },

    ], []);

    const [hoveredTabIndex, setHoveredTabIndex] = useState(null);
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const activePath = location.pathname;
        const index = tabs.findIndex(tab =>
            activePath.endsWith(tab.path)
        );
        if (index !== -1) {
            setActiveTabIndex(index);
        }
    }, [location.pathname, tabs]);

    const handleTabClick = (path, index) => {
        navigate(path); // relative navigate
        setHoveredTabIndex(null);
        setActiveTabIndex(index);
    };

    return (
        <div className="min-h-screen">
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

            <div className="mt-20 bg-white">
                <Outlet key={location.pathname} />
            </div>
        </div>
    );
};

export default LeaveTabs;
