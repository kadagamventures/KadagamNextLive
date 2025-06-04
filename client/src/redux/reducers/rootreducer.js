// src/redux/rootReducer.js
import { combineReducers } from 'redux';
import authReducer from './AuthReducers.'; 
import dataReducer from "../silces/dataslices.js";
import projectReducer from "../silces/ProjectSlice";
import staffReducer from "../silces/StaffSlice.js";
import taskReducer from "../silces/TaskSlice.js";
import staffAuthReducer from "../silces/StaffAuthslice.js";
import leaveRequestReducer from "../silces/leaveRequestSlice.js"; 
import staffSidebarReducer from "../silces/StaffSidebarSlice.js"; // New addition

const rootReducer = combineReducers({
  auth: authReducer,            // For admin-login
  data: dataReducer,
  projects: projectReducer,
  staff: staffReducer,          // For staff management components
  tasks: taskReducer,           // For task management
  staffAuth: staffAuthReducer,  // For staff-login authentication state
  leaveRequest: leaveRequestReducer, // For leave request submissions
  StaffSidebar: staffSidebarReducer, // Make sure the right-hand side matches the import
});

export default rootReducer;
