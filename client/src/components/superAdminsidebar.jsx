import { useLocation, Link } from "react-router-dom";
import {
  CurrencyDollarIcon,
  CurrencyRupeeIcon,
  DocumentIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import kadagamLogo from "../assets/kadagamlogo.png";

const SuperAdminSidebar = () => {
  const location = useLocation();

  const menuItems = [
    { path: "/superadmin/dashboard", label: "Company", icon: DocumentIcon },
    { path: "/superadmin/revenue", label: "Revenue", icon: CurrencyDollarIcon },
    { path: "/superadmin/setprice", label: "Set Pricing", icon: CurrencyRupeeIcon },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/superadmin/login"; // Enable redirection after logout
  };

  return (
    <nav className="bg-white text-gray-500 w-16 md:w-64 h-screen fixed top-0 left-0 p-4 md:p-6 flex flex-col shadow-lg z-50">
      {/* Logo Section */}
      <div className="mb-6">
        <div className="flex items-center">
          <img
            src={kadagamLogo}
            alt="Kadagam Logo"
            className="w-10 h-10 md:w-12 md:h-12 mr-0 md:mr-2"
          />
          <h3 className="hidden md:block font-extrabold text-red-600 text-lg">
            Kadagam <span className="text-blue-600">Ventures</span>
          </h3>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto scrollbar-style">
        <ul className="space-y-4">
          {menuItems.map(({ path, label, icon: Icon }) => (
            <li key={path}>
              <Link
                to={path}
                className={`flex items-center px-3 py-3 rounded-lg transition-all duration-300 ${
                  location.pathname.startsWith(path)
                    ? "bg-blue-800 text-white shadow"
                    : "hover:text-blue-800"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="hidden md:inline ml-3 font-medium">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Logout Button */}
      <div className="mt-6">
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-3 py-3 rounded-lg bg-red-500 hover:bg-gradient-to-r hover:from-red-500 hover:to-blue-500 text-white shadow-md transition-all"
        >
          <ArrowRightIcon className="h-5 w-5" />
          <span className="hidden md:inline ml-3 font-medium">Logout</span>
        </button>
      </div>

      {/* Scrollbar Styling */}
      <style>{`
        .scrollbar-style::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-style::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-style::-webkit-scrollbar-thumb {
          background-color: rgba(100, 116, 139, 0.3);
          border-radius: 4px;
        }
        .scrollbar-style:hover::-webkit-scrollbar-thumb {
          background-color: rgba(30, 64, 175, 0.5);
        }
        .scrollbar-style {
          scrollbar-width: thin;
          scrollbar-color: rgba(100,116,139,0.3) transparent;
        }
      `}</style>
    </nav>
  );
};

export default SuperAdminSidebar;
