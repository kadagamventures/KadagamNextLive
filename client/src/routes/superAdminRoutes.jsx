import { Routes, Route } from "react-router-dom";
import SuperAdminSidebar from "../components/superAdminsidebar";
import Dashboard from "../pages/superAdmin/superAdmindashboard";
import PaymentHistory from "../pages/superAdmin/paymentHistory";
import SuperAdminRevenue from "../pages/superAdmin/superAdminRevenue";
import SetPricePage from "../pages/superAdmin/setPricePage";

const SuperAdminRoutes = () => {
  return (
    <div className="flex w-full">
      <SuperAdminSidebar />
      <div className="flex-grow p-4">
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
          {/* Updated this route to accept companyId */}
          <Route path="payment-history/:companyId" element={<PaymentHistory />} />
          <Route path="revenue" element={<SuperAdminRevenue />} />
          <Route path="setprice" element={<SetPricePage />} />
          {/* Add more routes as needed */}
        </Routes>
      </div>
    </div>
  );
};

export default SuperAdminRoutes;
