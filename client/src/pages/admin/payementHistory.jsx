// src/components/payment/PaymentHistory.jsx

import { useState, useRef, useEffect } from "react";
import { FaDownload, FaChevronDown } from "react-icons/fa";
import paymentService from "../../services/paymentService";

const PaymentHistory = () => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [yearOpen, setYearOpen] = useState(false);
  const yearRef = useRef(null);

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const rupeeFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await paymentService.fetchHistory(selectedYear);
        setHistory(data);
      } catch (err) {
        setError("Failed to load payment history.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedYear]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (yearRef.current && !yearRef.current.contains(e.target)) {
        setYearOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDate = (date) => {
    if (!date) return "-";
    const d = new Date(date);
    return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-IN");
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-600">Loading…</div>;
  }

  if (error) {
    return <div className="p-12 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-[#F7F8FB] p-6 pl-64">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Payment History</h1>
        <div ref={yearRef} className="relative">
          <button
            onClick={() => setYearOpen((prev) => !prev)}
            className="flex items-center bg-white rounded-full px-4 py-2 shadow hover:shadow-md transition"
          >
            <span className="font-medium">{selectedYear}</span>
            <FaChevronDown className="ml-2 text-gray-500" />
          </button>
          {yearOpen && (
            <ul className="absolute right-0 mt-2 w-28 max-h-60 overflow-y-auto bg-white rounded-lg shadow-lg z-10">
              {years.map((year) => (
                <li
                  key={year}
                  onClick={() => {
                    setSelectedYear(String(year));
                    setYearOpen(false);
                  }}
                  className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                    String(year) === selectedYear ? "bg-gray-100 font-semibold" : ""
                  }`}
                >
                  {year}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Payment History Table */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="grid grid-cols-6 gap-x-6 border-b border-gray-200 pb-4 mb-6 text-sm font-semibold text-gray-600">
          <span>Total Amount</span>
          <span>Plan Price</span>
          <span>GST Amount</span>
          <span>Plan Name</span>
          <span>Date</span>
          <span>Download</span>
        </div>

        {history.length === 0 ? (
          <div className="text-center text-gray-500 py-6">
            No payments found for {selectedYear}.
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry, idx) => {
              const key = `${entry.paymentDate}-${entry.planName}-${idx}`;
              return (
                <div
                  key={key}
                  className="grid grid-cols-6 gap-x-6 items-center py-3 px-4 text-sm text-gray-800 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <span>{rupeeFormatter.format(entry.totalAmount)}</span>
                  <span>{rupeeFormatter.format(entry.baseAmount)}</span>
                  <span>{rupeeFormatter.format(entry.gstAmount)}</span>
                  <span>{entry.planName || "-"}</span>
                  <span>{formatDate(entry.paymentDate)}</span>
                  {entry.downloadUrl ? (
                    <a
                      href={entry.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center bg-green-50 text-green-600 px-3 py-1 rounded-full hover:bg-green-100 transition"
                    >
                      <FaDownload className="mr-1" />
                      Invoice
                    </a>
                  ) : (
                    <span className="text-gray-400 text-center">—</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentHistory;
