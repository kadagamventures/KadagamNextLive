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

    // For label positioning (not directly used for on-segment labels here)
    // const mid = polarToCartesian(cx, cy, radius, angleAcc + ang / 2);

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
    // Reverted to original API call to fetch live data
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
        // Optionally, set error state or show a message to the user
      }
    })();
  }, []); // Empty dependency array means this runs once on mount

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

  // Data for the CustomDoughnutChart will now use live overviewData
  // Ensure the data format matches what CustomDoughnutChart expects: [{name: 'label', value: number}]
  // The order here also dictates the order in the legend.
  const customDoughnutChartData = [
    { name: "Total Project", value: overviewData.totalProjects },
    { name: "Total Task", value: overviewData.totalTasks },
    { name: "Total Staff", value: overviewData.totalStaff },
  ];

  // Colors matching your image: Light Blue, Pink, Purple
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
        ticks: { color: "#6B7280", beginAtZero: true, stepSize: 1 }, // Ensure y-axis starts at 0 and has integer steps
        max: Math.max(overviewData.ongoingTasks, overviewData.completedTasks, 5) * 1.2, // Dynamic max, ensure at least 5 to prevent cramped chart with small numbers
      },
    },
    maintainAspectRatio: false,
  };

  // Calculate the percentage for the center text (Higher Rate)
  const totalRelevantData = overviewData.totalProjects + overviewData.totalStaff + overviewData.totalTasks;
  // Based on the image, "Higher Rate" seems to be for Total Staff (69%)
  // Adjust calculation if "Higher Rate" is for a different metric.
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Doughnut (now using CustomDoughnutChart) */}
        <motion.div
          className="bg-white p-6 shadow-md relative flex" // Use flex to align chart and legend
          style={{
            width: '435px', // Explicit width
            height: '276px', // Explicit height
            borderRadius: '16.46px', // Explicit border-radius
          }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex-1"> {/* This div contains the title and chart */}
            <h3 className="text-lg font-medium text-gray-700 mb-4">
              Project, Staff, Task
            </h3>
            <div className="relative flex items-center justify-center" style={{ height: 'calc(100% - 2rem)' }}> {/* Adjusted height for chart container */}
              <CustomDoughnutChart
                data={customDoughnutChartData}
                colors={customDoughnutColors}
                chartSize={200} // Adjust chartSize to fit within the new explicit height
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

          {/* Right side Legend */}
          <div className="flex-shrink-0 flex flex-col justify-center pl-8 pr-4"> {/* Added padding for spacing */}
            <ul className="space-y-2">
              {customDoughnutChartData.map((item, i) => (
                <li key={item.name} className="flex items-center text-gray-600">
                  <span
                    className="w-4 h-4 rounded-sm mr-2" // Rounded-sm for square-ish shape
                    style={{ backgroundColor: customDoughnutColors[i % customDoughnutColors.length] }}
                  ></span>
                  {item.name} - {item.value}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* Right Bar */}
        <motion.div
          className="bg-white  p-6 shadow-md"
          style={{
            width: '429px', // Explicit width
            height: '277px', // Explicit height
            borderRadius: '14.3px', // Explicit border-radius
          }}
          whileHover={{ scale: 1.02 }}
        >
          <h3 className="text-lg font-medium text-gray-700 mb-4">Task</h3>
          <div className="relative" style={{ height: 'calc(100% - 2rem)' }}> {/* Adjusted height for chart container */}
            <Bar data={barData} options={barOptions} />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Reports;