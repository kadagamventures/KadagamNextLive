const express = require("express");
const router = express.Router();

const { verifyToken } = require("../../middlewares/authMiddleware");
const checkPermissions = require("../../middlewares/permissionsMiddleware");

const projectReportController = require("../../controllers/reportControllers/projectReportController");

// ✅ Apply Authentication to All Routes
router.use(verifyToken);

/**
 * ===============================================
 * 📊 PROJECT REPORT ROUTES (Multi-Tenant SaaS)
 * Base: /api/reports/project
 * ===============================================
 */

/**
 * 🔹 [GET] /live-overview
 * → Fetch Live Project Stats (Real-Time Overview)
 */
router.get(
  "/live-overview",
  checkPermissions("manage_staff"),
  projectReportController.getLiveProjectOverview
);

/**
 * 🔹 [GET] /monthly-report
 * → Generate Monthly Project Report (Triggers PDF Generation)
 * Query: ?month=MM&year=YYYY
 */
router.get(
  "/monthly-report",
  checkPermissions("manage_staff"),
  projectReportController.generateMonthlyProjectReport
);

/**
 * 🔹 [GET] /monthly-report/download
 * → Download Project Report from Archive (if already generated)
 * Query: ?month=MM&year=YYYY
 */
router.get(
  "/monthly-report/download",
  checkPermissions("manage_staff"),
  projectReportController.downloadMonthlyProjectReport
);

/**
 * 🔹 [DELETE] /cleanup-old-reports
 * → Auto-delete expired project reports (from AWS S3) older than retention limit
 */
router.delete(
  "/cleanup-old-reports",
  checkPermissions("manage_staff"),
  projectReportController.cleanupOldProjectReports
);

module.exports = router;
