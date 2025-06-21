import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaSearch, FaTrash, FaPencilAlt } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { fetchStaffs, deleteStaff } from "../../../redux/slices/staffSlice";

const StaffList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { items: staff, status, error } = useSelector((state) => state.staff);
  const { role } = useSelector((state) => state.auth.user) || {};
  const canDeleteStaff = role === "admin";

  const [searchQuery, setSearchQuery] = useState("");
  const [filteredStaff, setFilteredStaff] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    dispatch(fetchStaffs());
  }, [dispatch]);

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

  const confirmDelete = async () => {
    if (!canDeleteStaff || !deleteId) return;
    try {
      const result = await dispatch(deleteStaff(deleteId));
      if (result.meta.requestStatus === "fulfilled") {
        alert("Staff member deleted successfully.");
        dispatch(fetchStaffs());
      } else {
        alert(result.payload?.message || "Failed to delete staff.");
      }
    } catch {
      alert("Failed to delete staff. Please try again.");
    }
    setShowModal(false);
    setDeleteId(null);
  };

  return (
    <div className="ml-0 md:ml-64 min-h-screen p-6 md:p-8 relative">
      {/* Delete Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 w-[90%] max-w-md shadow-xl text-center">
            <h2 className="text-lg font-semibold mb-4">Confirm Delete</h2>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this staff member?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          Staff Members
        </h1>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          {role === "admin" && (
            <Link
              to="/admin/staffs/add"
              className="px-4 py-2 hover:text-black text-gray-600 bg-white font-semibold rounded-full shadow transition-all"
            >
              <span className="text-violet-600 text-2xl">+</span> Add New Staff
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

      {/* Staff Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {status === "loading" ? (
          <div className="p-8 text-center text-gray-500 animate-pulse">
            Loading staff members...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  {["Staff ID", "Name", "Role", "Email", "Action"].map((col) => (
                    <th
                      key={col}
                      className="w-1/5 px-6 py-4 text-sm font-semibold text-gray-700 text-center"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStaff.length > 0 ? (
                  filteredStaff.map((member, idx) => (
                    <tr
                      key={member._id || idx}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-800 text-center">
                        {member.staffId || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 text-center">
                        {member.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 text-center">
                        {member.role}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 text-center">
                        {member.email}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          {role === "admin" && (
                            <button
                              onClick={() =>
                                navigate(`/admin/staffs/edit/${member._id}`)
                              }
                              className="px-3 py-2 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md text-xs font-medium flex items-center gap-1 transition-all hover:bg-green-50"
                            >
                              <FaPencilAlt className="w-6 h-5 text-green-500" />
                              Edit
                            </button>
                          )}
                          {canDeleteStaff && (
                            <button
                              onClick={() => {
                                setDeleteId(member._id);
                                setShowModal(true);
                              }}
                              className="px-3 py-2 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md text-xs font-medium flex items-center gap-1 transition-all hover:bg-red-50"
                            >
                              <FaTrash className="w-6 h-5 text-red-500" />
                              Delete
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
