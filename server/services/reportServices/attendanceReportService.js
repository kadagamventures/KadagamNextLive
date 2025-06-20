const Attendance       = require("../../models/Attendance");
const User             = require("../../models/User");
const ReportArchive    = require("../../models/ReportArchive");
const {  generateAttendancePDF } = require("../../services/pdfService");
const { uploadBufferToS3, generatePresignedUrl } = require("../../services/awsService");
const redisClient      = require("../../config/redisConfig").redisClient;

const REPORT_EXPIRATION_DAYS = 365;

/**
 * 🔧 Normalize companyId to string
 */
const normalizeCompanyId = (cid) => cid?.toString();

/**
 * 📆 Get Daily Attendance Report (Live Dashboard)
 */
const getDailyAttendanceReport = async (date, companyId) => {
  const cid = normalizeCompanyId(companyId);
  try {
    const filterDate = new Date(date);
    filterDate.setUTCHours(0, 0, 0, 0);

    const activeStaff = await User.find({
      companyId: cid,
      isDeleted: false,
      isActive: true,
      role:    { $ne: "admin" },
    }).select("_id").lean();

    const totalStaff = activeStaff.length;

    const attendanceRecords = await Attendance.find({
      companyId: cid,
      date:      filterDate,
    })
      .populate({
        path:  "userId",
        select:"name staffId role isDeleted isActive companyId",
        match: {
          companyId: cid,
          isDeleted: false,
          isActive:  true,
          role:      { $ne: "admin" },
        },
      })
      .lean();

    // only keep those where the populated userId exists
    const validRecords  = attendanceRecords.filter(r => r.userId);
    const presentStaff  = validRecords.length;
    const absentStaff   = totalStaff - presentStaff;

    return {
      date:            filterDate,
      totalStaff,
      presentStaff,
      absentStaff,
      lateArrivals:    validRecords.filter(r => r.status === "Late Arrival").length,
      earlyDepartures: validRecords.filter(r => r.status === "Early Departure").length,
      workFromHome:    validRecords.filter(r => r.status === "Work From Home").length,
      onLeave:         validRecords.filter(r => r.status === "On Leave").length,
      records:         validRecords,
    };
  } catch (error) {
    console.error("❌ Error fetching daily attendance:", error);
    throw new Error("Failed to fetch daily attendance.");
  }
};

/**
 * 📅 Generate Monthly Attendance Report
 */
const generateMonthlyAttendanceReport = async (month, year, companyId) => {
  const cid = normalizeCompanyId(companyId);
  try {
    const cacheKey = `attendanceReport:${cid}:${year}-${month}`;
    const cached   = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const archived = await ReportArchive.findOne({
      companyId:   cid,
      reportType:  "Attendance",
      reportMonth: parseInt(month, 10),
      reportYear:  parseInt(year, 10),
    });

    if (archived?.fileKey) {
      const downloadUrl = await generatePresignedUrl(archived.fileKey);
      return { month, year, downloadUrl };
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate   = new Date(Date.UTC(year, month, 0));

    const records = await Attendance.aggregate([
      { $match: { companyId: cid, date: { $gte: startDate, $lte: endDate } } },
      {
        $lookup: {
          from:         "users",
          localField:   "userId",
          foreignField: "_id",
          as:           "userDetails",
        },
      },
      { $unwind: "$userDetails" },
      {
        $match: {
          "userDetails.companyId": cid,
          "userDetails.isDeleted": false,
          "userDetails.isActive":  true,
          "userDetails.role":      { $ne: "admin" },
        },
      },
      {
        $group: {
          _id:            "$userDetails.staffId",
          name:           { $first: "$userDetails.name" },
          role:           { $first: "$userDetails.role" },
          totalPresent:   { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } },
          totalAbsent:    { $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] } },
          lateArrivals:   { $sum: { $cond: [{ $eq: ["$status", "Late Arrival"] }, 1, 0] } },
          earlyDepartures:{ $sum: { $cond: [{ $eq: ["$status", "Early Departure"] }, 1, 0] } },
          workFromHome:   { $sum: { $cond: [{ $eq: ["$status", "Work From Home"] }, 1, 0] } },
          onLeave:        { $sum: { $cond: [{ $eq: ["$status", "On Leave"] }, 1, 0] } },
        },
      },
    ]);

    const pdfBuffer = await generateAttendancePDF({ month, year, records });
    const fileKey   = `reports/${cid}/attendance_report_${year}_${month}.pdf`;

    await uploadBufferToS3(pdfBuffer, fileKey, "application/pdf");
    const fileUrl = await generatePresignedUrl(fileKey);
    await ReportArchive.create({
      reportType:  "Attendance",
      reportMonth: parseInt(month, 10),
      reportYear:  parseInt(year, 10),
      companyId:   cid,
      fileKey,
      fileUrl,
    });

    const result = { month, year, records, downloadUrl: fileUrl };
    await redisClient.setEx(cacheKey, 86400, JSON.stringify(result));
    return result;
  } catch (error) {
    console.error("❌ Error generating monthly attendance report:", error);
    throw new Error("Failed to generate monthly attendance report.");
  }
};

