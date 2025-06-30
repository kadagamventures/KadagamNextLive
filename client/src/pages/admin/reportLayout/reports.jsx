import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
// IMPORTANT: Import your configured axios instance with interceptors
// In src/pages/admin/reportLayout/reports.jsx
import { tokenRefreshInterceptor as axiosInstance } from '../../../utils/axiosInstance'; // <--- Make sure this path is correct

import {
  FaProjectDiagram,
  FaUsers,
  FaClone,
  FaClipboardCheck,
  FaClipboardList,
} from "react-icons/fa";
import CountUp from "react-countup";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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
      name: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
    })
  ).isRequired,
  colors: PropTypes.arrayOf(PropTypes.string).isRequired,
  chartSize: PropTypes.number,
  strokeThickness: PropTypes.number,
  gapDegrees: PropTypes.number,
};

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
    const fetchOverviewData = async () => {
      try {
        // *** THE FIX IS HERE: Use "accessToken" consistently ***
        const token = localStorage.getItem("accessToken"); // <--- CHANGED FROM "token" to "accessToken"

        if (!token) {
          console.warn("🚫 No authentication token found in localStorage. Please ensure user is logged in.");
          // Optionally, redirect to login or show a message to the user
          // window.location.href = "/admin/login"; // Uncomment if you want immediate redirect
          return; // Crucial: Exit if no token
        }

        console.log("Fetching overview data from:", `${API_BASE_URL}/reports/overview`);
        console.log("Using token:", token ? "Token present" : "No token");

        // Use the imported axiosInstance (tokenRefreshInterceptor) here
        const res = await axiosInstance.get(`${API_BASE_URL}/reports/overview`); // <--- Using axiosInstance

        console.log("API Response:", res.data);

        if (res.data.success) {
          const d = res.data.data;
          console.log("Received data (d):", d);
          setOverviewData({
            totalProjects: d.totalProjects || 0,
            totalStaff: d.totalStaff || 0,
            totalTasks: d.totalTasks || 0,
            ongoingTasks: d.ongoingTasks || 0,
            completedTasks: d.completedTasks || 0,
            toDoTasks: d.toDoTasks || 0,
          });
          console.log("Overview data updated:", {
            totalProjects: d.totalProjects || 0,
            totalStaff: d.totalStaff || 0,
            totalTasks: d.totalTasks || 0,
            ongoingTasks: d.ongoingTasks || 0,
            completedTasks: d.completedTasks || 0,
            toDoTasks: d.toDoTasks || 0,
          });
        } else {
          console.error("API call was successful but 'success' flag is false:", res.data.message);
        }
      } catch (err) {
        console.error("❌ Failed to fetch overview data:", err);
        if (err.response) {
          console.error("Error Response Data:", err.response.data);
          console.error("Error Response Status:", err.response.status);
          if (err.response.status === 401 || err.response.status === 403) {
            console.error("Authentication/Authorization error. Dispatching logout event.");
            // If the interceptor didn't handle it (e.g., if token was just missing, not expired),
            // manually dispatch logout to ensure clean state and redirect.
            window.dispatchEvent(new CustomEvent("auth:logout", { detail: { reason: "Session expired or invalid. Please log in again." } }));
          }
        } else if (err.request) {
          console.error("Error Request (No response received):", err.request);
        } else {
          console.error("Error Message:", err.message);
        }
      }
    };

    fetchOverviewData();
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

  const customDoughnutChartData = [
    { name: "Total Project", value: overviewData.totalProjects },
    { name: "Total Task", value: overviewData.totalTasks },
    { name: "Total Staff", value: overviewData.totalStaff },
  ];

  const customDoughnutColors = ["#41B6FF", "#FF4C80", "#752BdF"];

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
      y: {
        grid: { color: "#E5E7EB" },
        ticks: { color: "#6B7280", beginAtZero: true, stepSize: 1 },
        max: Math.max(overviewData.ongoingTasks, overviewData.completedTasks, 5) * 1.2,
      },
    },
    maintainAspectRatio: false,
  };

  const totalRelevantData = overviewData.totalProjects + overviewData.totalStaff + overviewData.totalTasks;
  const higherRateValue = overviewData.totalStaff;
  const centerPercentage = totalRelevantData
    ? Math.round((higherRateValue / totalRelevantData) * 100) + "%"
    : "0%";

  return (
    <div className="min-h-screen p-8">
      <motion.h2
        className="text-3xl items-center font-bold text-gray-900 mb-6 pb-6 text-center font-poppins font-weight-500 size-32px"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Analytics Dashboard
      </motion.h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div
          className="bg-white p-6 shadow-md flex flex-col justify-between"
          style={{
            borderRadius: '16.46px',
          }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex-1 flex flex-col items-center justify-center">
            <h3 className="text-lg font-medium text-gray-700 mb-4 text-center">
              Project, Staff, Task
            </h3>
            <div className="relative flex items-center justify-center w-full max-w-[200px] aspect-square">
              <CustomDoughnutChart
                data={customDoughnutChartData}
                colors={customDoughnutColors}
                chartSize={200}
                strokeThickness={28}
                gapDegrees={2}
              />
              <div
                className="absolute flex flex-col items-center justify-center pointer-events-none"
                style={{
                  top: "50%",
                  left: "50%",
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
          </div>

          <div className="mt-6">
            <ul className="space-y-2 flex flex-wrap justify-center">
              {customDoughnutChartData.map((item, i) => (
                <li key={item.name} className="flex items-center text-gray-600 px-2 py-1">
                  <span
                    className="w-4 h-4 rounded-sm mr-2"
                    style={{ backgroundColor: customDoughnutColors[i % customDoughnutColors.length] }}
                  ></span>
                  {item.name} - {item.value}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        <motion.div
          className="bg-white p-6 shadow-md"
          style={{
            borderRadius: '14.3px',
          }}
          whileHover={{ scale: 1.02 }}
        >
          <h3 className="text-lg font-medium text-gray-700 mb-4">Task</h3>
          <div className="relative h-[250px] w-full">
            <Bar data={barData} options={barOptions} />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Reports;