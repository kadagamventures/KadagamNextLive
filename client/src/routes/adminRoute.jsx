// src/routes/adminRoute.jsx
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import Sidebar from "../components/sidebar";

// Auth Pages
import ForgotPassword from "../pages/auth/forgotPassword";
import ResetPassword from "../pages/auth/resetPassword";

// Admin Pages
import Dashboard from "../pages/admin/dashboard";
import TaskStatus from "../pages/admin/taskStatus";

// Project
import Projects from "../pages/admin/adminproject/project";
import AddProject from "../pages/admin/adminproject/addProject";
import ProjectList from "../pages/admin/adminproject/projectList";

// Staff
import Staffs from "../pages/admin/adminstaff/staffs";
import AddStaff from "../pages/admin/adminstaff/addStaffs";
import AdminStaffList from "../pages/admin/adminstaff/staffsList";

// Task-Tabs
import TaskTabs from "../pages/admin/admintask/taskTabs";
import AddTask from "../pages/admin/admintask/addTask";
import TaskList from "../pages/admin/admintask/taskList";

// Reports
import ReportTabs from "../pages/admin/reportLayout/reportTabs";
import Reports from "../pages/admin/reportLayout/reports";
import Attendance from "../pages/admin/reportLayout/attendance";
import ReportTasks from "../pages/admin/reportLayout/tasks";
import ReportProjects from "../pages/admin/reportLayout/reportprojects";
import ReportStaff from "../pages/admin/reportLayout/reportStaff";
import StaffInfo from "../pages/admin/reportLayout/adminStaffinfo";

// Leave
import LeaveTabs from "../pages/admin/adminLeave/adminLeaveTabs";
import LeaveList from "../pages/admin/adminLeave/leaveList";
import LeaveApproval from "../pages/admin/adminLeave/leaveApproval";
import SetAttendance from "../pages/admin/setAttendace";

// **Default** import for paymentStatus.jsx
import PaymentStatus from "../pages/admin/paymentStatus";
import PaymentHistory from "../pages/admin/payementHistory";

import ChatPage from "../pages/admin/chatPage";
import AdminCreateChatRoomPage from "../pages/admin/adminCreateChatRoomPage";
import ReviewTasksPage from "../pages/reviewTasksPage";

// Loading Screen fallback
const LoadingScreen = () => (
  <div className="flex justify-center items-center min-h-screen">
    <p className="text-gray-700 text-lg">Loading...</p>
  </div>
);

const AdminRoutes = () => {
  const { role, isAuthenticated, authLoaded } = useAuth();
  const location = useLocation();

  // 1) While auth state is loading
  if (!authLoaded) return <LoadingScreen />;

  // 2) Public routes (forgot/reset)
  if (
    location.pathname === "/admin/forgot-password" ||
    location.pathname.startsWith("/admin/reset-password")
  ) {
    return (
      <Routes>
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password/:token" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="forgot-password" replace />} />
      </Routes>
    );
  }

  // 3) Protected: must be logged-in admin
  if (!isAuthenticated || role !== "admin") {
    localStorage.clear();
    return <Navigate to="/admin/login" replace />;
  }

  // 4) All other admin routes
  return (
    <div className="flex w-full">
      <Sidebar />
      <div className="flex-grow p-4">
        <Routes>
          {/* Core */}
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="daily-status" element={<TaskStatus />} />
          <Route path="leave-approval" element={<LeaveApproval />} />
          <Route path="set-attendnce" element={<SetAttendance />} />

          {/* Projects */}
          <Route path="projects" element={<Projects />} />
          <Route path="projects/add" element={<AddProject />} />
          <Route path="projects/edit/:id" element={<AddProject />} />
          <Route path="projects/list" element={<ProjectList />} />

          {/* Staff */}
          <Route path="staffs" element={<Staffs />} />
          <Route path="staffs/add" element={<AddStaff />} />
          <Route path="staffs/edit/:id" element={<AddStaff />} />
          <Route path="staffs/list" element={<AdminStaffList />} />

          {/* Tasks */}
          <Route path="tasks" element={<TaskTabs />}>
            <Route index element={<Navigate to="list" replace />} />
            <Route path="list" element={<TaskList />} />
            <Route path="add" element={<AddTask />} />
            <Route path="edit/:id" element={<AddTask />} />
            <Route path="daily-status" element={<TaskStatus />} />
            <Route path="review" element={<ReviewTasksPage />} />
          </Route>

          {/* Reports */}
          <Route path="reports" element={<ReportTabs />}>
            <Route index element={<Reports />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="tasks" element={<ReportTasks />} />
            <Route path="projects" element={<ReportProjects />} />
            <Route path="staffs" element={<ReportStaff />} />
            <Route path="staffinfo" element={<StaffInfo />} />
          </Route>

          {/* Leave */}
          <Route path="leave" element={<LeaveTabs />}>
            <Route index element={<Navigate to="approval" replace />} />
            <Route path="approval" element={<LeaveApproval />} />
            <Route path="list" element={<LeaveList />} />
          </Route>

          {/* Chat */}
          <Route path="chat" element={<ChatPage />} />
          <Route path="chat/create-room" element={<AdminCreateChatRoomPage />} />

          {/* Payment Status */}
          <Route path="paymentstatus" element={<PaymentStatus />} />
          <Route path="paymenthistory" element={<PaymentHistory />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default AdminRoutes;
