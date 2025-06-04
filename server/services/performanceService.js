const Task = require("../models/Task");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const ReportArchive = require("../models/ReportArchive");
const pdfService = require("./pdfService");
const awsService = require("./awsService");

// ✅ Overall Company Staff Metrics
const getOverallStaffPerformance = async (companyId) => {
  try {
    const totalStaff = await User.countDocuments({
      role: { $ne: "admin" },
      isActive: true,
      companyId
    });

    const activeStaff = await Task.distinct("assignedTo", {
      companyId,
      status: { $nin: ["Completed", "Cancelled"] }
    });

    const inactiveStaff = Math.max(totalStaff - activeStaff.length, 0);

    const totalAttendance = await Attendance.countDocuments({
      status: "Present",
      companyId
    });
    const totalRecords = await Attendance.countDocuments({ companyId });
    const attendancePercentage = totalRecords > 0
      ? (totalAttendance / totalRecords) * 100
      : 0;

    const totalTasks = await Task.countDocuments({ companyId });
    const completedTasks = await Task.countDocuments({ status: "Completed", companyId });
    const overdueTasks = await Task.countDocuments({ status: "Overdue", companyId });

    const onTimeCompletionRate = completedTasks > 0
      ? ((completedTasks - overdueTasks) / completedTasks) * 100
      : 0;
    const successRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const topPerformer = await User.aggregate([
      {
        $match: {
          role: { $ne: "admin" },
          isActive: true,
          companyId
        }
      },
      {
        $lookup: {
          from: "tasks",
          let: { staffId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$assignedTo", "$$staffId"] },
                companyId,
                status: "Completed"
              }
            }
          ],
          as: "tasks"
        }
      },
      {
        $project: {
          name: 1,
          completedTasks: { $size: "$tasks" }
        }
      },
      { $sort: { completedTasks: -1 } },
      { $limit: 1 }
    ]);

    return {
      totalStaff,
      activeStaff: activeStaff.length,
      inactiveStaff,
      attendancePercentage: attendancePercentage.toFixed(2),
      taskCompletionRate: ((completedTasks / Math.max(totalTasks, 1)) * 100).toFixed(2),
      onTimeCompletionRate: onTimeCompletionRate.toFixed(2),
      successRate: successRate.toFixed(2),
      topPerformer: topPerformer[0] || null
    };
  } catch (error) {
    console.error("❌ Error fetching overall performance:", error);
    throw error;
  }
};

