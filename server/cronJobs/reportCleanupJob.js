const ReportArchive = require('../models/ReportArchive');
const Company = require('../models/Company'); // Your company model
const pdfService = require('../services/pdfService');
const awsService = require('../services/awsService');
const mongoose = require('mongoose');
const MONGO_URI = process.env.MONGO_URI;

const reportTypes = ['attendance', 'task', 'project', 'staff']; // Leave excluded
const currentYear = new Date().getFullYear();
const targetYear = currentYear - 1;

module.exports = async function reportCleanupJob() {
  console.log(`🔁 Running yearly report cleanup for ${targetYear} across companies`);

  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const companies = await Company.find({}, { _id: 1 }).lean();

    for (const company of companies) {
      const companyId = company._id;
      console.log(`📋 Processing reports for company: ${companyId}`);

      // 1️⃣ Generate yearly summaries for each type per company
      for (const type of reportTypes) {
        try {
          // Pass companyId if your pdfService supports tenant filtering
          const buffer = await pdfService.generateYearly(type, targetYear, companyId);

          const key = `reports/${companyId}/${type}/${targetYear}-summary.pdf`;
          const url = await awsService.uploadBufferToS3(buffer, key, 'application/pdf');

          await ReportArchive.create({
            companyId,
            type,
            month: null,
            year: targetYear,
            isYearly: true,
            url,
          });

          console.log(`✅ Yearly summary created for company ${companyId}, type: ${type}`);
        } catch (err) {
          console.error(`❌ Failed to create summary for company ${companyId}, type ${type}:`, err.message);
        }
      }

      // 🗑️ 2️⃣ Cleanup monthly reports for targetYear per company
      const monthlyReports = await ReportArchive.find({
        companyId,
        year: targetYear,
        isYearly: false,
      });

      for (const report of monthlyReports) {
        try {
          const url = new URL(report.url);
          const s3Key = decodeURIComponent(url.pathname.slice(1));
          await awsService.deleteFile(s3Key);
          await report.remove();
        } catch (err) {
          console.error(`⚠️ Error deleting report ${report._id} for company ${companyId}:`, err.message);
        }
      }

      console.log(`🗑️ Deleted ${monthlyReports.length} monthly reports for company ${companyId} in ${targetYear}`);
    }
  } catch (error) {
    console.error('❌ Fatal error in reportCleanupJob:', error);
  } finally {
    await mongoose.connection.close();
  }
};
