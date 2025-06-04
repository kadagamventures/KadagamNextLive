// 📂 cronJobs/taskReminderCron.js
const cron = require("node-cron");
const Task = require("../models/Task");
const { createNotification } = require("../services/notificationService");
const Company = require("../models/Company"); // Assuming you have a Company model

const taskReminderCron = () => {
  cron.schedule("0 9 * * *", async () => {
    // Runs every day at 9:00 AM server time
    try {
      console.log("⏰ [CRON] Running task due soon/overdue check...");

      const now = new Date();
      const tomorrowStart = new Date(now);
      tomorrowStart.setDate(now.getDate() + 1);
      tomorrowStart.setHours(0, 0, 0, 0);

      const tomorrowEnd = new Date(tomorrowStart);
      tomorrowEnd.setHours(23, 59, 59, 999);

      // Fetch all active companies to scope tasks by company
      const companies = await Company.find({ isActive: true }).select("_id");

      let totalDueSoon = 0;
      let totalOverdue = 0;

      for (const company of companies) {
        // 🔍 1. Tasks due tomorrow (not completed) for this company
        const dueSoonTasks = await Task.find({
          companyId: company._id,
          dueDate: { $gte: tomorrowStart, $lte: tomorrowEnd },
          status: { $ne: "completed" },
          isDeleted: false,
        });

        for (const task of dueSoonTasks) {
          await createNotification({
            companyId: company._id,
            staffId: task.assignedTo.toString(),
            type: "TASK_DUE_SOON",
            title: "Task Due Soon",
            message: `Your task "${task.title}" is due tomorrow.`,
          });
        }

        // 🔍 2. Overdue tasks (past due, not completed) for this company
        const overdueTasks = await Task.find({
          companyId: company._id,
          dueDate: { $lt: now },
          status: { $ne: "completed" },
          isDeleted: false,
        });

        for (const task of overdueTasks) {
          await createNotification({
            companyId: company._id,
            staffId: task.assignedTo.toString(),
            type: "TASK_OVERDUE",
            title: "Task Overdue",
            message: `Your task "${task.title}" is overdue. Please take action.`,
          });
        }

        totalDueSoon += dueSoonTasks.length;
        totalOverdue += overdueTasks.length;
      }

      console.log(`✅ [CRON] ${totalDueSoon} due soon, ${totalOverdue} overdue tasks processed across ${companies.length} companies.`);

    } catch (err) {
      console.error("❌ [CRON ERROR] Task reminder cron failed:", err.message);
    }
  });
};

module.exports = taskReminderCron;
