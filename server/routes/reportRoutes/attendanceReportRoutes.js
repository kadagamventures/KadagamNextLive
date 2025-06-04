const express = require("express");
const router = express.Router();
const attendanceReportController = require("../../controllers/reportControllers/attendanceReportController");
const { verifyToken } = require("../../middlewares/authMiddleware");
const checkPermissions = require("../../middlewares/permissionsMiddleware");
const { query, validationResult } = require("express-validator");

/**
 * ✅ Middleware to validate request queries
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

/**
 * ================================
 * 📆 DAILY ATTENDANCE REPORT
 * GET /api/reports/attendance/daily?date=YYYY-MM-DD
 * ================================
 */
router.get(
  "/daily",
  verifyToken,
  checkPermissions("manage_staff"),
  [
    query("date", "Date is required and must be in YYYY-MM-DD format")
      .isISO8601()
  ],
  validateRequest,
  attendanceReportController.getDailyAttendanceReport
);

/**
 * ================================
 * 📅 MONTHLY ATTENDANCE REPORT (DATA)
 * GET /api/reports/attendance/monthly?month=5&year=2025
 * ================================
 */
router.get(
  "/monthly",
  verifyToken,
  checkPermissions("manage_staff"),
  [
    query("month", "Month is required and must be between 1-12").isInt({ min: 1, max: 12 }),
    query("year", "Year is required and must be a valid 4-digit year").isInt({ min: 2000, max: 2100 })
  ],
  validateRequest,
  attendanceReportController.getMonthlyAttendanceReport
);

/**
 * ================================
 * 🖨️ DOWNLOAD MONTHLY ATTENDANCE REPORT (PDF)
 * GET /api/reports/attendance/monthly/download?month=5&year=2025
 * ================================
 */
router.get(
  "/monthly/download",
  verifyToken,
  checkPermissions("manage_staff"),
  [
    query("month", "Month is required and must be between 1-12").isInt({ min: 1, max: 12 }),
    query("year", "Year is required and must be a valid 4-digit year").isInt({ min: 2000, max: 2100 })
  ],
  validateRequest,
  attendanceReportController.downloadMonthlyAttendancePDF
);

/**
 * ================================
 * 📆 YEARLY ATTENDANCE SUMMARY (DATA)
 * GET /api/reports/attendance/yearly?year=2025
 * ================================
 */
router.get(
  "/yearly",
  verifyToken,
  checkPermissions("manage_staff"),
  [
    query("year", "Year is required and must be a valid 4-digit year").isInt({ min: 2000, max: 2100 })
  ],
  validateRequest,
  attendanceReportController.getYearlyAttendanceSummary
);

/**
 * ================================
 * 🖨️ DOWNLOAD YEARLY ATTENDANCE REPORT (PDF)
 * GET /api/reports/attendance/yearly/download?year=2025
 * ================================
 */
router.get(
  "/yearly/download",
  verifyToken,
  checkPermissions("manage_staff"),
  [
    query("year", "Year is required and must be a valid 4-digit year").isInt({ min: 2000, max: 2100 })
  ],
  validateRequest,
  attendanceReportController.downloadYearlyAttendancePDF
);

module.exports = router;
