import { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import { tokenRefreshInterceptor as axiosInstance } from "../../../utils/axiosInstance";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import {
  Chart as ChartJS,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";

import {
  FaUsers,
  FaCalendarAlt,
  FaClipboardCheck,
  FaClock,
  FaCheckCircle,
  FaStar,
  FaDownload
} from "react-icons/fa";

ChartJS.register(
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

import PropTypes from "prop-types";
// --- CustomDoughnutChart Component ---
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

    if (ang > 0 && total > 0) {
      ang = Math.max(0, ang - gapDegrees);
    }

    const path = describeArc(cx, cy, radius, angleAcc + gapDegrees / 2, angleAcc + ang + gapDegrees / 2);

    angleAcc += (total ? (val / total) * 360 : 0);
    return { path, color: colors[i % colors.length], label: val, name: d.name };
  });
  return (
    // Make SVG responsive by setting width/height to 100% and using viewBox + preserveAspectRatio
    <div className="flex-1 flex items-center justify-center">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${chartSize} ${chartSize}`}
        preserveAspectRatio="xMidYMid meet"
        style={{maxWidth: `${chartSize}px`, maxHeight: `${chartSize}px`}} // Prevent it from getting too large
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
      name: PropTypes.string,
      value: PropTypes.number,
    })
  ).isRequired,
  colors: PropTypes.arrayOf(PropTypes.string).isRequired,
  chartSize: PropTypes.number,
  strokeThickness: PropTypes.number,
  gapDegrees: PropTypes.number,
};
// --- END CustomDoughnutChart Component ---


const StaffReports = () => {
  const [overallData, setOverallData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("");

  useEffect(() => {
    const fetchStaffOverview = async () => {
      try {
        const response = await axiosInstance.get("/reports/staff/admin/performance-overview");
        setOverallData(response.data.data);
      } catch (err) {
        console.error("Error fetching staff performance overview:", err);
        setError("Failed to load staff report data. Please check your permissions.");
      } finally {
        setLoading(false);
      }
    };
    fetchStaffOverview();
  }, []);

  if (loading) return <p className="text-center text-indigo-600">Loading staff performance data...</p>;
  if (error) return <p className="text-center text-red-600">{error}</p>;

  const {
    totalStaff = 0,
    attendancePercentage = "0.00",
    taskCompletionRate = "0.00",
    onTimeCompletionRate = "0.00",
    successRate = "0.00",
    topPerformer = null,
  } = overallData || {};

  // NOTE: For the CustomDoughnutChart, it seems you want to display Total Staff, Task Completion, and Success Rate.
  // However, the current implementation of CustomDoughnutChart draws slices based on `value / total`.
  // If `totalStaff` is a count, and `taskCompletionRate`/`successRate` are percentages, directly adding them might not
  // represent a meaningful "distribution".
  // Assuming the intention is to visualize these three distinct metrics (perhaps as if they were parts of a whole 'staff performance score' or similar),
  // the current `customDoughnutData` might need reconsideration if the chart's visual interpretation is critical.
  // For now, I'll keep the structure as is to maintain the original intent, but be aware of this potential logical mismatch.
  const customDoughnutData = [
    { name: "Total Staff", value: totalStaff },
    { name: "Task Completion", value: parseFloat(taskCompletionRate) },
    { name: "Success Rate", value: parseFloat(successRate) },
  ];

  // These colors correspond to the order in customDoughnutData
  const customDoughnutColors = ["#752BdF", "#41B6FF", "#FF0200"]; // Purple for Total Staff, Blue for Task Completion, Red for Success Rate

  // The center percentage is currently set to taskCompletionRate, assuming that's the primary focus for the center.
  const centerPercentage = parseFloat(taskCompletionRate).toFixed(0) + "%";

  const attendanceData = {
    labels: ["Present", "Absent"],
    datasets: [
      {
        data: [
          parseFloat(attendancePercentage),
          100 - parseFloat(attendancePercentage) // Calculate absent percentage
        ],
        backgroundColor: ["#4CAF50", "#F44336"],
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false, // Important for charts to fill container height
    scales: {
      y: {
        beginAtZero: true,
        max: 100, // Assuming percentages, so max is 100
        ticks: { stepSize: 20, color: "#6B7280" }
      },
      x: {
        grid: { display: false },
        ticks: { color: "#6B7280" }
      }
    },
    plugins: { legend: { display: false } },
  };

  const stats = [
    {
      label: "Total Staff",
      value: totalStaff,
      iconBg: "bg-purple-100",
      icon: <FaUsers className="text-purple-500 w-6 h-6" />,
    },
    {
      label: "Attendance Avg (%)",
      value: parseFloat(attendancePercentage).toFixed(2),
      iconBg: "bg-yellow-100",
      icon: <FaCalendarAlt className="text-yellow-500 w-6 h-6" />,
      isPercentage: true,
    },
    {
      label: "Task Completion Rate",
      value: parseFloat(taskCompletionRate).toFixed(2),
      iconBg: "bg-green-100",
      icon: <FaClipboardCheck className="text-green-500 w-6 h-6" />,
      isPercentage: true,
    },
    {
      label: "On-Time Completion (%)",
      value: parseFloat(onTimeCompletionRate).toFixed(2),
      iconBg: "bg-red-100",
      icon: <FaClock className="text-red-500 w-6 h-6" />,
      isPercentage: true,
    },
    {
      label: "Success Rate (%)",
      value: parseFloat(successRate).toFixed(2),
      iconBg: "bg-blue-100",
      icon: <FaCheckCircle className="text-blue-500 w-6 h-6" />,
      isPercentage: true,
    },
    {
      label: "Top Performer",
      value: topPerformer ? topPerformer.name : "N/A",
      iconBg: "bg-cyan-100",
      icon: <FaStar className="text-cyan-500 w-6 h-6" />,
      isText: true,
    },
  ];

  const handleDownloadPDF = async () => {
    if (!selectedMonth) return alert("Please select a month.");

    try {
      const payload = {
        month: String(selectedMonth).padStart(2, "0"),
        year: new Date().getFullYear(),
      };

      const res = await axiosInstance.post("/reports/generate/staff", payload);

      const downloadUrl = res.data?.downloadUrl || res.data?.url;

      if (!res.data?.success || !downloadUrl) {
        alert(res.data?.message || "Failed to generate or fetch report.");
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
      console.error("❌ Staff report generation error:", err);
      alert("No staff report found for this month or year.");
    }
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Changed max-w-7xl to w-full for full width responsiveness */}
      <div className="mx-auto px-6 py-10 w-full">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 pb-6 font-poppins">
            Staff Reports
          </h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              className="bg-white rounded-2xl p-6 shadow-md flex flex-col items-center"
              whileHover={{ scale: 1.03 }}
            >
              <div className={`${stat.iconBg} p-3 rounded-full mb-3`}>
                {stat.icon}
              </div>
              <p className="text-gray-500 mb-2">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-800">
                {stat.isText ? (
                  stat.value
                ) : (
                  <CountUp
                    end={parseFloat(stat.value)}
                    duration={1.5}
                    decimals={stat.isPercentage ? 2 : 0}
                    suffix={stat.isPercentage ? "%" : ""}
                  />
                )}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Staff Report Chart (Custom Doughnut) */}
          <motion.div
            className="bg-white p-6 rounded-2xl shadow-lg flex flex-col justify-between"
            style={{ borderRadius: '16.46px' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex-1 flex flex-col items-center justify-center h-min-full"> {/* Applied h-min-full here */}
              <h2 className="text-lg font-medium text-gray-700 mb-4 text-center">
                Staff Performance Metrics
              </h2>
              <div className="relative flex items-center justify-center w-full aspect-square max-w-[240px]">
                <CustomDoughnutChart
                  data={customDoughnutData}
                  colors={customDoughnutColors}
                  chartSize={240}
                  strokeThickness={28}
                  gapDegrees={2}
                />
                <div
                  className="absolute flex flex-col items-center justify-center pointer-events-none"
                  style={{
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <span className="text-sm text-gray-500">Completion Rate</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {centerPercentage}
                  </span>
                </div>
              </div>
            </div>

            {/* Legend for CustomDoughnutChart - moved to bottom and made flex-wrap */}
            <div className="mt-6">
              <ul className="space-y-2 flex flex-wrap justify-center">
                {customDoughnutData.map((item, i) => (
                  <li key={item.name} className="flex items-center text-gray-600 px-2 py-1">
                    <span
                      className="w-4 h-4 rounded-sm mr-2"
                      style={{ backgroundColor: customDoughnutColors[i % customDoughnutColors.length] }}
                    ></span>
                    {item.name} - {item.value}{item.name !== "Total Staff" ? "%" : ""}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Bar Chart */}
          <motion.div
            className="bg-white rounded-2xl p-6 shadow-md flex flex-col"
            style={{ borderRadius: '14.3px' }}
            whileHover={{ scale: 1.02 }}
          >
            <h3 className="text-lg font-medium text-gray-700 mb-4">Attendance Overview</h3>
            <div className="relative flex-1 h-min-full w-full"> {/* Applied h-min-full here */}
              <Bar data={attendanceData} options={barOptions} />
            </div>
          </motion.div>
        </div>

        <div className="flex justify-end items-center space-x-4">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-300 rounded-full px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select Month</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString("default", { month: "long" })}
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

export default StaffReports;