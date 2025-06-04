const mongoose = require("mongoose");
const cron = require("node-cron");
const Task = require("../models/Task");
const ArchivedTask = require("../models/ArchivedTask");
const Company = require("../models/Company"); // Assuming you have this model
const { getIO } = require("../config/websocketConfig");
const { connectDB, closeDB } = require("../config/dbConfig");

const ARCHIVE_DAYS = 30; // Number of days after which tasks are archived

/**
 * ✅ Archive Completed Tasks Older Than ARCHIVE_DAYS for a given companyId
 * @param {string|ObjectId} companyId 
 */
const archiveCompletedTasks = async (companyId) => {
    try {
        console.log(`🔄 Archiving old completed tasks for company ${companyId}...`);

        // Connect DB if not connected
        await connectDB();

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - ARCHIVE_DAYS);

        // Find completed tasks older than ARCHIVE_DAYS for this company only
        const tasksToArchive = await Task.find({
            companyId,
            status: "Completed",
            updatedAt: { $lte: cutoffDate }
        });

        if (tasksToArchive.length === 0) {
            console.log(`✅ No completed tasks to archive for company ${companyId}.`);
            return;
        }

        // Prepare archive docs with companyId included
        const archivedTasks = tasksToArchive.map(task => ({
            originalTaskId: task._id,
            title: task.title,
            description: task.description,
            project: task.project,
            assignedTo: task.assignedTo,
            status: "Archived",
            completedAt: task.updatedAt,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            companyId // <-- add companyId here
        }));

        await ArchivedTask.insertMany(archivedTasks);

        // Delete archived tasks from active collection
        await Task.deleteMany({ _id: { $in: tasksToArchive.map(task => task._id) } });

        // Notify the admin room specific to this company
        const io = getIO();
        io.to(`admin_${companyId}`).emit("tasksArchived", {
            archivedCount: tasksToArchive.length,
            lastArchivedDate: cutoffDate.toISOString()
        });

        console.log(`✅ Archived ${tasksToArchive.length} completed tasks for company ${companyId}.`);

    } catch (error) {
        console.error(`❌ Error archiving completed tasks for company ${companyId}:`, error);
    }
};

/**
 * ✅ Scheduled Cron Job: Runs Every Sunday at 1 AM and archives tasks for all companies
 */
cron.schedule("0 1 * * 0", async () => {
    console.log("⏳ Running scheduled task archiving job for all companies...");

    try {
        await connectDB();

        // Fetch all active company IDs
        const companies = await Company.find({}, { _id: 1 }).lean();

        for (const company of companies) {
            await archiveCompletedTasks(company._id);
        }

    } catch (err) {
        console.error("❌ Error running scheduled task archiving for companies:", err);
    } finally {
        await closeDB();
    }
});

module.exports = archiveCompletedTasks;
