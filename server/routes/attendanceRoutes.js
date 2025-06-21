// routes/attendanceRoutes.js
const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");

const {
  startWork,
  endWork,
  getOwnAttendance,
  getAllAttendance,
  getAttendanceByStaff,
  getAttendanceByDate,
  declareLeaveForPastDate,
  getActiveAttendance,
} = attendanceController;

const { verifyToken } = require("../middlewares/authMiddleware");
const { generalLimiter, adminLimiter } = require("../middlewares/rateLimiterMiddleware");
const checkPermissions = require("../middlewares/permissionsMiddleware");

// Apply authentication middleware to all attendance routes
router.use(verifyToken);

// ===============================
// 📍 STAFF ROUTES
// ===============================

// Staff Clock-In (Check-In)
router.post("/check-in", generalLimiter, startWork);

// Staff Clock-Out (Check-Out)
router.post("/check-out", generalLimiter, endWork);

// View Own Attendance Records (paginated via query ?page=&limit=)
router.get("/my-attendance", generalLimiter, getOwnAttendance);

// Fetch Active Session Info (For Resuming Timer, includes scheduledEndTime)
router.get("/active-session", generalLimiter, getActiveAttendance);

// ===============================
// 📍 ADMIN / HR ROUTES
// ===============================

// Admin: View All Attendance Records (Paginated)
router.get(
  "/",
  checkPermissions("manage_staff"),
  adminLimiter,
  getAllAttendance
);

// Admin: View Attendance by Staff ID
router.get(
  "/staff/:staffId",
  checkPermissions("manage_staff"),
  adminLimiter,
  async (req, res, next) => {
    const { staffId } = req.params;
    // Validate MongoDB ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(staffId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff ID format.",
      });
    }
    return getAttendanceByStaff(req, res, next);
  }
);

// Admin: View Attendance for a Specific Date
router.get(
  "/date/:date",
  checkPermissions("manage_staff"),
  adminLimiter,
  async (req, res, next) => {
    const { date } = req.params;
    // Expect YYYY-MM-DD; Date.parse handles ISO dates
    if (isNaN(Date.parse(date))) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD.",
      });
    }
    return getAttendanceByDate(req, res, next);
  }
);

// Admin: Declare Leave Retroactively for a Specific Date
router.post(
  "/declare-leave",
  checkPermissions("manage_staff"),
  adminLimiter,
  declareLeaveForPastDate
);

module.exports = router;
