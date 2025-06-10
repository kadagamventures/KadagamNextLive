import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaSearch, FaPencilAlt } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { fetchStaffs} from "../../../redux/slices/staffSlice";

const StaffList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { items: staff, status, error } = useSelector((state) => state.staff);
  const { role, permissions } = useSelector((state) => state.auth.user) || {};

  // Only admins can delete staff.
  const canDeleteStaff = role === "admin";

  const [searchQuery, setSearchQuery] = useState("");
  const [filteredStaff, setFilteredStaff] = useState([]);

  // Fetch staff data when component mounts
  useEffect(() => {
    dispatch(fetchStaffs());
  }, [dispatch]);

  // Handle search filtering
  useEffect(() => {
    setFilteredStaff(
      staff.filter((member) => {
        if (!member) return false;
        const memberName = (member.name || "").toLowerCase();
        const memberEmail = (member.email || "").toLowerCase();
        const memberRole = (member.role || "").toLowerCase();
        const memberId = member.staffId ? member.staffId.toString() : "";
        const query = searchQuery.toLowerCase();

        return (
          memberName.includes(query) ||
          memberEmail.includes(query) ||
          memberRole.includes(query) ||
          memberId.includes(query)
        );
      })
    );
  }, [searchQuery, staff]);

  

  return (
    <div className="pl-0 md:pl-64 min-h-screen p-6 md:p-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          Staff Members
        </h1>

        {/* Top Right Actions: Search + Add Staff */}
        <div className="flex items-center gap-3 mt-4 md:mt-0">

          {(role === "admin" || permissions?.includes("manage_staff")) && (
            <Link
              to="/staff/staffs/add"
              className="px-4 py-2 hover:text-black text-gray-600 bg-white font-semibold rounded-full shadow transition-all"
            >
              <span className="text-violet-600 text-2xl">+</span>  Add New Staff
            </Link>
          )}
          <div className="relative">
            <input
              type="text"
              placeholder="Search staffs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-3 pr-3 bg-white py-2 text-sm md:text-base border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <FaSearch className="absolute right-3 top-2.5 text-violet-600" />
          </div>

        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {status === "loading" ? (
          <div className="p-8 text-center text-gray-500 animate-pulse">
            Loading staff members...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-700">
                    Staff ID
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-700">
                    Name
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-700">
                    Role
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-700">
                    Email
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-700">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStaff.length > 0 ? (
                  filteredStaff.map((member, index) => (
                    <tr
                      key={member._id || index}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">
                        {member.staffId || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {member.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {member.role}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {member.email}
                      </td>
                      <td className="px-6 py-4 text-left">
                        <div className="flex justify-start gap-2">
                          {(role === "admin" ||
                            permissions?.includes("manage_staff")) && (
                              <button
                                onClick={() =>
                                  navigate(`/staff/staffs/edit/${member._id}`)
                                }
                                className="px-3 py-2 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md text-xs font-medium flex items-center gap-1 transition-all hover:bg-green-50"
                              >
                                <FaPencilAlt className="w-6 h-5 text-green-500" />
                                Edit
                              </button>
                            )}
                          
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="5"
                      className="p-8 text-center text-gray-500 text-sm"
                    >
                      No staff members found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffList;
