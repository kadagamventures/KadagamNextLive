const leaveService = require("../services/leaveService");
const emailService = require("../services/emailService");
const { createNotification } = require("../services/notificationService");
const asyncHandler = require("express-async-handler");

/**
 * ✅ Create a new leave or work-from-home request (staff).
 */
const createLeaveRequest = asyncHandler(async (req, res) => {
  const { type, startDate, endDate, reason, contactEmail } = req.body;
  const staff = req.user.id;
  const companyId = req.user.companyId;

  if (!type || !startDate || !endDate || !reason || !contactEmail) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  if (new Date(startDate) > new Date(endDate)) {
    return res.status(400).json({ success: false, message: "Start date cannot be after end date." });
  }

  const leaveData = {
    staff,
    type,
    startDate,
    endDate,
    reason,
    contactEmail,
    companyId,
    status: "pending"
  };

  const leaveRequest = await leaveService.createLeaveRequest(leaveData);

  const title = "Leave Request Submitted";
  const message = `${req.user.name || "A staff"} requested leave from ${startDate} to ${endDate}.`;

  const User = require("../models/User");
  const notifyTargets = [];

  // Notify all admins in same company
  const admins = await User.find({ companyId, role: "admin" }).select("_id");
  notifyTargets.push(...admins.map((admin) => admin._id.toString()));

  await Promise.all(
    notifyTargets.map((adminId) =>
      createNotification({
        staffId: adminId,
        type: "LEAVE_PENDING",
        title,
        message,
        companyId: companyId.toString() // ✅ ensure companyId is passed as string
      })
    )
  );

  res.status(201).json({
    success: true,
    message: "Leave request submitted successfully.",
    leaveRequest
  });
});

/**
 * ✅ Declare leave for all staff on a date (admin/HR).
 */
const declareLeaveForAll = asyncHandler(async (req, res) => {
  const { date, reason } = req.body;
  const companyId = req.user.companyId;

  if (!date || !reason) {
    return res.status(400).json({ success: false, message: "Date and reason are required." });
  }

  await leaveService.declareLeaveForAll(date, reason, companyId);

  res.status(200).json({
    success: true,
    message: `Leave declared for ${date} for all staff.`,
  });
});

/**
 * ✅ Get all leave requests (admin/HR), paginated, scoped to company.
 */
const getAllLeaveRequests = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const companyId = req.user.companyId;
  const filter = status ? { status } : {};

  const leaveRequests = await leaveService.getLeaveRequests({ page, limit, filter, companyId });

  res.status(200).json({ success: true, leaveRequests });
});

/**
 * ✅ Get leave requests by staffId (admin scoped).
 */
const getLeaveRequestsByStaff = asyncHandler(async (req, res) => {
  const { staffId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const companyId = req.user.companyId;

  const leaveRequests = await leaveService.getLeaveRequests({
    page,
    limit,
    filter: { staff: staffId },
    companyId,
  });

  res.status(200).json({ success: true, leaveRequests });
});

/**
 * ✅ Get all pending leave requests (for current company).
 */
const getPendingLeaveRequests = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const leaveRequests = await leaveService.getPendingLeaveRequests(companyId);

  res.status(200).json({ success: true, leaveRequests });
});

/**
 * ✅ Admin or permissioned staff: Approve/Reject leave request.
 */
const updateLeaveRequest = asyncHandler(async (req, res) => {
  const { leaveId } = req.params;
  const { status, adminReason } = req.body;
  const approvedBy = req.user.id;
  const companyId = req.user.companyId;

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ success: false, message: "Status must be 'approved' or 'rejected'." });
  }

  if (!adminReason || !adminReason.trim()) {
    return res.status(400).json({ success: false, message: "Admin reason is required." });
  }

  const updatedRequest = await leaveService.updateLeaveRequest(leaveId, {
    status,
    approvedBy,
    adminReason,
    companyId,
  });

  if (!updatedRequest) {
    return res.status(404).json({
      success: false,
      message: "Leave request not found or already processed.",
    });
  }

  const leaveDates = `${updatedRequest.startDate.toISOString().split("T")[0]} to ${updatedRequest.endDate.toISOString().split("T")[0]}`;

  // ✅ Send email
  await emailService.sendLeaveStatusEmail(
    updatedRequest.staff.email,
    status,
    leaveDates,
    adminReason
  );

  // ✅ Notify the staff
  await createNotification({
    staffId: updatedRequest.staff._id.toString(),
    type: status === "approved" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
    title: `Leave ${status === "approved" ? "Approved" : "Rejected"}`,
    message: `Your leave request from ${leaveDates} was ${status}. Reason: ${adminReason}`,
    companyId: companyId.toString() // ✅ ensure it's scoped to the correct tenant
  });

  res.status(200).json({
    success: true,
    message: `Leave request ${status} successfully.`,
    updatedRequest,
  });
});

module.exports = {
  createLeaveRequest,
  declareLeaveForAll,
  getAllLeaveRequests,
  getLeaveRequestsByStaff,
  getPendingLeaveRequests,
  updateLeaveRequest,
};
