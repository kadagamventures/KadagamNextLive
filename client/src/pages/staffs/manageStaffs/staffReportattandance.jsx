import { useEffect, useState } from "react";
import { Doughnut, Bar } from "react-chartjs-2";
import { tokenRefreshInterceptor as axiosInstance } from "../../../utils/axiosInstance";
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
  FaCalendarAlt,
  FaDownload,
  FaUsers,
  FaUserCheck,
  FaUserTimes,
  FaUserClock,
  FaSignOutAlt,
  FaUserSlash,
} from "react-icons/fa";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const Attendance = () => {
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [attendanceData, setAttendanceData] = useState(null);
  const [month, setMonth] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAttendanceData(selectedDate);
  }, [selectedDate]);

  const fetchAttendanceData = async (date) => {
    setLoading(true);
    setError("");
    try {
      const res = await axiosInstance.get(`/reports/attendance/daily`, {
        params: { date },
      });
      if (res.data.success) {
        setAttendanceData(res.data.data);
      } else {
        setError("Failed to fetch attendance data.");
      }
    } catch {
      setError("Error fetching attendance data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!month) return alert("Please select a month.");
    try {
      const res = await axiosInstance.get(
        `/reports/attendance/monthly/download`,
        { params: { month, year: new Date().getFullYear() } }
      );
      if (res.data.success) window.open(res.data.downloadUrl, "_blank");
      else alert("Error generating PDF.");
    } catch {
      alert("Failed to download report.");
    }
  };

  // Doughnut: Total Staff, Present, Absent
  const doughnutData = {
    labels: ["Total Staff", "Present", "Absent"],
    datasets: [
      {
        data: attendanceData
          ? [
            attendanceData.totalStaff,
            attendanceData.presentStaff,
            attendanceData.absentStaff,
          ]
          : [0, 0, 0],
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
  }



  // Calculate center percentage: largest slice / sum
  const totalSum = attendanceData
    ? attendanceData.totalStaff +
    attendanceData.presentStaff +
    attendanceData.absentStaff
    : 0;
  const maxValue = attendanceData
    ? Math.max(
      attendanceData.totalStaff,
      attendanceData.presentStaff,
      attendanceData.absentStaff
    )
    : 0;
  const centerPercentage = totalSum
    ? Math.round((maxValue / totalSum) * 100) + "%"
    : "0%";

  // Bar chart: Late Arrivals vs Early Departures
  const barData = {
    labels: ["Late Arrivals", "Early Departures"],
    datasets: [
      {
        data: attendanceData
          ? [attendanceData.lateArrivals, attendanceData.earlyDepartures]
          : [0, 0],
        backgroundColor: ["#FBBF24", "#34D399"],
      },
    ],
  };
  const barOptions = {
    responsive: true,
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
    plugins: { legend: { display: false } },
  };

  // Stats cards
  const stats = attendanceData
    ? [
      {
        label: "Total Staff",
        value: attendanceData.totalStaff,
        iconBg: "bg-purple-100",
        icon: <FaUsers className="text-purple-500 w-6 h-6" />,
      },
      {
        label: "Present",
        value: attendanceData.presentStaff,
        iconBg: "bg-sky-100",
        icon: <FaUserCheck className="text-sky-500 w-6 h-6" />,
      },
      {
        label: "Absent",
        value: attendanceData.absentStaff,
        iconBg: "bg-red-100",
        icon: <FaUserTimes className="text-red-500 w-6 h-6" />,
      },
      {
        label: "Late Arrivals",
        value: attendanceData.lateArrivals,
        iconBg: "bg-amber-100",
        icon: <FaUserClock className="text-amber-500 w-6 h-6" />,
      },
      {
        label: "Early Departures",
        value: attendanceData.earlyDepartures,
        iconBg: "bg-green-100",
        icon: <FaSignOutAlt className="text-green-500 w-6 h-6" />,
      },
      {
        label: "On Leave",
        value: attendanceData.onLeave,
        iconBg: "bg-emerald-100",
        icon: <FaUserSlash className="text-emerald-500 w-6 h-6" />,
      },
    ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl items-center font-bold text-gray-900 mb-6 pb-6  font-poppins font-weight-500 size-32px">
            Attendance Dashboard
          </h1>
          <div className="flex items-center space-x-3">
            <FaCalendarAlt className="text-gray-500 text-xl" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-lg p-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>

        {/* Loading / Error */}
        {loading && <p className="text-indigo-600">Loading data...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {/* Stats Cards */}
        {attendanceData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                className="bg-white rounded-2xl p-6 shadow-md flex flex-col items-center"
                whileHover={{ scale: 1.03 }}
              >
                <div className={`${s.iconBg} p-3 rounded-full mb-3`}>
                  {s.icon}
                </div>
                <p className="text-gray-500 mb-2">{s.label}</p>
                <p className="text-3xl font-bold text-gray-800">
                  <CountUp end={s.value} duration={1.5} separator="," />
                </p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Doughnut */}
          <motion.div
            className="bg-white p-6 rounded-2xl shadow-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h2 className="text-lg font-medium text-gray-700 mb-4">
              Attendance Distribution
            </h2>
            <div className="relative h-80">
              <Doughnut data={doughnutData} options={doughnutOptions} />
              <div
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                style={{
                  top: "50%",
                  left: "37%",
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

          {/* Bar */}
          <motion.div
            className="bg-white rounded-2xl p-6 shadow-md"
            whileHover={{ scale: 1.02 }}
          >
            <h3 className="text-lg font-medium text-gray-700 mb-4">Late Arrivals And Early Departures</h3>
            <div className="relative h-80">
              <Bar data={barData} options={barOptions} />
            </div>
          </motion.div>
        </div>

        {/* Bottom Controls */}
        <div className="flex justify-end items-center space-x-4">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-gray-300 rounded-lg p-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select Month</option>
            {[...Array(12)].map((_, idx) => (
              <option key={idx} value={idx + 1}>
                {new Date(0, idx).toLocaleString("default", {
                  month: "long",
                })}
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

export default Attendance;
