// src/components/TaskReports.tsx
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  BuildingOfficeIcon,
  SignalSlashIcon,
  MinusCircleIcon,
  SignalIcon,
  CurrencyRupeeIcon,
} from "@heroicons/react/24/outline";
import CountUp from "react-countup";
import { tokenRefreshInterceptor as api } from "../../utils/axiosInstance";
import PropTypes from "prop-types"; // Ensure PropTypes is imported if used directly

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function TaskReports() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0–11
  const [summary, setSummary] = useState(null); // Use 'any' or define a proper type for summary
  const [loading, setLoading] = useState(true);

  // Fetch once per year change
  useEffect(() => {
    setLoading(true);
    api
      .get(`/super-admin/revenue?year=${year}`)
      .then(res => setSummary(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  if (loading || !summary) {
    return <div className="p-8 pl-64">Loading…</div>;
  }

  // Prepare chart + card values
  const lineData = summary.monthlyRevenue.map((rev, idx) => ({
    name: MONTH_LABELS[idx],
    revenue: rev / 100000, // assuming your backend sends paise; adjust as needed
  }));

  const monthlyValue = (summary.monthlyRevenue[month] || 0) / 100000;

  const donutData = [
    {
      name: "Active",
      value: summary.statusPercentages.active,
      color: "#3b82f6",
    },
    {
      name: "Inactive",
      value: summary.statusPercentages.inactive,
      color: "#fb923c",
    },
    {
      name: "Cancelled",
      value: summary.statusPercentages.cancelled,
      color: "#ef4444",
    },
  ];

  // Find which segment is highest
  const highestRate = Math.max(
    summary.statusPercentages.active,
    summary.statusPercentages.inactive,
    summary.statusPercentages.cancelled
  );

  return (
    <div className="p-8 pl-64 bg-[#f6f8fc] min-h-screen">
      <div className="flex justify-between items-center mb-6 relative">
        <h1 className="text-2xl font-semibold text-center w-full">
          Task Reports
        </h1>
        <div className="flex gap-2 absolute right-0 top-0 mt-2 mr-2 md:static md:mt-0 md:mr-0">
          <select
            className="border rounded px-3 py-1 text-sm"
            value={MONTH_LABELS[month]}
            onChange={e => setMonth(MONTH_LABELS.indexOf(e.target.value))}
          >
            {MONTH_LABELS.map(m => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <select
            className="border rounded px-3 py-1 text-sm"
            value={year}
            onChange={e => setYear(parseInt(e.target.value, 10))}
          >
            {Array.from({ length: 5 }).map((_, i) => {
              const y = now.getFullYear() - i;
              return <option key={y}>{y}</option>;
            })}
          </select>
        </div>
      </div>

      {/* Cards - Enforced 3 columns across all screen sizes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"> {/* Changed to consistent 3 columns */}
        <Card
          title="Total Revenue"
          value={summary.totalRevenue / 100000}
          suffix=" Lakhs"
          color="green"
          icon={<CurrencyRupeeIcon className="w-6 h-6 text-green-500" />}
        />
        <Card
          title="Monthly Revenue"
          value={monthlyValue}
          suffix=" Lakhs"
          color="blue"
          icon={<CurrencyRupeeIcon className="w-6 h-6 text-blue-500" />}
        />
        <Card
          title="Total Company"
          value={summary.totalCompanies}
          color="yellow"
          icon={<BuildingOfficeIcon className="w-6 h-6 text-yellow-500" />}
        />
        <Card
          title="Active Company"
          value={summary.activeCompanies}
          color="indigo"
          icon={<SignalIcon className="w-6 h-6 text-indigo-500" />}
        />
        <Card
          title="Inactive Company"
          value={summary.inactiveCompanies}
          color="orange"
          icon={<SignalSlashIcon className="w-6 h-6 text-orange-500" />}
        />
        <Card
          title="Cancelled Company"
          value={summary.cancelledCompanies}
          color="red"
          icon={<MinusCircleIcon className="w-6 h-6 text-red-500" />}
        />
      </div>

      {/* Charts - No change here, remains responsive with 2 columns on larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8">
        {/* Yearly Revenue Line Chart */}
        <div className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-sm font-medium mb-4">Yearly Revenue</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={lineData}>
              <XAxis dataKey="name" />
              <YAxis
                domain={[0, Math.max(...lineData.map(d => d.revenue))]}
                tickFormatter={v => `${v} lakhs`}
              />
              <Tooltip formatter={(v, name) => [`${v} lakhs`, name]} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status Donut Chart */}
        <div className="bg-white rounded-2xl shadow p-4 flex flex-col md:flex-row items-center justify-between relative">
          <div className="w-full md:w-1/2 h-[250px] flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                <Pie
                  data={donutData}
                  dataKey="value"
                  innerRadius={70}
                  outerRadius={90}
                  stroke="none"
                >
                  {donutData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <p className="text-xs text-gray-400">Higher Rate</p>
              <p className="text-xl font-bold">
                <CountUp end={highestRate} duration={1.5} />%
              </p>
            </div>
          </div>

          <div className="w-full md:w-1/2 mt-6 md:mt-0 flex flex-col items-start justify-center gap-3 pl-4">
            {donutData.map(item => (
              <div key={item.name} className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block w-4 h-4 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Card component (no changes needed for responsiveness here)
function Card({ title, value, suffix = "", icon, color }) {
  const bg = {
    green: "bg-green-100 text-green-500",
    blue: "bg-blue-100 text-blue-500",
    yellow: "bg-yellow-100 text-yellow-500",
    indigo: "bg-indigo-100 text-indigo-500",
    orange: "bg-orange-100 text-orange-500",
    red: "bg-red-100 text-red-500",
  }[color];

  return (
    <div className="bg-white p-6 rounded-[20px] shadow-md flex flex-col items-center text-center gap-3">
      <div
        className={`w-12 h-12 flex items-center justify-center rounded-full ${bg} text-2xl`}
      >
        {icon}
      </div>
      <p
        className="text-gray-500"
        style={{
          fontFamily: "Poppins !important",
          fontWeight: 500,
          fontSize: "17.5px",
        }}
      >
        {title}
      </p>
      <p className="text-xl font-bold text-gray-800">
        <CountUp end={value} duration={1.5} decimals={2} />{suffix}
      </p>
    </div>
  );
}

Card.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  suffix: PropTypes.string,
  icon: PropTypes.node.isRequired,
  color: PropTypes.string.isRequired,
};