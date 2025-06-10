// src/pages/StaffReport.jsx
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import StaffSidebar from "../../components/staffSidebar";
// Removed Doughnut from react-chartjs-2 as we are now using a custom one
import { Bar } from "react-chartjs-2";
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

// --- CustomDoughnutChart Component (New/Replaced) ---
// This is the new custom doughnut chart you provided previously.
// I'm embedding it directly here for self-containment as requested.
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

  // --- Data for CustomDoughnutChart (Updated) ---
  // Using performance.totalTasksAssigned, performance.ongoingTasks, performance.totalTasksCompleted
  const customDoughnutData = [
    { name: "Total Assigned", value: performance.totalTasksAssigned || 0 },
    { name: "Ongoing Tasks", value: performance.ongoingTasks || 0 },
    { name: "Completed Tasks", value: performance.totalTasksCompleted || 0 },
  ];

  // Colors for the custom doughnut chart (keeping original)
  const customDoughnutColors = ["#752BdF", "#41B6FF", "#FF0200"];

  // Calculate percentage for center text based on completion rate
  // This can be changed if a different central metric is desired.
  const centerTextPercentage = performance.totalTasksAssigned > 0
    ? `${Math.round((performance.totalTasksCompleted / performance.totalTasksAssigned) * 100)}%`
    : "0%";


  // Bar chart data and options (remain unchanged as per request)
  // Ensure the bar chart still uses 'performance' data directly if it's available.
  const barData = {
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
  };

  const barOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, max: 100 } }
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
              className="p-2 border rounded-full w-[100px]  text-center border-gray-500 shadow-sm bg-white hover:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-600"
              placeholder="Year"
            />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="p-2 border rounded-full border-gray-500 shadow-sm w-[100px] text-center bg-white hover:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-600"
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
          className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6 justify-items-center"
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
          className="grid grid-cols-1 md:grid-cols-2 gap-6 justify-items-center"
        >
          {/* Custom Doughnut Chart */}
          <motion.div
            className="bg-white p-6 rounded-2xl shadow-lg   flex flex-col items-center justify-center relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              width: '494px',
              height: '300px',
              borderRadius: '16.46px',
            }}
          >
            <h2 className="text-xl font-medium text-gray-700 mb-4">Task Overview</h2>
            <div className="flex w-full justify-center items-center">
              <CustomDoughnutChart
                data={customDoughnutData}
                colors={customDoughnutColors}
                chartSize={200} // Adjust size to fit well within the card, maybe slightly smaller
                strokeThickness={30} // Adjust for desired thickness
                gapDegrees={3} // Adjust for desired gap between segments
              />
              <div
                className="absolute flex flex-col items-center justify-center pointer-events-none"
                style={{
                  top: "58%",
                  left: "30%", // Adjust this based on legend position and chart size
                  transform: "translate(-50%, -50%)",
                  width: "fit-content",
                }}
              >
                <span className="text-sm text-gray-500">Completed</span>
                <span className="text-2xl font-bold text-gray-900">
                  {centerTextPercentage}
                </span>
              </div>
              {/* Legend for CustomDoughnutChart */}
              <div className="flex-shrink-0 flex flex-col justify-center pl-4 pr-4">
                <ul className="space-y-2">
                  {customDoughnutData.map((item, i) => (
                    <li key={item.name} className="flex items-center text-gray-600 text-sm">
                      <span
                        className="w-4 h-4 rounded-sm mr-2"
                        style={{ backgroundColor: customDoughnutColors[i % customDoughnutColors.length] }}
                      ></span>
                      {item.name}: {item.value}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Bar Chart (remains unchanged) */}
          <motion.div
            className="bg-white p-6 rounded-2xl shadow-lg "
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            style={{
              width: '485px',
              height: '300px',
              borderRadius: '14.3px',
            }}
          >
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Performance Metrics</h2>
            <Bar
              data={barData}
              options={barOptions}
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