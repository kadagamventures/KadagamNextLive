const { startOfMonth, endOfMonth, startOfYear, endOfYear, format } = require("date-fns");
const Performance   = require("../models/Performance");
const User          = require("../../models/User");
const pdfService    = require("../../services/pdfService");
const fileService   = require("../services/fileService");
const { emitDashboardUpdate } = require("../../services/websocketService");

/**
 * 🔧 Normalize companyId to string
 */
const normalizeCompanyId = (cid) => cid?.toString();

/**
 * 📅 Generate Monthly Performance Reports (Auto-Scheduler - Monthly)
 * - Filters by companyId (multi-tenant)
 */
const generateMonthlyPerformanceReports = async (month, year, companyId) => {
  const cid       = normalizeCompanyId(companyId);
  console.log(`📊 Generating Monthly Performance Reports for ${month}/${year} (company ${cid})...`);

  const startDate = startOfMonth(new Date(year, month - 1));
  const endDate   = endOfMonth(startDate);

  const staffList = await User.find({
    role:      "staff",
    isDeleted: false,
    companyId: cid
  }).lean();

  if (!staffList.length) {
    console.warn("⚠️ No active staff found for monthly performance report.");
    return;
  }

  const reports = [];
  for (const staff of staffList) {
    const performance = await Performance.findOne({
      staffId:   staff._id,
      companyId: cid,
      month,
      year
    });
    if (!performance) {
      console.warn(`⚠️ No performance record for ${staff.name} in ${month}/${year}`);
      continue;
    }
    reports.push({
      staffName:            staff.name,
      staffEmail:           staff.email,
      month:                format(startDate, "MMMM yyyy"),
      attendancePercentage: `${performance.attendancePercentage.toFixed(2)}%`,
      taskCompletionRate:   `${performance.taskCompletionRate.toFixed(2)}%`,
      onTimeCompletionRate: `${performance.onTimeCompletionRate.toFixed(2)}%`,
      performanceScore:     `${performance.performanceScore.toFixed(2)}`,
      completedTasks:       performance.completedTasks,
    });
  }

  if (!reports.length) {
    console.warn("⚠️ No performance reports to generate for this month.");
    return;
  }

  const reportTitle = `Monthly Performance Report - ${format(startDate, "MMMM yyyy")}`;
  const pdfBuffer   = await pdfService.generatePerformanceReportPDF(reports, reportTitle);

  const fileName = `performance-reports/${cid}/${year}-${month}-monthly-performance-report.pdf`;
  const fileUrl  = await fileService.uploadReportFile(pdfBuffer, fileName, `performance-reports/${cid}/`);

  console.log(`✅ Monthly Performance Report uploaded: ${fileUrl}`);
  emitDashboardUpdate(cid, "performance");
  return { fileUrl };
};

/**
 * 📆 Generate Yearly Performance Reports (Auto-Scheduler - Yearly)
 * - Filters by companyId (multi-tenant)
 */
const generateYearlyPerformanceReports = async (year, companyId) => {
  const cid       = normalizeCompanyId(companyId);
  console.log(`📊 Generating Yearly Performance Reports for ${year} (company ${cid})...`);

  const startDate = startOfYear(new Date(year, 0, 1));
  const endDate   = endOfYear(startDate);

  const staffList = await User.find({
    role:      "staff",
    isDeleted: false,
    companyId: cid
  }).lean();

  if (!staffList.length) {
    console.warn("⚠️ No active staff found for yearly performance report.");
    return;
  }

  const reports = [];
  for (const staff of staffList) {
    const performance = await Performance.findOne({
      staffId:   staff._id,
      companyId: cid,
      year,
      isYearly:  true
    });
    if (!performance) {
      console.warn(`⚠️ No yearly performance record for ${staff.name} in ${year}`);
      continue;
    }
    reports.push({
      staffName:            staff.name,
      staffEmail:           staff.email,
      year,
      attendancePercentage: `${performance.attendancePercentage.toFixed(2)}%`,
      taskCompletionRate:   `${performance.taskCompletionRate.toFixed(2)}%`,
      onTimeCompletionRate: `${performance.onTimeCompletionRate.toFixed(2)}%`,
      performanceScore:     `${performance.performanceScore.toFixed(2)}`,
      completedTasks:       performance.completedTasks,
    });
  }

  if (!reports.length) {
    console.warn("⚠️ No performance reports to generate for this year.");
    return;
  }

  const reportTitle = `Yearly Performance Report - ${year}`;
  const pdfBuffer   = await pdfService.generatePerformanceReportPDF(reports, reportTitle);

  const fileName = `performance-reports/${cid}/${year}-yearly-performance-report.pdf`;
  const fileUrl  = await fileService.uploadReportFile(pdfBuffer, fileName, `performance-reports/${cid}/`);

  console.log(`✅ Yearly Performance Report uploaded: ${fileUrl}`);
  emitDashboardUpdate(cid, "performance");
  return { fileUrl };
};

module.exports = {
  generateMonthlyPerformanceReports,
  generateYearlyPerformanceReports,
};
