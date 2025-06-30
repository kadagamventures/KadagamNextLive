import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import { tokenRefreshInterceptor as axiosInstance } from "../../../utils/axiosInstance";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
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
    // Removed flex-1 here. The chart's size is determined by chartSize prop.
    // The parent div in ProjectReports will manage overall flexibility.
    <div
      className="flex items-center justify-center"
      style={{ width: chartSize, height: chartSize }}
    >
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
  Legend
);

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

        const customDoughnutData = [
          { name: "Ongoing", value: data.ongoingProjects },
          { name: "Pending", value: data.pendingProjects },
        ];
        const customDoughnutColors = ["#F59E0B", "#34D399"];

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
          statusBreakdown: customDoughnutData,
          statusColors: customDoughnutColors,
          completionTrend: barData,
        });
      } catch (error) {
        console.error("Error fetching project statistics:", error);
      }
    };

    fetchProjectStats();
  }, []);

  const handleDownloadPDF = async () => {
    if (!selectedMonth) {
      alert("Please select a month first.");
      return;
    }
    try {
      const response = await axiosInstance.get(
        `/reports/projects/monthly-report/download?year=${new Date().getFullYear()}&month=${selectedMonth}`
      );
      if (response.data.success) {
        // Assuming downloadUrl is directly a file link
        window.open(response.data.downloadUrl, "_blank");
      }
    } catch (error) {
      console.error("Error downloading report:", error);
      alert("Error downloading report. Please try again.");
    }
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 },
        grid: {
          color: 'rgba(0,0,0,0.05)', // Lighter grid lines
        },
      },
      x: {
        grid: {
          display: false, // No vertical grid lines
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `${context.label}: ${context.parsed.y}`;
          }
        }
      }
    },
  };

  const ongoingProjects = projectStats?.ongoingProjects || 0;
  const totalDoughnutProjects = (projectStats?.ongoingProjects || 0) + (projectStats?.pendingProjects || 0);
  const ongoingPercentage = totalDoughnutProjects > 0 ?
    Math.round((ongoingProjects / totalDoughnutProjects) * 100) : 0;
  const centerPercentageText = `${ongoingPercentage}%`;

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

  return (
    <div className="min-h-screen ">
      {/* Removed max-w-7xl to allow width to increase on zoom out */}
      <div className="mx-auto w-full px-6 py-10"> {/* Added w-full for consistent behavior */}
        {/* Header */}
        <div className="mb-8 text-center"> {/* Added text-center for better aesthetics */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Project Reports</h1>
          <p className="text-gray-700 text-lg">
            Live project status and progress insights
          </p>
        </div>

        {/* Stats Cards */}
        {projectStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-6">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                className="bg-white rounded-2xl p-6 shadow-md flex flex-col items-center text-center"
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

        {/* Charts Section */}
        {chartData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Left: Custom Doughnut Chart (Ongoing & Pending) */}
            <motion.div
              className="bg-white p-6 rounded-2xl shadow-lg flex flex-col items-center relative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h2 className="text-lg font-medium text-gray-700 mb-4">Project Overview</h2>
              <div className="flex w-full justify-center items-center h-full relative"> {/* Added relative here for proper absolute positioning context */}
                <CustomDoughnutChart
                  data={chartData.statusBreakdown}
                  colors={chartData.statusColors}
                  chartSize={220}
                strokeThickness={32}
                gapDegrees={3}
                />
                {/* Center Text for Ongoing Percentage */}
                <div
                  className="absolute top-1/2 left-1/2  -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none"
                >
                  <span className="text-sm text-gray-500">Ongoing</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {centerPercentageText}
                  </span>
                </div>
                {/* Manual Legend for CustomDoughnutChart */}
                <div className="flex-shrink-0 flex flex-col justify-center pl-4 pr-4 ml-8">
                  <ul className="space-y-2">
                    {chartData.statusBreakdown.map((item, i) => (
                      <li key={item.name} className="flex items-center text-gray-600 text-sm">
                        <span
                          className="w-4 h-4 rounded-sm mr-2"
                          style={{ backgroundColor: chartData.statusColors[i % chartData.statusColors.length] }}
                        ></span>
                        {item.name}: {item.value}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>

            {/* Right: Bar Chart (Total, Cancelled, Completed) */}
            <motion.div
              className="bg-white rounded-2xl p-6 shadow-md flex flex-col"
              whileHover={{ scale: 1.02 }}
            >
              <h3 className="text-lg font-medium text-gray-700 mb-4">Project Breakdown</h3>
              <div className="relative h-full min-h-[200px]"> {/* Added min-h for charts */}
                <Bar data={chartData.completionTrend} options={barOptions} />
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
            {[...Array(12)].map((_, idx) => (
              <option key={idx} value={idx + 1}>
                {new Date(0, idx).toLocaleString("default", { month: "long" })}
              </option>
            ))}
          </select>
          <motion.button
            onClick={handleDownloadPDF}
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

export default ProjectReports;