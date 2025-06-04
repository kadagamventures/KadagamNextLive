import { Routes, Route } from "react-router-dom";
import PropTypes from "prop-types";
import StaffSidebar from "../components/staffSidebar";

/* Management staffs */
import StaffTabs from "../pages/staffs/manageStaffs/staffReporttabs";
import StaffOverview from "../pages/staffs/manageStaffs/staffReportoverview";
import StaffAttandance from "../pages/staffs/manageStaffs/staffReportattandance"
import StaffReportTasks from "../pages/staffs/manageStaffs/staffReporttask";
import StaffReportProjects from "../pages/staffs/manageStaffs/staffReportproject";
import StaffReportStaff from "../pages/staffs/manageStaffs/staffReportstaffs";
import StaffReportInfo from "../pages/staffs/manageStaffs/staffReportinfo";

/* Core Pages */
import StaffProfile from "../pages/staffs/staffProfile";
import StaffDashboard from "../pages/staffs/staffDashboard";
import StaffReport from "../pages/staffs/staffReport";
import LeavePage from "../pages/staffs/leavePage";

/* Task Management */
import StaffTasks from "../pages/staffs/staffTask/staffTask";
import StaffAddTask from "../pages/staffs/staffTask/staffAddtask";
import StaffTaskList from "../pages/staffs/staffTask/staffTasklist";
import ReviewTasksPage from "../pages/reviewTasksPage"; // ✅ Correct import
import TasksPageUpdate from "../pages/staffs/staffTaskupdate"; // ✅ Correct import

/* Project Management */
import StaffProject from "../pages/staffs/staffProject/staffProject";
import StaffAddProject from "../pages/staffs/staffProject/staffAddproject";
import StaffProjectList from "../pages/staffs/staffProject/staffProjectlist";

/* Staff Management */
import StaffMain from "../pages/staffs/staffStaffs/staffMain"; 
import StaffAdd from "../pages/staffs/staffStaffs/staffAdd";
import StaffList from "../pages/staffs/staffStaffs/staffList";


/* Office Rules */
import OfficeRules from "../pages/staffs/officeRules";

/* Chat Pages */
import StaffChatLandingPage from "../pages/staffs/staffChat/staffChatLandingPage";
import StaffChatPage from "../pages/staffs/staffChat/staffChatPage";
import PermissionedStaffChatPage from "../pages/staffs/staffChat/permissionedStaffChatPage";
import PermissionedManagerChatPage from "../pages/staffs/staffChat/permissionedManagerChatPage";
import CreateChatRoomPage from "../pages/staffs/staffChat/createChatRoomPage";

/* Leave Approval And List */
import LeavePageApproval from "../pages/staffs/leavelistandapprovel/staffLeaveapproval"
import LeavePageList from "../pages/staffs/leavelistandapprovel/staffLeavelist";

/* Auth Pages */
import ForgotPassword from "../pages/auth/forgotPassword";
import ResetPassword from "../pages/auth/resetPassword";

const StaffRoutes = ({ staffPermissions }) => {
  return (
    <div className="flex w-full">
      <StaffSidebar permissions={staffPermissions} />
      <div className="flex-grow p-4">
        <Routes>
          {/* Core Pages */}
          <Route path="profile" element={<StaffProfile />} />
          <Route path="dashboard" element={<StaffDashboard />} />
          <Route path="reports" element={<StaffReport />} />
          <Route path="ask-leave" element={<LeavePage />} />

          {/* Task Management */}
          <Route path="tasks" element={<StaffTasks />} />
          <Route path="tasks/add" element={<StaffAddTask />} />
          <Route path="tasks/edit/:id" element={<StaffAddTask />} />
          <Route path="tasks/list" element={<StaffTaskList />} />
          <Route path="tasks/review" element={<ReviewTasksPage />} /> {/* ✅ Always show */}
          <Route path="tasks/update" element={<TasksPageUpdate />} /> {/* ✅ Show for specific task */}

          {/* Project Management */}
          <Route path="projects" element={<StaffProject />} />
          <Route path="projects/add" element={<StaffAddProject />} />
          <Route path="projects/edit/:id" element={<StaffAddProject />} />
          <Route path="projects/list" element={<StaffProjectList />} />

          {/* Staff Management */}
          <Route path="manage-staff" element={<StaffMain />} />
          <Route path="staffs/add" element={<StaffAdd />} />
          <Route path="staffs/edit/:id" element={<StaffAdd />} />
          <Route path="staffs/list" element={<StaffList />} />

           {/*  Management Staff */}
          <Route path="manage" element={<StaffTabs />}>
           <Route path="overview" element={<StaffOverview />} />
            <Route path="attendance" element={<StaffAttandance />} />
            <Route path="task" element={<StaffReportTasks />} />
            <Route path="projects" element={<StaffReportProjects />} />
            <Route path="staffs" element={<StaffReportStaff />} />
            <Route path="staffs/info" element={<StaffReportInfo />} />
          </Route>


          {/* Office Rules */}
          <Route path="office-rules" element={<OfficeRules />} />

          {/* Chat Pages */}
          <Route path="chat" element={<StaffChatLandingPage />} />
          <Route path="chat/staff" element={<StaffChatPage />} />
          <Route path="chat/permissioned-staff" element={<PermissionedStaffChatPage />} />
          <Route path="chat/permissioned-manager" element={<PermissionedManagerChatPage />} />
          <Route path="chat/create-room" element={<CreateChatRoomPage />} />

          {/* Leave Approval And List */}
          <Route path="leave" element={<LeavePage />} />
          <Route path="leave/approval" element={<LeavePageApproval />} /> {/* Leave Approval */}
          <Route path="leave/list" element={<LeavePageList />} /> {/* Leave List */}

          {/* 404 Page */}

          {/* Auth Pages */}
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password/:token" element={<ResetPassword />} />
        </Routes>
      </div>
    </div>
  );
};

StaffRoutes.propTypes = {
  staffPermissions: PropTypes.array.isRequired,
};

export default StaffRoutes;
