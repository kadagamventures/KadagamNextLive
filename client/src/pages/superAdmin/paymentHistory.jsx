// src/components/PaymentHistory.jsx

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import superAdminPaymentService from "../../services/superAdminPaymentService";

const PaymentHistory = () => {
  const { companyId } = useParams();
  const currentYear = new Date().getFullYear();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await superAdminPaymentService.fetchCompanyHistory(
          companyId,
          selectedYear.toString()
        );
        const formatted = data.map((p) => ({
          planName:      p.planName,
          baseAmount:    p.baseAmount,
          gstAmount:     p.gstAmount,
          totalAmount:   p.totalAmount,
          paymentDate:   new Date(p.paymentDate),
          invoiceNumber: p.invoiceNumber,
          downloadUrl:   p.downloadUrl,
        }));
        formatted.sort((a, b) => b.paymentDate - a.paymentDate);
        setPayments(formatted);
      } catch (err) {
        setError(err.message || "Failed to load payment history");
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [companyId, selectedYear]);

  const handleDownload = (invoiceNumber, downloadUrl) => {
    if (downloadUrl) {
      // use presigned URL if available
      window.open(downloadUrl, "_blank", "noopener");
    } else {
      // fallback to proxy endpoint
      superAdminPaymentService.downloadCompanyInvoice(companyId, invoiceNumber);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f6fa] flex flex-col items-center mt-5 pl-64 p-10">
      <div className="w-full bg-white rounded-2xl shadow p-6">
        {/* Header + Year selector */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Payment History</h1>
          <select
            className="text-sm bg-white border border-gray-300 rounded px-2 py-1"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {[currentYear, currentYear - 1, currentYear - 2].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Table headings */}
        <div className="grid grid-cols-6 gap-4 font-semibold text-gray-600 text-sm border-b border-gray-200 pb-2 mb-4">
          <div>Date</div>
          <div>Plan</div>
          <div className="text-right">Base ₹</div>
          <div className="text-right">GST ₹</div>
          <div className="text-right">Total ₹</div>
          <div>Invoice</div>
        </div>

        {/* Table body */}
        {loading ? (
          <div className="text-center py-10 text-gray-500">
            Loading payments…
          </div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">{error}</div>
        ) : payments.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No payments found for {selectedYear}.
          </div>
        ) : (
          payments.map((p) => (
            <div
              key={p.invoiceNumber}
              className="grid grid-cols-6 gap-4 text-sm text-gray-700 py-2 border-b border-gray-100"
            >
              <div>{p.paymentDate.toLocaleDateString("en-GB")}</div>
              <div>{p.planName}</div>
              <div className="text-right">₹ {p.baseAmount.toFixed(2)}</div>
              <div className="text-right">₹ {p.gstAmount.toFixed(2)}</div>
              <div className="text-right font-medium">
                ₹ {p.totalAmount.toFixed(2)}
              </div>
              <div>
                {p.invoiceNumber ? (
                  <button
                    onClick={() => handleDownload(p.invoiceNumber, p.downloadUrl)}
                    className="inline-block px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    Download
                  </button>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PaymentHistory;
