import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { tokenRefreshInterceptor as axiosInstance } from "../../../utils/axiosInstance"; // Using axiosInstance directly
import CountUp from "react-countup";
import {
  FaCalendarAlt,
  FaDownload,
  FaUsers,
  FaUserCheck,
  FaUserTimes,
  FaUserClock,
  FaSignOutAlt,
  FaUserSlash,
} from "react-icons/fa";

// Keep Bar chart specific imports as it's still Chart.js based
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register only what's needed for the Bar chart (removed ArcElement as Doughnut is custom)
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// --- CustomDoughnutChart Component (Copied from previous solution, apply for Attendance page) ---
import PropTypes from "prop-types";

const CustomDoughnutChart = ({ data, colors, chartSize = 240, strokeThickness = 28, gapDegrees = 2 }) => {
  const cx = chartSize / 2;
  const cy = chartSize / 2;
  const radius = (chartSize / 2) - (strokeThickness / 2);

  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);

  const toRad = (deg) => ((deg - 90) * Math.PI) / 180;
  const polarToCartesian = (cx, cy, r, deg) => ({
    x: cx + r * Math.cos(toRad(deg)),
    y: cy + r * Math.sin(toRad(deg)),
  });

  const describeArc = (cx, cy, r, start, end) => {
    const s = polarToCartesian(cx, cy, r, end);
    const e = polarToCartesian(cx, cy, r, start);
    const laf = end - start <= 180 ? "0" : "1";
    return `M${s.x.toFixed(3)} ${s.y.toFixed(3)} A${r.toFixed(3)} ${r.toFixed(3)} 0 ${laf} 0 ${e.x.toFixed(3)} ${e.y.toFixed(3)}`;
  };

  let angleAcc = 0;
  const slices = data.map((d, i) => {
    const val = d.value || 0;
    let ang = total ? (val / total) * 360 : 0;

    // Apply gap only if angle is greater than 0
    if (ang > 0 && total > 0) {
      ang = Math.max(0, ang - gapDegrees);
    }

    const path = describeArc(cx, cy, radius, angleAcc + gapDegrees / 2, angleAcc + ang + gapDegrees / 2);

    angleAcc += (total ? (val / total) * 360 : 0);
    return { path, color: colors[i % colors.length], label: val, name: d.name };
  });

  return (
    // This div will take up available space and center the SVG within it
    <div className="flex-1 flex items-center justify-center p-4"> {/* Added padding here for better spacing */}
      <svg
        width="100%" // Make SVG fill its parent's width
        height="100%" // Make SVG fill its parent's height
        viewBox={`0 0 ${chartSize} ${chartSize}`} // Keep original viewBox for internal scaling
        preserveAspectRatio="xMidYMid meet" // Important for scaling behavior
        style={{maxWidth: `${chartSize}px`, maxHeight: `${chartSize}px`}} // Limit max size based on original chartSize
      >
        {slices.map((s, i) => (
          <path
            key={i}
            d={s.path}
            fill="none"
            stroke={s.color}
            strokeWidth={strokeThickness}
            strokeLinecap="round"
          />
        ))}
      </svg>
    </div>
  );
};

CustomDoughnutChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      value: PropTypes.number,
    })
  ).isRequired,
  colors: PropTypes.arrayOf(PropTypes.string).isRequired,
  chartSize: PropTypes.number,
  strokeThickness: PropTypes.number,
  gapDegrees: PropTypes.number,
};
// --- END CustomDoughnutChart Component ---


