const ReportArchive = require('../../models/ReportArchive');
const pdfService = require('../pdfService');
const awsService = require('../awsService');

// Capitalize first letter of type (e.g., "attendance" → "Attendance")
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * 🔍 Try fetching a monthly report from archive (company scoped)
 */
exports.tryFindMonthlyReport = async ({ type, month, year, companyId }) => {
  const reportType = capitalize(type);
  const record = await ReportArchive.findOne({
    reportType,
    reportMonth: month,
    reportYear: year,
    companyId,
  });

  if (record?.fileUrl) {
    const fileExists = await awsService.checkIfS3KeyExists(record.fileUrl);
    if (!fileExists) {
      console.warn(`⚠️ S3 file missing: ${record.fileUrl}. Cleaning stale record.`);
      await ReportArchive.deleteOne({ _id: record._id });
      return null;
    }
  }

  return record;
};

/**
 * 🔍 Try fetching a yearly fallback report (company scoped)
 */
exports.tryFindYearlyFallback = async ({ type, year, companyId }) => {
  const reportType = capitalize(type);
  const record = await ReportArchive.findOne({
    reportType,
    reportMonth: null,
    reportYear: year,
    companyId,
  });

  if (record?.fileUrl) {
    const fileExists = await awsService.checkIfS3KeyExists(record.fileUrl);
    if (!fileExists) {
      console.warn(`⚠️ S3 yearly file missing: ${record.fileUrl}. Removing Mongo entry.`);
      await ReportArchive.deleteOne({ _id: record._id });
      return null;
    }
  }

  return record;
};

/**
 * 📄 Generate and store a new monthly report (company scoped)
 */
exports.generateAndStoreReport = async ({ type, month, year, companyId }) => {
  try {
    const formattedType = type.toLowerCase();
    const fileName = `${month}-${year}.pdf`;
    const folder = formattedType;
    const s3Key = `reports/${companyId}/${folder}/${fileName}`;

    console.log(`📄 Generating PDF for ${formattedType} report ${month}-${year} for company ${companyId}...`);

    // 1. Generate report buffer
    let buffer;
    switch (formattedType) {
      case "attendance":
        buffer = await pdfService.generateAttendancePDF(month, year, companyId);
        break;
      case "task":
        buffer = await pdfService.generateTaskPDF(month, year, companyId);
        break;
      case "project":
        buffer = await pdfService.generateProjectPDF(month, year, companyId);
        break;
      case "staff":
        buffer = await pdfService.generateStaffPDF(month, year, companyId);
        break;
      case "leave":
        buffer = await pdfService.generateLeavePDF(month, year, companyId);
        break;
      default:
        throw new Error(`❌ Unsupported report type: ${type}`);
    }

    if (!buffer?.length) throw new Error("❌ PDF buffer is empty.");

    // 2. Upload to S3
    const { fileUrl, fileKey } = await awsService.uploadBufferToS3(buffer, s3Key, 'application/pdf');
    if (!fileKey) throw new Error("❌ Missing fileKey after S3 upload");

    const s3Url = await awsService.generatePresignedUrl(fileKey);
    if (!s3Url) throw new Error("❌ Failed to generate presigned URL");

    console.log(`✅ Uploaded to S3: ${s3Url}`);

    // 3. Store archive metadata (company scoped)
    await ReportArchive.create({
      reportType: capitalize(type),
      reportMonth: month,
      reportYear: year,
      fileKey,
      fileUrl: s3Url,
      companyId,
    });

    console.log(`📚 Mongo archive created for ${type} report [${month}/${year}] - ${companyId}`);
    return s3Url;

  } catch (err) {
    console.error("❌ Report generation error:", err.message);
    throw err;
  }
};
