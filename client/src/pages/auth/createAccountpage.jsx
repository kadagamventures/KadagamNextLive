// src/pages/auth/CreateAccountPage.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiLock,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import bgImage from "../../assets/backimage.png";
import { tokenRefreshInterceptor as api } from "../../utils/axiosInstance";

export default function CreateAccountPage() {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  // Enable “Continue” only when all fields are filled and terms are checked
  const isContinueEnabled =
    companyName.trim() &&
    email.trim() &&
    mobile.trim() &&
    password &&
    confirmPassword &&
    agreedToTerms;

  const handleContinue = async (e) => {
    e.preventDefault();

    // Ensure passwords match
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setPasswordError("");
    setServerError("");
    setLoading(true);

    try {
      // POST to the backend’s Step 1 endpoint (stub-company creation)
      const { data } = await api.post("/company/register", {
        name: companyName.trim(),
        email: email.trim().toLowerCase(),
        phone: mobile.trim(),
        password: password,
      });

      // Extract the newly generated companyId
      const companyId = data.companyId;

      // Navigate to the second step route "/company-details"
      // Pass companyId and adminPassword (password) in state
      navigate("/company-details", {
        state: {
          companyId,
          adminPassword: password,
        },
      });
    } catch (err) {
      // Show server-side errors or a generic fallback
      if (err.response?.data?.error) {
        setServerError(err.response.data.error);
      } else {
        setServerError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    navigate("/admin/login");
  };

  const renderInput = ({ type, placeholder, value, onChange, Icon, toggle, isVisible }) => (
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
        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-10 p-2.5"
      />
      {toggle && (
        <div
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 cursor-pointer"
          onClick={toggle}
        >
          {isVisible ? <FiEyeOff size={18} /> : <FiEye size={18} />}
        </div>
      )}
    </div>
  );

  return (
    <div
      className="relative min-h-screen flex"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Left branding */}
      <div className="w-1/2 bg-opacity-50 flex items-center justify-center">
        <h1 className="text-white text-6xl font-bold">
          <span className="text-red-500">Kadagam</span>{" "}
          <span className="text-blue-600">Next</span>
        </h1>
      </div>

      {/* Right registration form */}
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
          className="absolute top-8 left-24 w-[400px] bg-white rounded-2xl p-8 flex flex-col gap-4 shadow-lg"
        >
          <h2 className="text-2xl font-bold text-center text-gray-900">
            Create your Account
          </h2>

          {renderInput({
            type: "text",
            placeholder: "Company Name",
            value: companyName,
            onChange: (e) => setCompanyName(e.target.value),
            Icon: FiUser,
          })}

          {renderInput({
            type: "email",
            placeholder: "Email",
            value: email,
            onChange: (e) => setEmail(e.target.value),
            Icon: FiMail,
          })}

          {renderInput({
            type: "tel",
            placeholder: "Mobile Number",
            value: mobile,
            onChange: (e) => setMobile(e.target.value),
            Icon: FiPhone,
          })}

          {renderInput({
            type: showPassword ? "text" : "password",
            placeholder: "Password",
            value: password,
            onChange: (e) => {
              setPassword(e.target.value);
              if (confirmPassword && e.target.value !== confirmPassword) {
                setPasswordError("Passwords do not match");
              } else {
                setPasswordError("");
              }
            },
            Icon: FiLock,
            toggle: () => setShowPassword((prev) => !prev),
            isVisible: showPassword,
          })}

          {renderInput({
            type: showConfirmPassword ? "text" : "password",
            placeholder: "Confirm Password",
            value: confirmPassword,
            onChange: (e) => {
              setConfirmPassword(e.target.value);
              if (password !== e.target.value) {
                setPasswordError("Passwords do not match");
              } else {
                setPasswordError("");
              }
            },
            Icon: FiLock,
            toggle: () => setShowConfirmPassword((prev) => !prev),
            isVisible: showConfirmPassword,
          })}

          {passwordError && (
            <p className="text-red-500 text-sm -mt-2">{passwordError}</p>
          )}
          {serverError && (
            <p className="text-red-600 text-sm">{serverError}</p>
          )}

          <label className="flex items-start gap-2 text-sm text-gray-800 mt-2">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={() => setAgreedToTerms(!agreedToTerms)}
              className="h-4 w-4 mt-1 text-blue-600 border-gray-300 rounded"
            />
            <span>
              By signing up, you agree to our{" "}
              <a
                href="/terms-conditions"
                className="underline text-blue-400"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="/privacy-policy"
                className="underline text-blue-400"
              >
                Privacy Policy
              </a>
              .
            </span>
          </label>

          <button
            type="submit"
            disabled={!isContinueEnabled || loading}
            className={`mx-auto w-36 h-11 py-2 font-semibold rounded-lg transition ${
              isContinueEnabled && !loading
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-gray-300 text-gray-600 cursor-not-allowed"
            }`}
          >
            {loading ? "Processing..." : "Continue"}
          </button>

          <div className="flex flex-col items-center mt-4">
            <p className="text-sm text-gray-700">
              Sign up via Google account
            </p>
            <a href={`${import.meta.env.VITE_API_URL}/auth/google`}>
              <button
                type="button"
                className="p-2 border rounded-full hover:bg-gray-100"
              >
                <FcGoogle size={20} />
              </button>
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
