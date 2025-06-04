import { useEffect, useState } from "react";
import { Doughnut, Bar } from "react-chartjs-2";
import { tokenRefreshInterceptor as axiosInstance } from "../../../utils/axiosInstance";
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
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
            labels: ["High Priority", "Other Tasks"],
            datasets: [
              {
                data: [
                  data.stats.highPriorityTasks,
                  data.stats.totalTasks - data.stats.highPriorityTasks,
                ],
                backgroundColor: ["#EF4444", "#10B981"],
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

  const chartOptions = {
    cutout: "70%",
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
      datalabels: {
        display: true,
        formatter: (value, ctx) => {
          const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
          return total ? Math.round((value / total) * 100) + "%" : "";
        },
        color: "#111827",
        font: { size: 18, weight: "bold" },
        anchor: "center",
        align: "center",
      },
    },
    maintainAspectRatio: false,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <motion.h2
          className="text-3xl font-bold text-gray-900 mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Task Reports
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
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
            <motion.div
              className="bg-white p-6 rounded-2xl shadow-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Task Distribution
              </h3>
              <div className="relative h-96">
                <Doughnut data={chartData.distribution} options={chartOptions} />
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                  style={{
                    top: "50%",
                    left: "37%",
                    transform: "translate(-50%, -50%)",
                    width: "fit-content",
                  }}
                >
                  <span className="text-sm text-gray-500">High Priority</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {Math.round(
                      (chartData.distribution.datasets[0].data[0] /
                        (chartData.distribution.datasets[0].data.reduce((a, b) => a + b, 0) || 1)) * 100
                    ) + "%"}
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="bg-white p-6 rounded-2xl shadow-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Task Overview
              </h3>
              <div className="h-96">
                <Bar data={chartData.overview} options={chartOptions} />
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
