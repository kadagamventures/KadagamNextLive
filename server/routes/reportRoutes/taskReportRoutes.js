const express = require("express");
const { check, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const {
    generateTaskReport,
    downloadArchivedTaskReport,
    getLiveTaskStats,
    getTaskVisualizationData,
    getSelfTaskReport
} = require("../../controllers/reportControllers/taskReportController");

const { verifyToken } = require("../../middlewares/authMiddleware");
const checkPermissions = require("../../middlewares/permissionsMiddleware");

// ✅ Rate Limiting: Prevent API Abuse (Max 5 requests per 10 minutes per user)
const reportRateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: { success: false, message: "Too many requests, please try again later." },
});

// ✅ Middleware: Validate Year & Month Parameters
const validateYearMonth = [
    check("year")
        .exists().withMessage("Year is required.")
        .isInt({ min: 2000, max: new Date().getFullYear() })
        .withMessage("Year must be between 2000 and current year."),
    check("month")
        .exists().withMessage("Month is required.")
        .isInt({ min: 1, max: 12 })
        .withMessage("Month must be between 1 and 12.")
];

// ✅ Middleware: Validate Report Type
const validateReportType = [
    check("reportType")
        .exists().withMessage("Report type is required.")
        .isIn(["daily", "monthly", "yearly"])
        .withMessage("Invalid report type. Must be daily, monthly, or yearly.")
];

// ✅ Middleware: Express Validator Error Handler
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, errors: errors.array() });
    }
    next();
};

// 🔐 All routes require token
router.use(verifyToken);

// 📍 Generate Task Report (Admins or Staff with "manage_staff")
router.post(
    "/generate",
    checkPermissions("manage_staff"),
    [...validateReportType, ...validateYearMonth],
    validateRequest,
    reportRateLimiter,
    generateTaskReport
);

// 📍 Download Archived Task Report (Admins or Staff with "manage_staff")
router.get(
    "/download",
    checkPermissions("manage_staff"),
    [...validateReportType, ...validateYearMonth],
    validateRequest,
    reportRateLimiter,
    downloadArchivedTaskReport
);

// 📍 Fetch Real-time Task Statistics (Admins or Staff with "manage_staff")
router.get("/live-stats", checkPermissions("manage_staff"), getLiveTaskStats);

// 📍 Fetch Task Visualization Data (Admins or Staff with "manage_staff")
router.get("/visualization", checkPermissions("manage_staff"), getTaskVisualizationData);

// 📍 Fetch Self Task Report (Logged-in Staff)
router.get("/self", getSelfTaskReport);

module.exports = router;
