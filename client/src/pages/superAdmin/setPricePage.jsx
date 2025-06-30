// 📂 src/pages/SetPlan.jsx

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { tokenRefreshInterceptor as axios } from "../../utils/axiosInstance";

// PlanCard component - Design enhancements applied here
const PlanCard = ({ plan, onUpdate }) => {
  // State initialization with fallback values
  const [duration, setDuration] = useState(plan?.duration?.value ?? 1);
  const [unit, setUnit] = useState(plan?.duration?.unit ?? "months");
  const [price, setPrice] = useState(plan?.price ?? 0);
  const [gst, setGst] = useState(plan?.gstPercentage ?? 18);

  // Defensive check for invalid plan data
  if (!plan || !plan.duration) {
    return <div className="text-red-500 p-4 bg-white rounded-lg shadow-md">Invalid plan data provided.</div>;
  }

  // Helper to format unit display (e.g., "1 month" vs "2 months")
  const formatUnit = (unit, value) => {
    const capitalized = unit.charAt(0).toUpperCase() + unit.slice(1);
    return value === 1 ? capitalized.slice(0, -1) : capitalized;
  };

  // Derived display name for the plan
  const displayName = `${duration} ${formatUnit(unit, duration)}`;

  // Handler for plan update button click
  const handleUpdate = () => {
    // Validate inputs before sending
    if (duration <= 0 || price < 0 || gst < 0 || gst > 100) {
      alert("Please enter valid positive numbers for duration, price, and GST (0-100%).");
      return;
    }
    if (!unit) {
      alert("Please select a valid duration unit.");
      return;
    }

    onUpdate(plan._id, {
      _id: plan._id,
      name: displayName,
      duration: { value: Number(duration), unit },
      price: Number(price),
      gstPercentage: Number(gst),
      isActive: plan.isActive, // Ensure isActive status is maintained
    });
  };

  return (
    <div
      className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden border border-gray-100" // Enhanced shadow, border, and rounded corners
      style={{ width: "320px", minHeight: "480px", padding: "28px" }} // Added minHeight for flexibility
    >
      <h2 className="text-2xl font-extrabold text-blue-700 mb-6 border-b-2 pb-3 border-blue-100 text-center"> {/* Stronger title styling */}
        {displayName}
      </h2>

      <div className="flex-grow space-y-6"> {/* Added space-y for consistent vertical spacing */}
        {/* Duration Input */}
        <div>
          <label htmlFor={`duration-${plan._id}`} className="block text-sm font-semibold text-gray-700 mb-2">
            Plan Duration
          </label>
          <div className="flex gap-3"> {/* Increased gap */}
            <input
              id={`duration-${plan._id}`}
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-1/2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-800 text-lg shadow-sm" // Changed flex-1 to w-1/2
              min="1"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-800 text-base shadow-sm appearance-none" // Changed flex-1 to w-1/2
            >
              <option value="days">Days</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </div>
        </div>

        {/* Price Input */}
        <div>
          <label htmlFor={`price-${plan._id}`} className="block text-sm font-semibold text-gray-700 mb-2">
            Plan Price
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xl font-bold">₹</span> {/* Larger Rupee icon */}
            <input
              id={`price-${plan._id}`}
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-800 text-lg shadow-sm" // Adjusted padding and enhanced style
              min="0"
            />
          </div>
        </div>

        {/* GST Input */}
        <div>
          <label htmlFor={`gst-${plan._id}`} className="block text-sm font-semibold text-gray-700 mb-2">
            GST %
          </label>
          <input
            id={`gst-${plan._id}`}
            type="number"
            value={gst}
            onChange={(e) => setGst(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-800 text-lg shadow-sm" // Enhanced input style
            min="0"
            max="100"
          />
        </div>
      </div>

      <button
        onClick={handleUpdate}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-bold py-3 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mt-8 transform hover:scale-105" // Enhanced button style
      >
        Update Plan
      </button>
    </div>
  );
};

// PropTypes for PlanCard (remains unchanged)
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

// SetPlan component - Design enhancements applied here
const SetPlan = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch plans on component mount
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await axios.get("/super-admin/plans");
        setPlans(res.data || []);
      } catch (err) {
        console.error("Failed to load plans:", err);
        alert("Could not fetch plan configurations. Please try again later."); // More user-friendly message
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  // Handler for updating a single plan
  const handlePlanUpdate = async (_id, updatedCfg) => {
    try {
      const res = await axios.put("/super-admin/plans", [updatedCfg]); // Backend expects an array
      const freshList = res.data; // Assuming backend returns the updated list of plans

      // Update the specific plan in the state with fresh data from the server
      setPlans((prev) =>
        prev.map((p) => (p._id === _id ? freshList.find((q) => q._id === _id) || p : p))
      );

      alert("Plan updated successfully!"); // Success message
    } catch (err) {
      console.error("Error updating plan:", err);
      const msg = err?.response?.data?.error || "An unexpected error occurred."; // More generic error fallback

      if (msg.startsWith("Duplicate duration found")) {
        alert("Update failed: A plan with the same duration (value and unit) already exists. Please choose a unique duration.");
      } else {
        alert(`Update failed: ${msg}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 py-10 pl-65 px-6 flex items-center justify-center">
        <div className="text-xl text-gray-600 font-semibold animate-pulse">Loading plan configurations...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-10 pl-65 px-6">
      <h1 className="text-4xl font-extrabold text-center mb-12 text-gray-800 tracking-tight"> {/* Larger, bolder title */}
        Manage Subscription Plans
      </h1>

      <div className="flex flex-wrap justify-center" style={{ gap: "36px" }}> {/* Gap remains for spacing between cards */}
        {plans.length > 0 ? (
          plans.map((plan, index) => (
            <PlanCard key={plan._id || index} plan={plan} onUpdate={handlePlanUpdate} />
          ))
        ) : (
          <div className="text-center text-gray-600 text-lg">No plans found.</div> // Message for no plans
        )}
      </div>
    </div>
  );
};

export default SetPlan;