const cron = require("node-cron");

// Report Generation Jobs (multi-tenant logic handled internally)
const generateMonthlyReports = require("../cronJobs/generateMonthlyReports");
const generateYearlyReports = require("../cronJobs/generateYearlyReports");
const { generateMonthlyPerformanceReports, generateYearlyPerformanceReports } = require("../cronJobs/generatePerformanceReports");

// Maintenance Jobs (assumed multi-tenant safe)
const clearOldDailyComments = require("../services/taskService").clearOldDailyComments;
const clearOldTaskUpdates = require("../cronJobs/clearOldTaskUpdates");
const optimizeDatabase = require("../cronJobs/optimizeDatabase");
const reportCleanupJob = require("../cronJobs/reportCleanupJob");

/**
 * 🔹 Monthly Reports - 1st of every month at 12:00 AM
 * Assumes internal multi-tenant handling (per company)
 */
cron.schedule("0 0 1 * *", async () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    try {
        console.log("📊 Starting Monthly Report Generation for all companies...");

        await generateMonthlyReports();
        await generateMonthlyPerformanceReports(currentMonth, currentYear);

        console.log("✅ Monthly Reports (including Performance) Generated for all companies.");
    } catch (error) {
        console.error("❌ Monthly Report Generation Failed:", error);
    }
});

/**
 * 🔹 Yearly Reports - January 1st at 1:00 AM
 * Includes cleanup job and performance reports generation
 */
cron.schedule("0 1 1 1 *", async () => {
    const currentYear = new Date().getFullYear();

    try {
        console.log("📊 Starting Yearly Report Generation and Cleanup for all companies...");

        // Runs your multi-tenant yearly report cleanup logic
        await reportCleanupJob();

        await generateYearlyPerformanceReports(currentYear);

        console.log("✅ Yearly Reports (including Performance) Generated for all companies.");
    } catch (error) {
        console.error("❌ Yearly Report Generation Failed:", error);
    }
});

/**
 * 🔹 Daily Cleanup - Clear Daily Comments Older Than 3 Days (Every Day at 2:00 AM)
 */
cron.schedule("0 2 * * *", async () => {
    try {
        console.log("🧹 Running Daily Comment Cleanup across all companies...");
        await clearOldDailyComments();
        console.log("✅ Old Daily Comments Cleared.");
    } catch (error) {
        console.error("❌ Daily Comment Cleanup Failed:", error);
    }
});

/**
 * 🔹 Daily Cleanup - Clear Old Task Updates (Every Day at 2:15 AM)
 */
cron.schedule("15 2 * * *", async () => {
    try {
        console.log("🧹 Running Old Task Updates Cleanup across all companies...");
        await clearOldTaskUpdates();
        console.log("✅ Old Task Updates Cleared.");
    } catch (error) {
        console.error("❌ Old Task Updates Cleanup Failed:", error);
    }
});

/**
 * 🔹 Daily Database Optimization (Every Day at 3:00 AM)
 */
cron.schedule("0 3 * * *", async () => {
    try {
        console.log("🛠️ Running Database Optimization...");
        await optimizeDatabase();
        console.log("✅ Database Optimization Completed.");
    } catch (error) {
        console.error("❌ Database Optimization Failed:", error);
    }
});

console.log("⏳ Report & Maintenance Schedulers Initialized (Multi-tenant aware).");
