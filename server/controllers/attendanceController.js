const mongoose = require("mongoose");
const attendanceService = require("../services/attendanceService");
const asyncHandler = require("express-async-handler");

/**
 * 🚀 Staff Clock-In (Start Work)
 */
const startWork = asyncHandler(async (req, res, next) => {
  const userId = req.user?.id;
  let companyId = req.user?.companyId;
  if (!userId || !companyId) {
    return res.status(401).json({ success: false, message: "Unauthorized. Please log in." });
  }
  companyId = String(companyId);

  try {
    const { attendance, scheduledEndTime } = await attendanceService.startWork(userId, companyId);
    return res.status(201).json({
      success: true,
      message: "Workday started successfully.",
      data: {
        isWorking: true,
        attendanceId: attendance._id,
        checkInTime: attendance.checkInTime,
        status: attendance.status,
        scheduledEndTime,
      },
    });
  } catch (err) {
    console.error("🔴 startWork error:", err);
    if (err.code === 400) {
      return res.status(400).json({ success: false, message: err.message });
    }
    return next(err);
  }
});

/**
 * 🚀 Staff Clock-Out (End Work)
 */
const endWork = asyncHandler(async (req, res, next) => {
  const userId = req.user?.id;
  let companyId = req.user?.companyId;
  if (!userId || !companyId) {
    return res.status(401).json({ success: false, message: "Unauthorized. Please log in." });
  }
  companyId = String(companyId);

  try {
    const attendance = await attendanceService.endWork(userId, companyId);
    return res.status(200).json({
      success: true,
      message: "Workday ended successfully.",
      data: {
        isWorking: false,
        attendanceId: attendance._id,
        checkOutTime: attendance.checkOutTime,
        totalHours: attendance.totalHours,
        status: attendance.status,
      },
    });
  } catch (err) {
    console.error("🔴 endWork error:", err);
    if (err.code === 400) {
      return res.status(400).json({ success: false, message: err.message });
    }
    return next(err);
  }
});

/**
 * 🚀 Fetch Ongoing Attendance Session (minimal info)
 */
const getOngoingAttendance = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  let companyId = req.user?.companyId;
  if (!userId || !companyId) {
    return res.status(401).json({ success: false, message: "Unauthorized. Please log in." });
  }
  companyId = String(companyId);

  const session = await attendanceService.getOngoingAttendance(userId, companyId);
  if (!session) {
    return res.status(200).json({ success: true, data: {} });
  }
  return res.status(200).json({
    success: true,
    data: {
      attendanceId: session._id,
      checkInTime: session.checkInTime,
      status: session.status,
    },
  });
});

/**
 * 🚀 Fetch Active Timer Data (Staff Dashboard)
 */
const getActiveAttendance = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  let companyId = req.user?.companyId;
  if (!userId || !companyId) {
    return res.status(401).json({ success: false, message: "Unauthorized. Please log in." });
  }
  companyId = String(companyId);

  const active = await attendanceService.getActiveSession(userId, companyId);
  if (!active) {
    return res.status(200).json({ success: true, isWorking: false, timer: 0 });
  }
  return res.status(200).json({
    success: true,
    isWorking: true,
    attendanceId: active.attendanceId,
    checkInTime: active.checkInTime,
    timer: active.elapsedSeconds,
    status: active.status,
    scheduledEndTime: active.scheduledEndTime,
  });
});

/**
 * 🚀 Admin: Get All Attendance Records (Paginated)
 */
const getAllAttendance = asyncHandler(async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Access denied. Admins only." });
  }
  let companyId = req.user.companyId;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  companyId = String(companyId);

  const records = await attendanceService.getAllAttendance(companyId, page, limit);
  return res.status(200).json({ success: true, data: records });
});

/**
 * 🚀 Admin: Get Attendance by Staff ID (Paginated)
 */
const getAttendanceByStaff = asyncHandler(async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Access denied. Admins only." });
  }
  const staffId = req.params.staffId;
  if (!mongoose.Types.ObjectId.isValid(staffId)) {
    return res.status(400).json({ success: false, message: "Invalid staff ID." });
  }
  let companyId = req.user.companyId;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  companyId = String(companyId);

  const records = await attendanceService.getAttendanceByStaff(staffId, companyId, page, limit);
  return res.status(200).json({ success: true, data: records });
});

/**
 * 🚀 Admin: Get Attendance by Date
 */
const getAttendanceByDate = asyncHandler(async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Access denied. Admins only." });
  }
  const date = req.params.date;
  if (isNaN(Date.parse(date))) {
    return res.status(400).json({ success: false, message: "Invalid date format. Use YYYY-MM-DD." });
  }
  let companyId = req.user.companyId;
  companyId = String(companyId);

  try {
    const records = await attendanceService.getAttendanceByDate(date, companyId);
    return res.status(200).json({ success: true, data: records });
  } catch (err) {
    console.error("🔴 getAttendanceByDate error:", err);
    return res.status(500).json({ success: false, message: "Server error fetching attendance by date." });
  }
});

/**
 * 🚀 Staff: View Their Own Attendance Records
 */
const getOwnAttendance = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  let companyId = req.user?.companyId;
  if (!userId || !companyId) {
    return res.status(401).json({ success: false, message: "Unauthorized. Please log in." });
  }
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  companyId = String(companyId);

  const records = await attendanceService.getAttendanceByStaff(userId, companyId, page, limit);
  return res.status(200).json({ success: true, data: records });
});

/**
 * 🚀 Admin: Declare Leave Retroactively
 */
const declareLeaveForPastDate = asyncHandler(async (req, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Access denied. Admins only." });
  }
  const { date, reason } = req.body;
  if (!date || !reason) {
    return res.status(400).json({ success: false, message: "Date and reason are required." });
  }
  if (isNaN(Date.parse(date))) {
    return res.status(400).json({ success: false, message: "Invalid date format." });
  }
  let companyId = req.user.companyId;
  companyId = String(companyId);

  try {
    const result = await attendanceService.declareLeaveForPastDate(date, reason, companyId);
    if (result.modifiedCount === 0) {
      return res.status(404).json({ success: false, message: "No attendance records found for this date." });
    }
    return res.status(200).json({
      success: true,
      message: `Leave declared for ${date} for all staff.`,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error("🔴 declareLeaveForPastDate error:", err);
    return res.status(500).json({ success: false, message: "Server error declaring leave." });
  }
});

module.exports = {
  startWork,
  endWork,
  getOngoingAttendance,
  getActiveAttendance,
  getAllAttendance,
  getAttendanceByStaff,
  getAttendanceByDate,
  getOwnAttendance,
  declareLeaveForPastDate,
};