const getStaffPerformanceById = async (staffId, companyId) => {
  const staff = await User.findOne({ _id: staffId, companyId });
  if (!staff) throw new Error("Staff not found");

  const totalPresent = await Attendance.countDocuments({
    userId: staffId,
    status: "Present",
    companyId
  });

  const totalAbsent = await Attendance.countDocuments({
    userId: staffId,
    status: "Absent",
    companyId
  });

  const totalAttendanceRecords = totalPresent + totalAbsent;
  const attendancePercentage = totalAttendanceRecords > 0
    ? (totalPresent / totalAttendanceRecords) * 100
    : 0;

  const totalTasksAssigned = await Task.countDocuments({ assignedTo: staffId, companyId });
  const completedTasks     = await Task.countDocuments({ assignedTo: staffId, status: "Completed", companyId });
  const overdueTasks       = await Task.countDocuments({ assignedTo: staffId, status: "Overdue", companyId });

  const highPriorityCompleted = await Task.countDocuments({
    assignedTo: staffId,
    status: "Completed",
    priority: { $in: ["High", "Critical"] },
    companyId
  });

  const ongoingTasks = await Task.countDocuments({ assignedTo: staffId, status: "Ongoing", companyId });

  const taskCompletionRate    = totalTasksAssigned > 0 ? (completedTasks / totalTasksAssigned) * 100 : 0;
  const onTimeCompletionRate  = completedTasks > 0
    ? ((completedTasks - overdueTasks) / completedTasks) * 100
    : 0;
  const successRate           = totalTasksAssigned > 0 ? (completedTasks / totalTasksAssigned) * 100 : 0;
  const efficiencyScore       = completedTasks / Math.max(totalPresent, 1);
  const consistencyScore      = 90;

  const overallPerformanceScore =
    successRate * 0.4 +
    attendancePercentage * 0.3 +
    onTimeCompletionRate * 0.2 +
    efficiencyScore * 0.1;

  return {
    staffId,
    name: staff.name,
    email: staff.email,
    totalTasksAssigned,
    totalTasksCompleted: completedTasks,
    taskCompletionRate: taskCompletionRate.toFixed(2),
    onTimeCompletionRate: onTimeCompletionRate.toFixed(2),
    overdueTasks,
    highPriorityTasksCompleted: highPriorityCompleted,
    ongoingTasks,
    totalDaysPresent: totalPresent,
    totalDaysAbsent: totalAbsent,
    attendancePercentage: attendancePercentage.toFixed(2),
    successRate: successRate.toFixed(2),
    efficiencyScore: efficiencyScore.toFixed(2),
    consistencyScore,
    overallPerformanceScore: overallPerformanceScore.toFixed(2)
  };
};
const getStaffVisualizationData = async (companyId) => {
  try {
    const attendanceTrends = await Attendance.aggregate([
      { $match: { companyId } },
      {
        $group: {
          _id: {
            month: { $month: "$date" },
            year: { $year: "$date" }
          },
          presentDays: {
            $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] }
          }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const taskCompletionGraph = await Task.aggregate([
      { $match: { companyId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    return { attendanceTrends, taskCompletionGraph };
  } catch (error) {
    console.error("❌ Error fetching visualization data:", error);
    return {};
  }
};


const generateMonthlyStaffReportPDF = async (year, month, companyId) => {
  try {
    const existingReport = await ReportArchive.findOne({
      reportType: "Staff",
      reportYear: year,
      reportMonth: month,
      companyId
    });

    if (existingReport) return existingReport.fileUrl;

    const reportData = await getStaffVisualizationData(companyId);

    const pdfBuffer = await pdfService.generateStaffReportPDF(
      reportData,
      `Staff Report - ${month}/${year}`
    );

    const fileKey = `reports/staff/company_${companyId}/${year}/${month}/staff-report.pdf`;
    const fileUrl = await awsService.uploadFile(pdfBuffer, fileKey, {
      expiresIn: "1y"
    });

    await ReportArchive.create({
      reportType: "Staff",
      reportMonth: month,
      reportYear: year,
      companyId,
      fileUrl
    });

    return fileUrl;
  } catch (err) {
    console.error("❌ Error generating or uploading Monthly Staff Report PDF:", err);
    throw err;
  }
};


const archiveRemovedStaffReport = async (staffId, companyId) => {
  try {
    const performanceData = await getStaffPerformanceById(staffId, companyId);
    const pdfBuffer = await pdfService.generateFinalStaffReportPDF(performanceData, "Final Report");

    const fileName = `reports/removed_staff/company_${companyId}/${staffId}-${Date.now()}.pdf`;
    const fileUrl = await awsService.uploadFile(pdfBuffer, fileName, { expiresIn: "5y" });

    await ReportArchive.create({
      reportType: "FinalStaff",
      staffId,
      companyId,
      fileUrl,
      archivedAt: new Date()
    });

    return fileUrl;
  } catch (err) {
    console.error("❌ Error archiving removed staff report:", err);
    throw err;
  }
};
const getMonthlyPerformance = async (staffId, year, month, companyId) => {
  const startDate = new Date(`${year}-${month}-01`);
  const endDate = new Date(`${year}-${month}-31`);

  const tasks = await Task.find({
    assignedTo: staffId,
    companyId,
    createdAt: { $gte: startDate, $lte: endDate }
  });

  const completed = tasks.filter(t => t.status === 'Completed').length;
  const overdue = tasks.filter(t => t.status === 'Overdue').length;

  return {
    totalTasks: tasks.length,
    completed,
    overdue,
    completionRate: tasks.length ? ((completed / tasks.length) * 100).toFixed(2) : "0.00"
  };
};


// ✅ Yearly Performance
const getYearlyPerformance = async (staffId, year, companyId) => {
  const startDate = new Date(`${year}-01-01`);
  const endDate = new Date(`${year}-12-31`);

  const tasks = await Task.find({
    assignedTo: staffId,
    companyId,
    createdAt: { $gte: startDate, $lte: endDate }
  });

  const completed = tasks.filter(t => t.status === 'Completed').length;
  const overdue = tasks.filter(t => t.status === 'Overdue').length;

  return {
    totalTasks: tasks.length,
    completed,
    overdue,
    completionRate: tasks.length ? ((completed / tasks.length) * 100).toFixed(2) : "0.00"
  };
};


// ✅ Monthly Individual Staff Performance with Extended Metrics (By Month)
const getMonthlyPerformanceById = async (staffId, year, month, companyId) => {
  const startDate = new Date(`${year}-${month}-01`);
  const endDate   = new Date(`${year}-${month}-31`);

  const tasks = await Task.find({
    assignedTo: staffId,
    companyId,
    createdAt: { $gte: startDate, $lte: endDate }
  });

  const totalTasksAssigned = tasks.length;
  const completedTasks     = tasks.filter(t => t.status === 'Completed').length;
  const overdueTasks       = tasks.filter(t => t.status === 'Overdue').length;
  const highPriorityCompleted = tasks.filter(
    t => t.status === 'Completed' && ['High', 'Critical'].includes(t.priority)
  ).length;
  const ongoingTasks = tasks.filter(t => t.status === 'Ongoing').length;

  const attendanceRecords = await Attendance.find({
    userId: staffId,
    companyId,
    date: { $gte: startDate, $lte: endDate }
  });

  const totalPresent = attendanceRecords.filter(a => a.status === 'Present').length;
  const totalAbsent  = attendanceRecords.filter(a => a.status === 'Absent').length;
  const totalAttendance = totalPresent + totalAbsent;
  const attendancePercentage = totalAttendance > 0
    ? (totalPresent / totalAttendance) * 100
    : 0;

  const taskCompletionRate   = totalTasksAssigned > 0 ? (completedTasks / totalTasksAssigned) * 100 : 0;
  const onTimeCompletionRate = completedTasks > 0
    ? ((completedTasks - overdueTasks) / completedTasks) * 100
    : 0;
  const successRate = totalTasksAssigned > 0
    ? (completedTasks / totalTasksAssigned) * 100
    : 0;
  const efficiencyScore = completedTasks / Math.max(totalPresent, 1);
  const consistencyScore = 90;
  const overallPerformanceScore =
    successRate * 0.4 +
    attendancePercentage * 0.3 +
    onTimeCompletionRate * 0.2 +
    efficiencyScore * 0.1;

  return {
    totalTasksAssigned,
    totalTasksCompleted: completedTasks,
    taskCompletionRate: taskCompletionRate.toFixed(2),
    onTimeCompletionRate: onTimeCompletionRate.toFixed(2),
    overdueTasks,
    highPriorityTasksCompleted: highPriorityCompleted,
    ongoingTasks,
    totalDaysPresent: totalPresent,
    totalDaysAbsent: totalAbsent,
    attendancePercentage: attendancePercentage.toFixed(2),
    successRate: successRate.toFixed(2),
    efficiencyScore: efficiencyScore.toFixed(2),
    consistencyScore,
    overallPerformanceScore: overallPerformanceScore.toFixed(2)
  };
};


  const getMonthlyPerformanceByStaffId = async (staffId, year, month, companyId) => {
  const user = await User.findOne({ staffId, companyId });
  if (!user) throw new Error("Staff not found");
  const objectId = user._id;

  const startDate = new Date(`${year}-${month}-01`);
  const endDate   = new Date(`${year}-${month}-31`);

  const tasks = await Task.find({
    assignedTo: objectId,
    companyId,
    createdAt: { $gte: startDate, $lte: endDate }
  });

  const totalTasksAssigned = tasks.length;
  const completedTasks     = tasks.filter(t => t.status === "Completed").length;
  const overdueTasks       = tasks.filter(t => t.status === "Overdue").length;
  const highPriorityCompleted = tasks.filter(
    t => t.status === "Completed" && ["High", "Critical"].includes(t.priority)
  ).length;
  const ongoingTasks = tasks.filter(t => t.status === "Ongoing").length;

  const attendanceRecords = await Attendance.find({
    userId: objectId,
    companyId,
    date: { $gte: startDate, $lte: endDate }
  });

  const totalPresent = attendanceRecords.filter(a => a.status === "Present").length;
  const totalAbsent  = attendanceRecords.filter(a => a.status === "Absent").length;
  const totalAttendance = totalPresent + totalAbsent;
  const attendancePercentage = totalAttendance > 0
    ? (totalPresent / totalAttendance) * 100
    : 0;

  const taskCompletionRate   = totalTasksAssigned > 0 ? (completedTasks / totalTasksAssigned) * 100 : 0;
  const onTimeCompletionRate = completedTasks > 0
    ? ((completedTasks - overdueTasks) / completedTasks) * 100
    : 0;
  const successRate   = totalTasksAssigned > 0 ? (completedTasks / totalTasksAssigned) * 100 : 0;
  const efficiencyScore = completedTasks / Math.max(totalPresent, 1);
  const consistencyScore = 90;
  const overallPerformanceScore =
    successRate * 0.4 +
    attendancePercentage * 0.3 +
    onTimeCompletionRate * 0.2 +
    efficiencyScore * 0.1;

  return {
    staffId,
    staffName: user.name,
    totalTasksAssigned,
    totalTasksCompleted: completedTasks,
    taskCompletionRate: taskCompletionRate.toFixed(2),
    onTimeCompletionRate: onTimeCompletionRate.toFixed(2),
    overdueTasks,
    highPriorityTasksCompleted: highPriorityCompleted,
    ongoingTasks,
    totalDaysPresent: totalPresent,
    totalDaysAbsent: totalAbsent,
    attendancePercentage: attendancePercentage.toFixed(2),
    successRate: successRate.toFixed(2),
    efficiencyScore: efficiencyScore.toFixed(2),
    consistencyScore,
    overallPerformanceScore: overallPerformanceScore.toFixed(2)
  };
};

const getAllStaffPerformance = async (year, month, companyId) => {
  const staffList = await User.find({
    role: { $ne: "admin" },
    isActive: true,
    companyId
  });

  const startDate = new Date(`${year}-${month}-01`);
  const endDate   = new Date(`${year}-${month}-31`);

  const allPerformances = [];
  for (const staff of staffList) {
    const tasks = await Task.find({
      assignedTo: staff._id,
      companyId,
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const totalTasksAssigned = tasks.length;
    const completedTasks     = tasks.filter(t => t.status === "Completed").length;
    const overdueTasks       = tasks.filter(t => t.status === "Overdue").length;

    const attendanceRecords = await Attendance.find({
      userId: staff._id,
      companyId,
      date: { $gte: startDate, $lte: endDate }
    });

    const totalPresent = attendanceRecords.filter(a => a.status === "Present").length;
    const totalAbsent  = attendanceRecords.filter(a => a.status === "Absent").length;
    const totalAttendance = totalPresent + totalAbsent;
    const attendancePercentage = totalAttendance > 0
      ? (totalPresent / totalAttendance) * 100
      : 0;

    const taskCompletionRate   = totalTasksAssigned > 0 ? (completedTasks / totalTasksAssigned) * 100 : 0;
    const onTimeCompletionRate = completedTasks > 0
      ? ((completedTasks - overdueTasks) / completedTasks) * 100
      : 0;
    const successRate   = totalTasksAssigned > 0 ? (completedTasks / totalTasksAssigned) * 100 : 0;
    const efficiencyScore = completedTasks / Math.max(totalPresent, 1);
    const consistencyScore = 90;
    const overallPerformanceScore =
      successRate * 0.4 +
      attendancePercentage * 0.3 +
      onTimeCompletionRate * 0.2 +
      efficiencyScore * 0.1;

    allPerformances.push({
      staffId: staff.staffId,
      staffName: staff.name,
      totalTasksAssigned,
      totalTasksCompleted: completedTasks,
      taskCompletionRate: taskCompletionRate.toFixed(2),
      onTimeCompletionRate: onTimeCompletionRate.toFixed(2),
      overdueTasks,
      totalDaysPresent: totalPresent,
      totalDaysAbsent: totalAbsent,
      attendancePercentage: attendancePercentage.toFixed(2),
      successRate: successRate.toFixed(2),
      efficiencyScore: efficiencyScore.toFixed(2),
      consistencyScore,
      overallPerformanceScore: overallPerformanceScore.toFixed(2)
    });
  }

  return allPerformances;
};

module.exports = {
  getOverallStaffPerformance,
  getStaffPerformanceById,
  getStaffVisualizationData,
  generateMonthlyStaffReportPDF,
  archiveRemovedStaffReport,
  getMonthlyPerformance,
  getYearlyPerformance,
  getMonthlyPerformanceById,
  getMonthlyPerformanceByStaffId,
  getAllStaffPerformance
};
