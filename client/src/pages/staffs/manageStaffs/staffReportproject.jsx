import { useEffect, useState } from "react";
import { Doughnut, Bar } from "react-chartjs-2";
import { tokenRefreshInterceptor as axiosInstance } from "../../../utils/axiosInstance";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

/**
 * Custom plugin to display text in the center of the Doughnut chart.
 * This calculates the percentage for the "Ongoing" slice.
 */
const centerTextPlugin = {
  id: "centerTextPlugin",
  afterDraw: (chart) => {
    const { ctx, data, chartArea } = chart;
    const [dataset] = data.datasets || [];
    if (!dataset) return;

    // Find "Ongoing" slice index
    const ongoingIndex = data.labels.findIndex(
      (label) => label.toLowerCase() === "ongoing"
    );
    if (ongoingIndex < 0) return;

    const ongoingValue = dataset.data[ongoingIndex];
    const total = dataset.data.reduce((acc, val) => acc + val, 0);
    const ongoingPercentage = total > 0 ? Math.round((ongoingValue / total) * 100) : 0;
    const text = `${ongoingPercentage}%`;

    const centerX = (chartArea.left + chartArea.right) / 2;
    const centerY = (chartArea.top + chartArea.bottom) / 2;

    ctx.save();
    ctx.font = "bold 24px sans-serif";
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, centerX, centerY);
    ctx.restore();
  },
};

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

        // Left Doughnut chart: only "Ongoing" and "Pending"
        const doughnutData = {
          labels: ["Ongoing", "Pending"],
          datasets: [
            {
              data: [data.ongoingProjects, data.pendingProjects],
              backgroundColor: ["#F59E0B", "#34D399"],
            },
          ],
        };

        // Right Bar chart: only "Total Projects", "Cancelled", "Completed"
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
          statusBreakdown: doughnutData,
          completionTrend: barData,
        });
      } catch (error) {
        console.error("Error fetching project statistics:", error);
      }
    };

    fetchProjectStats();
  }, []);

  // Download Monthly Report
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
        window.open(response.data.downloadUrl, "_blank");
      }
    } catch (error) {
      console.error("Error downloading report:", error);
    }
  };

  // Doughnut chart options (Left Side)
  const doughnutOptions = {
    cutout: "70%",
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "right",
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          color: "#4B5563",
          padding: 20,
          generateLabels: (chart) =>
            chart.data.labels.map((label, i) => ({
              text: `${label} - ${chart.data.datasets[0].data[i]}`,
              fillStyle: chart.data.datasets[0].backgroundColor[i],
              strokeStyle: chart.data.datasets[0].backgroundColor[i],
              index: i,
            })),
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || "";
            const value = context.raw || 0;
            return `${label}: ${value}`;
          },
        },
      },
    },
  };

  // Bar chart options (Right Side)
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
    plugins: { legend: { display: false } },
  };

  // Stats cards data
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Project Reports</h1>
          <p className="text-gray-700 text-lg">
            Live project status and progress insights
          </p>
        </div>

        {/* Stats Cards */}
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

        {/* Charts Section */}
        {chartData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Left: Doughnut Chart (Only Ongoing & Pending) */}
            <motion.div
              className="bg-white p-6 rounded-2xl shadow-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h2 className="text-lg font-medium text-gray-700 mb-4">Project Overview</h2>
              <div className="relative h-80">
                <Doughnut
                  data={chartData.statusBreakdown}
                  options={doughnutOptions}
                  plugins={[centerTextPlugin]}
                />
              </div>
            </motion.div>

            {/* Right: Bar Chart (Only Total, Cancelled, Completed) */}
            <motion.div
              className="bg-white rounded-2xl p-6 shadow-md"
              whileHover={{ scale: 1.02 }}
            >
              <h3 className="text-lg font-medium text-gray-700 mb-4">Project Breakdown</h3>
              <div className="relative h-80">
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
            className="border border-gray-300 rounded-lg p-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg shadow"
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
