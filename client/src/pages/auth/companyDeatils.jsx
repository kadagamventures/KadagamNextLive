// src/pages/auth/CompanyDetailsPage.jsx

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FiPhone,
  FiUser,
  FiCreditCard,
  FiBriefcase,
  FiMapPin,
} from "react-icons/fi";
import bgImage from "../../assets/backimage.png";
import { tokenRefreshInterceptor as api } from "../../utils/axiosInstance";

export default function CompanyDetailsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const { companyId, adminPassword } = location.state || {};

  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [cin, setCin] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [address, setAddress] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId || !adminPassword) {
      navigate("/signup", { replace: true });
    }
  }, [companyId, adminPassword, navigate]);

  const isContinueEnabled =
    gstin.trim() &&
    pan.trim() &&
    cin.trim() &&
    companyType &&
    address.trim() &&
    agreedToTerms;

  const handleContinue = async (e) => {
    e.preventDefault();
    setServerError("");
    setLoading(true);

    try {
      const { data } = await api.post("/company/details", {
        companyId,
        gstin: gstin.trim().toUpperCase(),
        pan: pan.trim().toUpperCase(),
        cin: cin.trim().toUpperCase(),
        companyType,
        address: address.trim(),
        adminPassword,
      });

      navigate("/verification", {
        state: {
          companyId: data.company._id || data.companyId,
          email: data.company.email,
        },
      });
    } catch (err) {
      setServerError(err.response?.data?.error || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    navigate("/admin/login");
  };

  const renderInput = ({ type, placeholder, value, onChange, Icon }) => (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
        <Icon size={18} />
      </div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
        className="bg-white border border-gray-300 text-sm text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-3 py-2"
      />
    </div>
  );

  return (
    <div
      className="min-h-screen flex"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="w-1/2 flex items-center justify-center">
        <h1 className="text-white text-6xl font-bold">
          <span className="text-red-500">Kadagam</span>{" "}
          <span className="text-blue-600">Next</span>
        </h1>
      </div>

      <div className="w-1/2 relative flex items-center justify-center">
        <button
          type="button"
          onClick={handleLogin}
          className="absolute top-4 right-8 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-full shadow-lg hover:bg-blue-700"
        >
          Login
        </button>

        <form
          onSubmit={handleContinue}
          className="absolute top-24 left-24 w-[400px] bg-white rounded-2xl p-8 flex flex-col gap-4 shadow-lg"
        >
          <h2 className="text-xl font-bold text-center text-gray-900">
            Company Details
          </h2>

          {renderInput({
            type: "text",
            placeholder: "Enter your GSTIN",
            value: gstin,
            onChange: (e) => setGstin(e.target.value),
            Icon: FiPhone,
          })}

          {renderInput({
            type: "text",
            placeholder: "Enter your PAN",
            value: pan,
            onChange: (e) => setPan(e.target.value),
            Icon: FiUser,
          })}

          {renderInput({
            type: "text",
            placeholder: "Corporate Identification Number (CIN)",
            value: cin,
            onChange: (e) => setCin(e.target.value),
            Icon: FiCreditCard,
          })}

          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
              <FiBriefcase size={18} />
            </div>
            <select
              value={companyType}
              onChange={(e) => setCompanyType(e.target.value)}
              required
              className="bg-white border border-gray-300 text-sm text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-3 py-2"
            >
              <option value="" disabled>
                Select Company Type
              </option>
              <option>Private Limited</option>
              <option>Partnership</option>
              <option>Sole Proprietorship</option>
              <option>Limited Liability Company (LLC)</option>
              <option>Limited Liability Partnership (LLP)</option>
              <option>Corporation (C-Corp)</option>
              <option>S Corporation (S-Corp)</option>
              <option>Nonprofit Corporation</option>
              <option>Others</option>
            </select>
          </div>

          {renderInput({
            type: "text",
            placeholder: "Enter your Address",
            value: address,
            onChange: (e) => setAddress(e.target.value),
            Icon: FiMapPin,
          })}

          {serverError && (
            <p className="text-red-600 text-sm">{serverError}</p>
          )}

          <label className="flex items-start gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={() => setAgreedToTerms(!agreedToTerms)}
              className="h-4 w-4 mt-1 text-blue-600 border-gray-300 rounded"
            />
            <span>
              By signing up, you agree to our{" "}
              <a href="/terms-conditions" className="underline text-blue-400">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy-policy" className="underline text-blue-400">
                Privacy Policy
              </a>
              .
            </span>
          </label>

          <button
            type="submit"
            disabled={!isContinueEnabled || loading}
            className={`w-full h-11 py-2 font-semibold rounded-lg transition ${
              isContinueEnabled && !loading
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-gray-300 text-gray-600 cursor-not-allowed"
            }`}
          >
            {loading ? "Processing..." : "Create"}
          </button>
        </form>
      </div>
    </div>
  );
}
