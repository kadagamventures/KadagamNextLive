const cron = require("node-cron");
const Task = require("../models/Task");
const Company = require("../models/Company"); // Add your company model path
const { emitDashboardUpdate } = require("../services/websocketService");
const { extractFileKey, deleteFile } = require("../utils/fileUtils");
const mongoose = require("mongoose");
const MONGO_URI = process.env.MONGO_URI;

/**
 * Cleanup daily updates older than 2 days per company
 * @param {string} companyId 
 */
const cleanupDailyUpdatesForCompany = async (companyId) => {
  try {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const tasks = await Task.find({
      companyId,
      "dailyUpdates.0": { $exists: true },
      isDeleted: false,
    });

    let totalDeletedUpdates = 0;
    let totalFilesDeleted = 0;

    for (const task of tasks) {
      const oldUpdates = task.dailyUpdates.filter(update => update.date < twoDaysAgo);

      for (const update of oldUpdates) {
        if (update.attachment?.fileUrl) {
          const fileKey = extractFileKey(update.attachment.fileUrl);
          if (fileKey) {
            await deleteFile(fileKey);
            totalFilesDeleted++;
          }
        }
      }

      const newUpdates = task.dailyUpdates.filter(update => update.date >= twoDaysAgo);

      if (newUpdates.length !== task.dailyUpdates.length) {
        const removedCount = task.dailyUpdates.length - newUpdates.length;
        task.dailyUpdates = newUpdates;
        await task.save();
        totalDeletedUpdates += removedCount;
      }
    }

    console.log(`✅ [Company: ${companyId}] Daily Updates Cleanup: Removed ${totalDeletedUpdates} outdated updates.`);
    console.log(`✅ [Company: ${companyId}] Attachments deleted from S3: ${totalFilesDeleted}`);

  } catch (error) {
    console.error(`❌ Error during daily updates cleanup for company ${companyId}:`, error);
  }
};

/**
 * Scheduled Cleanup: Runs daily at 2 AM UTC
 */
cron.schedule("0 2 * * *", async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB for daily updates cleanup job");

    const companies = await Company.find({}, { _id: 1 }).lean();

    for (const company of companies) {
      await cleanupDailyUpdatesForCompany(company._id);
    }

    // Notify dashboards once after all companies cleaned
    emitDashboardUpdate(null, "taskUpdatesCleared");

  } catch (error) {
    console.error("❌ Critical error during scheduled daily updates cleanup:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 MongoDB connection closed after daily updates cleanup");
  }
});

console.log("⏳ Scheduled Daily Update Cleanup Job initialized (Runs daily at 2 AM UTC)");
