// src/components/PaymentHistory.jsx

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import classNames from "classnames";
import { tokenRefreshInterceptor as axios } from "../../utils/axiosInstance";

const PaymentHistory = () => {
  const { companyId } = useParams();
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get(
          `/super-admin/companies/${companyId}/payments`
        );
        // response.data is expected to be an array of { date, plan, amount, status }
        const formatted = response.data.map((p) => ({
          date: new Date(p.date).toLocaleDateString("en-GB"), // "DD/MM/YYYY"
          plan: p.plan,
          price: `₹ ${p.amount}`,
          status: p.status,
          rawDate: new Date(p.date),
        }));
        // Sort descending by rawDate
        formatted.sort((a, b) => b.rawDate - a.rawDate);
        setPayments(formatted);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to fetch payment history."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [companyId]);

  // Filter payments by selectedYear
  useEffect(() => {
    const filtered = payments.filter(
      (p) => p.rawDate.getFullYear() === parseInt(selectedYear, 10)
    );
    setFilteredPayments(filtered);
  }, [payments, selectedYear]);

  const handleYearChange = (e) => {
    setSelectedYear(e.target.value);
  };

  return (
    <div className="min-h-screen bg-[#f6f6fa] flex flex-col items-center mt-5 pl-64 p-10">
      <div className="w-full bg-white rounded-2xl shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-center w-full">
            Payment History
          </h1>
          <div className="absolute right-10 top-5">
            <select
              className="text-sm bg-white border border-gray-300 rounded px-2 py-1"
              value={selectedYear}
              onChange={handleYearChange}
            >
              {[selectedYear, selectedYear - 1, selectedYear - 2].map(
                (year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-4 font-semibold text-gray-600 text-sm border-b border-gray-200 pb-2 mb-4">
          <div>Last Payment Date</div>
          <div>Plan Package</div>
          <div>Price</div>
          <div>Status</div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-500">
            Loading payments...
          </div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">{error}</div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No payments found for {selectedYear}.
          </div>
        ) : (
          filteredPayments.map((item, idx) => (
            <div
              key={idx}
              className="grid grid-cols-4 text-sm text-gray-700 py-2 border-b border-gray-100"
            >
              <div>{item.date}</div>
              <div>{item.plan}</div>
              <div>{item.price}</div>
              <div
                className={classNames({
                  "text-green-500": item.status === "Active",
                  "text-red-500": item.status !== "Active",
                })}
              >
                {item.status}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PaymentHistory;
