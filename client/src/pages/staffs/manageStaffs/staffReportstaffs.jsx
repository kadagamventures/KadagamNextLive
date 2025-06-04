import { useState, useEffect } from "react";
import { Doughnut, Bar } from "react-chartjs-2";
import { tokenRefreshInterceptor as axiosInstance } from "../../../utils/axiosInstance"; // Secure API requests
import { motion } from "framer-motion";
import CountUp from "react-countup";
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
import {
  FaUsers,

  FaCalendarAlt,
  FaClipboardCheck,
  FaClock,
  FaCheckCircle,
  FaStar,
  FaDownload
} from "react-icons/fa";

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
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

  // Staff report doughnut chart
  const taskCompletionData = {
    labels: ["Total Staff", "Task Completion", "Success Rate"],
    datasets: [
      {
        data: [
          totalStaff,
          parseFloat(taskCompletionRate),
          parseFloat(successRate),
        ],
        backgroundColor: ["#752BdF", "#41B6FF", "#FF0200"],
        hoverOffset: 4,
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
    },
    maintainAspectRatio: false,
  };

  // Calculate center percentage for largest slice
  const maxValue = Math.max(
    totalStaff,
    parseFloat(taskCompletionRate),
    parseFloat(successRate)
  );
  const centerPercentage = maxValue ? Math.round(maxValue) + "%" : "0%";

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
          {/* Staff Report Chart */}
          <motion.div
            className="bg-white p-6 rounded-2xl shadow-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h2 className="text-lg font-medium text-gray-700 mb-4">
              Staff Report
            </h2>
            <div className="relative h-80">
              <Doughnut data={taskCompletionData} options={doughnutOptions} />
              <div
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                style={{
                  top: "50%",
                  left: "30%",
                  transform: "translate(-50%, -50%)",
                  width: "fit-content",
                }}
              >
                <span className="text-sm text-gray-500">Completion Rate</span>
                <span className="text-2xl font-bold text-gray-900">
                  {centerPercentage}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Attendance Chart */}
          <motion.div
            className="bg-white rounded-2xl p-6 shadow-md"
            whileHover={{ scale: 1.02 }}
          >
            <h3 className="text-lg font-medium text-gray-700 mb-4">Attendance Overview</h3>
            <div className="relative h-80">
              <Bar data={attendanceData} options={barOptions} />
            </div>
          </motion.div>

          <div className="flex justify-end items-center space-x-4">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-gray-300 rounded-lg p-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg shadow"
              whileHover={{ scale: 1.05 }}
            >
              <FaDownload />
              Download PDF
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffReports;