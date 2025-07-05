const Leave = require("../models/Leave");
const User = require("../models/User");
const emailService = require("./emailService");
const { format } = require("date-fns");

const COMPANY_LEAVE_EMAIL = process.env.COMPANY_LEAVE_EMAIL || "hr@kadagamventures.com";

const leaveService = {
  /**
   * ✅ Create a new leave or WFH request (per company)
   */
  async createLeaveRequest(leaveData) {
    const { staff, startDate, endDate, type, contactEmail, companyId } = leaveData;

    const companyIdStr = companyId.toString();

    if (new Date(startDate) > new Date(endDate)) {
      throw new Error("Start date cannot be after end date.");
    }

    // 🔒 Prevent on declared leave days (within same company)
    const isDeclaredLeave = await Leave.findOne({
      companyId: companyIdStr,
      type: "declared_leave",
      $or: [
        { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } },
      ],
    });

    if (isDeclaredLeave) {
      throw new Error("This date is already declared as leave for your company.");
    }

    // 🔒 Prevent overlapping personal leave
    const overlappingLeave = await Leave.findOne({
      companyId: companyIdStr,
      staff,
      isDeleted: false,
      $or: [
        { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } },
      ],
    });

    if (overlappingLeave) {
      throw new Error("You already have a leave request during this period.");
    }

    // ✅ Save leave request
    const leaveRequest = await Leave.create({ ...leaveData, companyId: companyIdStr });

    // 🔔 Notify HR (via email)
    const leaveType = type === "leave" ? "Leave" : "Work From Home";
    const formattedStart = format(new Date(startDate), "yyyy-MM-dd");
    const formattedEnd = format(new Date(endDate), "yyyy-MM-dd");

    const subject = `New ${leaveType} Request from ${contactEmail}`;
    const text = `A new ${leaveType} request has been submitted.\n\n📅 ${formattedStart} - ${formattedEnd}\n📝 Reason: ${leaveData.reason}`;
    const html = `<p>A new <strong>${leaveType}</strong> request has been submitted.</p>
                  <p><strong>📅 Dates:</strong> ${formattedStart} - ${formattedEnd}</p>
                  <p><strong>📝 Reason:</strong> ${leaveData.reason}</p>`;

    await emailService.sendEmail(COMPANY_LEAVE_EMAIL, subject, text, html);

    return leaveRequest;
  },

  /**
   * ✅ Admin declares a leave for all staff (multi-tenant scoped)
   */
  async declareLeaveForAll(date, reason, companyId) {
    const companyIdStr = companyId.toString();

    const exists = await Leave.findOne({
      companyId: companyIdStr,
      startDate: date,
      type: "declared_leave"
    });

    if (exists) throw new Error("This leave date is already declared.");

    const staffList = await User.find({ companyId: companyIdStr, role: "staff" }).select("_id");

    const leaveRequests = staffList.map(staff => ({
      companyId: companyIdStr,
      staff: staff._id,
      type: "declared_leave",
      startDate: date,
      endDate: date,
      status: "approved",
      reason,
    }));

    await Leave.insertMany(leaveRequests);
  },

  /**
   * ✅ Paginated leave request fetch (admin panel)
   */
  async getLeaveRequests({ page = 1, limit = 10, filter = {}, companyId }) {
    const companyIdStr = companyId.toString();
    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    const query = { ...filter, companyId: companyIdStr };

    const leaveRequests = await Leave.find(query)
      .populate("staff", "name email")
      .sort({ status: 1, startDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalRecords = await Leave.countDocuments(query);

    return {
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
      currentPage: page,
      leaveRequests,
    };
  },

  /**
   * ✅ Get all pending leave requests for a company
   */
  async getPendingLeaveRequests(companyId) {
    const companyIdStr = companyId.toString();

    return await Leave.find({ companyId: companyIdStr, status: "pending" })
      .populate("staff", "name email")
      .sort({ startDate: -1 })
      .lean();
  },

  /**
   * ✅ Approve or reject a leave request (multi-tenant scoped)
   */
  async updateLeaveRequest(leaveId, { status, approvedBy, adminReason, companyId }) {
    if (!["approved", "rejected"].includes(status)) {
      throw new Error("Invalid status. Must be 'approved' or 'rejected'.");
    }

    const companyIdStr = companyId.toString();

    const leaveRequest = await Leave.findOne({ _id: leaveId, companyId: companyIdStr })
      .populate("staff", "email _id")
      .lean();

    if (!leaveRequest) throw new Error("Leave request not found.");
    if (leaveRequest.status !== "pending") throw new Error("This request has already been processed.");

    if (leaveRequest.staff._id.toString() === approvedBy.toString()) {
      throw new Error("You cannot approve/reject your own request.");
    }

    const updatedLeave = await Leave.findByIdAndUpdate(
      leaveId,
      { status, approvedBy, adminReason },
      { new: true }
    ).populate("staff", "email").lean();

    if (!updatedLeave) return null;

    // ❌ Removed: direct email to staff here. 
    // Email will be sent from the controller using sendLeaveStatusEmail.

    return updatedLeave;
  },
};

module.exports = leaveService;
