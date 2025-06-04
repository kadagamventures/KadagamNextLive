import { Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import {
  FaProjectDiagram,
  FaUsers,
  FaClone,
  FaClipboardCheck,
  FaClipboardList,

} from "react-icons/fa";
import CountUp from "react-countup";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartDataLabels
);

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const Reports = () => {
  const [overviewData, setOverviewData] = useState({
    totalProjects: 0,
    totalStaff: 0,
    totalTasks: 0,
    ongoingTasks: 0,
    completedTasks: 0,
    toDoTasks: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE_URL}/reports/overview`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          const d = res.data.data;
          setOverviewData({
            totalProjects: d.totalProjects || 0,
            totalStaff: d.totalStaff || 0,
            totalTasks: d.totalTasks || 0,
            ongoingTasks: d.ongoingTasks || 0,
            completedTasks: d.completedTasks || 0,
            toDoTasks: d.toDoTasks || 0,
          });
        }
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const cards = [
    {
      label: "Total Project",
      value: overviewData.totalProjects,
      icon: <FaProjectDiagram className="text-3xl text-blue-500" />,
      bg: "bg-blue-100",
    },
    {
      label: "Total Staff",
      value: overviewData.totalStaff,
      icon: <FaUsers className="text-3xl text-purple-500" />,
      bg: "bg-purple-100",
    },
    {
      label: "Total Task",
      value: overviewData.totalTasks,
      icon: <FaClone className="text-3xl text-pink-500" />,
      bg: "bg-pink-100",
    },
    {
      label: "Ongoing Task",
      value: overviewData.ongoingTasks,
      icon: <FaClipboardCheck className="text-3xl text-orange-500" />,
      bg: "bg-orange-100",
    },
    {
      label: "Completed Task",
      value: overviewData.completedTasks,
      icon: <FaClipboardCheck className="text-3xl text-green-500" />,
      bg: "bg-green-100",
    },
    {
      label: "Pending Task",
      value: overviewData.toDoTasks,
      icon: <FaClipboardList className="text-3xl text-yellow-500" />,
      bg: "bg-yellow-100",
    },
  ];

  const doughnutData = {
    labels: ["Total Project", "Total Staff", "Total Task"],
    datasets: [
      {
        data: [
          overviewData.totalProjects,
          overviewData.totalStaff,
          overviewData.totalTasks,
        ],
        backgroundColor: ["#41B6FF", "#752BdF", "#FF4C80"],
        borderWidth: 0,
      },
    ],
  };

  const doughnutOptions = {
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

  const barData = {
    labels: ["Ongoing Task", "Completed Task"],
    datasets: [
      {
        data: [overviewData.ongoingTasks, overviewData.completedTasks],
        backgroundColor: ["#3B82F6", "#10B981"],
        barThickness: 24,
      },
    ],
  };

  const barOptions = {
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#6B7280" } },
      y: { grid: { color: "#E5E7EB" }, ticks: { color: "#6B7280" } },
    },
    maintainAspectRatio: false,
  };

  const centerPercentage = overviewData.totalTasks
    ? Math.round(
      (overviewData.totalTasks /
        (overviewData.totalProjects +
          overviewData.totalStaff +
          overviewData.totalTasks)) *
      100
    ) + "%"
    : "0%";

  return (
    <div className="min-h-screen bg-gray-50  p-8">
      <motion.h2
        className="text-3xl items-center font-bold text-gray-900 mb-6 pb-6 text-center font-poppins font-weight-500 size-32px"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Analytics Dashboard
      </motion.h2>

      {/* Six Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-white rounded-2xl p-6 shadow-md flex flex-col items-center"
          >
            <div className={`${c.bg} p-4 rounded-full mb-4 flex items-center justify-center`}>
              {c.icon}
            </div>
            <p className="text-gray-500">{c.label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              <CountUp end={c.value} duration={2} separator="," />
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Doughnut */}
        <motion.div
          className="bg-white rounded-2xl p-6 shadow-md relative"
          whileHover={{ scale: 1.02 }}
        >
          <h3 className="text-lg font-medium text-gray-700 mb-4">
            Project, Staff, Task
          </h3>
          <div className="relative h-80">
            <Doughnut data={doughnutData} options={doughnutOptions} />
            <div
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
              style={{
                top: "50%",
                left: "35%",
                transform: "translate(-50%, -50%)",
                width: "fit-content",
              }}
            >
              <span className="text-sm text-gray-500">Higher Rate</span>
              <span className="text-2xl font-bold text-gray-900">
                {centerPercentage}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Right Bar */}
        <motion.div
          className="bg-white rounded-2xl p-6 shadow-md"
          whileHover={{ scale: 1.02 }}
        >
          <h3 className="text-lg font-medium text-gray-700 mb-4">Task</h3>
          <div className="relative h-80">
            <Bar data={barData} options={barOptions} />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Reports;
