import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import { tokenRefreshInterceptor as axiosInstance } from "../../../utils/axiosInstance";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";
import {
  FaCalendarAlt,
  FaDownload,
  FaUsers,
  FaUserCheck,
  FaUserTimes,
  FaUserClock,
  FaSignOutAlt,
  FaUserSlash,
} from "react-icons/fa";
import PropTypes from "prop-types";


// --- CustomDoughnutChart Component ---
// Modified to accept 'children' and provide a relative positioning context
const CustomDoughnutChart = ({ data, colors, chartSize = 240, strokeThickness = 28, gapDegrees = 2, children }) => {
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
    // This div serves as the relative container for both the SVG and the absolutely positioned children (your text).
    // It's explicitly sized to match the chart, ensuring accurate centering.
    <div className="relative flex items-center justify-center" style={{ width: chartSize, height: chartSize }}>
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
      {/* Render children passed to this component, which will be centered over the SVG */}
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
  children: PropTypes.node, // Added propType for children
};
// --- END CustomDoughnutChart Component ---

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const Attendance = () => {
  const [selectedDate, setSelectedDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [attendanceData, setAttendanceData] = useState(null);
  const [month, setMonth] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAttendanceData(selectedDate);
  }, [selectedDate]);

  const fetchAttendanceData = async (date) => {
    setLoading(true);
    setError("");
    try {
      const res = await axiosInstance.get(`/reports/attendance/daily`, {
        params: { date },
      });
      if (res.data.success) {
        setAttendanceData(res.data.data);
      } else {
        setError("Failed to fetch attendance data.");
      }
    } catch (err) {
      console.error("Error fetching attendance data:", err);
      setError("Error fetching attendance data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!month) {
      alert("Please select a month.");
      return;
    }
    try {
      const res = await axiosInstance.get(
        `/reports/attendance/monthly/download`,
        {
          params: { month, year: new Date().getFullYear() },
          responseType: 'blob'
        }
      );
      if (res.status === 200) {
        const fileURL = window.URL.createObjectURL(new Blob([res.data]));
        const fileLink = document.createElement('a');
        fileLink.href = fileURL;
        fileLink.setAttribute('download', `Attendance_Report_Month_${month}_${new Date().getFullYear()}.pdf`);
        document.body.appendChild(fileLink);
        fileLink.click();
        fileLink.remove();
        window.URL.revokeObjectURL(fileURL);
      } else {
        alert("Error generating PDF.");
      }
    } catch (err) {
      console.error("Failed to download report:", err);
      alert("Failed to download report. Please try again.");
    }
  };

  const customDoughnutData = attendanceData
    ? [
      { name: "Total Staff", value: attendanceData.totalStaff },
      { name: "Present", value: attendanceData.presentStaff },
      { name: "Absent", value: attendanceData.absentStaff },
    ]
    : [
      { name: "Total Staff", value: 0 },
      { name: "Present", value: 0 },
      { name: "Absent", value: 0 },
    ];

  const customDoughnutColors = ["#752BdF", "#41B6FF", "#FF0200"];

  const centerPercentage = attendanceData && attendanceData.totalStaff > 0
    ? `${Math.round((attendanceData.presentStaff / attendanceData.totalStaff) * 100)}%`
    : "0%";

  const barData = {
    labels: ["Late Arrivals", "Early Departures"],
    datasets: [
      {
        data: attendanceData
          ? [attendanceData.lateArrivals, attendanceData.earlyDepartures]
          : [0, 0],
        backgroundColor: ["#FBBF24", "#34D399"],
        barPercentage: 0.5,
        categoryPercentage: 0.6,
      },
    ],
  };
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, precision: 0 },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y;
            }
            return label;
          }
        }
      }
    },
  };

  const stats = attendanceData
    ? [
      {
        label: "Total Staff",
        value: attendanceData.totalStaff,
        iconBg: "bg-purple-100",
        icon: <FaUsers className="text-purple-500 w-6 h-6" />,
      },
      {
        label: "Present",
        value: attendanceData.presentStaff,
        iconBg: "bg-sky-100",
        icon: <FaUserCheck className="text-sky-500 w-6 h-6" />,
      },
      {
        label: "Absent",
        value: attendanceData.absentStaff,
        iconBg: "bg-red-100",
        icon: <FaUserTimes className="text-red-500 w-6 h-6" />,
      },
      {
        label: "Late Arrivals",
        value: attendanceData.lateArrivals,
        iconBg: "bg-amber-100",
        icon: <FaUserClock className="text-amber-500 w-6 h-6" />,
      },
      {
        label: "Early Departures",
        value: attendanceData.earlyDepartures,
        iconBg: "bg-green-100",
        icon: <FaSignOutAlt className="text-green-500 w-6 h-6" />,
      },
      {
        label: "On Leave",
        value: attendanceData.onLeave,
        iconBg: "bg-emerald-100",
        icon: <FaUserSlash className="text-emerald-500 w-6 h-6" />,
      },
    ]
    : [];

  return (
    <div className="min-h-screen  p-6">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-gray-900 font-poppins">
            Attendance Dashboard
          </h1>
          <div className="flex items-center space-x-3">
            <FaCalendarAlt className="text-gray-500 text-xl" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 rounded-full p-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-700"
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>

        {/* Loading / Error */}
        {loading && <p className="text-center text-indigo-600 py-4">Loading data...</p>}
        {error && <p className="text-center text-red-600 py-4">{error}</p>}

        {/* Stats Cards */}
        {attendanceData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                className="bg-white rounded-2xl p-6 shadow-md flex flex-col items-center justify-center text-center"
                whileHover={{ scale: 1.03 }}
              >
                <div className={`${s.iconBg} p-3 rounded-full mb-3`}>
                  {s.icon}
                </div>
                <p className="text-gray-500 mb-2 text-sm">{s.label}</p>
                <p className="text-3xl font-bold text-gray-800">
                  <CountUp end={s.value} duration={1.5} separator="," />
                </p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Doughnut Chart */}
          <motion.div
            className="bg-white p-6 rounded-2xl shadow-lg flex flex-col items-center justify-center relative w-full h-[300px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h2 className="text-lg font-medium text-gray-700 mb-4">
              Attendance Distribution
            </h2>
            <div className="flex w-full justify-center items-center h-full">
              <CustomDoughnutChart
                data={customDoughnutData}
                colors={customDoughnutColors}
                chartSize={220}
                strokeThickness={32}
                gapDegrees={3}
              >
                {/* This div is now passed as children to CustomDoughnutChart, ensuring proper centering */}
                <div
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none"
                >
                  <span className="text-sm text-gray-500">Present</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {centerPercentage}
                  </span>
                </div>
              </CustomDoughnutChart>
              {/* Legend for CustomDoughnutChart - placed alongside the chart component */}
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

          {/* Bar Chart */}
          <motion.div
            className="bg-white rounded-2xl p-6 shadow-md w-full h-[300px]"
            whileHover={{ scale: 1.02 }}
          >
            <h3 className="text-lg font-medium text-gray-700 mb-4">Late Arrivals And Early Departures</h3>
            <div className="relative h-[calc(100%-2rem)]">
              <Bar data={barData} options={barOptions} />
            </div>
          </motion.div>
        </div>

        {/* Bottom Controls */}
        <div className="flex flex-col sm:flex-row justify-end items-center space-y-3 sm:space-y-0 sm:space-x-4 mt-6">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-gray-300 rounded-full p-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto"
          >
            <option value="">Select Month</option>
            {[...Array(12)].map((_, idx) => (
              <option key={idx} value={idx + 1}>
                {new Date(0, idx).toLocaleString("default", {
                  month: "long",
                })}
              </option>
            ))}
          </select>
          <motion.button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full shadow w-full sm:w-auto"
            whileHover={{ scale: 1.05 }}
          >
            <FaDownload />
            Download PDF
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default Attendance;