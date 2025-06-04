// src/pages/superAdmin/AdminLogin.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { tokenRefreshInterceptor as axios } from "../../utils/axiosInstance";
import backgroundImg from "../../assets/backimage.png";
import kadagamLogo from "../../assets/kadagamlogo.png";
import { FiMail, FiLock } from "react-icons/fi";
import { resetAuthState } from "../../redux/slices/authSlice";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Both Email and Password are required.");
      return;
    }

    setLoading(true);
    try {
      dispatch(resetAuthState());

      const { data } = await axios.post("/super-admin/login", {
        email,
        password,
      });

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.user.role === "super_admin") {
        navigate("/superadmin/dashboard");
      } else {
        setError("Access denied. Only Super Admins can log in.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
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
      {/* Branding Pane */}
      <div className="hidden md:flex w-1/2 bg-black bg-opacity-50 items-center justify-center">
        <div className="text-white text-center p-8">
          <h1 className="text-5xl font-extrabold" style={{ fontSize: "69px" }}>
            Kadagam Next
          </h1>
          <p className="mt-4 text-xl">Your ultimate workspace</p>
        </div>
      </div>

      {/* Login Form */}
      <div className="flex w-full md:w-1/2 items-center justify-center p-6">
        <div className="bg-white rounded-4xl shadow-xl p-8 w-full max-w-md">
          <div className="flex justify-center mb-8">
            <img src={kadagamLogo} alt="Logo" className="w-12" />
          </div>

          <h3 className="text-2xl font-bold text-center text-gray-800 mb-10">
            SuperAdmin Login
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
                type="email"
                name="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <FiLock size={18} />
              </div>
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
