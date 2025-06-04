const express = require("express");
const router = express.Router();
const staffReportController = require("../../controllers/reportControllers/staffReportController");
const { verifyToken } = require("../../middlewares/authMiddleware");
const checkPermissions = require("../../middlewares/permissionsMiddleware");

// ===================== 🔐 AUTH PROTECTION FOR ALL ROUTES ===================== \\
router.use(verifyToken);

// ===================== 👤 STAFF SELF-PERFORMANCE ROUTES ===================== \\

/**
 * @route   GET /report/staff/self/monthly
 * @desc    Fetch monthly performance report for logged-in staff
 */
router.get("/self/monthly", staffReportController.getSelfMonthlyPerformance);

/**
 * @route   GET /report/staff/self/yearly
 * @desc    Fetch yearly performance report for logged-in staff
 */
router.get("/self/yearly", staffReportController.getSelfYearlyPerformance);

/**
 * @route   GET /report/staff/self/visualization
 * @desc    Get chart/graph data for logged-in staff
 */
router.get("/self/visualization", staffReportController.getSelfVisualizationData);

// ===================== 🏢 ADMIN DASHBOARD REPORT ROUTES ===================== \\

/**
 * @route   GET /report/staff/admin/performance-overview
 * @desc    Admin overview of all staff performance
 */
router.get(
  "/admin/performance-overview",
  checkPermissions("manage_staff"),
  staffReportController.getStaffPerformanceOverview
);

/**
 * @route   GET /report/staff/admin/:staffId/performance
 * @desc    Fetch detailed performance data of specific staff (by staffId)
 */
router.get(
  "/admin/:staffId/performance",
  checkPermissions("manage_staff"),
  staffReportController.getSpecificStaffPerformance
);

/**
 * @route   GET /report/staff/admin/visualization
 * @desc    Admin charts for staff breakdowns
 */
router.get(
  "/admin/visualization",
  checkPermissions("manage_staff"),
  staffReportController.getStaffVisualizationData
);

/**
 * @route   GET /report/staff/admin/attendance-monthly/download
 * @desc    Download monthly staff attendance report as PDF
 */
router.get(
  "/admin/attendance-monthly/download",
  checkPermissions("manage_staff"),
  staffReportController.downloadStaffMonthlyReport
);

module.exports = router;
