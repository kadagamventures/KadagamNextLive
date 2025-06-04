const express = require("express");
const router = express.Router();

const {
  getMyMonthlyPerformance,
  getMyYearlyPerformance,
  getMonthlyPerformanceByStaff,
  getYearlyPerformanceByStaff,
  getLivePerformanceSummary,
  getPerformanceVisualization,
  generateMonthlyPerformanceReport,
  getStaffPerformanceById,
  getMonthlyPerformanceById,
  getMonthlyPerformanceByStaffIdCustom,
  getAllStaffPerformance
} = require("../controllers/performanceController");

const { verifyToken } = require("../middlewares/authMiddleware");
const checkPermissions = require("../middlewares/permissionsMiddleware");

// ✅ Staff: View own performance
router.get("/self/monthly", verifyToken, getMyMonthlyPerformance);
router.get("/self/yearly", verifyToken, getMyYearlyPerformance);

// ✅ Admin: Get performance of all staff
router.get("/staff/all", verifyToken, checkPermissions("manage_staff"), getAllStaffPerformance);

// ✅ Admin: Monthly performance using custom string staffId (not ObjectId)
router.get("/staff-by-staffId/:staffId/monthly", verifyToken, checkPermissions("manage_staff"), getMonthlyPerformanceByStaffIdCustom);

// ✅ Admin: Monthly performance using strict ObjectId
router.get("/staff/:staffId/monthly", verifyToken, checkPermissions("manage_staff"), getMonthlyPerformanceById);

// ✅ Admin: View single staff's full performance
router.get("/staff/:staffId", verifyToken, checkPermissions("manage_staff"), getStaffPerformanceById);

// ✅ Admin: Staff performance by month/year (role: admin)
router.get("/admin/staff/:staffId/monthly", verifyToken, checkPermissions("manage_staff"), getMonthlyPerformanceByStaff);
router.get("/admin/staff/:staffId/yearly", verifyToken, checkPermissions("manage_staff"), getYearlyPerformanceByStaff);

// ✅ Admin: Dashboard insights and reporting
router.get("/admin/live-summary", verifyToken, checkPermissions("manage_staff"), getLivePerformanceSummary);
router.get("/admin/visualization", verifyToken, checkPermissions("manage_staff"), getPerformanceVisualization);
router.get("/admin/monthly-report", verifyToken, checkPermissions("manage_staff"), generateMonthlyPerformanceReport);

module.exports = router;
