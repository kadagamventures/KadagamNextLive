const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const Task = require("../models/Task");
const Report = require("../models/Report");
const cron = require("node-cron");
const { connectDB, closeDB } = require("../config/dbConfig");

/**
 * ✅ Optimize Indexes for Faster Queries
 */
const optimizeIndexes = async () => {
    try {
        console.log("🔄 Optimizing database indexes...");

        // Index Staff ID for quick lookups
        await Attendance.collection.createIndex({ staffId: 1, date: 1 });

        // Compound index: Task Status & Due Date (for sorting tasks efficiently)
        await Task.collection.createIndex({ status: 1, dueDate: -1 });

        // Compound index: Report Lookups (for faster staff-based reports)
        await Report.collection.createIndex({ staffId: 1, createdAt: -1 });

        console.log("✅ Index optimization completed.");
    } catch (error) {
        console.error("⚠️ Error optimizing indexes:", error);
    }
};

/**
 * ✅ Auto-Delete Old Data (Retention Policy)
 */
const cleanupOldData = async () => {
    try {
        console.log("🗑️ Cleaning up old records...");

        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        // 🟢 Delete attendance records older than 1 year
        const deletedAttendance = await Attendance.deleteMany({ createdAt: { $lt: oneYearAgo } });

        // 🟢 Delete reports older than 1 month
        const deletedReports = await Report.deleteMany({ createdAt: { $lt: oneMonthAgo } });

        // 🟢 Delete completed tasks older than 6 months
        const deletedTasks = await Task.deleteMany({
            status: { $in: ["Completed", "Abandoned"] },
            updatedAt: { $lt: sixMonthsAgo },
        });

        console.log(`✅ Cleanup completed: ${deletedAttendance.deletedCount} attendance, ${deletedReports.deletedCount} reports, ${deletedTasks.deletedCount} tasks removed.`);
    } catch (error) {
        console.error("⚠️ Error cleaning old records:", error);
    }
};

/**
 * ✅ Run Optimization & Cleanup as a Scheduled Cron Job (Runs Weekly on Sunday at 02:00 AM)
 */
cron.schedule("0 2 * * 0", async () => {
    console.log("🚀 Running scheduled database optimization...");

    await connectDB();
    await optimizeIndexes();
    await cleanupOldData();
    await closeDB();

    console.log("🔒 Database optimization completed.");
});

/**
 * ✅ Manual Execution (For Admin Use)
 */
const manualOptimizeDatabase = async () => {
    console.log("⚡ Manual Database Optimization Triggered...");

    await connectDB();
    await optimizeIndexes();
    await cleanupOldData();
    await closeDB();

    console.log("✅ Manual Optimization Completed.");
};

module.exports = {
    manualOptimizeDatabase,
};
