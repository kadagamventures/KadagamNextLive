const asyncHandler      = require("express-async-handler");
const taskReportService = require("../../services/reportServices/taskReportService");
const ReportArchive     = require("../../models/ReportArchive");

/**
 * 📍 1. Generate Task Report (Admin Only)
 */
const generateTaskReport = asyncHandler(async (req, res) => {
  const { reportType, month, year } = req.query;
  const companyId = req.user.companyId?.toString();

  if (!companyId) {
    return res.status(400).json({ message: "Missing companyId" });
  }
  if (!reportType || !["daily","monthly","yearly"].includes(reportType)) {
    return res.status(400).json({ message: "Invalid report type. Choose daily, monthly, or yearly." });
  }

  const monthInt = parseInt(month, 10);
  const yearInt  = parseInt(year, 10);
  if (isNaN(monthInt) || isNaN(yearInt)) {
    return res.status(400).json({ message: "Month and year are required and must be numbers." });
  }

  const reportUrl = await taskReportService.generateTaskReport(
    companyId,
    reportType,
    monthInt,
    yearInt
  );
  await saveReportToArchive(
    companyId,
    "Task",
    monthInt,
    yearInt,
    reportType,
    reportUrl
  );

  res.status(200).json({
    success: true,
    message: "Task report generated successfully",
    reportUrl
  });
});

/**
 * 📍 2. Download Archived Task Report (Admin Only)
 */
const downloadArchivedTaskReport = asyncHandler(async (req, res) => {
  const { reportType, month, year } = req.query;
  const companyId = req.user.companyId?.toString();

  if (!companyId) {
    return res.status(400).json({ message: "Missing companyId" });
  }
  if (!reportType || !["daily","monthly","yearly"].includes(reportType)) {
    return res.status(400).json({ message: "Invalid report type." });
  }

  const monthInt = parseInt(month, 10);
  const yearInt  = parseInt(year, 10);
  if (isNaN(monthInt) || isNaN(yearInt)) {
    return res.status(400).json({ message: "Month and year are required and must be numbers." });
  }

  const archivedReport = await ReportArchive.findOne({
    companyId,
    reportType:     "Task",
    reportCategory: reportType,
    reportMonth:    monthInt,
    reportYear:     yearInt
  });

  if (!archivedReport) {
    return res.status(404).json({ message: "Archived report not found for this period." });
  }

  res.status(200).json({
    success: true,
    fileUrl: archivedReport.fileUrl
  });
});

/**
 * 📍 3. Fetch Real-time Task Statistics (Admin Only)
 */
const getLiveTaskStats = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId?.toString();
  if (!companyId) {
    return res.status(400).json({ message: "Missing companyId" });
  }

  const stats = await taskReportService.getLiveTaskStats(companyId);
  res.status(200).json({ success: true, stats });
});

/**
 * 📍 4. Fetch Data Visualization (Admin Only)
 */
const getTaskVisualizationData = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId?.toString();
  if (!companyId) {
    return res.status(400).json({ message: "Missing companyId" });
  }

  const data = await taskReportService.getTaskVisualizationData(companyId);
  res.status(200).json({ success: true, data });
});

/**
 * 📍 5. Fetch Self Task Report (For Staff)
 */
const getSelfTaskReport = asyncHandler(async (req, res) => {
  const staffId   = req.user.id;
  const companyId = req.user.companyId?.toString();
  const { month, year } = req.query;

  if (!companyId) {
    return res.status(400).json({ message: "Missing companyId" });
  }

  const monthInt = parseInt(month, 10);
  const yearInt  = parseInt(year, 10);
  if (isNaN(monthInt) || isNaN(yearInt)) {
    return res.status(400).json({ message: "Year and month are required and must be numbers." });
  }

  try {
    const taskSummary = await taskReportService.getMonthlyTaskSummary(
      companyId,
      staffId,
      yearInt,
      monthInt
    );

    res.status(200).json({
      success: true,
      year: yearInt,
      month: monthInt,
      taskSummary
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch task report.",
      error: error.message
    });
  }
});

/**
 * 🆕 Save Generated Report to AWS S3 & Store Metadata in MongoDB
 */
const saveReportToArchive = async (
  companyId,
  reportType,
  reportMonth,
  reportYear,
  reportCategory,
  fileUrl
) => {
  try {
    await ReportArchive.updateOne(
      {
        companyId,
        reportType,
        reportCategory,
        reportMonth,
        reportYear
      },
      { fileUrl },
      { upsert: true }
    );

    console.log(`✅ ${reportType} report archived: ${fileUrl}`);
  } catch (error) {
    console.error(`❌ Error archiving ${reportType} report:`, error);
  }
};

module.exports = {
  generateTaskReport,
  downloadArchivedTaskReport,
  getLiveTaskStats,
  getTaskVisualizationData,
  getSelfTaskReport
};
