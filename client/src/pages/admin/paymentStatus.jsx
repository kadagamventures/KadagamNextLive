import { useEffect, useState } from "react";
import { HiPlus } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import paymentService from "../../services/paymentService";

const PaymentStatus = () => {
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPaymentStatus = async () => {
      try {
        const data = await paymentService.fetchStatus();
        setPlan(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load payment status.");
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentStatus();
  }, []);

  if (loading) return <div className="p-12">Loading...</div>;
  if (error) return <div className="p-12 text-red-500">{error}</div>;
  if (!plan) return null;

  const {
    planPackage,
    lastPaymentDate,
    nextPaymentDate,
    daysRemaining,
    status,
  } = plan;

  return (
    <div className="p-12 bg-gray-50 min-h-screen ml-45">
      {/* Header */}
      <div className="relative mb-15">
        <h1 className="w-full text-3xl font-semibold text-gray-800 text-center">
          Active Plan
        </h1>
        <button
          type="button"
          onClick={() => navigate("/pricing")}
          className="absolute top-0 right-5 inline-flex items-center space-x-1 px-4 py-2 bg-white text-gray-700 rounded-full shadow-md hover:shadow-lg transition-shadow duration-200"
        >
          <span className="text-sm font-medium">Add Plan</span>
          <HiPlus className="w-5 h-5 text-violet-600" />
        </button>
      </div>

      {/* Card */}
      <div className="w-[450px] h-[450px] mx-auto bg-white rounded-[30px] border-[2.25px] border-blue-100 shadow p-8">
        <div className="flex flex-col h-full">
          {/* Plan & Status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-gray-500">Pack</p>
              <p className="text-3xl font-semibold text-gray-900">
                {planPackage}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                status?.toLowerCase() === "active"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {status}
            </span>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-10 mt-12">
            <div>
              <p className="text-base text-gray-500">Last Payment Date</p>
              <p className="mt-1 text-2xl font-semibold text-gray-800">
                {lastPaymentDate || "-"}
              </p>
            </div>
            <div>
              <p className="text-base text-gray-500 ml-8">Next Payment Date</p>
              <p className="mt-1 text-2xl font-semibold text-gray-800 ml-8">
                {nextPaymentDate || "-"}
              </p>
            </div>
          </div>

          {/* Due Days */}
          <div className="mt-12">
            <p className="text-sm text-gray-500">Days Remaining</p>
            <p className="mt-1 text-2xl font-medium text-gray-800">
              {typeof daysRemaining === "number"
                ? `${daysRemaining} days`
                : "-"}
            </p>
          </div>

          <div className="flex-1" />

          {/* History Button */}
          <button
            onClick={() => navigate("/admin/paymenthistory")}
            className="mx-auto w-[277px] h-[50px] flex items-center justify-center bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition-colors duration-200"
          >
            View Payment History
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentStatus;
