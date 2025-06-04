const projectReportService = require("../../services/reportServices/projectReportService");
const { errorHandler }     = require("../../utils/errorHandler");
const ReportArchive        = require("../../models/ReportArchive");

/**
 * 📍 1. Get Live Project Statistics (per company)
 */
const getLiveProjectOverview = async (req, res) => {
  try {
    const companyId = req.user.companyId?.toString();
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Missing companyId" });
    }
    const stats = await projectReportService.getLiveProjectStats(companyId);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error("❌ Error fetching live project overview:", error);
    return errorHandler(res, error, "Failed to fetch live project overview.");
  }
};

/**
 * 📍 2. Generate Monthly Project Report (PDF + upload + archive)
 */
const generateMonthlyProjectReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    const companyId       = req.user.companyId?.toString();

    if (!companyId) {
      return res.status(400).json({ success: false, message: "Missing companyId" });
    }
    const m = parseInt(month, 10), y = parseInt(year, 10);
    if (isNaN(m) || isNaN(y) || y < 2000) {
      return res.status(400).json({ success: false, message: "Invalid month or year format." });
    }

    const archivedReport = await ReportArchive.findOne({
      companyId,
      reportType:  "Project",
      reportMonth: m,
      reportYear:  y
    });

    if (archivedReport) {
      return res.status(200).json({ success: true, downloadUrl: archivedReport.fileUrl });
    }

    const fileUrl = await projectReportService.generateMonthlyProjectReport(m, y, companyId);
    await saveReportToArchive("Project", m, y, fileUrl, companyId);

    return res.status(200).json({ success: true, downloadUrl: fileUrl });
  } catch (error) {
    console.error("❌ Error generating monthly project report:", error);
    return errorHandler(res, error, "Failed to generate monthly project report.");
  }
};

/**
 * 📍 3. Download Existing Monthly Project Report (from archive)
 */
const downloadMonthlyProjectReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    const companyId       = req.user.companyId?.toString();

    if (!companyId) {
      return res.status(400).json({ success: false, message: "Missing companyId" });
    }
    const m = parseInt(month, 10), y = parseInt(year, 10);
    if (isNaN(m) || isNaN(y) || y < 2000) {
      return res.status(400).json({ success: false, message: "Invalid month or year format." });
    }

    const archivedReport = await ReportArchive.findOne({
      companyId,
      reportType:  "Project",
      reportMonth: m,
      reportYear:  y
    });

    if (!archivedReport) {
      return res.status(404).json({ success: false, message: "Report not found. Please generate it first." });
    }

    return res.status(200).json({ success: true, downloadUrl: archivedReport.fileUrl });
  } catch (error) {
    console.error("❌ Error downloading monthly project report:", error);
    return errorHandler(res, error, "Failed to download monthly project report.");
  }
};

/**
 * 📍 4. Auto-Delete Expired Reports for Current Company
 */
const cleanupOldProjectReports = async (req, res) => {
  try {
    const companyId = req.user.companyId?.toString();
    if (!companyId) {
      return res.status(400).json({ success: false, message: "Missing companyId" });
    }
    await projectReportService.deleteExpiredProjectReports(companyId);
    res.status(200).json({ success: true, message: "Old project reports cleaned up from AWS S3." });
  } catch (error) {
    console.error("❌ Error deleting expired project reports:", error);
    return errorHandler(res, error, "Failed to clean up expired project reports.");
  }
};

/**
 * ✅ Archive metadata for newly generated report
 */
const saveReportToArchive = async (reportType, reportMonth, reportYear, fileUrl, companyId) => {
  try {
    await ReportArchive.create({
      reportType,
      reportMonth,
      reportYear,
      fileUrl,
      companyId
    });
    console.log(`✅ Archived ${reportType} report: ${fileUrl}`);
  } catch (error) {
    console.error(`❌ Failed to archive ${reportType} report:`, error);
  }
};

module.exports = {
  getLiveProjectOverview,
  generateMonthlyProjectReport,
  downloadMonthlyProjectReport,
  cleanupOldProjectReports,
};
