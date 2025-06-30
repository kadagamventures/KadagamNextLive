import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loginStaff } from "../../redux/slices/staffAuthslice"; // <-- fixed typo in file name
import { Eye, EyeOff } from "lucide-react";
import backgroundImg from "../../assets/backimage.png";
import kadagamLogo from "../../assets/kadagamlogo.png";
import { FiMail, FiBriefcase, FiLock } from "react-icons/fi";

const StaffLogin = () => {
  // Pre-fill companyId from localStorage if available
  const storedCompanyId = localStorage.getItem("companyId") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyId, setCompanyId] = useState(storedCompanyId);
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.staffAuth);

  useEffect(() => {
    if (error) {
      console.warn("🔴 Redux error state:", error);
    }
  }, [error]);

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log("🔐 Attempting login with:", { email, password, companyId });

    // Save companyId for future convenience
    localStorage.setItem("companyId", companyId);

    try {
      const resultAction = await dispatch(
        loginStaff({ email, password, companyId })
      );

      if (loginStaff.fulfilled.match(resultAction)) {
        const { role, permissions } = resultAction.payload.user;

        console.log("✅ Login successful:", resultAction.payload.user);

        localStorage.setItem("role", role);
        localStorage.setItem("permissions", JSON.stringify(permissions || []));

        // Use "accessToken" instead of "token" for full consistency
        if (resultAction.payload.token) {
          localStorage.setItem("accessToken", resultAction.payload.token);
        }

        navigate("/staff/dashboard");
      } else {
        console.error(
          "❌ Login rejected by server:",
          resultAction.payload
        );
        // Clear only relevant keys if login fails
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        localStorage.removeItem("role");
        localStorage.removeItem("permissions");
        localStorage.removeItem("companyId");
      }
    } catch (err) {
      console.error("❌ Login failed (exception):", err);
    }
  };

  return (
    <div
      className="relative min-h-screen flex overflow-visible"
      style={{
        backgroundImage: `url(${backgroundImg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >

      {/* Left Branding */}
      <div className="hidden md:flex w-1/2 bg-opacity-50 items-center justify-center">
        <div className="text-white text-center p-8">
          <h1
            className="text-5xl font-extrabold"
            style={{ fontFamily: "Inter", fontSize: "69px" }}
          >
            Kadagam Next
          </h1>
          <p className="mt-4 text-xl">Your ultimate workspace</p>
        </div>
      </div>

      {/* Right Login Form */}
      <div className="flex w-full md:w-1/2 items-center justify-center p-6">
        <div className="bg-white rounded-4xl shadow-xl p-8 w-full max-w-md">
          <div className="flex justify-center mb-8">
            <img src={kadagamLogo} alt="Logo" className="w-16" />
          </div>

          <h2 className="text-2xl font-bold text-center text-gray-800 mb-10">
            Staff Login
          </h2>

          {error && (
            <p className="text-sm text-red-600 bg-red-100 p-2 rounded mb-4 text-center">
              {typeof error === "string"
                ? error
                : "Login failed. Please try again."}
            </p>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
                required
              />
              <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>

            {/* Password Field with Icon and Toggle */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
                required
              />
              <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Company ID Field with Icon */}
            <div className="relative">
              <input
                type="text"
                placeholder="Company ID"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
                required
              />
              <FiBriefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Continue"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => navigate("/forgot-password")}
              className="text-blue-600 text-sm hover:underline"
              disabled={loading}
            >
              Forgot Password?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;
