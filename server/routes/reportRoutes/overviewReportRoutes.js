const express = require("express");
const router = express.Router();

const {
  getOverviewReport,
  getOverviewCharts
} = require("../../controllers/reportControllers/overviewReportController");

const { verifyToken } = require("../../middlewares/authMiddleware");
const checkPermissions = require("../../middlewares/permissionsMiddleware");

// ✅ All routes below require authentication
router.use(verifyToken);

/**
 * ================================================
 * 📊 OVERVIEW REPORT ROUTES (Multi-Tenant)
 * Base: /api/reports/overview
 * ================================================
 */

/**
 * 🔹 GET /
 * Get overall report summary
 * Query: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get("/", checkPermissions("manage_staff"), getOverviewReport);

/**
 * 🔹 GET /charts
 * Get dashboard chart data
 * Query: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get("/charts", checkPermissions("manage_staff"), getOverviewCharts);

module.exports = router;