const Attendance = () => {
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [attendanceData, setAttendanceData] = useState(null);
  const [month, setMonth] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAttendanceData(selectedDate);
  }, [selectedDate]);

  const fetchAttendanceData = async (date) => {
    setLoading(true);
    setError("");
    try {
      const res = await axiosInstance.get(`/reports/attendance/daily`, {
        params: { date },
      });
      if (res.data.success) {
        setAttendanceData(res.data.data);
      } else {
        setError("Failed to fetch attendance data.");
      }
    } catch (err) {
      console.error("Error fetching attendance data:", err);
      setError("Error fetching attendance data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!month) return alert("Please select a month.");

    try {
      const payload = {
        month: String(month).padStart(2, "0"),
        year: new Date().getFullYear(),
      };

      const res = await axiosInstance.post("/reports/generate/attendance", payload);

      const downloadUrl = res.data?.downloadUrl || res.data?.url;

      if (!downloadUrl || typeof downloadUrl !== "string" || !downloadUrl.startsWith("http")) {
        alert("Download link not available.");
        return;
      }

      if (res.data.fallback) {
        alert("Monthly report not found. Showing yearly summary instead.");
      }

      const opened = window.open(downloadUrl, "_blank");
      if (!opened) {
        alert("Popup blocked! Please allow popups for this site.");
      }

    } catch (err) {
      console.error("❌ Report generation error:", err);
      alert("Failed to generate or fetch the attendance report.");
    }
  };

  // Prepare data for CustomDoughnutChart
  const customDoughnutChartData = attendanceData
    ? [
      { name: "Total Staff", value: attendanceData.totalStaff },
      { name: "Present", value: attendanceData.presentStaff },
      { name: "Absent", value: attendanceData.absentStaff },
    ]
    : [
      { name: "Total Staff", value: 0 },
      { name: "Present", value: 0 },
      { name: "Absent", value: 0 },
    ];

  const customDoughnutColors = ["#752BdF", "#41B6FF", "#FF0200"];

  // Calculate center percentage
  const totalForPercentage = attendanceData
    ? attendanceData.totalStaff + attendanceData.presentStaff + attendanceData.absentStaff
    : 0;
  const higherRateValue = attendanceData ? attendanceData.presentStaff : 0;
  const centerPercentage = totalForPercentage
    ? Math.round((higherRateValue / totalForPercentage) * 100) + "%"
    : "0%";

  // Bar chart data and options
  const barData = {
    labels: ["Late Arrivals", "Early Departures"],
    datasets: [
      {
        data: attendanceData ? [attendanceData.lateArrivals, attendanceData.earlyDepartures] : [0, 0],
        backgroundColor: ["#FBBF24", "#34D399"],
        barThickness: 24,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#6B7280" }
      },
      y: {
        grid: { color: "#E5E7EB" },
        ticks: {
          color: "#6B7280",
          beginAtZero: true,
          stepSize: 1,
        },
        // Ensure max scales appropriately, using a reasonable default/minimum
        max: attendanceData ? Math.max(attendanceData.lateArrivals, attendanceData.earlyDepartures, 5) * 1.2 : 10,
      },
    },
    maintainAspectRatio: false, // Essential for Chart.js to fit container height
  };

  // Stats cards
  const stats = attendanceData
    ? [
      {
        label: "Total Staff",
        value: attendanceData.totalStaff,
        iconBg: "bg-purple-100",
        icon: <FaUsers className="text-purple-500 w-6 h-6" />,
      },
      {
        label: "Present",
        value: attendanceData.presentStaff,
        iconBg: "bg-sky-100",
        icon: <FaUserCheck className="text-sky-500 w-6 h-6" />,
      },
      {
        label: "Absent",
        value: attendanceData.absentStaff,
        iconBg: "bg-red-100",
        icon: <FaUserTimes className="text-red-500 w-6 h-6" />,
      },
      {
        label: "Late Arrivals",
        value: attendanceData.lateArrivals,
        iconBg: "bg-amber-100",
        icon: <FaUserClock className="text-amber-500 w-6 h-6" />,
      },
      {
        label: "Early Departures",
        value: attendanceData.earlyDepartures,
        iconBg: "bg-green-100",
        icon: <FaSignOutAlt className="text-green-500 w-6 h-6" />,
      },
      {
        label: "On Leave",
        value: attendanceData.onLeave,
        iconBg: "bg-emerald-100",
        icon: <FaUserSlash className="text-emerald-500 w-6 h-6" />,
      },
    ]
    : [];

  return (
    <div className="min-h-screen ">
      {/* Changed: Removed max-w-7xl to allow content to expand more horizontally */}
      <div className="mx-auto px-6 py-10 w-full"> {/* Added w-full for clarity, though it's often implied by flex/grid parents */}
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl items-center font-bold text-gray-900 mb-6 pb-6 font-poppins font-weight-500 size-32px">
            Attendance Dashboard
          </h1>
          <div className="flex items-center space-x-3">
            <FaCalendarAlt className="text-gray-500 text-xl" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-lg p-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>

        {/* Loading / Error */}
        {loading && <p className="text-indigo-600">Loading data...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {/* Stats Cards - These are already responsive due to grid and flex-col classes */}
        {attendanceData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                className="bg-white rounded-2xl p-6 shadow-md flex flex-col items-center"
                whileHover={{ scale: 1.03 }}
              >
                <div className={`${s.iconBg} p-3 rounded-full mb-3`}>
                  {s.icon}
                </div>
                <p className="text-gray-500 mb-2">{s.label}</p>
                <p className="text-3xl font-bold text-gray-800">
                  <CountUp end={s.value} duration={1.5} separator="," />
                </p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Charts - Made Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Doughnut Chart */}
          <motion.div
            className="bg-white p-6 shadow-lg flex flex-col justify-between"
            style={{ borderRadius: '16.46px' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex-1 flex flex-col items-center justify-center">
              <h2 className="text-lg font-medium text-gray-700 mb-4 text-center">
                Attendance Distribution
              </h2>
              {/* This container ensures the SVG scales proportionally within available space */}
              <div className="relative flex items-center justify-center w-full aspect-square max-w-[240px]"> {/* Added max-w for larger screens */}
                <CustomDoughnutChart
                  data={customDoughnutChartData}
                  colors={customDoughnutColors}
                  chartSize={200} // This is the SVG viewBox size, it will scale to its container
                strokeThickness={28}
                gapDegrees={2}
                />
                {/* Center text for percentage */}
                <div
                  className="absolute flex flex-col items-center justify-center pointer-events-none"
                  style={{
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <span className="text-sm text-gray-500">Higher Rate</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {centerPercentage}
                  </span>
                </div>
              </div>
            </div>

            {/* Legend at the bottom */}
            <div className="mt-6">
              <ul className="space-y-2 flex flex-wrap justify-center">
                {customDoughnutChartData.map((item, i) => (
                  <li key={item.name} className="flex items-center text-gray-600 px-2 py-1">
                    <span
                      className="w-4 h-4 rounded-sm mr-2"
                      style={{ backgroundColor: customDoughnutColors[i % customDoughnutColors.length] }}
                    ></span>
                    {item.name} - {item.value}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Bar Chart */}
          <motion.div
            className="bg-white p-6 shadow-lg flex flex-col" // Added flex-col for consistent vertical layout
            style={{ borderRadius: '14.3px' }}
            whileHover={{ scale: 1.02 }}
          >
            <h3 className="text-lg font-medium text-gray-700 mb-4">Late Arrivals And Early Departures</h3>
            {/* Chart.js container: h-full w-full ensures it fills the parent div */}
            <div className="relative flex-1 h-[250px] w-full"> {/* Set a base height for the chart */}
              <Bar data={barData} options={barOptions} />
            </div>
          </motion.div>
        </div>

        {/* Bottom Controls */}
        <div className="flex justify-end items-center space-x-4">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-gray-300 rounded-full px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select Month</option>
            {[...Array(12)].map((_, idx) => (
              <option key={idx} value={idx + 1}>
                {new Date(0, idx).toLocaleString("default", {
                  month: "long",
                })}
              </option>
            ))}
          </select>
          <motion.button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full shadow transition"
            whileHover={{ scale: 1.05 }}
          >
            <FaDownload />
            Download PDF
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default Attendance;