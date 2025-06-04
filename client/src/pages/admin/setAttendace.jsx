// src/pages/admin/Attendance.jsx
import { useState, useEffect } from "react";
import AdminSidebar from "../../components/sidebar";
import { tokenRefreshInterceptor as axios } from "../../utils/axiosInstance";

const formatTimeInput = (value) => {
  const digitsOnly = value.replace(/\D/g, "").slice(0, 4);
  if (digitsOnly.length === 0) return "";
  const hour = parseInt(digitsOnly.slice(0, 2), 10);
  if (digitsOnly.length >= 2 && (hour < 1 || hour > 12)) return "";
  if (digitsOnly.length <= 2) return digitsOnly;
  const minute = parseInt(digitsOnly.slice(2), 10);
  if (minute > 59) return `${digitsOnly.slice(0, 2)}:`;
  return `${digitsOnly.slice(0, 2)}:${digitsOnly.slice(2)}`;
};

const isValid12HourTime = (time) =>
  /^([0]?[1-9]|1[0-2]):[0-5][0-9]$/.test(time);

const Attendance = () => {
  const [startTime, setStartTime] = useState("");
  const [startPeriod, setStartPeriod] = useState("AM");
  const [endTime, setEndTime] = useState("");
  const [endPeriod, setEndPeriod] = useState("PM");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch existing office timing on mount
  useEffect(() => {
    axios
      .get("/api/office-timing")
      .then(({ data }) => {
        const { startTime: s, endTime: e } = data.data || data;
        if (s) {
          const [st, sp] = s.split(" ");
          setStartTime(st);
          setStartPeriod(sp);
        }
        if (e) {
          const [et, ep] = e.split(" ");
          setEndTime(et);
          setEndPeriod(ep);
        }
      })
      .catch(() => {
        // ignore if not configured yet
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid12HourTime(startTime)) {
      setError("Invalid Start Time. Use format hh:mm (01-12).");
      return;
    }
    if (!isValid12HourTime(endTime)) {
      setError("Invalid End Time. Use format hh:mm (01-12).");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const payload = {
        startTime: `${startTime} ${startPeriod}`,
        endTime: `${endTime} ${endPeriod}`,
        graceMinutes: 15,
        fullDayHours: 8,
      };
      await axios.post("/office-timing/admin", payload);
      alert("Office timing updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Update failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      <div className="flex-grow pl-64 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-xl">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Set Office Time
          </h2>
          {error && (
            <div className="mb-4 text-sm text-red-600 text-center font-medium">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <div className="flex space-x-3">
                <input
                  type="text"
                  placeholder="hh:mm"
                  value={startTime}
                  onChange={(e) => setStartTime(formatTimeInput(e.target.value))}
                  className="w-2/3 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <select
                  value={startPeriod}
                  onChange={(e) => setStartPeriod(e.target.value)}
                  className="w-1/3 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
            {/* End Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <div className="flex space-x-3">
                <input
                  type="text"
                  placeholder="hh:mm"
                  value={endTime}
                  onChange={(e) => setEndTime(formatTimeInput(e.target.value))}
                  className="w-2/3 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <select
                  value={endPeriod}
                  onChange={(e) => setEndPeriod(e.target.value)}
                  className="w-1/3 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
            {/* Submit Button */}
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={loading}
                className="bg-purple-600 text-white px-6 py-2 rounded-full hover:bg-purple-700 transition disabled:opacity-50"
              >
                {loading ? "Saving…" : "Submit"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
