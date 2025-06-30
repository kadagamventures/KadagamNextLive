import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

// Home Pages
import Homepage from "./pages/kadagamNext/homePage";
import Howitworks from "./pages/kadagamNext/howItworks";
import Pricing from "./pages/kadagamNext/pricingPage";
import Privacy from "./pages/kadagamNext/privacypolicy";
import Terms from "./pages/kadagamNext/termspage";
import About from "./pages/kadagamNext/about";

// Auth Pages
import CreateAccountPage from "./pages/auth/createAccountpage";
import CompanyDeatils from "./pages/auth/companyDeatils";
import SuperAdminLogin from "./pages/auth/superAdminlogin";
import ProfileSetupPage from "./pages/auth/profileSetuppage";
import AdminLogin from "./pages/auth/login";
import StaffLogin from "./pages/auth/staffLogin";
import ForgotPassword from "./pages/auth/forgotPassword";
import ResetPassword from "./pages/auth/resetPassword";
import VerificationPage from "./pages/auth/verficationpage";

// Routes & Components
import SuperAdminRoute from "./routes/superAdminRoutes";
import AdminRoute from "./routes/adminRoute";
import StaffRoutes from "./routes/staffRoute";
import DataComponent from "./components/dataComponents";
import AxiosAuthProvider from "./hooks/axiosAuthProvider";

// WebSocket Setup
import { initializeChatSocket } from "./websocket/chatSocket";
import { initializeNotificationSocket } from "./websocket/notificationSocket";
import { setSocketConnected } from "./redux/slices/chatSlice";
import { setUserOnline, setUserOffline } from "./redux/slices/presenceSlice";

import "./index.css";

function App() {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  const staffAuth = useSelector((state) => state.staffAuth);
  const [staffPermissions, setStaffPermissions] = useState([]);

  // Safety: keep staffPermissions in state for StaffRoutes
  useEffect(() => {
    const storedPermissions = JSON.parse(localStorage.getItem("staffPermissions") || "[]");
    setStaffPermissions(Array.isArray(storedPermissions) ? storedPermissions : []);
  }, []);

  // Consistent accessToken usage + session safety
  useEffect(() => {
    const token = localStorage.getItem("accessToken"); // Must match axiosInstance.js
    const user = auth?.user || staffAuth?.user;

    // Extra session safety: if missing accessToken, clear sensitive info!
    if (!token) {
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      localStorage.removeItem("permissions");
      localStorage.removeItem("subscriptionStatus");
      localStorage.removeItem("nextBillingDate");
      localStorage.removeItem("companyId");
      localStorage.removeItem("staffPermissions");
      // Optionally force-redirect (comment if you want to stay on home page):
      // window.location.href = "/admin/login";
    }

    // Only initialize sockets if user+token exist
    if (user && token) {
      initializeChatSocket({
        onSocketConnected: () => dispatch(setSocketConnected(true)),
        onSocketDisconnected: () => dispatch(setSocketConnected(false)),
        onUserOnline: (userId) => dispatch(setUserOnline(userId)),
        onUserOffline: (userId) => dispatch(setUserOffline(userId)),
      });

      initializeNotificationSocket(dispatch);
    }
  }, [auth?.user, staffAuth?.user, dispatch]);

  return (
    <Router>
      <AxiosAuthProvider />

      <div className="flex flex-col font-sans min-h-screen">
        <Routes>
          {/* Home Routes */}
          <Route path="/" element={<Homepage />} />
          <Route path="/try" element={<Howitworks />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/privacy-policy" element={<Privacy />} />
          <Route path="/terms-conditions" element={<Terms />} />
          <Route path="/about" element={<About />} />

          {/* Redirect /home to admin login */}
          <Route path="/home" element={<Navigate to="/admin/login" replace />} />

          {/* Auth Routes */}
          <Route path="/signin" element={<CreateAccountPage />} />
          <Route path="/company-details" element={<CompanyDeatils />} />
          <Route path="/superadmin/login" element={<SuperAdminLogin />} />
          <Route path="/profile-setup" element={<ProfileSetupPage />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/staff/login" element={<StaffLogin />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/verification" element={<VerificationPage />} />

          {/* Protected Routes */}
          <Route path="/superadmin/*" element={<SuperAdminRoute />} />
          <Route path="/admin/*" element={<AdminRoute />} />
          <Route path="/staff/*" element={<StaffRoutes staffPermissions={staffPermissions} />} />

          {/* Misc */}
          <Route path="/data" element={<DataComponent />} />
          <Route path="*" element={<h1 className="text-center text-2xl mt-20">404 - Page Not Found</h1>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
