import { Routes, Route } from "react-router-dom";
import PropTypes from "prop-types";
import SuperAdminlogin from "../pages/auth/superAdminlogin";
import AdminLogin from "../pages/auth/login";
import StaffLogin from "../pages/auth/staffLogin";


const AuthRoutes = () => {
  return (
    <Routes>
      {/* Super Admin Login Route */}
      <Route path="/superadmin/login" element={<AuthLayout><SuperAdminlogin /></AuthLayout>} />

      {/* Admin Login Route */}
      <Route path="/admin/login" element={<AuthLayout><AdminLogin /></AuthLayout>} />

      {/* Staff Login Route */}
      <Route path="/staff/login" element={<AuthLayout><StaffLogin /></AuthLayout>} />
    </Routes>
  );
};


 //✅ Auth Layout Component - Centers Auth Pages

const AuthLayout = ({ children }) => (
  <div className="flex items-center justify-center min-h-screen w-full">
    {children}
  </div>
);

AuthLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthRoutes;






// import { Routes, Route } from "react-router-dom";
// import SuperAdminlogin from "../pages/auth/superAdminlogin";
// import AdminLogin from "../pages/auth/login";
// import StaffLogin from "../pages/auth/staffLogin";


// /**
//  * ✅ Authentication Routes
//  * - Admin Login: `/admin/login`
//  * - Staff Login: `/staff/login`
//  * - Forgot Password: `/forgot-password`
//  */
// const AuthRoutes = () => {
//   return (
//     <Routes>
//       {/* Super Admin Login Route */}
//       <Route path="/superadmin/login" element={<AuthLayout><SuperAdminlogin /></AuthLayout>} />

//       {/* Admin Login Route */}
//       <Route path="/admin/login" element={<AuthLayout><AdminLogin /></AuthLayout>} />

//       {/* Staff Login Route */}
//       <Route path="/staff/login" element={<AuthLayout><StaffLogin /></AuthLayout>} />
//     </Routes>
//   );
// };


//  //✅ Auth Layout Component - Centers Auth Pages

// const AuthLayout = ({ children }) => (
//   <div className="flex items-center justify-center min-h-screen w-full">
//     {children}
//   </div>
// );

// export default AuthRoutes;
