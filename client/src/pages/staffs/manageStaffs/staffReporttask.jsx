import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
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
import ChartDataLabels from "chartjs-plugin-datalabels";
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

        // Prepare data for CustomDoughnutChart and Bar Chart based on fetched stats
        setChartData({
          // Data for CustomDoughnutChart (High Priority vs Other Tasks)
          distributionDoughnut: [
            { name: "High Priority", value: data.stats.highPriorityTasks || 0 },
            { name: "Other Tasks", value: (data.stats.totalTasks - data.stats.highPriorityTasks) || 0 },
          ].filter(d => d.value > 0), // Filter out zero values for better doughnut display

          // Data for Bar Chart (Task Overview)
          overviewBar: {
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
                  "#6366F1", // Total (Blue)
                  "#10B981", // Completed (Green)
                  "#F59E0B", // Ongoing (Orange)
                  "#EF4444", // Overdue (Red)
                  "#EAB308", // To Do (Amber/Yellow)
                ],
              },
            ],
          },
        });
      } catch (err) {
        console.error("Error fetching task stats:", err);
        // Optionally set an error state to display to the user
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
      window.URL.revokeObjectURL(url); // Clean up the URL object
    } catch (err) {
      console.error("Error downloading report:", err); // Log for debugging
      alert("Error downloading report. Please try again.");
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

  const doughnutColors = ["#EF4444", "#10B981"]; // Colors for High Priority and Other Tasks

  const highPriorityPercentage = taskStats && taskStats.totalTasks > 0
    ? `${Math.round((taskStats.highPriorityTasks / taskStats.totalTasks) * 100)}%`
    : "0%";

  const barChartOptions = { // Separate options for Bar chart for clarity
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Usually turned off for simple overview bar charts if labels are on X-axis
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (context.parsed.y !== null) {
              label += ': ' + context.parsed.y;
            }
            return label;
          }
        }
      },
      datalabels: { // Enable datalabels for Bar chart
        anchor: 'end',
        align: 'top',
        formatter: (value) => value,
        color: '#6B7280',
        font: {
          weight: 'bold'
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false, // No vertical grid lines
        },
        ticks: { color: "#6B7280" },
      },
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, precision: 0, color: "#6B7280" }, // Ensure whole numbers, set tick color
        grid: {
          color: 'rgba(0, 0, 0, 0.05)', // Lighter horizontal grid lines
        },
      },
    },
  };


  return (
    <div className="min-h-screen  p-6">
      <div className="mx-auto w-full">
        {/* Header */}
        <motion.h2
          className="text-3xl font-bold text-gray-900 mb-6 text-center font-poppins"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Task Reports
        </motion.h2>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              className="bg-white rounded-2xl p-6 shadow-md flex flex-col items-center text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.03 }}
            >
              <div
                className={`${s.circleBg} p-3 rounded-full mb-3 flex items-center justify-center`}
              >
                {s.icon}
              </div>
              <p className="text-sm text-gray-500 mb-2">{s.label}</p>
              <p className="text-3xl font-bold text-gray-900">
                <CountUp end={s.value} duration={1.5} separator="," />
              </p>
            </motion.div>
          ))}
        </div>

        {/* Task Distribution & Overview Charts */}
        {chartData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Distribution Doughnut Chart */}
            <motion.div
              className="bg-white p-6 rounded-2xl shadow-lg flex flex-col items-center justify-center relative w-full h-[300px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileHover={{ scale: 1.02 }}
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Task Distribution by Priority
              </h3>
              <div className="flex w-full justify-center items-center h-full"> {/* Changed to flex, removed sm:flex-row */}
                <div className="relative flex items-center justify-center"> {/* Added relative positioning for text overlay */}
                  <CustomDoughnutChart
                    data={chartData.distributionDoughnut}
                    colors={doughnutColors}
                    chartSize={220}
                strokeThickness={32}
                gapDegrees={3}
                  />
                  {/* Centered High Priority Text */}
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none"
                  >
                    <span className="text-sm text-gray-500">High Priority</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {highPriorityPercentage}
                    </span>
                  </div>
                </div>

                {/* Legend for CustomDoughnutChart - now positioned separately */}
                <div className="flex-shrink-0 flex flex-col justify-center pl-4 pr-4 ml-8"> {/* Adjusted spacing and removed sm:mt-0 */}
                  <ul className="space-y-2">
                    {chartData.distributionDoughnut.map((item, i) => (
                      <li key={item.name} className="flex items-center text-gray-600 text-sm">
                        <span className="w-4 h-4 rounded-sm mr-2" style={{ backgroundColor: doughnutColors[i % doughnutColors.length] }}></span>
                        {item.name}: {item.value}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>

            {/* Task Overview Bar Chart */}
            <motion.div
              className="bg-white p-6 rounded-2xl shadow-lg flex flex-col w-full h-[300px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileHover={{ scale: 1.02 }}
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Task Status Overview
              </h3>
              <div className="relative h-[calc(100%-2rem)]">
                <Bar data={chartData.overviewBar} options={barChartOptions} />
              </div>
            </motion.div>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="flex flex-col sm:flex-row justify-end items-center space-y-3 sm:space-y-0 sm:space-x-4 mt-6">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-300 rounded-full p-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
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
          <motion.button
            onClick={handleDownloadReport}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full shadow w-full sm:w-auto"
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

export default Task;