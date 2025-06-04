const Leave = require("../../models/Leave");
const ReportArchive = require("../../models/ReportArchive");
const pdfService = require("../../services/pdfService");
const awsService = require("../../services/awsService");

/**
 * 📦 Leave Report Service (Multi-Tenant Enabled)
 */
const leaveReportService = {
  /**
   * ✅ Get Monthly Leave Report for a Company
   */
  async getMonthlyLeaveReport(companyId, year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const companyIdStr = companyId.toString();

    return await Leave.aggregate([
      {
        $match: {
          companyId: companyIdStr,
          startDate: { $lte: endDate },
          endDate: { $gte: startDate },
          status: { $in: ["approved", "rejected"] },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "staff",
          foreignField: "_id",
          as: "staffDetails",
        },
      },
      { $unwind: "$staffDetails" },
      {
        $match: {
          "staffDetails.companyId": companyIdStr,
          "staffDetails.isDeleted": false,
          "staffDetails.isActive": true,
        },
      },
      {
        $project: {
          staffName: "$staffDetails.name",
          email: "$staffDetails.email",
          startDate: 1,
          endDate: 1,
          status: 1,
          reason: 1,
        },
      },
    ]);
  },

  /**
   * ✅ Get Yearly Leave Report for a Company
   */
  async getYearlyLeaveReport(companyId, year) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const companyIdStr = companyId.toString();

    return await Leave.aggregate([
      {
        $match: {
          companyId: companyIdStr,
          startDate: { $lte: endDate },
          endDate: { $gte: startDate },
          status: { $in: ["approved", "rejected"] },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "staff",
          foreignField: "_id",
          as: "staffDetails",
        },
      },
      { $unwind: "$staffDetails" },
      {
        $match: {
          "staffDetails.companyId": companyIdStr,
          "staffDetails.isDeleted": false,
          "staffDetails.isActive": true,
        },
      },
      {
        $project: {
          staffName: "$staffDetails.name",
          email: "$staffDetails.email",
          startDate: 1,
          endDate: 1,
          status: 1,
          reason: 1,
        },
      },
    ]);
  },

  /**
   * ✅ Generate and Upload Yearly PDF to AWS for a Company
   */
  async getOrGenerateYearlyLeaveReport(companyId, year) {
    const companyIdStr = companyId.toString();

    const archived = await ReportArchive.findOne({
      reportType: "Leave",
      reportMonth: "Yearly",
      reportYear: parseInt(year),
      companyId: companyIdStr,
    });

    if (archived?.fileUrl) {
      return archived.fileUrl;
    }

    const reportData = await this.getYearlyLeaveReport(companyIdStr, year);
    if (!reportData.length) throw new Error("No leave records found for this year.");

    const pdfBuffer = await pdfService.generateLeaveReportPDF(reportData, year);
    const fileKey = `reports/leave/${companyIdStr}/${year}-leave-report.pdf`;

    const fileUrl = await awsService.uploadFile(pdfBuffer, fileKey, { expiresIn: "1y" });

    await ReportArchive.create({
      reportType: "Leave",
      reportMonth: "Yearly",
      reportYear: year,
      companyId: companyIdStr,
      fileKey,
      fileUrl,
    });

    return fileUrl;
  },

  /**
   * ✅ Cleanup Reports Older Than 1 Year
   */
  async cleanupOldLeaveReports(companyId) {
    const cutoffYear = new Date().getFullYear() - 1;
    const companyIdStr = companyId.toString();
    const fileKey = `reports/leave/${companyIdStr}/${cutoffYear}-leave-report.pdf`;

    const exists = await awsService.fileExists(fileKey);
    if (!exists) return { message: "No old leave reports found." };

    await awsService.deleteFile(fileKey);
    await ReportArchive.deleteOne({
      reportType: "Leave",
      reportMonth: "Yearly",
      reportYear: cutoffYear,
      companyId: companyIdStr,
    });

    return { message: `Old leave report (${cutoffYear}) deleted successfully.` };
  },
};

module.exports = leaveReportService;
