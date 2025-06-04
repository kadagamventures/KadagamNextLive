import { useState, useRef, useEffect } from "react";
import { FaDownload, FaChevronDown } from "react-icons/fa";

const PaymentHistory = () => {
  // Dummy data array matching the screenshot (9 rows)
  const payments = [
    { total: 1900, planPrice: "1 Month", planPackage: "22-10-2025", lastPayment: "22-10-2025" },
    { total: 1900, planPrice: "6 Month", planPackage: "22-10-2025", lastPayment: "23-10-2025" },
    { total: 1900, planPrice: "1 Year",  planPackage: "22-10-2025", lastPayment: "24-10-2025" },
    { total: 1900, planPrice: "6 Month", planPackage: "22-10-2025", lastPayment: "25-10-2025" },
    { total: 1900, planPrice: "1 Month", planPackage: "22-10-2025", lastPayment: "26-10-2025" },
    { total: 1900, planPrice: "1 Year",  planPackage: "22-10-2025", lastPayment: "27-10-2025" },
    { total: 1900, planPrice: "6 Month", planPackage: "22-10-2025", lastPayment: "28-10-2025" },
    { total: 1900, planPrice: "1 Month", planPackage: "22-10-2025", lastPayment: "29-10-2025" },
    { total: 1900, planPrice: "1 Year",  planPackage: "22-10-2025", lastPayment: "30-10-2025" },
  ];

  // --- Year dropdown logic ---
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i);
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [yearOpen, setYearOpen] = useState(false);
  const yearRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (yearRef.current && !yearRef.current.contains(e.target)) {
        setYearOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F8FB] p-6 pl-64">
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-gray-800 ml-100">Payment History</h1>

        {/* Custom Year dropdown */}
        <div ref={yearRef} className="relative">
          <button
            onClick={() => setYearOpen((o) => !o)}
            className="flex items-center bg-white rounded-full px-4 py-2 shadow"
          >
            <span className="text-gray-700 font-medium">{selectedYear}</span>
            <FaChevronDown className="ml-2 text-gray-500" />
          </button>
          {yearOpen && (
            <ul className="absolute right-0 mt-2 w-28 max-h-60 overflow-y-auto bg-white rounded-lg shadow-lg z-10">
              {years.map((y) => (
                <li
                  key={y}
                  onClick={() => {
                    setSelectedYear(String(y));
                    setYearOpen(false);
                  }}
                  className={`px-4 py-2 text-gray-700 cursor-pointer hover:bg-gray-100 ${
                    String(y) === selectedYear ? "bg-gray-100 font-semibold" : ""
                  }`}
                >
                  {y}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* White card container */}
      <div className="bg-white rounded-xl shadow-md p-6">
        {/* Table header */}
        <div className="grid grid-cols-5 gap-x-8 justify-items-center border-b border-gray-200 pb-4 mb-6">
          <span className="text-gray-500 font-semibold text-xl text-left">Total Amount</span>
          <span className="text-gray-500 font-semibold text-xl text-left">Plan Price</span>
          <span className="text-gray-500 font-semibold text-xl text-left">Plan Package</span>
          <span className="text-gray-500 font-semibold text-xl text-left">Last Payment</span>
          <span className="text-gray-500 font-semibold text-xl text-left">Download</span>
        </div>

        {/* Table rows */}
        <div className="space-y-6">
          {payments.map((row, index) => (
            <div
              key={index}
              className="grid grid-cols-5 gap-x-8 justify-items-start items-center py-3 px-8"
            >
              <span className="text-gray-400  text-base text-left px-5">{row.total}</span>
              <span className="text-gray-400  text-base text-left px-11">{row.planPrice}</span>
              <span className="text-gray-400  text-base text-left px-10">{row.planPackage}</span>
              <span className="text-gray-400  text-base text-left px-13">{row.lastPayment}</span>
              <button
  className="justify-self-end flex items-center bg-white rounded-full shadow-sm px-4 py-2 text-gray-400 text-base mr-1.5"
>
  Download
  <FaDownload className="text-base text-green-500 ml-2" />
</button>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PaymentHistory;
