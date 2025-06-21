import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2"; // Keep Bar import
import { tokenRefreshInterceptor as axiosInstance } from "../../../utils/axiosInstance";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip, // Keep Tooltip for Bar chart
  Legend,  // Keep Legend for Bar chart
} from "chart.js";

import {
  FaListAlt,
  FaCheckCircle,
  FaSyncAlt,
  FaExclamationCircle,
  FaTimesCircle,
  FaClock,
  FaDownload,
} from "react-icons/fa";

// Register Chart.js components only for the Bar chart
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// --- CustomDoughnutChart Component (Copied for use in ProjectReports page) ---
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
            strokeLinecap="round" // This gives the rounded ends on both sides
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

const ProjectReports = () => {
  const [projectStats, setProjectStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("");

  useEffect(() => {
    const fetchProjectStats = async () => {
      try {
        const response = await axiosInstance.get("/reports/projects/live-overview");
        const data = response.data.data;
        setProjectStats(data);

        // Data for CustomDoughnutChart
        const customDoughnutData = [
          { name: "Ongoing", value: data.ongoingProjects },
          { name: "Pending", value: data.pendingProjects },
        ];
        // Ensure consistent colors, possibly define them outside if used across components
        const customDoughnutColors = ["#F59E0B", "#34D399"]; // Orange for Ongoing, Green for Pending

        // Data for Bar chart (remains as is)
        const barData = {
          labels: ["Total Projects", "Cancelled", "Completed"],
          datasets: [
            {
              label: "Projects Overview",
              data: [data.totalProjects, data.cancelledProjects, data.completedProjects],
              backgroundColor: ["#6366F1", "#8B5CF6", "#10B981"],
            },
          ],
        };

        setChartData({
          statusBreakdownCustom: customDoughnutData, // New property for custom chart
          customDoughnutColors: customDoughnutColors, // Colors for custom chart
          completionTrend: barData,
        });
      } catch (error) {
        console.error("Error fetching project statistics:", error);
      }
    };

    fetchProjectStats();
  }, []);

  const handleDownloadPDF = async () => {
    if (!selectedMonth) return alert("Please select a month.");

    try {
      const payload = {
        month: String(selectedMonth).padStart(2, "0"),
        year: new Date().getFullYear(),
      };

      const res = await axiosInstance.post("/reports/generate/project", payload);

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
      console.error("❌ Project report generation error:", err);
      alert("No project report found for this month or year.");
    }
  };

  // Bar chart options (Right Side)
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false, // Important for chart to fill parent height
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } },
      x: {
        grid: { display: false },
        ticks: { color: "#6B7280" }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true }
    },
  };

  const stats = projectStats
    ? [
      {
        label: "Total Projects",
        value: projectStats.totalProjects,
        iconBg: "bg-indigo-100",
        icon: <FaListAlt className="text-indigo-500 w-6 h-6" />,
      },
      {
        label: "Completed",
        value: projectStats.completedProjects,
        iconBg: "bg-green-100",
        icon: <FaCheckCircle className="text-green-500 w-6 h-6" />,
      },
      {
        label: "Ongoing",
        value: projectStats.ongoingProjects,
        iconBg: "bg-yellow-100",
        icon: <FaSyncAlt className="text-yellow-500 w-6 h-6" />,
      },
      {
        label: "Overdue",
        value: projectStats.overdueProjects,
        iconBg: "bg-red-100",
        icon: <FaExclamationCircle className="text-red-500 w-6 h-6" />,
      },
      {
        label: "Cancelled",
        value: projectStats.cancelledProjects,
        iconBg: "bg-purple-100",
        icon: <FaTimesCircle className="text-purple-500 w-6 h-6" />,
      },
      {
        label: "Pending",
        value: projectStats.pendingProjects,
        iconBg: "bg-blue-100",
        icon: <FaClock className="text-blue-500 w-6 h-6" />,
      },
    ]
    : [];

  // Calculate percentage for the center of the Doughnut chart
  const ongoingValue = projectStats ? projectStats.ongoingProjects : 0;
  const pendingValue = projectStats ? projectStats.pendingProjects : 0;
  const totalDoughnutProjects = ongoingValue + pendingValue; // Only ongoing + pending for this doughnut
  const centerPercentage = totalDoughnutProjects
    ? Math.round((ongoingValue / totalDoughnutProjects) * 100) + "%"
    : "0%";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Changed max-w-7xl to w-full to allow content to expand */}
      <div className="mx-auto px-6 py-10 w-full">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Project Reports</h1>
          <p className="text-gray-700 text-lg">
            Live project status and progress insights
          </p>
        </div>


        {projectStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                className="bg-white rounded-2xl p-6 shadow-md flex flex-col items-center"
                whileHover={{ scale: 1.03 }}
              >
                <div className={`${s.iconBg} p-3 rounded-full mb-3`}>{s.icon}</div>
                <p className="text-gray-500 mb-2">{s.label}</p>
                <p className="text-3xl font-bold text-gray-800">
                  <CountUp end={s.value} duration={1.5} separator="," />
                </p>
              </motion.div>
            ))}
          </div>
        )}


        {chartData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Custom Doughnut Chart */}
            <motion.div
              className="bg-white p-6 shadow-lg flex flex-col justify-between" // Use flex-col and justify-between for better layout
              style={{ borderRadius: '16.46px' }} // Keep the border-radius
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex-1 flex flex-col items-center justify-center"> {/* This div contains the title and chart */}
                <h2 className="text-lg font-medium text-gray-700 mb-4 text-center">Project Status Breakdown</h2> {/* Changed title slightly for clarity */}
                <div className="relative flex items-center justify-center w-full aspect-square max-w-[240px]"> {/* Added max-w for larger screens */}
                  <CustomDoughnutChart
                    data={chartData.statusBreakdownCustom}
                    colors={chartData.customDoughnutColors}
                    chartSize={240} // Base size for viewBox, SVG will scale
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
                    <span className="text-sm text-gray-500">Ongoing</span> {/* Changed text to reflect ongoing percentage */}
                    <span className="text-2xl font-bold text-gray-900">
                      {centerPercentage}
                    </span>
                  </div>
                </div>
              </div>

              {/* Legend for CustomDoughnutChart - moved to bottom and made flex-wrap */}
              <div className="mt-6">
                <ul className="space-y-2 flex flex-wrap justify-center">
                  {chartData.statusBreakdownCustom.map((item, i) => (
                    <li key={item.name} className="flex items-center text-gray-600 px-2 py-1">
                      <span
                        className="w-4 h-4 rounded-sm mr-2"
                        style={{ backgroundColor: chartData.customDoughnutColors[i % chartData.customDoughnutColors.length] }}
                      ></span>
                      {item.name} - {item.value}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* Bar Chart */}
            <motion.div
              className="bg-white rounded-2xl p-6 shadow-md flex flex-col" // Use flex-col to allow chart to fill height
              style={{ borderRadius: '14.3px' }} // Keep the border-radius
              whileHover={{ scale: 1.02 }}
            >
              <h3 className="text-lg font-medium text-gray-700 mb-4">Project Breakdown</h3>
              {/* Chart.js container: h-[250px] as base, flex-1 and w-full for responsiveness */}
              <div className="relative flex-1 h-[250px] w-full">
                <Bar data={chartData.completionTrend} options={barOptions} />
              </div>
            </motion.div>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="flex justify-end items-center space-x-4">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-300 rounded-full px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select Month</option>
            {[...Array(12)].map((_, idx) => (
              <option key={idx} value={idx + 1}>
                {new Date(0, idx).toLocaleString("default", { month: "long" })}
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

export default ProjectReports;