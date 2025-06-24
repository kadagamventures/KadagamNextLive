// 📂 src/pages/SetPlan.jsx

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { tokenRefreshInterceptor as axios } from "../../utils/axiosInstance";

const PlanCard = ({ plan, onUpdate }) => {
  if (!plan || !plan.duration) {
    return <div className="text-red-500">Invalid plan data</div>;
  }

  const [duration, setDuration] = useState(plan.duration?.value ?? 1);
  const [unit, setUnit] = useState(plan.duration?.unit ?? "months");
  const [price, setPrice] = useState(plan.price ?? 0);
  const [gst, setGst] = useState(plan.gstPercentage ?? 18);

  const formatUnit = (unit, value) => {
    const capitalized = unit.charAt(0).toUpperCase() + unit.slice(1);
    return value === 1 ? capitalized.slice(0, -1) : capitalized;
  };

  const displayName = `${duration} ${formatUnit(unit, duration)}`;

  const handleUpdate = () => {
    onUpdate(plan._id, {
      _id: plan._id,
      name: displayName,
      duration: { value: Number(duration), unit },
      price: Number(price),
      gstPercentage: Number(gst),
      isActive: plan.isActive,
    });
  };

  return (
    <div
      className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between"
      style={{ width: "320px", height: "480px", padding: "28px" }}
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3 border-gray-200">
        {displayName}
      </h2>

      <div className="flex-grow">
        {/* Duration */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Plan Duration
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
              min="1"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
            >
              <option value="days">Days</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </div>
        </div>

        {/* Price */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Plan Price
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">₹</span>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="pl-8 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
              min="0"
            />
          </div>
        </div>

        {/* GST */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            GST %
          </label>
          <input
            type="number"
            value={gst}
            onChange={(e) => setGst(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
            min="0"
            max="100"
          />
        </div>
      </div>

      <button
        onClick={handleUpdate}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Update Plan
      </button>
    </div>
  );
};

PlanCard.propTypes = {
  plan: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    duration: PropTypes.shape({
      value: PropTypes.number,
      unit: PropTypes.string,
    }),
    price: PropTypes.number,
    gstPercentage: PropTypes.number,
    isActive: PropTypes.bool,
  }).isRequired,
  onUpdate: PropTypes.func.isRequired,
};

const SetPlan = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get("/super-admin/plans");
        setPlans(res.data || []);
      } catch (err) {
        console.error("Failed to load plans:", err);
        alert("Could not fetch plan configurations.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePlanUpdate = async (_id, updatedCfg) => {
    try {
      // Send only the updated plan (one by one)
      const res = await axios.put("/super-admin/plans", [updatedCfg]);
      const freshList = res.data;

      setPlans((prev) =>
        prev.map((p) => (p._id === _id ? freshList.find((q) => q._id === _id) || p : p))
      );

      alert("Plan updated successfully.");
    } catch (err) {
      console.error("Error updating plan:", err);
      const msg = err?.response?.data?.error || err.message;

      if (msg.startsWith("Duplicate duration found")) {
        alert("Update failed: A plan with the same duration already exists.");
      } else {
        alert(`Update failed: ${msg}`);
      }
    }
  };

  if (loading) {
    return <div className="p-10 text-center">Loading plans…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-10 pl-65 px-6">
      <h1 className="text-3xl font-bold text-center mb-10 text-gray-800">
        Plan Configuration
      </h1>

      <div className="flex flex-wrap justify-center" style={{ gap: "36px" }}>
        {plans.map((plan, index) => (
          <PlanCard key={plan._id || index} plan={plan} onUpdate={handlePlanUpdate} />
        ))}
      </div>
    </div>
  );
};

export default SetPlan;
