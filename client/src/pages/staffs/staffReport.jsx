// src/pages/StaffReport.jsx
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import StaffSidebar from "../../components/staffSidebar";
import { Doughnut, Bar } from "react-chartjs-2";
import { tokenRefreshInterceptor as axiosInstance } from "../../utils/axiosInstance";
import "chart.js/auto";
import {
  FaTasks,
  FaCheckCircle,
  FaClipboardList,
  FaClock,
  FaExclamationCircle,
  FaFlag,
  FaPlayCircle,
  FaCalendarCheck,
  FaCalendarTimes,
  FaFingerprint,
  FaAward,
  FaStar,
} from "react-icons/fa";

import PropTypes from "prop-types";

const InfoBox = ({ Icon, iconBg, iconColor, label, value }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.03 }}
    transition={{ duration: 0.3 }}
    className="bg-white p-4 rounded-xl shadow-md flex flex-col items-center w-full max-w-xs"
  >
    <div className={`w-12 h-12 flex items-center justify-center rounded-full ${iconBg}`}>
      <Icon className={`text-2xl ${iconColor}`} />
    </div>
    <p className="text-gray-500 text-xs mt-2 text-center uppercase tracking-wide">{label}</p>
    <p className="text-gray-800 text-2xl font-semibold mt-1">{value}</p>
  </motion.div>
);

const StaffReport = () => {
  const user = useSelector((state) => state.staffAuth.user);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(false);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    if (!user?.id) return;
    const fetchPerformance = async () => {
      setLoading(true);
      try {
        const endpoint = `/performance/staff/${user.id}/monthly?year=${selectedYear}&month=${selectedMonth}`;
        const res = await axiosInstance.get(endpoint);
        setPerformance(res.data.success ? res.data.data : null);
      } catch (error) {
        console.error(error);
        setPerformance(null);
      } finally {
        setLoading(false);
      }
    };
    fetchPerformance();
  }, [user?.id, selectedYear, selectedMonth]);

  if (loading) return <div className="text-center p-4 text-lg font-semibold">Loading...</div>;
  if (!performance) return <div className="text-center p-4 text-red-600 text-lg font-semibold">No Data Found</div>;

  // Build doughnut data
  const doughnutData = {
    labels: ["Total Staff", "Present", "Absent"],
    datasets: [{
      data: [
        performance.totalStaff || 0,
        performance.totalDaysPresent || 0,
        performance.totalDaysAbsent || 0,
      ],
      backgroundColor: ["#752BdF", "#41B6FF", "#FF0200"],
      hoverOffset: 4
    }]
  };

  // Find highest segment for center text
  const values = doughnutData.datasets[0].data;
  const labels = doughnutData.labels;
  const total = values.reduce((sum, v) => sum + v, 0);
  const maxIndex = values.indexOf(Math.max(...values));
  const centerText = total > 0
    ? `${labels[maxIndex]}: ${Math.round((values[maxIndex] / total) * 100)}%`
    : "";

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
          padding: 10,
          generateLabels: (chart) =>
            chart.data.labels.map((label, idx) => ({
              text: `${label} - ${chart.data.datasets[0].data[idx]}`,
              fillStyle: chart.data.datasets[0].backgroundColor[idx],
              strokeStyle: chart.data.datasets[0].backgroundColor[idx],
              index: idx,
            })),
        },
      },
      datalabels: { display: false }
    },
    maintainAspectRatio: false
  };

  return (
    <div className="flex min-h-screen pl-64 bg-gray-50">
      <StaffSidebar />
      <div className="flex-grow px-6 py-8 mx-auto max-w-screen-xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4"
        >
          <h1 className="text-3xl font-bold text-gray-800">My Monthly Performance</h1>
          <div className="flex gap-3">
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="p-2 border rounded-lg shadow-sm bg-white"
              placeholder="Year"
            />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="p-2 border rounded-lg shadow-sm bg-white"
            >
              {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
        </motion.div>

        {/* 12 InfoBoxes in 3 cols x 4 rows */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 justify-items-center"
        >
          <InfoBox Icon={FaTasks} iconBg="bg-pink-100" iconColor="text-pink-500" label="Total Tasks Assigned" value={performance.totalTasksAssigned} />
          <InfoBox Icon={FaCheckCircle} iconBg="bg-green-100" iconColor="text-green-500" label="Tasks Completed" value={performance.totalTasksCompleted} />
          <InfoBox Icon={FaClipboardList} iconBg="bg-teal-100" iconColor="text-teal-500" label="Completion Rate" value={`${performance.taskCompletionRate}%`} />
          <InfoBox Icon={FaClock} iconBg="bg-blue-100" iconColor="text-blue-500" label="On-Time Completion" value={`${performance.onTimeCompletionRate}%`} />
          <InfoBox Icon={FaExclamationCircle} iconBg="bg-yellow-100" iconColor="text-yellow-500" label="Overdue Tasks" value={performance.overdueTasks} />
          <InfoBox Icon={FaFlag} iconBg="bg-red-100" iconColor="text-red-500" label="High Priority" value={performance.highPriorityTasksCompleted} />
          <InfoBox Icon={FaPlayCircle} iconBg="bg-orange-100" iconColor="text-orange-500" label="Ongoing Tasks" value={performance.ongoingTasks} />
          <InfoBox Icon={FaCalendarCheck} iconBg="bg-green-100" iconColor="text-green-500" label="Present Days" value={performance.totalDaysPresent} />
          <InfoBox Icon={FaCalendarTimes} iconBg="bg-red-100" iconColor="text-red-500" label="Absent Days" value={performance.totalDaysAbsent} />
          <InfoBox Icon={FaFingerprint} iconBg="bg-lime-100" iconColor="text-lime-500" label="Attendance %" value={`${performance.attendancePercentage}%`} />
          <InfoBox Icon={FaAward} iconBg="bg-purple-100" iconColor="text-purple-500" label="Success Rate" value={`${performance.successRate}%`} />
          <InfoBox Icon={FaStar} iconBg="bg-blue-100" iconColor="text-blue-500" label="Overall Score" value={`${performance.overallPerformanceScore}%`} />
        </motion.div>

        {/* Charts side by side */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.2 } } }}
          className="grid grid-cols-1 md:grid-cols-2 gap-25 justify-items-center"
        >
          <motion.div
            className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-md relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h2 className="text-xl font-medium text-gray-700 mb-4">Staff Attendance</h2>
            <div className="relative h-64">
              <Doughnut data={doughnutData} options={doughnutOptions} />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  top: "50%",
                  left: "37%",
                  transform: "translate(-50%, -50%)",
                  width: "fit-content",
                }}>
                <span className="text-center text-lg font-bold text-gray-900">{centerText}</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-md"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Performance Metrics</h2>
            <Bar
              data={{
                labels: ["Completion %", "On-Time %", "Attendance %", "Success %", "Overall %"],
                datasets: [{
                  data: [
                    performance.taskCompletionRate,
                    performance.onTimeCompletionRate,
                    performance.attendancePercentage,
                    performance.successRate,
                    performance.overallPerformanceScore
                  ],
                  backgroundColor: ["#3B82F6", "#10B981", "#F59E0B", "#6366F1", "#8B5CF6"]
                }]
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, max: 100 } }
              }}
            />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

InfoBox.propTypes = {
  Icon: PropTypes.elementType.isRequired,
  iconBg: PropTypes.string.isRequired,
  iconColor: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default StaffReport;
