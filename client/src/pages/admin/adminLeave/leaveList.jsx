import { useEffect, useState } from "react";
import { tokenRefreshInterceptor as axiosInstance } from "../../../utils/axiosInstance";
import "react-datepicker/dist/react-datepicker.css";

const LeaveList = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth() + 1;

  useEffect(() => {
    const fetchLeaveReports = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axiosInstance.get(
          `/reports/leave/reports/monthly/${selectedYear}/${selectedMonth}`
        );
        setLeaveRequests(response.data.report || []);
      } catch (err) {
        console.error("Error fetching leave reports:", err);
        setError("Failed to load leave reports.");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaveReports();
  }, [selectedYear, selectedMonth]);

  const formatDateString = (dateString) => {
    if (dateString) {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    }
    return "N/A";
  };

  const handleMonthChange = (event) => {
    const month = parseInt(event.target.value, 10);
    const newDate = new Date(selectedDate);
    newDate.setMonth(month - 1);
    setSelectedDate(newDate);
  };

  return (
    <div className="min-h-screen bg-white pl-64 p-6">
      <h1 className="text-2xl font-semibold text-center text-gray-800 mb-6">
        Monthly Leave Reports
      </h1>

      <div className="flex justify-end items-center mb-6">
        <div className="relative">
          <select
            className="appearance-none bg-white border border-gray-300 rounded-full py-2 pl-3 pr-10 text-sm leading-5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            value={selectedMonth}
            onChange={handleMonthChange}
          >
            <option value="">Select Month ▾</option>
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString("default", { month: "long" })}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg className="fill-current h-4 w-4" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path
                fillRule="evenodd"
                d="M3.293 9.707a1 1 0 011.414 0L10 14.586l5.293-4.879a1 1 0 111.414 1.414l-6 5.586a2 2 0 01-2.828 0l-6-5.586a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>

      {loading && <p className="text-center text-gray-500">Loading leave reports...</p>}
      {error && <p className="text-center text-red-500">{error}</p>}

      <div className="w-full overflow-auto bg-white rounded-lg shadow-sm">
        <table className="w-full border-collapse max-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Staff</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Email</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Start Date</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">End Date</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Reason</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leaveRequests.length > 0 ? (
              leaveRequests.map((request) => (
                <tr key={request._id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs text-gray-600">{request.staffName}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{request.email}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{formatDateString(request.startDate)}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">{formatDateString(request.endDate)}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 break-words">{request.reason}</td>
                  <td className="px-3 py-2 text-xs">
                    <span
                      className={`px-2 py-0.5 inline-flex text-xs leading-5 rounded-full ${request.status.toLowerCase() === "approved"
                          ? "text-green-500 bg-green-100"
                          : "text-red-500 bg-red-100"
                        }`}
                    >
                      {request.status === "approved" ? "Approved" : "Rejected"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                  No leave requests found for the selected period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeaveList;
