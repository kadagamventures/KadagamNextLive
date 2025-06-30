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
  const [localError, setLocalError] = useState(""); // New state for local error messages

  const dispatch = useDispatch();
  const navigate = useNavigate();
  // We'll primarily use the Redux 'error' state for server-side errors
  // but keep 'loading' for UI feedback.
  const { loading, error: reduxError } = useSelector((state) => state.staffAuth);

  useEffect(() => {
    if (reduxError) {
      console.warn("🔴 Redux error state:", reduxError);
      // Set the local error state to display the Redux error
      setLocalError(typeof reduxError === "string" ? reduxError : "Login failed. Please check your credentials.");
    } else {
      // Clear local error if Redux error is cleared (e.g., on successful login attempt or component re-render without error)
      setLocalError("");
    }
  }, [reduxError]); // Watch for changes in the Redux error state

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log("🔐 Attempting login with:", { email, password, companyId });

    // Clear any previous local errors
    setLocalError("");

    // Basic client-side validation
    if (!email || !password || !companyId) {
      setLocalError("All fields are required.");
      return;
    }

    // Save companyId for future convenience (do this BEFORE the API call attempt)
    localStorage.setItem("companyId", companyId);

    try {
      const resultAction = await dispatch(
        loginStaff({ email, password, companyId })
      );

      if (loginStaff.fulfilled.match(resultAction)) {
        const { role, permissions } = resultAction.payload.user;

        console.log("✅ Login successful:", resultAction.payload.user);

        localStorage.setItem("role", role);
        // Ensure permissions is an array before stringifying
        localStorage.setItem("permissions", JSON.stringify(permissions || []));

        // Use "accessToken" instead of "token" for full consistency
        if (resultAction.payload.token) {
          localStorage.setItem("accessToken", resultAction.payload.token);
        }

        navigate("/staff/dashboard");
      } else {
        // This block will be hit if the thunk was rejected but didn't throw an error
        // (e.g., if it used rejectWithValue and was handled by createAsyncThunk's error handling)
        console.error(
          "❌ Login rejected by server (resultAction.payload):",
          resultAction.payload
        );
        // The error message should already be in reduxError via the `createAsyncThunk`'s `rejected` case.
        // We set localError based on reduxError in the useEffect hook.
      }
    } catch (err) {
      // This catch block will only be hit if the dispatch itself throws an unexpected error
      // (e.g., network error before server response, or an unhandled error in the thunk)
      console.error("❌ Login failed (exception):", err);
      setLocalError(err.message || "An unexpected error occurred during login.");
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

          {/* Display error messages from either local state or Redux state */}
          {(localError || reduxError) && (
            <p className="text-sm text-red-600 bg-red-100 p-2 rounded mb-4 text-center">
              {localError || (typeof reduxError === "string"
                ? reduxError
                : "Login failed. Please check your credentials.")}
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