/**
 * 📆 Generate Yearly Attendance Summary Report
 */
const generateYearlyAttendanceSummary = async (year, companyId) => {
  const cid = normalizeCompanyId(companyId);
  try {
    const archived = await ReportArchive.findOne({
      companyId:   cid,
      reportType:  "Attendance",
      reportMonth: "Yearly",
      reportYear:  parseInt(year, 10),
    });

    if (archived?.fileKey) {
      const downloadUrl = await generatePresignedUrl(archived.fileKey);
      return { year, downloadUrl };
    }

    const startDate = new Date(Date.UTC(year, 0, 1));
    const endDate   = new Date(Date.UTC(year, 11, 31));

    const records = await Attendance.aggregate([
      { $match: { companyId: cid, date: { $gte: startDate, $lte: endDate } } },
      {
        $lookup: {
          from:         "users",
          localField:   "userId",
          foreignField: "_id",
          as:           "userDetails",
        },
      },
      { $unwind: "$userDetails" },
      {
        $match: {
          "userDetails.companyId": cid,
          "userDetails.isDeleted": false,
          "userDetails.isActive":  true,
          "userDetails.role":      { $ne: "admin" },
        },
      },
      {
        $group: {
          _id:            "$userDetails.staffId",
          name:           { $first: "$userDetails.name" },
          role:           { $first: "$userDetails.role" },
          totalPresent:   { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } },
          totalAbsent:    { $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] } },
          lateArrivals:   { $sum: { $cond: [{ $eq: ["$status", "Late Arrival"] }, 1, 0] } },
          earlyDepartures:{ $sum: { $cond: [{ $eq: ["$status", "Early Departure"] }, 1, 0] } },
          workFromHome:   { $sum: { $cond: [{ $eq: ["$status", "Work From Home"] }, 1, 0] } },
          onLeave:        { $sum: { $cond: [{ $eq: ["$status", "On Leave"] }, 1, 0] } },
        },
      },
    ]);

    const pdfBuffer = await generateAttendancePDF({ year, summary: records });
    const fileKey   = `reports/${cid}/attendance_yearly_report_${year}.pdf`;

    await uploadBufferToS3(pdfBuffer, fileKey, "application/pdf");
    const fileUrl = await generatePresignedUrl(fileKey);
    await ReportArchive.create({
      reportType:  "Attendance",
      reportMonth: "Yearly",
      reportYear:  parseInt(year, 10),
      companyId:   cid,
      fileKey,
      fileUrl,
    });

    return { year, summary: records, downloadUrl: fileUrl };
  } catch (error) {
    console.error("❌ Error generating yearly attendance report:", error);
    throw new Error("Failed to generate yearly attendance report.");
  }
};

module.exports = {
  getDailyAttendanceReport,
  generateMonthlyAttendanceReport,
  generateYearlyAttendanceSummary,
};
