const Project       = require("../../models/Project");
const Task          = require("../../models/Task");
const User          = require("../../models/User");
const awsService    = require("../../services/awsService");
const pdfService    = require("../../services/pdfService");
const { format }    = require("date-fns");

const REPORT_EXPIRATION_DAYS = 365;

/**
 * 🔧 Normalize companyId to string
 */
const normalizeCompanyId = (cid) => cid?.toString();

/**
 * Auto-move empty ongoing projects to Completed
 */
const autoMoveEmptyOngoingProjects = async (companyId) => {
  const cid = normalizeCompanyId(companyId);
  const emptyProjects = await Project.find({
    companyId: cid,
    isDeleted: false,
    status:    "Ongoing",
    tasks:     { $size: 0 }
  });

  if (emptyProjects.length > 0) {
    await Project.updateMany(
      { _id: { $in: emptyProjects.map(p => p._id) } },
      { status: "Completed" }
    );
    console.log(`✅ Auto-moved ${emptyProjects.length} empty projects to Completed for company: ${cid}`);
  }
};

/**
 * 1. Get live project stats
 */
const getLiveProjectStats = async (companyId) => {
  const cid = normalizeCompanyId(companyId);
  await autoMoveEmptyOngoingProjects(cid);

  const [total, completed, ongoing, cancelled, overdue] = await Promise.all([
    Project.countDocuments({ companyId: cid, isDeleted: false }),
    Project.countDocuments({ companyId: cid, isDeleted: false, status: "Completed" }),
    Project.countDocuments({ companyId: cid, isDeleted: false, status: "Ongoing" }),
    Project.countDocuments({ companyId: cid, isDeleted: false, status: "Cancelled" }),
    Project.countDocuments({
      companyId: cid,
      isDeleted: false,
      status:    { $nin: ["Completed","Cancelled"] },
      endDate:   { $lt: new Date() }
    }),
  ]);

  return {
    totalProjects:     total,
    completedProjects: completed,
    ongoingProjects:   ongoing,
    overdueProjects:   overdue,
    cancelledProjects: cancelled,
    pendingProjects:   0
  };
};

/**
 * 2. Generate Monthly Project Report (PDF + S3)
 */
const generateMonthlyProjectReport = async (month, year, companyId) => {
  const cid   = normalizeCompanyId(companyId);
  const m     = parseInt(month, 10);
  const y     = parseInt(year, 10);
  const start = new Date(y, m - 1, 1);
  const end   = new Date(y, m, 0);

  await autoMoveEmptyOngoingProjects(cid);

  const projects = await Project.find({
    companyId: cid,
    isDeleted: false,
    createdAt: { $gte: start, $lte: end }
  })
    .populate("tasks")
    .lean();

  const staffPerformance = {};
  const reportData = {
    month:             format(start, "MMMM yyyy"),
    totalProjects:     projects.length,
    completedProjects: projects.filter(p => p.status === "Completed").length,
    overdueProjects:   projects.filter(p => p.status !== "Completed" && p.endDate && p.endDate < new Date()).length,
    cancelledProjects: projects.filter(p => p.status === "Cancelled").length,
    projectBreakdown:  [],
    staffPerformance:  []
  };

  for (const project of projects) {
    const completion      = await calculateProjectProgress(project._id, cid);
    const completedTasks  = project.tasks.filter(t => t.status === "Completed").length;

    (project.assignedStaff || []).forEach(staffId => {
      staffPerformance[staffId] = (staffPerformance[staffId] || 0) + completedTasks;
    });

    reportData.projectBreakdown.push({
      name:           project.name,
      status:         project.status,
      completionRate: completion.toFixed(2),
      completedTasks,
      totalTasks:     project.tasks.length
    });
  }

  const staffList = await User.find({
    _id:       { $in: Object.keys(staffPerformance) },
    companyId: cid,
    isDeleted: false
  });

  staffList.forEach(staff => {
    reportData.staffPerformance.push({
      name:           staff.name,
      completedTasks: staffPerformance[staff._id.toString()] || 0
    });
  });

  const buffer = await pdfService.generateProjectReportPDF(reportData);
  const key    = `reports/${cid}/project/${year}/${month}/project-report.pdf`;
  const upload = await awsService.uploadFile(buffer, key, { expiresIn: "1y" });

  return upload.url;
};

/**
 * 3. Get report link
 */
const getMonthlyProjectReportLink = async (month, year, companyId) => {
  const cid = normalizeCompanyId(companyId);
  const key = `reports/${cid}/project/${year}/${month}/project-report.pdf`;
  return awsService.getFileUrl(key);
};

/**
 * 4. Cleanup expired project reports
 */
const deleteExpiredProjectReports = async (companyId) => {
  const cid = normalizeCompanyId(companyId);
  try {
    const files  = await awsService.listFiles(`reports/${cid}/project/`);
    const cutoff = Date.now() - REPORT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

    for (const file of files) {
      const tsMatch = file.Key.match(/\d{4}\/\d{1,2}\/\d{1,2}/);
      const timestamp = tsMatch
        ? new Date(tsMatch[0].replace(/\//g, "-")).getTime()
        : null;
      if (timestamp && timestamp < cutoff) {
        await awsService.deleteFile(file.Key);
        console.log(`🗑️ Deleted expired project report: ${file.Key}`);
      }
    }
  } catch (err) {
    console.error("❌ Failed to clean expired project reports:", err);
  }
};

/**
 * Helper - Calculate Project Progress
 */
const calculateProjectProgress = async (projectId, companyId) => {
  const tasks = await Task.find({
    projects:   projectId,
    companyId,
    isDeleted:  false
  });
  if (!tasks.length) return 0;
  const completed = tasks.filter(t => t.status === "Completed").length;
  return (completed / tasks.length) * 100;
};

module.exports = {
  getLiveProjectStats,
  generateMonthlyProjectReport,
  getMonthlyProjectReportLink,
  deleteExpiredProjectReports
};
