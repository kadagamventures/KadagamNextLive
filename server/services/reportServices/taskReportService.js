const Task       = require("../../models/Task");
const User       = require("../../models/User");
const awsService = require("../../services/awsService");
const pdfService = require("../../services/pdfService");
const moment     = require("moment");

const REPORT_EXPIRATION_DAYS = 365;

const normalizeCompanyId = (cid) => cid?.toString();

const taskReportService = {
  // ✅ 1. Live Task Statistics (SaaS Scoped)
  async getLiveTaskStats(companyId) {
    const cid = normalizeCompanyId(companyId);

    // Tasks are hard-deleted now, so no isDeleted filter
    const stats = await Task.aggregate([
      { $match: { companyId: cid } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const totalTasks      = stats.reduce((acc, s) => acc + s.count, 0);
    const completedTasks  = stats.find(s => s._id === "Completed")?.count || 0;
    const ongoingTasks    = stats.find(s => s._id === "Ongoing")?.count || 0;
    const overdueTasks    = stats.find(s => s._id === "Overdue")?.count || 0;
    const toDoTasks       = stats.find(s => s._id === "To Do")?.count || 0;

    const highPriorityTasks = await Task.countDocuments({ 
      companyId: cid, 
      priority: "High" 
    });

    const dueToday = await Task.countDocuments({
      companyId: cid,
      dueDate: {
        $gte: moment().startOf("day").toDate(),
        $lt:  moment().endOf("day").toDate()
      }
    });

    return {
      totalTasks,
      completedTasks,
      ongoingTasks,
      overdueTasks,
      toDoTasks,
      highPriorityTasks,
      dueToday
    };
  },

  // ✅ 2. Generate Task Report & Store in AWS S3 (SaaS Scoped)
  async generateTaskReport(companyId, reportType, month, year) {
    const cid = normalizeCompanyId(companyId);
    const { startDate, endDate } = getDateRange(reportType, month, year);

    const tasks = await Task.find({
      companyId: cid,
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate("assignedTo", "name email");

    const priorityStats = {
      high:   tasks.filter(t => t.priority === "High").length,
      medium: tasks.filter(t => t.priority === "Medium").length,
      low:    tasks.filter(t => t.priority === "Low").length,
    };

    const overdueTasks = tasks
      .filter(t => t.status === "Overdue")
      .map(mapTaskRecord);

    const topPerformingStaff = await getTopPerformingStaff(tasks);

    const reportData = {
      summary: {
        totalTasks:       tasks.length,
        completedTasks:   tasks.filter(t => t.status === "Completed").length,
        completionRate:   ((tasks.filter(t => t.status === "Completed").length / (tasks.length || 1)) * 100).toFixed(2) + "%",
        avgCompletionTime: calculateAverageCompletionTime(tasks),
      },
      priorityStats,
      tasks:        tasks.map(mapTaskRecord),
      overdueTasks,
      performance:  topPerformingStaff,
    };

    const title     = `${capitalize(reportType)} Task Report - ${moment(startDate).format("MMMM YYYY")}`;
    const pdfBuffer = await pdfService.generateReportPDF(reportData, title);

    const fileName     = `reports/task/${cid}/${year}/${month}/${reportType}-task-report.pdf`;
    const uploadResult = await awsService.uploadFile(pdfBuffer, fileName, { expiresIn: "1y" });

    return uploadResult.url;
  },

  // ✅ 3. Auto-Delete Expired Reports (Scoped to S3 path, not companyId filterable)
  async deleteExpiredTaskReports() {
    try {
      const allFiles      = await awsService.listFiles("reports/task/");
      const expirationTime = Date.now() - REPORT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

      for (const file of allFiles) {
        const tsMatch = file.Key.match(/\d{4}/g);
        const fileTimestamp = tsMatch && tsMatch.length >= 3
          ? new Date(tsMatch[0], parseInt(tsMatch[1], 10) - 1, tsMatch[2]).getTime()
          : null;

        if (fileTimestamp && fileTimestamp < expirationTime) {
          await awsService.deleteFile(file.Key);
          console.log(`🗑️ Deleted expired task report: ${file.Key}`);
        }
      }
    } catch (error) {
      console.error("❌ Error auto-deleting expired task reports:", error);
    }
  }
};

// 🔹 Helper - Get Date Range
function getDateRange(type, month, year) {
  const date = moment(`${year}-${month}-01`);
  if (type === "daily") {
    return {
      startDate: date.startOf("day").toDate(),
      endDate:   date.endOf("day").toDate()
    };
  }
  if (type === "monthly") {
    return {
      startDate: date.startOf("month").toDate(),
      endDate:   date.endOf("month").toDate()
    };
  }
  return {
    startDate: date.startOf("year").toDate(),
    endDate:   date.endOf("year").toDate()
  };
}

// 🔹 Helper - Top Performing Staff
async function getTopPerformingStaff(tasks) {
  const performance = {};
  tasks.forEach(task => {
    if (task.status === "Completed") {
      const sid = task.assignedTo._id.toString();
      performance[sid] = (performance[sid] || 0) + 1;
    }
  });

  const staffIds = Object.keys(performance);
  if (!staffIds.length) return [];

  const staffDetails = await User.find({ _id: { $in: staffIds } }).select("name email");
  return staffDetails
    .map(staff => ({
      name:           staff.name,
      email:          staff.email,
      tasksCompleted: performance[staff._id.toString()] || 0,
    }))
    .sort((a, b) => b.tasksCompleted - a.tasksCompleted);
}

// 🔹 Helper - Calculate Average Completion Time
function calculateAverageCompletionTime(tasks) {
  const completedTasks = tasks.filter(t => t.status === "Completed" && t.completedAt && t.createdAt);
  if (!completedTasks.length) return "N/A";

  const totalTime = completedTasks.reduce(
    (sum, t) => sum + (new Date(t.completedAt) - new Date(t.createdAt)),
    0
  );
  const avgHr = Math.round(totalTime / completedTasks.length / (1000 * 60 * 60));
  return `${avgHr} hrs`;
}

// 🔹 Helper - Format Task Record
function mapTaskRecord(task) {
  return {
    title:       task.title,
    status:      task.status,
    priority:    task.priority,
    assignedTo:  task.assignedTo.name,
    dueDate:     moment(task.dueDate).format("YYYY-MM-DD"),
    completedAt: task.completedAt ? moment(task.completedAt).format("YYYY-MM-DD") : "N/A"
  };
}

// 🔹 Helper - Capitalize string
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = taskReportService;
