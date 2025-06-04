const express = require("express");
const router = express.Router();

// 🔐 All sub-routes are protected at individual route level

// ✅ Individual Report Modules (SaaS-compliant)
const overviewReportRoutes = require("./reportRoutes/overviewReportRoutes");
const attendanceReportRoutes = require("./reportRoutes/attendanceReportRoutes");
const taskReportRoutes = require("./reportRoutes/taskReportRoutes");
const projectReportRoutes = require("./reportRoutes/projectReportRoutes");
const staffReportRoutes = require("./reportRoutes/staffReportRoutes");
const leaveReportRoutes = require("./reportRoutes/leaveReportRoutes");
const manualDeleteRoutes = require("./reportRoutes/manualDeleteRoutes");
const manualGenerateRoutes = require("./reportRoutes/manualGenerateRoutes");

// ✅ Mount submodules under appropriate namespaces
router.use("/overview", overviewReportRoutes);         
router.use("/attendance", attendanceReportRoutes);     
router.use("/tasks", taskReportRoutes);                
router.use("/projects", projectReportRoutes);          
router.use("/staff", staffReportRoutes);               
router.use("/leave", leaveReportRoutes);               
router.use("/delete", manualDeleteRoutes);             
router.use("/generate", manualGenerateRoutes);         

module.exports = router;
