import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2"; // Keep Bar import
import { tokenRefreshInterceptor as axiosInstance } from "../../../utils/axiosInstance";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip, // Keep Tooltip and Legend for Bar chart
  Legend,  // Keep Tooltip and Legend for Bar chart
} from "chart.js";
// No need for ChartDataLabels or ArcElement if Doughnut is custom
// import ChartDataLabels from "chartjs-plugin-datalabels"; // Removed
// import { ArcElement } from "chart.js"; // Removed

import { motion } from "framer-motion";
import CountUp from "react-countup";
import {
  FaTasks,
  FaCheckCircle,
  FaSyncAlt,
  FaExclamationCircle,
  FaClipboardList,
  FaStar,
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

// --- CustomDoughnutChart Component (Copied for use in Task page) ---
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


const Task = () => {
  const [taskStats, setTaskStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axiosInstance.get("/reports/tasks/live-stats");
        setTaskStats(data.stats);

        // Prepare data for CustomDoughnutChart
        const highPriorityValue = data.stats.highPriorityTasks || 0;
        const otherTasksValue = (data.stats.totalTasks || 0) - highPriorityValue;

        setChartData({
          // This will be used by CustomDoughnutChart
          distributionCustom: [
            { name: "High Priority", value: highPriorityValue },
            { name: "Other Tasks", value: otherTasksValue },
          ],
          // This remains for the Bar chart
          overview: {
            labels: ["Total", "Completed", "Ongoing", "Overdue", "To Do"],
            datasets: [
              {
                data: [
                  data.stats.totalTasks,
                  data.stats.completedTasks,
                  data.stats.ongoingTasks,
                  data.stats.overdueTasks,
                  data.stats.toDoTasks,
                ],
                backgroundColor: [
                  "#6366F1", // Indigo
                  "#10B981", // Green
                  "#F59E0B", // Amber
                  "#EF4444", // Red
                  "#EAB308", // Yellow
                ],
              },
            ],
          },
        });
      } catch (err) {
        console.error("Live stats fetch error:", err);
      }
    })();
  }, []);

  const handleDownloadReport = async () => {
    if (!selectedMonth) {
      alert("Please select a month first.");
      return;
    }

    try {
      const payload = {
        month: String(selectedMonth).padStart(2, "0"),
        year: new Date().getFullYear(),
      };

      const res = await axiosInstance.post("/reports/generate/task", payload);

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
      console.error("Report generation error:", err);
      alert("Failed to generate or fetch the task report.");
    }
  };

  const stats = taskStats
    ? [
      {
        label: "Total Tasks",
        value: taskStats.totalTasks,
        icon: <FaTasks className="text-blue-500 w-6 h-6" />,
        circleBg: "bg-blue-100",
      },
      {
        label: "Completed",
        value: taskStats.completedTasks,
        icon: <FaCheckCircle className="text-green-500 w-6 h-6" />,
        circleBg: "bg-green-100",
      },
      {
        label: "Ongoing",
        value: taskStats.ongoingTasks,
        icon: <FaSyncAlt className="text-yellow-500 w-6 h-6" />,
        circleBg: "bg-yellow-100",
      },
      {
        label: "Overdue",
        value: taskStats.overdueTasks,
        icon: <FaExclamationCircle className="text-red-500 w-6 h-6" />,
        circleBg: "bg-red-100",
      },
      {
        label: "To Do",
        value: taskStats.toDoTasks,
        icon: <FaClipboardList className="text-indigo-500 w-6 h-6" />,
        circleBg: "bg-indigo-100",
      },
      {
        label: "High Priority",
        value: taskStats.highPriorityTasks,
        icon: <FaStar className="text-pink-500 w-6 h-6" />,
        circleBg: "bg-pink-100",
      },
    ]
    : [];

  // Options for the Bar chart only.
  const barChartOptions = {
    responsive: true,
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#6B7280" }
      },
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, color: "#6B7280" },
        grid: { color: "#E5E7EB" }
      },
    },
    plugins: {
      legend: { display: false }, // Hide legend as per original code for Bar
      tooltip: { enabled: true }
    },
    maintainAspectRatio: false, // Essential for Chart.js to fit container height
  };

  // Colors for the CustomDoughnutChart (High Priority vs Other Tasks)
  const customDoughnutColors = ["#EF4444", "#10B981"]; // Red for High Priority, Green for Other Tasks

  // Calculate percentage for the center of the Doughnut chart
  const highPriorityValue = taskStats ? taskStats.highPriorityTasks : 0;
  const totalTasksForDoughnut = taskStats ? taskStats.totalTasks : 0;
  const centerPercentage = totalTasksForDoughnut
    ? Math.round((highPriorityValue / totalTasksForDoughnut) * 100) + "%"
    : "0%";


  return (
    <div className="min-h-screen ">
      {/* Changed max-w-7xl to w-full to allow content to expand */}
      <div className="mx-auto px-6 py-10 w-full">
        <motion.h2
          className="text-3xl font-bold text-gray-900 mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Task Reports
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              className="bg-white rounded-2xl p-6 shadow-md flex flex-col items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className={`${s.circleBg} p-3 rounded-full mb-3`}>
                {s.icon}
              </div>
              <p className="text-base text-gray-500 mb-2">{s.label}</p>
              <p className="text-3xl font-bold text-gray-900">
                <CountUp end={s.value} duration={1.5} separator="," />
              </p>
            </motion.div>
          ))}
        </div>

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
                <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">
                  Task Distribution
                </h3>
                {/* Responsive container for the CustomDoughnutChart */}
                <div className="relative flex items-center justify-center w-full aspect-square max-w-[240px]"> {/* Added max-w for larger screens */}
                  <CustomDoughnutChart
                    data={chartData.distributionCustom}
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
                    <span className="text-sm text-gray-500">High Priority</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {centerPercentage}
                    </span>
                  </div>
                </div>
              </div>

              {/* Legend for CustomDoughnutChart - moved to bottom and made flex-wrap */}
              <div className="mt-6">
                <ul className="space-y-2 flex flex-wrap justify-center">
                  {chartData.distributionCustom.map((item, i) => (
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
              className="bg-white p-6 shadow-lg flex flex-col" // Use flex-col to allow chart to fill height
              style={{ borderRadius: '14.3px' }} // Keep the border-radius
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Task Overview
              </h3>
              {/* Chart.js container: h-[250px] as base, flex-1 and w-full for responsiveness */}
              <div className="relative flex-1 h-[250px] w-full">
                <Bar data={chartData.overview} options={barChartOptions} />
              </div>
            </motion.div>
          </div>
        )}

        <div className="flex justify-end items-center space-x-4">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-300 rounded-full px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select Month</option>
            {[...Array(12)].map((_, i) => (
              <option key={i} value={i + 1}>
                {new Date(0, i).toLocaleString("default", {
                  month: "long",
                })}
              </option>
            ))}
          </select>
          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full shadow transition"
          >
            <FaDownload />
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default Task;