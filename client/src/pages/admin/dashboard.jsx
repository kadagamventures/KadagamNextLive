import { useState, useEffect } from "react";
import {
  FaProjectDiagram,
  FaUsers,
  FaTasks,
  FaSpinner, // Ongoing Task
  FaCheckCircle, // Completed Task
} from "react-icons/fa";
import NotificationBell from "../../components/notificationBell";
import { tokenRefreshInterceptor as axiosInstance } from "../../utils/axiosInstance";
import tasksIcon from "../../assets/icons/task-icon.png";
import boltIcon from "../../assets/icons/bolt-icon.png";

const Dashboard = () => {
  const [overviewData, setOverviewData] = useState([]);
  const [taskChartData, setTaskChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [ovRes, chRes] = await Promise.all([
        axiosInstance.get("/dashboard/overview"),
        axiosInstance.get("/dashboard/charts"),
      ]);
      const ov = ovRes.data.data;
      const ch = chRes.data.data;

      // Always set cards in the correct order:
      setOverviewData([
        { name: "Total Project", value: ov.totalProjects || 0 },
        { name: "Total Staff", value: ov.totalStaff || 0 },
        { name: "Total Tasks", value: ov.totalTasks || 0 },
        { name: "Ongoing Task", value: ov.ongoingTasks || 0 },
        { name: "Completed Task", value: ov.completedTasks || 0 },
      ]);

      // Task chart always has all three segments
      const ongoing = ch.pieData.find(d => d.name === "Ongoing")?.value || 0;
      const todoOrPending = (ch.pieData.find(d => d.name === "To Do")?.value || 0) +
        (ch.pieData.find(d => d.name === "Pending")?.value || 0);
      const completed = ch.pieData.find(d => d.name === "Completed")?.value || 0;

      setTaskChartData([
        { name: "Ongoing Task", value: Number(ongoing) },
        { name: "Pending", value: Number(todoOrPending) },
        { name: "Completed Task", value: Number(completed) },
      ]);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="bg-gray-100 p-4 sm:p-6 lg:pl-64 min-h-screen lg:pr-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 sm:mb-6">
        <div className="w-full px-4 lg:px-12">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            Welcome, Kadagam Ventures
          </h1>
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mt-2 sm:mt-4">
            Analytics Overview
          </h2>
        </div>
        <NotificationBell />
      </div>

      {error && (
        <div className="text-center text-red-500 font-medium mb-4 sm:mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-600">Loading...</p>
      ) : (
        <>
          {/* Top 5 cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-8 mb-4 sm:mb-8 px-4 lg:px-12">
            {[FaProjectDiagram, FaUsers, FaTasks, FaSpinner, FaCheckCircle].map(
              (Icon, i) => (
                <OverviewCard
                  key={i}
                  className="w-full"
                  icon={<Icon />}
                  label={[
                    "Total Project",
                    "Total Staff",
                    "Total Tasks",
                    "Ongoing Task",
                    "Completed Task",
                  ][i]}
                  value={overviewData[i]?.value || 0}
                  bgColor={[
                    "bg-blue-200",
                    "bg-purple-200",
                    "bg-pink-200",
                    "bg-orange-200",
                    "bg-green-200",
                  ][i]}
                  iconColor={[
                    "text-blue-600",
                    "text-purple-600",
                    "text-pink-600",
                    "text-orange-600",
                    "text-green-600",
                  ][i]}
                />
              )
            )}
          </div>

          {/* Bottom charts row */}
          <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-8 px-4 lg:px-12">
            {/* Task Distribution Donut Chart */}
            <div className="w-full lg:w-3/5 flex-1 min-w-0 min-h-full">
              <TaskDistributionDonut
                data={taskChartData}
                size={240}
                radius={100}
                strokeWidth={24}
                fontSize={16}
                iconSize={32}
              />
            </div>
            {/* Dashboard Overview Donut Chart */}
            <div className="w-full lg:w-3/5 flex-1 min-w-0 min-h-full">
              <OverviewDonut
                overviewData={overviewData}
                size={240}
                radius={100}
                strokeWidth={24}
                fontSize={16}
                iconSize={32}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;

// OverviewCard
const OverviewCard = ({
  className = "",
  icon,
  label,
  value,
  bgColor,
  iconColor,
}) => (
  <div className={`bg-white rounded-xl shadow-lg p-6 sm:p-8 text-center ${className}`}>
    <div
      className={`mx-auto mb-3 sm:mb-4 h-12 w-12 sm:h-16 sm:w-16 flex items-center justify-center rounded-full ${bgColor}`}
    >
      <div className={`${iconColor} text-xl sm:text-2xl`}>{icon}</div>
    </div>
    <div className="text-2xl sm:text-3xl font-bold text-gray-800">{value}</div>
    <div className="text-sm sm:text-base font-medium text-gray-600 mt-1">{label}</div>
  </div>
);

// TaskDistributionDonut: Always shows Ongoing, Pending, Completed
const TaskDistributionDonut = ({
  data,
  size = 240,
  radius = 100,
  strokeWidth = 24,
  fontSize = 16,
  iconSize = 32,
}) => {
  const COLORS = ["#FF9800", "#F44336", "#4CAF50"];
  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);

  const cx = size / 2;
  const cy = size / 2;
  const iconX = cx - iconSize / 2;
  const iconY = cy - iconSize / 2;

  const toRad = deg => ((deg - 90) * Math.PI) / 180;
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
    const ang = total ? (val / total) * 360 : 0;
    const path = describeArc(cx, cy, radius, angleAcc, angleAcc + ang);
    const mid = polarToCartesian(cx, cy, radius, angleAcc + ang / 2);
    angleAcc += ang;
    return { path, color: COLORS[i], label: val, x: mid.x, y: mid.y, name: d.name };
  });

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 sm:p-12 h-full flex flex-col">
      <h3 className="text-xl sm:text-3xl font-semibold mb-2 sm:mb-4">Task Distribution</h3>
      <div className="flex-1 flex flex-col sm:flex-row">
        {/* Left: labels */}
        <ul className="flex-1 flex flex-col justify-center space-y-2 sm:space-y-3 mb-4 sm:mb-0">
          {slices.map((s, i) => (
            <li key={i} className="flex items-center text-base sm:text-lg">
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full mr-2 sm:mr-3" style={{ backgroundColor: s.color }} />
              <span className="text-gray-600">{s.name}</span>
            </li>
          ))}
        </ul>
        {/* Right: donut chart */}
        <div className="flex-1 flex items-center justify-center">
          {total === 0 ? (
            <div className="text-gray-500 text-lg font-medium text-center">
              No tasks to display.
              <br />
              <img src={tasksIcon} alt="Tasks Icon" className={`mx-auto mt-2 w-[${iconSize}px] h-[${iconSize}px] opacity-50`} />
            </div>
          ) : (
            <svg className="w-full h-auto" viewBox={`0 0 ${size} ${size}`}>
              {slices.map((s, i) => (
                <path
                  key={i}
                  d={s.path}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                />
              ))}
              {slices.map((s, i) => (
                <text
                  key={i}
                  x={s.x}
                  y={s.y}
                  fill="#fff"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={fontSize}
                  fontWeight="bold"
                >
                  {s.label}
                </text>
              ))}
              <image key="tasks-icon-main" href={tasksIcon} x={iconX} y={iconY} width={iconSize} height={iconSize} />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};

// OverviewDonut: Excludes "Completed Task"
const OverviewDonut = ({
  overviewData,
  size = 240,
  radius = 100,
  strokeWidth = 24,
  fontSize = 16,
  iconSize = 32,
}) => {
  // Only use the first 4 items (order guaranteed in overviewData above)
  const filteredData = overviewData.slice(0, 4);

  const COLORS = ["#29B6F6", "#AB47BC", "#FF4081", "#FF9800"];
  const labels = ["Total Project", "Total Staff", "Total Tasks", "Ongoing Task"];
  const total = filteredData.reduce((sum, d) => sum + (d.value || 0), 0);

  const cx = size / 2;
  const cy = size / 2;
  const iconX = cx - iconSize / 2;
  const iconY = cy - iconSize / 2;

  const toRad = deg => ((deg - 90) * Math.PI) / 180;
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

  let acc = 0;
  const slices = filteredData.map((d, i) => {
    const val = d.value || 0;
    const ang = total ? (val / total) * 360 : 0;
    const path = describeArc(cx, cy, radius, acc, acc + ang);
    const mid = polarToCartesian(cx, cy, radius, acc + ang / 2);
    acc += ang;
    return { path, color: COLORS[i], label: val, x: mid.x, y: mid.y, name: labels[i] };
  });

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 sm:p-12 h-full flex flex-col">
      <h3 className="text-xl sm:text-3xl font-semibold mb-2 sm:mb-4">Dashboard Overview</h3>
      <div className="flex-1 flex flex-col sm:flex-row">
        {/* Left: labels */}
        <ul className="flex-1 flex flex-col justify-center space-y-2 sm:space-y-3 mb-4 sm:mb-0">
          {slices.map((s, i) => (
            <li key={i} className="flex items-center text-base sm:text-lg">
              <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full mr-2 sm:mr-3" style={{ backgroundColor: s.color }} />
              <span className="text-gray-700">{s.name}</span>
            </li>
          ))}
        </ul>
        {/* Right: donut chart */}
        <div className="flex-1 flex items-center justify-center">
          {total === 0 ? (
            <div className="text-gray-500 text-lg font-medium text-center">
              No overview data to display.
              <br />
              <img src={boltIcon} alt="Overview Icon" className={`mx-auto mt-2 w-[${iconSize}px] h-[${iconSize}px] opacity-50`} />
            </div>
          ) : (
            <svg className="w-full h-auto" viewBox={`0 0 ${size} ${size}`}>
              {slices.map((s, i) => (
                <path
                  key={i}
                  d={s.path}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                />
              ))}
              {slices.map((s, i) => (
                <text
                  key={i}
                  x={s.x}
                  y={s.y}
                  fill="#fff"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={fontSize}
                  fontWeight="bold"
                >
                  {s.label}
                </text>
              ))}
              <image key="bolt-icon-main" href={boltIcon} x={iconX} y={iconY} width={iconSize} height={iconSize} />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};
