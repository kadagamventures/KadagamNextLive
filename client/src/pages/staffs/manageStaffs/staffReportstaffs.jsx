import { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2"; // Removed Doughnut import as we're using CustomDoughnutChart
import { tokenRefreshInterceptor as axiosInstance } from "../../../utils/axiosInstance"; // Secure API requests
import { motion } from "framer-motion";
import CountUp from "react-countup";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip, // Keep Tooltip and Legend for Bar chart if needed
  Legend,
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
import PropTypes from "prop-types"; // Import PropTypes for CustomDoughnutChart

// --- CustomDoughnutChart Component (Re-added here for completeness) ---
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
    <div className="flex-1 flex items-center justify-center">
      <svg width={chartSize} height={chartSize} viewBox={`0 0 ${chartSize} ${chartSize}`}>
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

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend // Keep Tooltip and Legend for Bar chart
);

const StaffReports = () => {
  const [overallData, setOverallData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("");

  // Fetch Staff Performance Data
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

  // Destructure overallData with defaults
  const {
    totalStaff = 0,
    attendancePercentage = "0.00",
    taskCompletionRate = "0.00",
    onTimeCompletionRate = "0.00",
    successRate = "0.00",
    topPerformer = null,
  } = overallData || {};

  // Staff report doughnut chart data for CustomDoughnutChart
  const customDoughnutData = [
    { name: "Task Completion", value: parseFloat(taskCompletionRate) },
    { name: "Success Rate", value: parseFloat(successRate) },
    // Removed "Total Staff" as it might not be a percentage for the custom chart
    // If you need total staff represented, consider if it should be a slice
    // or if the chart should only represent percentages.
  ];

  const customDoughnutColors = ["#41B6FF", "#FF0200"]; // Colors for Task Completion, Success Rate

  // Calculate center percentage for the doughnut chart (e.g., Task Completion)
  const centerPercentage = parseFloat(taskCompletionRate) ? `${parseFloat(taskCompletionRate).toFixed(0)}%` : "0%";

  // Attendance bar chart
  const attendanceData = {
    labels: ["Present", "Absent"],
    datasets: [
      {
        data: [
          parseFloat(attendancePercentage),
          100 - parseFloat(attendancePercentage)
        ],
        backgroundColor: ["#4CAF50", "#F44336"],
      },
    ],
  };

  const barOptions = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { stepSize: 20 }
      }
    },
    plugins: { legend: { display: false } },
    maintainAspectRatio: false, // Ensure this is false for fixed height
  };

  // Stats cards
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

  // Handle Report Download
  const handleDownloadPDF = async () => {
    if (!selectedMonth) return alert("Please select a month to download the report.");
    try {
      const res = await axiosInstance.get("/reports/staff/admin/attendance-monthly/download", {
        params: { month: selectedMonth, year: new Date().getFullYear() },
      });
      if (res.data.success) window.open(res.data.downloadUrl, "_blank");
      else alert("Error generating PDF.");
    } catch (err) {
      console.error("Download error:", err);
      alert("Failed to download report.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 pb-6 font-poppins">
            Staff Reports
          </h1>
          {/* Removed select and download button from here */}
        </div>

        {/* Stats Cards */}
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

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Staff Report Chart - CustomDoughnutChart */}
          <motion.div
            className="bg-white p-6 rounded-2xl shadow-lg flex flex-col items-center justify-center relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              width: '448px',
              height: '280px',
              borderRadius: '16.46px',
            }}
          >
            <h2 className="text-lg font-medium text-gray-700 mb-4">
              Staff Performance Overview
            </h2>
            <div className="flex w-full justify-center items-center h-full">
              <CustomDoughnutChart
                data={customDoughnutData}
                colors={customDoughnutColors}
                chartSize={180} // Adjusted size for better fit
                strokeThickness={28}
                gapDegrees={3}
              />
              <div
                className="absolute flex flex-col items-center justify-center pointer-events-none"
                style={{
                  top: "59%", // Adjusted top for vertical centering
                  left: "27%", // Adjusted left to compensate for legend
                  transform: "translate(-50%, -50%)",
                  width: "fit-content",
                }}
              >
                <span className="text-sm text-gray-500">Completion Rate</span>
                <span className="text-2xl font-bold text-gray-900">
                  {centerPercentage}
                </span>
              </div>
              {/* Manual Legend for CustomDoughnutChart */}
              <div className="flex-shrink-0 flex flex-col justify-center pl-4 pr-4">
                <ul className="space-y-2">
                  {customDoughnutData.map((item, i) => (
                    <li key={item.name} className="flex items-center text-gray-600 text-sm">
                      <span
                        className="w-4 h-4 rounded-sm mr-2"
                        style={{ backgroundColor: customDoughnutColors[i % customDoughnutColors.length] }}
                      ></span>
                      {item.name}: {item.value.toFixed(2)}%
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Attendance Chart */}
          <motion.div
            className="bg-white rounded-2xl p-6 pb-11 shadow-md"
            whileHover={{ scale: 1.02 }}
            style={{
              width: '445px',
              height: '280px',
              borderRadius: '14.3px',
            }}
          >
            <h3 className="text-lg font-medium text-gray-700 mb-4">Attendance Overview</h3>
            <div className="relative h-full">
              <Bar data={attendanceData} options={barOptions} />
            </div>
          </motion.div>
        </div>

        {/* Moved Month Selection and Download Button here */}
        <div className="flex justify-end items-center space-x-4 mt-8"> {/* Added mt-8 for spacing */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-300 rounded-full p-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full shadow"
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