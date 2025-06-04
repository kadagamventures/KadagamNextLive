const express = require("express");
const { check, validationResult } = require("express-validator");
const router = express.Router();
const {
    getMonthlyLeaveReport,
    getYearlyLeaveReport,
    generateYearlyLeaveReport,
    cleanupOldLeaveReports
} = require("../../controllers/reportControllers/leaveReportController");

const { verifyToken } = require("../../middlewares/authMiddleware");
const checkPermissions = require("../../middlewares/permissionsMiddleware");

/**
 * ✅ Middleware to validate input parameters
 */
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
};

/**
 * ✅ Validation: Year and Month
 */
const validateYearMonth = [
    check("year").isInt({ min: 2000, max: new Date().getFullYear() }).withMessage("Invalid year."),
    check("month").isInt({ min: 1, max: 12 }).withMessage("Invalid month."),
];

/**
 * ✅ Validation: Year only
 */
const validateYear = [
    check("year").isInt({ min: 2000, max: new Date().getFullYear() }).withMessage("Invalid year."),
];

// ✅ Protect all routes
router.use(verifyToken);

// ====================== 📊 LEAVE REPORT ROUTES ====================== \\

// 📍 GET: Monthly Leave Report (Admin/HR)
router.get(
    "/reports/monthly/:year/:month",
    validateYearMonth,
    validateRequest,
    checkPermissions("manage_staff"),
    getMonthlyLeaveReport
);

// 📍 GET: Yearly Leave Report (Admin/HR)
router.get(
    "/reports/yearly/:year",
    validateYear,
    validateRequest,
    checkPermissions("manage_staff"),
    getYearlyLeaveReport
);

// 📍 GET: Generate & Download Yearly Leave Report PDF (Admin/HR)
router.get(
    "/reports/yearly/:year/download",
    validateYear,
    validateRequest,
    checkPermissions("manage_staff"),
    generateYearlyLeaveReport
);

// 📍 DELETE: Cleanup Old Leave Reports (Admin/HR)
router.delete(
    "/reports/cleanup",
    checkPermissions("manage_staff"),
    cleanupOldLeaveReports
);

module.exports = router;
