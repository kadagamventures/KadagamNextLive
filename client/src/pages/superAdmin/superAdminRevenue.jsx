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

const revenueData = [
    { name: "Jan", revenue: 2 },
    { name: "Feb", revenue: 3 },
    { name: "Mar", revenue: 2.8 },
    { name: "Apr", revenue: 5 },
    { name: "May", revenue: 1.5 },
    { name: "Jun", revenue: 2.2 },
    { name: "Jul", revenue: 3.6 },
    { name: "Aug", revenue: 4.2 },
    { name: "Sep", revenue: 3.8 },
    { name: "Oct", revenue: 4.5 },
    { name: "Nov", revenue: 4.8 },
    { name: "Dec", revenue: 6.5 },
];

const companyStatusData = [
    { name: "Active", value: 45, color: "#3b82f6" },
    { name: "Inactive", value: 18, color: "#fb923c" },
    { name: "Cancelled", value: 6, color: "#ef4444" },
];

export default function TaskReports() {
    return (
        <div className="p-8 pl-64 bg-[#f6f8fc] min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-center w-full">Task Reports</h1>
                <div className="flex gap-2 absolute right-8">
                    <select className="border rounded px-3 py-1 text-sm">
                        <option>Jan</option>
                    </select>
                    <select className="border rounded px-3 py-1 text-sm">
                        <option>2025</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <Card
                    title="Total Revenue"
                    value={22}
                    suffix=" Lakhs"
                    color="green"
                    icon={<CurrencyRupeeIcon className="w-6 h-6 text-green-500" />}
                />
                <Card
                    title="Monthly Revenue"
                    value={10}
                    suffix=" Lakhs"
                    color="blue"
                    icon={<CurrencyRupeeIcon className="w-6 h-6 text-blue-500" />}
                />
                <Card
                    title="Total Company"
                    value={69}
                    color="yellow"
                    icon={<BuildingOfficeIcon className="w-6 h-6 text-yellow-500" />}
                />
                <Card
                    title="Active Company"
                    value={45}
                    color="indigo"
                    icon={<SignalIcon className="w-6 h-6 text-indigo-500" />}
                />
                <Card
                    title="Inactive Company"
                    value={18}
                    color="orange"
                    icon={<SignalSlashIcon className="w-6 h-6 text-orange-500" />}
                />
                <Card
                    title="Cancelled Company"
                    value={6}
                    color="red"
                    icon={<MinusCircleIcon className="w-6 h-6 text-red-500" />}
                />
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <div className="bg-white rounded-2xl shadow p-4">
                    <h2 className="text-sm font-medium mb-4">Yearly Revenue</h2>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={revenueData}>
                            <XAxis dataKey="name" />
                            <YAxis domain={[0, 7]} tickFormatter={(v) => `${v} lakhs`} />
                            <Tooltip formatter={(v) => `${v} lakhs`} />
                            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white rounded-2xl shadow p-4 flex flex-col md:flex-row items-center justify-between relative">
                    <div className="w-full md:w-1/2 h-[250px] flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                                <Pie
                                    data={companyStatusData}
                                    dataKey="value"
                                    innerRadius={70}
                                    outerRadius={90}
                                    stroke="none"
                                >
                                    {companyStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center label */}
                        <div className="absolute text-center">
                            <p className="text-xs text-gray-400">Higher Rate</p>
                            <p className="text-xl font-bold">
                                <CountUp end={45} duration={2} />%
                            </p>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="w-full md:w-1/2 mt-6 md:mt-0 flex flex-col items-start justify-center gap-3 pl-4">
                        {companyStatusData.map((item) => (
                            <div key={item.name} className="flex items-center gap-2 text-sm">
                                <span
                                    className="inline-block w-4 h-4 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                ></span>
                                {item.name}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

import PropTypes from "prop-types";

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
            <div className={`w-12 h-12 flex items-center justify-center rounded-full ${bg} text-2xl`}>
                {icon}
            </div>
            <p className=" text-gray-500"
                style={{
                    fontFamily: "Poppins !important",
                    fontWeight: "500",
                    fontSize: "17.5px",
                }}>{title}</p>
            <p className="text-xl font-bold text-gray-800">
                <CountUp end={value} duration={2} />{suffix}
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
