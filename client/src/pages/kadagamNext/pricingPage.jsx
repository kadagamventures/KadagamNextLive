import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import paymentService from "../../services/paymentService";
import { loadRazorpay } from "../../utils/loadRazorpay";

export default function PricingPage() {
  const [plans, setPlans] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    paymentService
      .getPlans()
      .then((data) => {
        const sorted = [...data].sort((a, b) => {
          const priceA = a.isFreeTrial ? 0 : a.price;
          const priceB = b.isFreeTrial ? 0 : b.price;
          return priceA - priceB;
        });
        setPlans(sorted);
      })
      .catch((err) => {
        console.error("Failed to load plans:", err);
        alert("Unable to load pricing plans. Please try again later.");
      });
  }, []);

  const handlePurchase = async (plan) => {
    try {
      if (plan.isFreeTrial && plan.used) return;

      const resp = await paymentService.createOrder({ planId: plan._id });

      if (resp.trialActivated) {
        navigate("/admin/dashboard");
        return;
      }

      const { order } = resp;
      await loadRazorpay();

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.totalAmount.toString(),
        currency: order.currency,
        name: "KadagamNext",
        description: plan.isFreeTrial
          ? `${plan.duration.value} ${plan.duration.unit} Free Trial`
          : `${plan.duration.value} ${plan.duration.unit} Subscription`,
        order_id: order.orderId,
        handler: async (response) => {
          const razorpay_order_id = response.razorpay_order_id || response.order_id;
          const razorpay_payment_id = response.razorpay_payment_id || response.payment_id;
          const razorpay_signature = response.razorpay_signature;

          if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            alert("Payment confirmation failed. Please contact support.");
            return;
          }

          await paymentService.capturePayment({
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
          });

          navigate("/admin/dashboard");
        },
        prefill: {
          email: localStorage.getItem("userEmail") || "",
          contact: localStorage.getItem("userPhone") || "",
        },
        theme: { color: "#139DEB" },
      };

      new window.Razorpay(options).open();
    } catch (err) {
      console.error("Payment error:", err);
      alert(err.error || err.message || "Payment failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white flex flex-col items-center px-4 py-12">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-10 text-center bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-400 to-gray-500">
        Select Your Plan
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 max-w-7xl w-full justify-center">
        {plans.map((plan) => {
          const isDisabled = plan.isFreeTrial && plan.used;
          const buttonLabel = plan.isFreeTrial
            ? plan.used
              ? "TRIAL USED"
              : "START FREE"
            : "BUY";

          const gstRate = plan.gstPercentage ?? 18;
          const badgeColor = plan.isFreeTrial
            ? "bg-indigo-600"
            : plan.isFeatured
            ? "bg-green-600"
            : "bg-pink-600";

          return (
            <div
              key={plan._id}
              className="relative bg-white text-gray-800 rounded-3xl shadow-xl p-8 transform transition-all hover:scale-105 border-2 border-gray-200"
            >
              <div
                className={`absolute top-4 right-4 px-3 py-1 text-xs font-semibold text-white rounded-full ${badgeColor}`}
              >
                {plan.isFreeTrial
                  ? "Free Trial"
                  : `${plan.duration.value} ${
                      plan.duration.value > 1
                        ? plan.duration.unit
                        : plan.duration.unit.slice(0, -1)
                    }`}
              </div>

              <h2 className="text-2xl font-bold mb-2">
                {plan.duration.value}{" "}
                {plan.duration.value > 1
                  ? plan.duration.unit
                  : plan.duration.unit.slice(0, -1)}
              </h2>

              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.isFreeTrial ? "Free" : `₹${plan.price}`}
                  </span>
                  {!plan.isFreeTrial && (
                    <span className="ml-2 text-sm font-medium text-gray-600">
                      + GST ({gstRate}%)
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => handlePurchase(plan)}
                disabled={isDisabled}
                className={`w-full text-center font-semibold py-3 rounded-full text-white text-lg transition-all ${
                  isDisabled
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {buttonLabel}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
