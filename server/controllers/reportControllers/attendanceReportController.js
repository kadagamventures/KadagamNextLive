const attendanceReportService = require("../../services/reportServices/attendanceReportService");
const { errorHandler }            = require("../../utils/errorHandler");
const ReportArchive               = require("../../models/ReportArchive");
const moment                      = require("moment");

/**
 * 📆 Get Daily Attendance Report (Live Data)
 */
const getDailyAttendanceReport = async (req, res) => {
  try {
    const { date }   = req.query;
    const companyId  = req.user.companyId?.toString();

    if (!companyId) {
      return res.status(400).json({ success: false, message: "Missing companyId" });
    }
    if (!date || !moment(date, "YYYY-MM-DD", true).isValid()) {
      return res.status(400).json({ success: false, message: "Invalid date format. Use YYYY-MM-DD." });
    }

    const attendanceData = await attendanceReportService.getDailyAttendanceReport(date, companyId);
    return res.status(200).json({ success: true, data: attendanceData });
  } catch (error) {
    console.error("❌ Error fetching daily attendance report:", error);
    return errorHandler(res, error, "Failed to fetch daily attendance report.");
  }
};

/**
 * 📅 Get Monthly Attendance Report (On-Demand)
 */
const getMonthlyAttendanceReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    const companyId       = req.user.companyId?.toString();

    if (!companyId) {
      return res.status(400).json({ success: false, message: "Missing companyId" });
    }
    const m = parseInt(month, 10), y = parseInt(year, 10);
    if (isNaN(m) || m < 1 || m > 12) {
      return res.status(400).json({ success: false, message: "Invalid month. Provide 1–12." });
    }
    if (isNaN(y) || y < 2000 || y > new Date().getFullYear()) {
      return res.status(400).json({ success: false, message: "Invalid year." });
    }

    const reportData = await attendanceReportService.generateMonthlyAttendanceReport(m, y, companyId);
    return res.status(200).json({ success: true, data: reportData });
  } catch (error) {
    console.error("❌ Error fetching monthly attendance report:", error);
    return errorHandler(res, error, "Failed to fetch monthly attendance report.");
  }
};

/**
 * 🖨 Download Monthly Attendance Report (Stored in AWS S3)
 */
const downloadMonthlyAttendancePDF = async (req, res) => {
  try {
    const { month, year } = req.query;
    const companyId       = req.user.companyId?.toString();

    if (!companyId) {
      return res.status(400).json({ success: false, message: "Missing companyId" });
    }
    const m = parseInt(month, 10), y = parseInt(year, 10);
    if (isNaN(m) || m < 1 || m > 12) {
      return res.status(400).json({ success: false, message: "Invalid month. Provide 1–12." });
    }
    if (isNaN(y) || y < 2000 || y > new Date().getFullYear()) {
      return res.status(400).json({ success: false, message: "Invalid year." });
    }

    const archivedReport = await ReportArchive.findOne({
      reportType:  "Attendance",
      reportMonth: m,
      reportYear:  y,
      companyId,
    });

    if (archivedReport?.fileUrl) {
      return res.status(200).json({ success: true, downloadUrl: archivedReport.fileUrl });
    }

    const result = await attendanceReportService.generateMonthlyAttendanceReport(m, y, companyId);
    return res.status(200).json({ success: true, downloadUrl: result.downloadUrl });
  } catch (error) {
    console.error("❌ Error generating monthly attendance report PDF:", error);
    return errorHandler(res, error, "Failed to generate monthly attendance report.");
  }
};

/**
 * 📆 Get Yearly Attendance Summary (Auto-Generated)
 */
const getYearlyAttendanceSummary = async (req, res) => {
  try {
    const { year }      = req.query;
    const companyId     = req.user.companyId?.toString();
    const y             = parseInt(year, 10);

    if (!companyId) {
      return res.status(400).json({ success: false, message: "Missing companyId" });
    }
    if (isNaN(y) || y < 2000 || y > new Date().getFullYear()) {
      return res.status(400).json({ success: false, message: "Invalid year." });
    }

    const summaryData = await attendanceReportService.generateYearlyAttendanceSummary(y, companyId);
    return res.status(200).json({ success: true, data: summaryData });
  } catch (error) {
    console.error("❌ Error fetching yearly attendance summary:", error);
    return errorHandler(res, error, "Failed to fetch yearly attendance summary.");
  }
};

/**
 * 🖨 Download Yearly Attendance Report
 */
const downloadYearlyAttendancePDF = async (req, res) => {
  try {
    const { year }      = req.query;
    const companyId     = req.user.companyId?.toString();
    const y             = parseInt(year, 10);

    if (!companyId) {
      return res.status(400).json({ success: false, message: "Missing companyId" });
    }
    if (isNaN(y) || y < 2000 || y > new Date().getFullYear()) {
      return res.status(400).json({ success: false, message: "Invalid year." });
    }

    const archivedReport = await ReportArchive.findOne({
      reportType:  "Attendance",
      reportMonth: "Yearly",
      reportYear:  y,
      companyId,
    });

    if (archivedReport?.fileUrl) {
      return res.status(200).json({ success: true, downloadUrl: archivedReport.fileUrl });
    }

    const result = await attendanceReportService.generateYearlyAttendanceSummary(y, companyId);
    return res.status(200).json({ success: true, downloadUrl: result.downloadUrl });
  } catch (error) {
    console.error("❌ Error generating yearly attendance report PDF:", error);
    return errorHandler(res, error, "Failed to generate yearly attendance report.");
  }
};

module.exports = {
  getDailyAttendanceReport,
  getMonthlyAttendanceReport,
  downloadMonthlyAttendancePDF,
  getYearlyAttendanceSummary,
  downloadYearlyAttendancePDF,
};
