import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import classNames from "classnames";
import PropTypes from "prop-types";
import { tokenRefreshInterceptor as axios } from "../../utils/axiosInstance";

const Dashboard = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || user.role !== "super_admin") {
      setError("Access denied. Super Admin only.");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data } = await axios.get("/super-admin/companies");
        setCompanies(data);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const handleRowClick = (company) => setSelectedCompany(company);
  const closeModal = () => setSelectedCompany(null);
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

  return (
    <div className="min-h-screen bg-[#f6f6fa] p-8 pl-64 relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Company List</h1>
        <div className="relative">
          <input
            type="text"
            placeholder="Search Companies..."
            className="pl-4 pr-10 py-2 rounded-full text-sm bg-white shadow-md"
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
        <div className="grid grid-cols-12 font-semibold text-gray-700 text-sm mb-4 px-2">
          <div className="col-span-2">Company ID</div>
          <div className="col-span-4">Company Name</div>
          <div className="col-span-4">Email</div>
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
            const status = company.subscription?.status || "Unknown";

            return (
              <div
                key={company._id}
                className="grid grid-cols-12 items-center text-sm text-gray-500 py-3 px-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                onClick={() => handleRowClick(company)}
              >
                <div className="col-span-2">{company._id}</div>
                <div className="col-span-4">{company.name}</div>
                <div className="col-span-4">{company.email}</div>
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

      {selectedCompany && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-25 z-50">
          <div className="bg-white rounded-2xl shadow-lg p-6 w-80">
            <h2 className="text-xl font-semibold text-center mb-4">Company Details</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <DetailRow label="Company ID" value={selectedCompany._id} />
              <DetailRow label="Name" value={selectedCompany.name} />
              <DetailRow label="Email" value={selectedCompany.email} />
              <DetailRow
                label="Renewal Date"
                value={fmtDate(selectedCompany.subscription?.nextBillingDate)}
              />
              <DetailRow
                label="Status"
                value={
                  selectedCompany.subscription?.status
                    ? selectedCompany.subscription.status.charAt(0).toUpperCase() +
                      selectedCompany.subscription.status.slice(1)
                    : "Unknown"
                }
                valueClass={classNames("font-medium", {
                  "text-green-500":
                    selectedCompany.subscription?.status?.toLowerCase() === "active",
                  "text-red-500":
                    selectedCompany.subscription?.status?.toLowerCase() !== "active",
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
