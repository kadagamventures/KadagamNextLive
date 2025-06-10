import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { useEffect, useState } from "react";
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
import PropTypes from "prop-types"; // Import PropTypes for the CustomDoughnutChart

// --- CustomDoughnutChart Component (Copied from previous task) ---
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


ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartDataLabels
);

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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
        console.error(err);
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

  // --- Data for CustomDoughnutChart (Updated) ---
  const customDoughnutData = [
    { name: "Total Tasks", value: overviewData.totalTasks || 0 },
    { name: "Ongoing Tasks", value: overviewData.ongoingTasks || 0 },
    { name: "Completed Tasks", value: overviewData.completedTasks || 0 },
  ];

  // Colors for the custom doughnut chart (keeping original-like colors, adjusting as needed)
  const customDoughnutColors = ["#FF4C80", "#41B6FF", "#752BdF"]; // Using colors from the original doughnut for consistency, but reordered for the new labels

  // Calculate percentage for center text based on completion rate of tasks
  const centerTextPercentage = overviewData.totalTasks > 0
    ? `${Math.round((overviewData.completedTasks / overviewData.totalTasks) * 100)}%`
    : "0%";

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
      y: { grid: { color: "#E5E7EB" }, ticks: { color: "#6B7280" } },
    },
    maintainAspectRatio: false,
  };

  return (
    <div className="min-h-screen bg-gray-50  p-8">
      <motion.h2
        className="text-3xl items-center font-bold text-gray-900 mb-6 pb-6 text-center font-poppins font-weight-500 size-32px"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Analytics Dashboard
      </motion.h2>

      {/* Six Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
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
        {/* Left Doughnut */}
        <motion.div
          className="bg-white rounded-2xl p-6 shadow-md relative flex flex-col items-center justify-center"
          whileHover={{ scale: 1.02 }}
          style={{
            width: '470px',
            height: '300px',
            borderRadius: '16.46px',
          }}
        >
          <h3 className="text-lg font-medium text-gray-700 mb-4">
            Task Distribution
          </h3>
          <div className="flex w-full justify-center items-center h-full"> {/* Ensure inner flex takes full height */}
            <CustomDoughnutChart
              data={customDoughnutData}
              colors={customDoughnutColors}
              chartSize={180} // Adjusted for better fit within the fixed height, can be fine-tuned
              strokeThickness={28}
              gapDegrees={3}
            />
            <div
              className="absolute flex flex-col items-center justify-center pointer-events-none"
              style={{
                top: "58%", // Adjusted top for vertical centering
                left: "32%", // Adjusted left to compensate for legend
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

        {/* Right Bar */}
        <motion.div
          className="bg-white rounded-2xl p-6 "
          whileHover={{ scale: 1.02 }}
          style={{
            width: '460px',
            height: '300px',
            borderRadius: '14.3px',
          }}
        >
          <h3 className="text-lg font-medium text-gray-700 mb-4">Task</h3>
          <div className="relative h-full"> {/* Changed to h-full to fill parent height */}
            <Bar data={barData} options={barOptions} />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Reports;