const pdfService = require("./pdfService");
const awsService = require("./awsService");

const attendanceReportService = require("./reportServices/attendanceReportService");
const taskReportService = require("./reportServices/taskReportService");
const projectReportService = require("./reportServices/projectReportService");
const staffReportService = require("./reportServices/staffReportService");
const overviewReportService = require("./reportServices/overviewReportService");

const ReportArchive = require("../models/ReportArchive");

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

/**
 * Generate and archive a report for a company
 */
const generateReport = async (type, params) => {
  try {
    const reportType = capitalize(type);
    const companyId = params.companyId;
    const year = params.year || new Date().getFullYear();
    const month = params.month || null;

    // Check for existing archived report
    const existing = await ReportArchive.findOne({
      companyId,
      reportType,
      reportMonth: month,
      reportYear: year,
    });

    if (existing?.fileKey) {
      const freshUrl = await awsService.generatePresignedUrl(existing.fileKey);
      console.log(`📦 Reusing archived ${reportType} report`);
      return { downloadUrl: freshUrl };
    }

    // Generate fresh report data
    let data;
    switch (type) {
      case "overview":
        data = await overviewReportService.generate(params);
        break;
      case "attendance":
        data = await attendanceReportService.generate(params);
        break;
      case "task":
        data = await taskReportService.generate(params);
        break;
      case "project":
        data = await projectReportService.generate(params);
        break;
      case "staff":
        data = await staffReportService.generate(params);
        break;
      default:
        throw new Error("❌ Invalid report type");
    }

    if (!data || !data.headers || !data.rows) {
      throw new Error("❌ Invalid report data structure");
    }

    const buffer = await pdfService.createPDF(data);
    const keyName = `reports/${companyId}/${type}_${year}_${month || "Yearly"}.pdf`;

    const { fileKey, fileUrl } = await awsService.uploadBufferToS3(
      buffer,
      keyName,
      "application/pdf"
    );

    if (!fileKey) {
      console.error("❌ fileKey was not returned from S3 upload");
      throw new Error("❌ fileKey is undefined after S3 upload");
    }

    await ReportArchive.create({
      companyId,
      reportType,
      reportMonth: month,
      reportYear: year,
      fileKey,
    });

    const signedUrl = await awsService.generatePresignedUrl(fileKey);
    if (!signedUrl) throw new Error("❌ Failed to sign report URL");

    console.log(`✅ ${reportType} report generated and stored`);
    return { downloadUrl: signedUrl };

  } catch (err) {
    console.error("❌ Report generation error:", err.message || err);
    throw err;
  }
};

/**
 * Bulk generate yearly reports for all types for a company
 */
const generateYearlyReports = async (companyId) => {
  try {
    const reportTypes = ["attendance", "task", "project", "staff"];
    const year = new Date().getFullYear();

    for (const type of reportTypes) {
      await generateReport(type, { companyId, year });
    }

    console.log("✅ All yearly reports generated and archived.");
  } catch (err) {
    console.error("❌ Yearly report generation failed:", err.message || err);
  }
};

module.exports = { generateReport, generateYearlyReports };
