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
import PropTypes from "prop-types";

// --- CustomDoughnutChart Component (unchanged from previous iterations) ---
const CustomDoughnutChart = ({
  data,
  colors,
  chartSize = 220, // Remains slightly larger for better visibility
  strokeThickness = 32, // Remains slightly thicker
  gapDegrees = 2,
  children,
}) => {
  const cx = chartSize / 2;
  const cy = chartSize / 2;
  const radius = chartSize / 2 - strokeThickness / 2;

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
    return `M${s.x.toFixed(3)} ${s.y.toFixed(3)} A${r.toFixed(
      3
    )} ${r.toFixed(3)} 0 ${laf} 0 ${e.x.toFixed(3)} ${e.y.toFixed(3)}`;
  };

  let angleAcc = 0;
  const slices = data.map((d, i) => {
    const val = d.value || 0;
    let ang = total ? (val / total) * 360 : 0;

    if (ang > 0 && total > 0) {
      ang = Math.max(0, ang - gapDegrees);
    }

    const path = describeArc(
      cx,
      cy,
      radius,
      angleAcc + gapDegrees / 2,
      angleAcc + ang + gapDegrees / 2
    );

    angleAcc += total ? (val / total) * 360 : 0;
    return { path, color: colors[i % colors.length], label: val, name: d.name };
  });

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: chartSize, height: chartSize }}
    >
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
      {children}
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
  children: PropTypes.node,
};
// --- END CustomDoughnutChart Component ---

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartDataLabels);

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
        console.error("Error fetching overview data:", err);
      }
    })();
  }, []);

  const cards = [
    {
      label: "Total Projects",
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
      label: "Total Tasks",
      value: overviewData.totalTasks,
      icon: <FaClone className="text-3xl text-pink-500" />,
      bg: "bg-pink-100",
    },
    {
      label: "Ongoing Tasks",
      value: overviewData.ongoingTasks,
      icon: <FaClipboardCheck className="text-3xl text-orange-500" />,
      bg: "bg-orange-100",
    },
    {
      label: "Completed Tasks",
      value: overviewData.completedTasks,
      icon: <FaClipboardCheck className="text-3xl text-green-500" />,
      bg: "bg-green-100",
    },
    {
      label: "Pending Tasks",
      value: overviewData.toDoTasks,
      icon: <FaClipboardList className="text-3xl text-yellow-500" />,
      bg: "bg-yellow-100",
    },
  ];

  const customDoughnutData = [
    { name: "Ongoing Tasks", value: overviewData.ongoingTasks || 0 },
    { name: "Completed Tasks", value: overviewData.completedTasks || 0 },
    { name: "Pending Tasks", value: overviewData.toDoTasks || 0 },
  ].filter((d) => d.value > 0);

  const customDoughnutColors = ["#41B6FF", "#752BdF", "#FBBF24"];

  const totalDisplayTasks = overviewData.ongoingTasks + overviewData.completedTasks + overviewData.toDoTasks;
  const centerTextPercentage = totalDisplayTasks > 0
    ? `${Math.round((overviewData.completedTasks / totalDisplayTasks) * 100)}%`
    : "0%";

  const barData = {
    labels: ["Ongoing Tasks", "Completed Tasks"],
    datasets: [
      {
        data: [overviewData.ongoingTasks, overviewData.completedTasks],
        backgroundColor: ["#3B82F6", "#10B981"],
        barThickness: 24,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      datalabels: {
        anchor: "end",
        align: "top",
        formatter: (value) => value,
        color: "#6B7280",
        font: {
          weight: "bold",
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#6B7280" },
      },
      y: {
        beginAtZero: true,
        ticks: { color: "#6B7280", stepSize: 1, precision: 0 },
        grid: { color: "#E5E7EB" },
      },
    },
  };

  return (
    <div className="min-h-screen  p-6 sm:p-8">
      {/* Changed max-w-7xl to max-w-full to allow full width expansion on zoom out */}
      <div className="w-full max-w-full mx-auto">
        <motion.h2
          className="text-3xl font-bold text-gray-900 mb-6 text-center font-poppins"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Analytics Dashboard
        </motion.h2>

        {/* Cards: Consistent 3 columns for md screens and above, naturally expanding width */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mb-6">
          {cards.map((c) => (
            <motion.div
              key={c.label}
              className="bg-white rounded-2xl p-6 shadow-md flex flex-col items-center text-center"
              whileHover={{ scale: 1.03 }}
            >
              <div
                className={`${c.bg} p-4 rounded-full mb-4 flex items-center justify-center`}
              >
                {c.icon}
              </div>
              <p className="text-gray-500 text-sm mb-1">{c.label}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                <CountUp end={c.value} duration={2} separator="," />
              </p>
            </motion.div>
          ))}
        </div>

        {/* Charts: Remain side-by-side on lg screens and above, expanding with container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Left Doughnut */}
          <motion.div
            className="bg-white rounded-2xl p-6 shadow-md flex flex-col items-center justify-center relative w-full h-[300px]"
            whileHover={{ scale: 1.02 }}
          >
            <h3 className="text-lg font-medium text-gray-700 mb-4">
              Task Distribution
            </h3>
            <div className="flex w-full justify-center items-center h-full">
              <CustomDoughnutChart
                data={customDoughnutData}
                colors={customDoughnutColors}
                chartSize={220}
                strokeThickness={32}
                gapDegrees={3}
              >
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-sm text-gray-500">Completed</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {centerTextPercentage}
                  </span>
                </div>
              </CustomDoughnutChart>
              <div className="flex-shrink-0 flex flex-col justify-center pl-4 pr-4">
                <ul className="space-y-2">
                  {customDoughnutData.map((item, i) => (
                    <li
                      key={item.name}
                      className="flex items-center text-gray-600 text-sm"
                    >
                      <span
                        className="w-4 h-4 rounded-sm mr-2"
                        style={{
                          backgroundColor:
                            customDoughnutColors[i % customDoughnutColors.length],
                        }}
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
            className="bg-white rounded-2xl p-6 shadow-md w-full h-[300px]"
            whileHover={{ scale: 1.02 }}
          >
            <h3 className="text-lg font-medium text-gray-700 mb-4">
              Task Status
            </h3>
            <div className="relative h-[calc(100%-2rem)]">
              <Bar data={barData} options={barOptions} />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Reports;