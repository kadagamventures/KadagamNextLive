// src/components/Dashboard.jsx

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import classNames from "classnames";
import PropTypes from "prop-types";
import { tokenRefreshInterceptor as axios } from "../../utils/axiosInstance";

const Dashboard = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get("/super-admin/companies");
        setCompanies(response.data);
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Failed to fetch companies.");
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  const handleRowClick = (company) => {
    setSelectedCompany(company);
  };

  const closeModal = () => {
    setSelectedCompany(null);
  };

  const formatDate = (isoString) => {
    if (!isoString) return "—";
    const date = new Date(isoString);
    return date.toLocaleDateString("en-GB");
  };

  return (
    <div className="min-h-screen bg-[#f6f6fa] p-8 pl-64 relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Company List</h1>
        <div className="relative">
          <input
            type="text"
            placeholder="Search Companies..."
            className="pl-4 pr-10 py-2 rounded-full text-sm bg-white shadow-md focus:outline-none"
          />
          <span className="absolute right-3 top-2 text-purple-500">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1116.65 16.65z"
              />
            </svg>
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-6">
        {/* Header Row */}
        <div className="grid grid-cols-12 font-semibold text-gray-700 text-sm mb-4 px-2">
          <div className="col-span-2">Company ID</div>
          <div className="col-span-3">Company Name</div>
          <div className="col-span-4">Email</div>
          <div className="col-span-1">Plan</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1">Payment</div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading companies...</div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">{error}</div>
        ) : companies.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No companies found.</div>
        ) : (
          companies.map((company) => {
            const planName = company.subscription?.planId?.name || "—";
            const status = company.subscription?.status || "Unknown";
            return (
              <div
                key={company._id}
                className="grid grid-cols-12 items-center text-sm text-gray-500 py-3 px-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                onClick={() => handleRowClick(company)}
              >
                <div className="col-span-2">{company._id}</div>
                <div className="col-span-3">{company.name}</div>
                <div className="col-span-4">{company.email}</div>
                <div className="col-span-1">{planName}</div>
                <div
                  className={classNames("col-span-1 font-medium", {
                    "text-green-500": status.toLowerCase() === "active",
                    "text-red-500": status.toLowerCase() !== "active",
                  })}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </div>
                <div className="col-span-1">
                  <Link
                    to={`/superadmin/payment-history/${company._id}`}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View more &gt;
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Popup */}
      {selectedCompany && (
        <div className="fixed inset-0 flex items-center justify-center backdrop-blur-xs bg-opacity-30 z-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-[320px]">
            <h2 className="text-xl font-semibold text-center mb-4">Company Details</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <DetailRow label="Company ID" value={selectedCompany._id} />
              <DetailRow label="Company Name" value={selectedCompany.name} />
              <DetailRow label="Email" value={selectedCompany.email} />
              <DetailRow
                label="Current Plan"
                value={selectedCompany.subscription?.planId?.name || "—"}
              />
              <DetailRow
                label="Renewal Date"
                value={formatDate(selectedCompany.subscription?.nextBillingDate)}
              />
              <DetailRow
                label="Payment Status"
                value={selectedCompany.subscription?.status || "—"}
                valueClass={classNames("font-medium", {
                  "text-green-500": selectedCompany.subscription?.status === "active",
                  "text-red-500": selectedCompany.subscription?.status !== "active",
                })}
              />
            </div>
            <button
              onClick={closeModal}
              className="mt-6 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Subcomponent for reusable detail rows
const DetailRow = ({ label, value, valueClass }) => (
  <div className="flex justify-between">
    <span className="font-medium text-gray-700">{label}</span>
    <span className={valueClass}>{value}</span>
  </div>
);

DetailRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  valueClass: PropTypes.string,
};

export default Dashboard;
