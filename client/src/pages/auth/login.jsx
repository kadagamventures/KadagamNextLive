// src/pages/auth/AdminLogin.jsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "../../redux/slices/authSlice";
import {
  initializeChatSocket,
  disconnectChatSocket,
} from "../../websocket/chatSocket";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { FiMail, FiLock } from "react-icons/fi";
import backgroundImg from "../../assets/backimage.png";
import kadagamLogo from "../../assets/kadagamlogo.png";
import { toast } from "react-toastify";

const AdminLogin = () => {
  const [credentials, setCredentials] = useState({ loginId: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState(null);

  const { status, error, user, isAuthenticated, subscriptionStatus } = useSelector(
    (state) => state.auth
  );
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "success" && isAuthenticated && user) {
      if (user.role !== "admin") {
        setFormError("Access denied. Only admins can log in.");
        return;
      }

      switch (subscriptionStatus) {
        case "active":
          toast.success("Login successful!");
          initializeChatSocket()
            .then(() => console.log("🟢 Chat socket initialized"))
            .catch((err) => console.warn("⚠ Chat socket init failed:", err));
          setTimeout(() => navigate("/admin/dashboard"), 150);
          break;

        case "pending":
          toast.warn("Your subscription is pending. Please subscribe.");
          navigate("/pricing", { state: { companyId: user.companyId } });
          break;

        default:
          toast.error("Your company is not verified or has been deactivated.");
          break;
      }
    }
  }, [status, isAuthenticated, user, subscriptionStatus, navigate]);

  const handleChange = (e) =>
    setCredentials((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const togglePassword = () => setShowPassword((prev) => !prev);

  const handleLogin = async (e) => {
    e.preventDefault();
    setFormError(null);

    const { loginId, password } = credentials;
    if (!loginId || !password) {
      setFormError("Both Login ID and Password are required.");
      return;
    }

    disconnectChatSocket();

    const resultAction = await dispatch(loginUser({ loginId, password }));

    if (loginUser.rejected.match(resultAction)) {
      const res = resultAction.payload;

      if (
        res?.code === "EMAIL_NOT_VERIFIED" &&
        res?.companyId &&
        credentials?.loginId
      ) {
        try {
          await fetch("/api/verify/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ companyId: res.companyId }),
          });
        } catch (err) {
          console.warn("⚠ OTP send failed:", err);
        }

        navigate("/verification", {
          replace: true,
          state: {
            companyId: res.companyId,
            email: credentials.loginId,
          },
        });
      } else {
        setFormError(res || "Login failed.");
      }
    }
  };

  return (
    <div
      className="relative min-h-screen flex"
      style={{
        backgroundImage: `url(${backgroundImg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="hidden md:flex w-1/2 bg-opacity-50 items-center justify-center">
        <div className="text-white text-center p-8">
          <h1 className="text-5xl font-extrabold">Kadagam Next</h1>
          <p className="mt-4 text-xl">Your ultimate workspace</p>
        </div>
      </div>

      <div className="flex w-full md:w-1/2 items-center justify-center p-6">
        <div className="bg-white rounded-4xl shadow-xl p-8 w-full max-w-md">
          <div className="flex justify-center mb-8">
            <img src={kadagamLogo} alt="Logo" className="w-12" />
          </div>

          <h3 className="text-2xl font-bold text-center text-gray-800 mb-6">
            Admin Login
          </h3>

          {formError && (
            <p className="text-sm text-red-600 bg-red-100 p-2 rounded mb-4 text-center">
              {formError}
            </p>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <FiMail size={18} />
              </div>
              <input
                type="text"
                name="loginId"
                placeholder="Admin ID or Email"
                value={credentials.loginId}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={status === "loading"}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <FiLock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={credentials.password}
                onChange={handleChange}
                className="w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={status === "loading"}
              />
              <button
                type="button"
                onClick={togglePassword}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500"
                tabIndex={-1}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
              disabled={status === "loading"}
            >
              {status === "loading" ? "Logging in..." : "Continue"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate("/admin/forgot-password")}
              className="text-sm text-blue-600 hover:underline"
              disabled={status === "loading"}
            >
              Forgot your password?
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center mt-6">
            By signing up, you agree to our{" "}
            <span
              className="text-blue-600 hover:underline cursor-pointer"
              onClick={() => window.open("/terms-conditions", "_blank")}
            >
              Terms of Service
            </span>{" "}
            and{" "}
            <span
              className="text-blue-600 hover:underline cursor-pointer"
              onClick={() => window.open("/privacy-policy", "_blank")}
            >
              Privacy Policy
            </span>
            .
          </p>

          <button
            onClick={() => navigate("/staff/login")}
            className="mt-6 w-full text-sm text-blue-600 hover:underline"
            disabled={status === "loading"}
          >
            Staff Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
