const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const Company = require("../models/Company"); // Your company model
const cron = require("node-cron");
const { connectDB, closeDB } = require("../config/dbConfig");

/**
 * ✅ Auto-Cleanup of Notifications for a specific company
 * - Delete read notifications from the same day.
 * - Delete unread task update notifications older than 3 days.
 * - Delete unread other notifications older than 7 days.
 * @param {string|ObjectId} companyId
 */
const cleanupOldNotificationsForCompany = async (companyId) => {
  try {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(now.getDate() - 3);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    // Delete read notifications from the same day
    const deletedRead = await Notification.deleteMany({
      companyId,
      isRead: true,
      expiresAt: { $lte: endOfDay },
    });

    // Delete unread task update notifications older than 3 days
    const deletedTaskUpdates = await Notification.deleteMany({
      companyId,
      isRead: false,
      createdAt: { $lt: threeDaysAgo },
      message: /Task Update:/,
    });

    // Delete unread other notifications older than 7 days
    const deletedUnread = await Notification.deleteMany({
      companyId,
      isRead: false,
      createdAt: { $lt: sevenDaysAgo },
      message: { $not: /Task Update:/ },
    });

    console.log(
      `🧹 Notifications Cleanup Done for company ${companyId}: ${deletedRead.deletedCount} read, ${deletedTaskUpdates.deletedCount} task updates, ${deletedUnread.deletedCount} other`
    );
  } catch (error) {
    console.error(
      `❌ Error during notification cleanup for company ${companyId}:`,
      error.message
    );
  }
};

/**
 * ⏳ Schedule Cleanup Job (Runs every night at 23:59)
 */
cron.schedule("59 23 * * *", async () => {
  console.log("🕛 Running Scheduled Notification Cleanup for all companies...");
  try {
    await connectDB();
    const companies = await Company.find({}, { _id: 1 }).lean();

    for (const company of companies) {
      await cleanupOldNotificationsForCompany(company._id);
    }
  } catch (err) {
    console.error("❌ Error running scheduled notification cleanup:", err);
  } finally {
    await closeDB();
  }
});

/**
 * 🔄 Manual Cleanup Trigger (For Admin Use)
 * Cleans up notifications for all companies (or you can pass a companyId param to clean a single company)
 */
const manualCleanupOldNotifications = async () => {
  console.log("⚡ Manual Notification Cleanup Triggered for all companies...");
  try {
    await connectDB();
    const companies = await Company.find({}, { _id: 1 }).lean();

    for (const company of companies) {
      await cleanupOldNotificationsForCompany(company._id);
    }
  } catch (err) {
    console.error("❌ Error during manual notification cleanup:", err);
  } finally {
    await closeDB();
  }
};

module.exports = {
  cleanupOldNotificationsForCompany,
  manualCleanupOldNotifications,
};
