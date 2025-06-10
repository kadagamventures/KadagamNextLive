
import{ useState } from "react";
import { HiPlus } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";

const PaymentStatus = () => {
  const navigate = useNavigate();
  const [plan] = useState({
    planName: "PACK",
    price: 649,
    period: "Month",
    status: "Active",
    lastPaymentDate: "22/10/2025",
    nextPaymentDate: "22/11/2025",
    dueDays: 30,
  });

  const {
    price,
    period,
    status,
    lastPaymentDate,
    nextPaymentDate,
    dueDays,
  } = plan;

  return (
    <div className="p-12 bg-gray-50 min-h-screen ml-45">
      {/* Header */}
            <div className="relative mb-15">
        {/* This H1 is full-width and centered in the content area */}
        <h1 className="w-full text-3xl font-semibold text-gray-800 text-center">
          Active Pack
        </h1>
        {/* Button sits in the top-right corner of the content */}
        <button
          type="button"
          className="absolute top-0 right-5 inline-flex items-center space-x-1 px-4 py-2 bg-white text-gray-700 rounded-full shadow-md hover:shadow-lg transition-shadow duration-200"
        >
          <span className="text-sm font-medium">Add Plan</span>
          <HiPlus className="w-5 h-5 text-violet-600" />
        </button>
      </div>

      {/* 450×450 Card */}
      <div
        className="
          w-[450px] h-[450px]
          mx-auto
          bg-white
          rounded-[30px]
          border-[2.25px] border-blue-100
          shadow
          p-8
        "
      >
        <div className="flex flex-col h-full">
          {/* Pack & Status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-gray-500">Pack</p>
              <p className="text-3xl font-semibold text-gray-900">
                ₹{price} / {period}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                status === "Active"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {status}
            </span>
          </div>

          {/* Payment Dates – increased size & spacing */}
          <div className="grid grid-cols-2 gap-10 mt-12">
            <div>
              <p className="text-base text-gray-500">Last Payment Date</p>
              <p className="mt-1 text-2xl font-semibold text-gray-800">
                {lastPaymentDate}
              </p>
            </div>
            <div>
              <p className="text-base text-gray-500 ml-8">Next Payment Date</p>
              <p className="mt-1 text-2xl font-semibold text-gray-800 ml-8">
                {nextPaymentDate}
              </p>
            </div>
          </div>

          {/* Due Days */}
          <div className="mt-12">
            <p className="text-xm text-gray-500">Due Days</p>
            <p className="mt-1 text-2xl font-medium text-gray-800">
              {dueDays} Days Left
            </p>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* View Payment History Button */}
          <button
          onClick={() => navigate("/admin/paymenthistory")}
            className="
              mx-auto
              w-[277px]
              h-[50px]
              flex items-center justify-center
              bg-purple-600
              text-white
              rounded-full
              font-semibold
              hover:bg-purple-700
              transition-colors duration-200
            "
          >
            View Payment History
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentStatus;
