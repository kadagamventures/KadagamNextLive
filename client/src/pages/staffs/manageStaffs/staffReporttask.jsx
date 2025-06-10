import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2"; // Removed Doughnut
import { tokenRefreshInterceptor as axiosInstance } from "../../../utils/axiosInstance";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels"; // Re-added since Bar chart might still use it
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
import PropTypes from "prop-types"; // Import PropTypes for CustomDoughnutChart


// --- CustomDoughnutChart Component (Copied from previous tasks) ---
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels // Keep if you want datalabels on the Bar chart
);

const Task = () => {
  const [taskStats, setTaskStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axiosInstance.get("/reports/tasks/live-stats");
        setTaskStats(data.stats);
        setChartData({
          distribution: {
            // Data for CustomDoughnutChart
            labels: ["High Priority", "Other Tasks"], // Kept for reference but not directly used by CustomDoughnutChart data prop
            datasets: [
              {
                data: [
                  data.stats.highPriorityTasks,
                  data.stats.totalTasks - data.stats.highPriorityTasks,
                ],
                backgroundColor: ["#EF4444", "#10B981"], // Kept for reference
              },
            ],
          },
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
                  "#6366F1",
                  "#10B981",
                  "#F59E0B",
                  "#EF4444",
                  "#EAB308",
                ],
              },
            ],
          },
        });
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const handleDownloadReport = async () => {
    if (!selectedMonth) {
      alert("Please select a month first.");
      return;
    }
    try {
      const res = await axiosInstance.get(
        `/reports/tasks/download?year=${new Date().getFullYear()}&month=${selectedMonth}`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `task_report_${selectedMonth}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert("Error downloading report.");
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

  const chartOptions = { // These options are primarily for the Bar chart now
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: "top",
      },
      datalabels: { // Keeping if desired for Bar chart
        display: false, // Set to false for Bar chart, unless specifically needed
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
      },
    },
    maintainAspectRatio: false,
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <motion.h2
          className="text-3xl items-center font-bold text-gray-900 mb-6 pb-6  font-poppins font-weight-500 size-32px"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Task Reports
        </motion.h2>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              className="bg-white rounded-2xl p-6 shadow-md flex flex-col items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div
                className={`${s.circleBg} p-3 rounded-full mb-3 flex items-center justify-center`}
              >
                {s.icon}
              </div>
              <p className="text-base text-gray-500 mb-2">{s.label}</p>
              <p className="text-3xl font-bold text-gray-900">
                <CountUp end={s.value} duration={1.5} separator="," />
              </p>
            </motion.div>
          ))}
        </div>

        {/* Task Distribution & Overview */}
        {chartData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Distribution Doughnut */}
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
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Task Distribution
              </h3>
              <div className="flex w-full justify-center items-center h-full">
                <CustomDoughnutChart
                  data={[
                    { name: "High Priority", value: taskStats.highPriorityTasks || 0 },
                    { name: "Other Tasks", value: (taskStats.totalTasks - taskStats.highPriorityTasks) || 0 },
                  ]}
                  colors={["#EF4444", "#10B981"]} // Corresponding colors
                  chartSize={180}
                  strokeThickness={28}
                  gapDegrees={3}
                />
                <div
                  className="absolute flex flex-col items-center justify-center pointer-events-none"
                  style={{
                    top: "56%", // Adjusted top for vertical centering
                    left: "34%", // Adjusted left to compensate for legend
                    transform: "translate(-50%, -50%)",
                    width: "fit-content",
                  }}
                >
                  <span className="text-sm text-gray-500">High Priority</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {Math.round(
                      (taskStats.highPriorityTasks / (taskStats.totalTasks || 1)) * 100
                    ) + "%"}
                  </span>
                </div>
                {/* Legend for CustomDoughnutChart */}
                <div className="flex-shrink-0 flex flex-col justify-center pl-4 pr-4">
                  <ul className="space-y-2">
                    <li className="flex items-center text-gray-600 text-sm">
                      <span className="w-4 h-4 rounded-sm mr-2" style={{ backgroundColor: "#EF4444" }}></span>
                      High Priority: {taskStats.highPriorityTasks || 0}
                    </li>
                    <li className="flex items-center text-gray-600 text-sm">
                      <span className="w-4 h-4 rounded-sm mr-2" style={{ backgroundColor: "#10B981" }}></span>
                      Other Tasks: {(taskStats.totalTasks - taskStats.highPriorityTasks) || 0}
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>

            {/* Overview Bar */}
            <motion.div
              className="bg-white p-6 rounded-2xl shadow-lg flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                width: '446px',
                height: '280px',
                borderRadius: '14.3px',
              }}
            >
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Task Overview
              </h3>
              <div className="h-full"> {/* Changed to h-full to fill parent height */}
                <Bar data={chartData.overview} options={chartOptions} />
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