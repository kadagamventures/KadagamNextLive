import { useState } from "react";
import { motion } from "framer-motion";
import StaffSidebar from "../../../components/sidebar";
import { Bar } from "react-chartjs-2";
import { tokenRefreshInterceptor as axiosInstance } from "../../../utils/axiosInstance";
import "chart.js/auto";
import {
  FaTasks, FaCheckCircle, FaClipboardList, FaClock, FaExclamationCircle,
  FaFlag, FaPlayCircle, FaCalendarCheck, FaCalendarTimes, FaFingerprint,
  FaAward, FaStar,
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
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${chartSize} ${chartSize}`}
      preserveAspectRatio="xMidYMid meet"
    >
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
    className="bg-white p-4 rounded-xl shadow-md flex flex-col items-center w-full"
  >
    <div className={`w-12 h-12 flex items-center justify-center rounded-full ${iconBg}`}>
      <Icon className={`text-2xl ${iconColor}`} />
    </div>
    <p className="text-gray-500 text-xs mt-2 text-center uppercase tracking-wide">{label}</p>
    <p className="text-gray-800 text-2xl font-semibold mt-1">{value}</p>
  </motion.div>
);

InfoBox.propTypes = {
  Icon: PropTypes.elementType.isRequired,
  iconBg: PropTypes.string.isRequired,
  iconColor: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

const StaffReport = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [searchTerm, setSearchTerm] = useState("");
  const [individualReport, setIndividualReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleSearchClick = async () => {
    if (!searchTerm.trim()) {
      setError("Please enter a valid Staff ID.");
      return;
    }

    setLoading(true);
    setError("");
    setIndividualReport(null);

    try {
      const res = await axiosInstance.get(
        `/performance/staff-by-staffId/${searchTerm.trim()}/monthly?year=${selectedYear}&month=${selectedMonth}`
      );
      setIndividualReport(res.data.success ? res.data.data : null);
    } catch {
      setError("No staff found with the entered ID.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center p-4 text-lg font-semibold">Loading...</div>;

  // --- Data for Doughnut Chart (Overall Performance Score) ---
  const overallScore = individualReport?.overallPerformanceScore || 0;
  const remainingScore = 100 - overallScore; // Assuming score is out of 100

  const overallPerformanceDoughnutData = [
    { name: "Overall Score", value: overallScore },
    { name: "Remaining", value: remainingScore > 0 ? remainingScore : 0 } // Ensure remaining is not negative
  ];
  const overallPerformanceDoughnutColors = ["#8B5CF6", "#E5E7EB"]; // Purple for score, light gray for remaining


  // --- Data for Bar Chart (Other Performance Metrics - excluding Overall as it's in Doughnut) ---
  const performanceMetricsLabels = ["Completion %", "On-Time %", "Attendance %", "Success %"];
  const performanceMetricsValues = individualReport ? [
    individualReport.taskCompletionRate,
    individualReport.onTimeCompletionRate,
    individualReport.attendancePercentage,
    individualReport.successRate,
  ] : [];
  const performanceColors = ["#3B82F6", "#10B981", "#F59E0B", "#6366F1"]; // Keep consistent colors


  return (
    <div className="flex min-h-screen ">
      <StaffSidebar />
      <div className="flex-grow px-6 py-8 mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4"
        >
          <h1 className="text-3xl font-bold text-gray-800">Staff Performance Report</h1>
          <div className="flex flex-wrap justify-center md:justify-end gap-3 w-full md:w-auto">
            <input
              type="text"
              placeholder="Search by ID"
              className="p-2 border rounded-full shadow-sm bg-white flex-grow md:flex-none"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIndividualReport(null);
                setError("");
              }}
            />
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="p-2 border rounded-full shadow-sm bg-white w-24"
              placeholder="Year"
            />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="p-2 border rounded-full shadow-sm bg-white w-32"
            >
              {monthNames.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-full shadow hover:bg-blue-700 flex-grow md:flex-none"
              onClick={handleSearchClick}
            >
              Search
            </button>
          </div>
        </motion.div>

        {error && <div className="text-red-600 text-center font-medium mb-4">{error}</div>}

        {individualReport ? (
          <motion.div
            key={individualReport.staffId}
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="bg-white p-6 rounded-xl shadow-md mb-8"
          >
            <h2 className="text-xl font-semibold text-gray-700 mb-4">{individualReport.staffName || individualReport.name}&#39;s Performance</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 justify-items-center">
              <InfoBox Icon={FaTasks} iconBg="bg-pink-100" iconColor="text-pink-500" label="Total Tasks Assigned" value={individualReport.totalTasksAssigned} />
              <InfoBox Icon={FaCheckCircle} iconBg="bg-green-100" iconColor="text-green-500" label="Tasks Completed" value={individualReport.totalTasksCompleted} />
              <InfoBox Icon={FaClipboardList} iconBg="bg-teal-100" iconColor="text-teal-500" label="Completion Rate" value={`${individualReport.taskCompletionRate}%`} />
              <InfoBox Icon={FaClock} iconBg="bg-blue-100" iconColor="text-blue-500" label="On-Time Completion" value={`${individualReport.onTimeCompletionRate}%`} />
              <InfoBox Icon={FaExclamationCircle} iconBg="bg-yellow-100" iconColor="text-yellow-500" label="Overdue Tasks" value={individualReport.overdueTasks} />
              <InfoBox Icon={FaFlag} iconBg="bg-red-100" iconColor="text-red-500" label="High Priority" value={individualReport.highPriorityTasksCompleted} />
              <InfoBox Icon={FaPlayCircle} iconBg="bg-orange-100" iconColor="text-orange-500" label="Ongoing Tasks" value={individualReport.ongoingTasks} />
              <InfoBox Icon={FaCalendarCheck} iconBg="bg-green-100" iconColor="text-green-500" label="Present Days" value={individualReport.totalDaysPresent} />
              <InfoBox Icon={FaCalendarTimes} iconBg="bg-red-100" iconColor="text-red-500" label="Absent Days" value={individualReport.totalDaysAbsent} />
              <InfoBox Icon={FaFingerprint} iconBg="bg-lime-100" iconColor="text-lime-500" label="Attendance %" value={`${individualReport.attendancePercentage}%`} />
              <InfoBox Icon={FaAward} iconBg="bg-purple-100" iconColor="text-purple-500" label="Success Rate" value={`${individualReport.successRate}%`} />
              <InfoBox Icon={FaStar} iconBg="bg-blue-100" iconColor="text-blue-500" label="Overall Score" value={`${individualReport.overallPerformanceScore}%`} />
            </div>

            <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-8 justify-items-center">
              {/* Doughnut Chart Section (Now showing Overall Performance Score) */}
              <motion.div
                className="bg-white p-6 rounded-2xl shadow-lg w-full flex flex-col items-center"
              >
                <h2 className="text-xl font-medium text-gray-700 mb-4">Overall Performance</h2>
                <div className="relative flex items-center justify-center w-full" style={{ height: '250px' }}>
                  <div className="w-full h-full relative max-w-[200px] max-h-[200px]">
                    <CustomDoughnutChart
                      data={overallPerformanceDoughnutData}
                      colors={overallPerformanceDoughnutColors}
                      chartSize={200}
                      strokeThickness={28}
                      gapDegrees={2}
                    />
                    <div
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none"
                    >
                      <span className="text-center text-lg font-bold text-gray-900">
                        {overallScore}%
                      </span>
                      <span className="text-center text-xs text-gray-500 mt-1">Score</span>
                    </div>
                  </div>
                  {/* Manual Legend for CustomDoughnutChart */}
                  <div className="flex-shrink-0 flex flex-col justify-center pl-4 pr-4">
                    <ul className="space-y-2">
                      {overallPerformanceDoughnutData.map((item, i) => (
                        <li key={item.name} className="flex items-center text-gray-600 text-sm">
                          <span
                            className="w-4 h-4 rounded-sm mr-2"
                            style={{ backgroundColor: overallPerformanceDoughnutColors[i] }}
                          ></span>
                          {item.name}: {item.value}%
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>

              {/* Bar Chart Section (Now showing other key Performance Metrics) */}
              <motion.div className="bg-white p-6 rounded-2xl shadow-lg w-full flex flex-col">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Key Performance Metrics</h2>
                <div className="relative w-full" style={{ height: '300px' }}>
                  <Bar
                    data={{
                      labels: performanceMetricsLabels,
                      datasets: [{
                        data: performanceMetricsValues,
                        backgroundColor: performanceColors
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: { y: { beginAtZero: true, max: 100 } }
                    }}
                  />
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        ) : (
          <div className="text-center p-4 text-gray-600 text-lg font-semibold">
            Please search with a valid staff ID to view their performance.
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffReport;