const express = require("express");
const router = express.Router();
const leaveController = require("../controllers/leaveController");
const leaveReportService = require("../services/reportServices/leaveReportService");

const {
  createLeaveRequest,
  declareLeaveForAll,
  getAllLeaveRequests,
  getLeaveRequestsByStaff,
  getPendingLeaveRequests,
  updateLeaveRequest,
} = leaveController;

const { verifyToken } = require("../middlewares/authMiddleware");
const { generalLimiter, adminLimiter } = require("../middlewares/rateLimiterMiddleware");
const checkPermissions = require("../middlewares/permissionsMiddleware");

// ✅ All routes below require authentication
router.use(verifyToken);

// ======================================================
// 📍 STAFF ROUTES
// ======================================================

// ✅ Submit a new leave request (Leave/WFH)
router.post("/", generalLimiter, createLeaveRequest);

// ✅ Fetch logged-in staff's leave requests (paginated)
router.get("/my-leaves", async (req, res, next) => {
  // Redirect to controller with staffId = logged-in user
  req.params.staffId = req.user.id;
  await getLeaveRequestsByStaff(req, res, next);
});

// ======================================================
// 📍 ADMIN / HR ROUTES
// ======================================================

// ✅ Get all leave requests for current company
router.get("/", checkPermissions("manage_staff"), adminLimiter, getAllLeaveRequests);

// ✅ Get leave requests for specific staff (admin)
router.get("/staff/:staffId", checkPermissions("manage_staff"), adminLimiter, getLeaveRequestsByStaff);

// ✅ Approve or reject a leave request (admin only)
router.put("/:leaveId", checkPermissions("manage_staff"), adminLimiter, updateLeaveRequest);

// ✅ Shortcut: Approve via PATCH
router.patch("/approve/:leaveId", checkPermissions("manage_staff"), adminLimiter, async (req, res, next) => {
  req.body.status = "approved";
  req.body.adminReason = req.body.adminReason || "Approved by Admin";
  await updateLeaveRequest(req, res, next);
});

// ✅ Shortcut: Reject via PATCH
router.patch("/reject/:leaveId", checkPermissions("manage_staff"), adminLimiter, async (req, res, next) => {
  req.body.status = "rejected";
  req.body.adminReason = req.body.adminReason || "Rejected by Admin";
  await updateLeaveRequest(req, res, next);
});

// ✅ Declare leave for all staff on a specific day
router.post("/declare-leave", checkPermissions("manage_staff"), adminLimiter, declareLeaveForAll);

// ✅ Get all pending leave requests (unapproved)
router.get("/pending", checkPermissions("manage_staff"), adminLimiter, getPendingLeaveRequests);

// ======================================================
// 📍 LEAVE REPORTS (PDF / JSON)
// ======================================================

router.get("/reports/monthly/:year/:month", checkPermissions("manage_staff"), adminLimiter, async (req, res) => {
  const year = parseInt(req.params.year, 10);
  const month = parseInt(req.params.month, 10);
  const companyId = req.user.companyId;

  try {
    const report = await leaveReportService.getMonthlyLeaveReport(year, month, companyId);
    res.status(200).json({ success: true, report });
  } catch (error) {
    console.error("❌ Monthly Leave Report Error:", error);
    res.status(500).json({ success: false, message: "Failed to generate monthly leave report." });
  }
});

router.get("/reports/yearly/:year", checkPermissions("manage_staff"), adminLimiter, async (req, res) => {
  const year = parseInt(req.params.year, 10);
  const companyId = req.user.companyId;

  try {
    const report = await leaveReportService.getYearlyLeaveReport(year, companyId);
    res.status(200).json({ success: true, report });
  } catch (error) {
    console.error("❌ Yearly Leave Report Error:", error);
    res.status(500).json({ success: false, message: "Failed to generate yearly leave report." });
  }
});

router.get("/reports/yearly/:year/download", checkPermissions("manage_staff"), adminLimiter, async (req, res) => {
  const year = parseInt(req.params.year, 10);
  const companyId = req.user.companyId;

  try {
    const reportUrl = await leaveReportService.getOrGenerateYearlyLeaveReport(year, companyId);
    res.status(200).json({ success: true, reportUrl });
  } catch (error) {
    console.error("❌ Download Yearly Leave Report Error:", error);
    res.status(500).json({ success: false, message: "Download failed." });
  }
});

module.exports = router;
