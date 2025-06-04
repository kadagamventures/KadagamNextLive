import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";

const TaskTabs = () => {
    const tabs = useMemo(() => [
        { name: "Tasks", path: "/admin/tasks/list" },
        { name: "Task Updates", path: "/admin/tasks/daily-status" },
        { name: "Task Review", path: "/admin/tasks/review" },
    ], []);

    const [hoveredTabIndex, setHoveredTabIndex] = useState(null);
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const activePath = location.pathname;
        const index = tabs.findIndex(tab => activePath.startsWith(tab.path.split("/:")[0]));
        if (index !== -1) {
            setActiveTabIndex(index);
        }
    }, [location.pathname, tabs]);

    const handleTabClick = (path, index) => {
        navigate(path);
        setHoveredTabIndex(null);
        setActiveTabIndex(index);
    };

    return (
        <div className="pl-5  min-h-screen ">
            <div className="fixed top-0 w-277.5 right-0 bg-white z-50 pt-6 pb-10">
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

            <div className="mt-20 bg-white ">
                <Outlet key={location.pathname} />
            </div>
        </div>
    );
};

export default TaskTabs;
