import { useEffect, useState } from "react";
import PropTypes from "prop-types";
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

// Import Bar chart specific elements, as we are still using the Bar chart
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

// Register only what's needed for the Bar chart
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
  const radius = (chartSize / 2) - (strokeThickness / 2); // Calculate radius based on size and stroke

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

    // Apply gap: reduce angle by half the gap on each side
    if (ang > 0 && total > 0) {
      ang = Math.max(0, ang - gapDegrees); // Ensure angle doesn't go negative
    }

    const path = describeArc(cx, cy, radius, angleAcc + gapDegrees / 2, angleAcc + ang + gapDegrees / 2); // Start after half gap, end before half gap

    angleAcc += (total ? (val / total) * 360 : 0); // Accumulate full angle for next segment's start
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
            strokeLinecap="round" // This gives the rounded ends on both sides
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
// --- END CustomDoughnutChart Component ---


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
        console.error("Failed to fetch overview data:", err);
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
    maintainAspectRatio: false, // Important for responsive charts with defined height
  };

  // Calculate the percentage for the center text (Higher Rate)
  const totalRelevantData = overviewData.totalProjects + overviewData.totalStaff + overviewData.totalTasks;
  const higherRateValue = overviewData.totalStaff;
  const centerPercentage = totalRelevantData
    ? Math.round((higherRateValue / totalRelevantData) * 100) + "%"
    : "0%";

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <motion.h2
        className="text-3xl items-center font-bold text-gray-900 mb-6 pb-6 text-center font-poppins font-weight-500 size-32px"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Analytics Dashboard
      </motion.h2>

      {/* Six Cards */}
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

      {/* Charts - Made Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Doughnut (now using CustomDoughnutChart) */}
        <motion.div
          className="bg-white p-6 shadow-md flex flex-col justify-between" // Changed to flex-col and justify-between
          style={{
            borderRadius: '16.46px',
            // Removed fixed width and height for responsiveness
          }}
          whileHover={{ scale: 1.02 }}
        >
          {/* Main content area (title + chart) */}
          <div className="flex-1 flex flex-col items-center justify-center"> {/* Use flex-1 to take available space, center items */}
            <h3 className="text-lg font-medium text-gray-700 mb-4 text-center">
              Project, Staff, Task
            </h3>
            {/* Chart container with aspect ratio */}
            <div className="relative flex items-center justify-center w-full max-w-[200px] aspect-square"> {/* Added max-w for chart size */}
              <CustomDoughnutChart
                data={customDoughnutChartData}
                colors={customDoughnutColors}
                chartSize={200} // This is the SVG viewBox size, it will scale to its container
                strokeThickness={28}
                gapDegrees={2}
              />
              {/* Center text for percentage */}
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

          {/* Legend at the bottom, now as a separate flex item */}
          <div className="mt-6"> {/* Added top margin to separate from chart */}
            <ul className="space-y-2 flex flex-wrap justify-center"> {/* Use flex-wrap and justify-center for legend items */}
              {customDoughnutChartData.map((item, i) => (
                <li key={item.name} className="flex items-center text-gray-600 px-2 py-1"> {/* Added px-2 py-1 for spacing between inline items */}
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

        {/* Right Bar Chart - Responsive */}
        <motion.div
          className="bg-white p-6 shadow-md"
          style={{
            borderRadius: '14.3px',
            // Removed fixed width and height for responsiveness
          }}
          whileHover={{ scale: 1.02 }}
        >
          <h3 className="text-lg font-medium text-gray-700 mb-4">Task</h3>
          {/* Chart.js requires a container with defined dimensions for responsiveness */}
          <div className="relative h-[250px] w-full">
            <Bar data={barData} options={barOptions} />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Reports;