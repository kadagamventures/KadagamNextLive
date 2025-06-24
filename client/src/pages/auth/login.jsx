import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { initializeChatSocket, disconnectChatSocket } from "../../websocket/chatSocket";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { FiMail, FiLock } from "react-icons/fi";
import backgroundImg from "../../assets/backimage.png";
import kadagamLogo from "../../assets/kadagamlogo.png";
import { tokenRefreshInterceptor as api } from "../../utils/axiosInstance";
import { toast } from "react-toastify";

const AdminLogin = () => {
  const [credentials, setCredentials] = useState({ loginId: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) =>
    setCredentials((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const togglePassword = () => setShowPassword((prev) => !prev);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { loginId, password } = credentials;
    if (!loginId || !password) {
      setError("Both Login ID and Password are required.");
      setLoading(false);
      return;
    }

    try {
      disconnectChatSocket();

      const resp = await api.post("/auth/admin/login", { loginId, password });
      const {
        accessToken,
        user,
        subscriptionStatus,
        nextBillingDate,
      } = resp.data;

      localStorage.setItem("accessToken", accessToken);

      if (user.role !== "admin") {
        setError("Access denied. Only admins can log in.");
        setLoading(false);
        return;
      }

      if (subscriptionStatus === "active") {
        await initializeChatSocket();
        navigate("/admin/dashboard");
      } else if (subscriptionStatus === "pending") {
        toast.warn("Your company subscription is pending. Please subscribe.");
        navigate("/pricing", { state: { companyId: user.companyId } });
      } else {
        toast.error("Your company is not verified or has been deactivated.");
      }
    } catch (err) {
      const res = err.response;
      if (
        res?.status === 403 &&
        res.data?.code === "EMAIL_NOT_VERIFIED" &&
        res.data?.companyId
      ) {
        const { companyId } = res.data;
        const email = credentials.loginId;

        try {
          // ✅ Use the new public resend route
          await api.post("/verify/resend", { companyId });
        } catch (e) {
          console.warn("OTP resend failed but continuing to verification screen.");
        }

        navigate("/verification", {
          replace: true,
          state: { companyId, email },
        });
        return;
      }

      setError(
        res?.data?.message ||
        err.message ||
        "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
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

          {error && (
            <p className="text-sm text-red-600 bg-red-100 p-2 rounded mb-4 text-center">
              {error}
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
                disabled={loading}
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
                disabled={loading}
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
              disabled={loading}
            >
              {loading ? "Logging in..." : "Continue"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate("/admin/forgot-password")}
              className="text-sm text-blue-600 hover:underline"
              disabled={loading}
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
            disabled={loading}
          >
            Staff Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
