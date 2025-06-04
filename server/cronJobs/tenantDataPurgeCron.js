const cron = require('node-cron');
const mongoose = require('mongoose');
const Company = require('../models/Company');
const awsService = require('../services/awsService');
const cacheService = require('../services/cacheService');
const ReportArchive = require('../models/ReportArchive'); 

/**
 * Purge tenant data for companies whose subscription expired > 30 days ago.
 * Runs daily at 02:00 AM IST.
 */
cron.schedule('0 2 * * *', async () => {
  try {
    const now = new Date();
    const purgeThreshold = new Date(now);
    purgeThreshold.setDate(purgeThreshold.getDate() - 30);

    // Find companies soft-deleted or expired more than 30 days ago
    const toPurge = await Company.find({
      isDeleted: true,
      'subscription.nextBillingDate': { $lte: purgeThreshold }
    }).lean();

    for (const { _id: companyId, name } of toPurge) {
      console.log(`🗑️ Purging data for company ${companyId} (${name})`);

      // 1) Archive metadata for audit (optional)
      await ReportArchive.create({
        companyId,
        archivedAt: now,
        reason: 'Subscription lapsed > 30 days'
      });

      // 2) Delete MongoDB data across all tenant collections
      const modelsToPurge = ['User','Project','Task','Attendance','Leave','Notification','Performance','ArchivedTask'];
      for (const modelName of modelsToPurge) {
        const Model = mongoose.model(modelName);
        await Model.deleteMany({ companyId });
      }

      // 3) Delete S3 folders under company_<companyId>/
      await awsService.deleteFolder(`task-attachments/company_${companyId}`);
      await awsService.deleteFolder(`reports/company_${companyId}`);
      await awsService.deleteFolder(`staff-profile-pictures/company_${companyId}`);
      // add any other company-specific buckets

      // 4) Delete Redis keys by prefix
      await cacheService.deleteByPrefix(`company_${companyId}:`);

      // 5) Finally, hard-delete the Company document
      await Company.deleteOne({ _id: companyId });

      console.log(`✅ Completed purge for company ${companyId}`);
    }
  } catch (err) {
    console.error('⏰ [TenantDataPurgeCron] error purging tenant data:', err);
  }
}, {
  timezone: 'Asia/Kolkata'
});
