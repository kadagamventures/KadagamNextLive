import { useState, useEffect } from "react";
import {
  FaProjectDiagram,
  FaUsers,
  FaTasks,
  FaSpinner,
  FaCheckCircle,
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

      setOverviewData([
        { name: "Total Project", value: ov.totalProjects },
        { name: "Total Staff", value: ov.totalStaff },
        { name: "Total Tasks", value: ov.totalTasks },
        { name: "Ongoing Task", value: ov.ongoingTasks },
        { name: "Completed Task", value: ov.completedTasks },
      ]);

      setTaskChartData([
        {
          name: "Ongoing Task",
          value: ch.pieData.find((d) => d.name === "Ongoing")?.value || 0,
        },
        {
          name: "Pending",
          value:
            ch.pieData.find((d) => d.name === "To Do")?.value ||
            ch.pieData.find((d) => d.name === "Pending")?.value ||
            0,
        },
        {
          name: "Completed Task",
          value: ch.pieData.find((d) => d.name === "Completed")?.value || 0,
        },
      ]);
    } catch {
      setError("Failed to load dashboard data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="bg-gray-100 min-h-screen p-4 md:p-6 lg:px-12 lg:pl-64">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome, Kadagam Ventures
          </h1>
          <h2 className="text-xl font-medium text-gray-600">
            Analytics Overview
          </h2>
        </div>
        <div className="self-start mt-1">
          <NotificationBell />
        </div>
      </div>

      {error && (
        <div className="text-center text-red-500 font-medium mb-6">{error}</div>
      )}

      {loading ? (
        <p className="text-center text-gray-600">Loading...</p>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            {[FaProjectDiagram, FaUsers, FaTasks, FaSpinner, FaCheckCircle].map(
              (Icon, i) => (
                <OverviewCard
                  key={i}
                  className="w-[190px] h-[222px]"
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

          {/* Charts */}
          <div className="flex flex-col lg:flex-row gap-6 justify-center">
            <div className="w-full lg:w-[416px] h-[430px]">
              <TaskDistributionDonut data={taskChartData} />
            </div>
            <div className="w-full lg:w-[620px] h-[430px]">
              <OverviewDonut data={overviewData} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;

// OverviewCard Component
const OverviewCard = ({
  className = "",
  icon,
  label,
  value,
  bgColor,
  iconColor,
}) => (
  <div className={`bg-white rounded-xl shadow-lg p-8 text-center ${className}`}>
    <div
      className={`mx-auto mb-4 h-16 w-16 flex items-center justify-center rounded-full ${bgColor}`}
    >
      <div className={`${iconColor} text-2xl`}>{icon}</div>
    </div>
    <div className="text-3xl font-bold text-gray-800">{value}</div>
    <div className="text-base font-medium text-gray-600 mt-1">{label}</div>
  </div>
);

// TaskDistributionDonut Component
const TaskDistributionDonut = ({ data }) => {
  const COLORS = ["#FF9800", "#F44336", "#4CAF50"];
  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
  const size = 180,
    cx = 90,
    cy = 90,
    radius = 70,
    strokeWidth = 20;
  const toRad = (deg) => ((deg - 90) * Math.PI) / 180;
  const polarToCartesian = (cx, cy, r, deg) => ({
    x: cx + r * Math.cos(toRad(deg)),
    y: cy + r * Math.sin(toRad(deg)),
  });
  const describeArc = (cx, cy, r, start, end) => {
    const s = polarToCartesian(cx, cy, r, end);
    const e = polarToCartesian(cx, cy, r, start);
    const laf = end - start <= 180 ? "0" : "1";
    return `M${s.x} ${s.y} A${r} ${r} 0 ${laf} 0 ${e.x} ${e.y}`;
  };

  let angleAcc = 0;
  const slices = data.map((d, i) => {
    const ang = total ? (d.value / total) * 360 : 0;
    const path = describeArc(cx, cy, radius, angleAcc, angleAcc + ang);
    const mid = polarToCartesian(cx, cy, radius, angleAcc + ang / 2);
    angleAcc += ang;
    return { path, color: COLORS[i], label: d.value, x: mid.x, y: mid.y, name: d.name };
  });

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 h-full flex flex-col">
      <h3 className="text-3xl font-semibold mb-6">Task Distribution</h3>
      <div className="flex-1 flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
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
              fontSize={14}
              fontWeight="bold"
            >
              {s.label}
            </text>
          ))}
          <image href={tasksIcon} x={cx - 12} y={cy - 12} width={24} height={24} />
        </svg>
      </div>
      <ul className="mt-6 space-y-2">
        {slices.map((s, i) => (
          <li key={i} className="flex items-center text-lg">
            <span className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: s.color }} />
            <span className="text-gray-600">{s.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// OverviewDonut Component
const OverviewDonut = ({ data }) => {
  const COLORS = ["#29B6F6", "#AB47BC", "#FF4081", "#FF9800", "#4CAF50"];
  const labels = ["Total Project", "Total Staff", "Total Tasks", "Ongoing Task", "Completed Task"];
  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
  const size = 240,
    cx = 120,
    cy = 120,
    radius = 100,
    strokeWidth = 24;
  const toRad = (deg) => ((deg - 90) * Math.PI) / 180;
  const polarToCartesian = (cx, cy, r, deg) => ({
    x: cx + r * Math.cos(toRad(deg)),
    y: cy + r * Math.sin(toRad(deg)),
  });
  const describeArc = (cx, cy, r, start, end) => {
    const s = polarToCartesian(cx, cy, r, end);
    const e = polarToCartesian(cx, cy, r, start);
    const laf = end - start <= 180 ? "0" : "1";
    return `M${s.x} ${s.y} A${r} ${r} 0 ${laf} 0 ${e.x} ${e.y}`;
  };

  let angleAcc = 0;
  const slices = data.map((d, i) => {
    const ang = total ? (d.value / total) * 360 : 0;
    const path = describeArc(cx, cy, radius, angleAcc, angleAcc + ang);
    const mid = polarToCartesian(cx, cy, radius, angleAcc + ang / 2);
    angleAcc += ang;
    return {
      path,
      color: COLORS[i],
      label: d.value,
      x: mid.x,
      y: mid.y,
      name: labels[i],
    };
  });

  return (
    <div className="bg-white rounded-xl shadow-lg p-12 h-full flex flex-col">
      <h3 className="text-3xl font-semibold mb-4">Dashboard Overview</h3>
      <div className="flex-1 flex">
        <ul className="flex-1 flex flex-col justify-center space-y-3">
          {slices.map((s, i) => (
            <li key={i} className="flex items-center text-lg">
              <span className="w-5 h-5 rounded-full mr-3" style={{ backgroundColor: s.color }} />
              <span className="text-gray-700">{s.name}</span>
            </li>
          ))}
        </ul>
        <div className="flex-1 flex items-center justify-center">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
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
                fontSize={16}
                fontWeight="bold"
              >
                {s.label}
              </text>
            ))}
            <image href={boltIcon} x={cx - 16} y={cy - 16} width={32} height={32} />
          </svg>
        </div>
      </div>
    </div>
  );
};
