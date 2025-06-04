const Task           = require("../../models/Task");
const Attendance     = require("../../models/Attendance");
const Leave          = require("../../models/Leave");
const User           = require("../../models/User");
const redisClient    = require("../../config/redisConfig");
const pdfService     = require("../../services/pdfService");
const awsService     = require("../../services/awsService");
const ReportArchive  = require("../../models/ReportArchive");

const CACHE_EXPIRATION = 60 * 5; // 5 minutes

/**
 * 🔧 Normalize companyId to string
 */
const normalizeCompanyId = (cid) => cid?.toString();

/**
 * ===========================================
 * ✅ Helper: Performance Scoring Formula
 * ===========================================
 */
const calculatePerformanceScore = ({ attendancePercentage, totalTasks, completedTasks, taskComplexitySummary }) => {
  const attendanceScore        = attendancePercentage * 0.5;
  const taskCompletionScore    = totalTasks > 0 ? (completedTasks / totalTasks) * 100 * 0.3 : 30;
  const complexityWeight       = ((taskComplexitySummary.high * 3) + (taskComplexitySummary.medium * 2) + (taskComplexitySummary.low * 1)) / Math.max(totalTasks, 1);
  const projectComplexityScore = (complexityWeight / 3) * 20;
  return parseFloat((attendanceScore + taskCompletionScore + projectComplexityScore).toFixed(2));
};

/**
 * ===========================================
 * ✅ Monthly Performance (company scoped)
 * ===========================================
 */
const getMonthlyPerformance = async (staffId, year, month, companyId) => {
  const cid      = normalizeCompanyId(companyId);
  const y        = parseInt(year, 10);
  const m        = parseInt(month, 10);
  const cacheKey = `monthlyPerformance:${cid}:${staffId}:${y}:${m}`;
  const cached   = await redisClient.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const startDate = new Date(y, m - 1, 1);
  const endDate   = new Date(y, m, 0);

  const attendance = await Attendance.find({
    companyId: cid,
    userId:    staffId,                // updated field name
    date:      { $gte: startDate, $lte: endDate }
  });

  const tasks = await Task.find({
    companyId:  cid,
    assignedTo: staffId,
    createdAt:  { $gte: startDate, $lte: endDate }
  }).lean();

  const leaves = await Leave.countDocuments({
    companyId: cid,
    userId:    staffId,                // updated field name
    startDate: { $lte: endDate },
    endDate:   { $gte: startDate }
  });

  const attendancePercentage = attendance.length > 0
    ? (attendance.filter(a => a.status === "Present").length / attendance.length) * 100
    : 0;

  const completedTasks = tasks.filter(t => t.status === "Completed").length;
  const totalTasks     = tasks.length;

  const onTimeCompletionRate = completedTasks > 0
    ? (tasks.filter(t => t.completedAt && t.completedAt <= t.dueDate).length / completedTasks) * 100
    : 0;

  const taskComplexitySummary = {
    high:   tasks.filter(t => t.priority === "High").length,
    medium: tasks.filter(t => t.priority === "Medium").length,
    low:    tasks.filter(t => t.priority === "Low").length,
  };

  const performanceScore = calculatePerformanceScore({
    attendancePercentage,
    totalTasks,
    completedTasks,
    taskComplexitySummary
  });

  const result = {
    attendancePercentage:    attendancePercentage.toFixed(2),
    onTimeCompletionRate:    onTimeCompletionRate.toFixed(2),
    totalTasks,
    completedTasks,
    totalLeaves:             leaves,
    performanceScore
  };

  // use setEx for consistency
  await redisClient.setEx(cacheKey, CACHE_EXPIRATION, JSON.stringify(result));
  return result;
};

/**
 * ===========================================
 * ✅ Yearly Performance (company scoped)
 * ===========================================
 */
const getYearlyPerformance = async (staffId, year, companyId) => {
  const cid       = normalizeCompanyId(companyId);
  const y         = parseInt(year, 10);
  const startDate = new Date(y, 0, 1);
  const endDate   = new Date(y, 11, 31);

  const attendance = await Attendance.find({
    companyId: cid,
    userId:    staffId,                // updated field name
    date:      { $gte: startDate, $lte: endDate }
  });

  const tasks = await Task.find({
    companyId:  cid,
    assignedTo: staffId,
    createdAt:  { $gte: startDate, $lte: endDate }
  }).lean();

  const leaves = await Leave.countDocuments({
    companyId: cid,
    userId:    staffId,                // updated field name
    startDate: { $lte: endDate },
    endDate:   { $gte: startDate }
  });

  const attendancePercentage = attendance.length > 0
    ? (attendance.filter(a => a.status === "Present").length / attendance.length) * 100
    : 0;

  const completedTasks = tasks.filter(t => t.status === "Completed").length;
  const totalTasks     = tasks.length;

  const onTimeCompletionRate = completedTasks > 0
    ? (tasks.filter(t => t.completedAt && t.completedAt <= t.dueDate).length / completedTasks) * 100
    : 0;

  const taskComplexitySummary = {
    high:   tasks.filter(t => t.priority === "High").length,
    medium: tasks.filter(t => t.priority === "Medium").length,
    low:    tasks.filter(t => t.priority === "Low").length,
  };

  const performanceScore = calculatePerformanceScore({
    attendancePercentage,
    totalTasks,
    completedTasks,
    taskComplexitySummary
  });

  return {
    attendancePercentage:    attendancePercentage.toFixed(2),
    onTimeCompletionRate:    onTimeCompletionRate.toFixed(2),
    totalTasks,
    completedTasks,
    totalLeaves:             leaves,
    performanceScore
  };
};

/**
 * ===========================================
 * ✅ Self or Staff Visualization Data
 * ===========================================
 */
const getStaffVisualizationData = async (companyId, role = null) => {
  const cid   = normalizeCompanyId(companyId);
  const query = { isActive: true, isDeleted: false, companyId: cid };
  if (role) query.role = role;
  return await User.find(query).lean();
};

const getSelfVisualizationData = async (staffId, companyId) => {
  const cid = normalizeCompanyId(companyId);
  return await User.findOne({ _id: staffId, companyId: cid }).lean();
};

/**
 * ===========================================
 * ✅ Generate Monthly Staff Report PDF (Company Scoped)
 * ===========================================
 */
const generateMonthlyStaffReportPDF = async (year, month, companyId) => {
  const cid        = normalizeCompanyId(companyId);
  const reportData = await getStaffVisualizationData(cid);

  const pdfBuffer   = await pdfService.generateStaffReportPDF(reportData, `Staff Report - ${month}/${year}`);
  const fileName    = `reports/${cid}/staff/${year}/${month}/staff-report.pdf`;
  const uploadResult = await awsService.uploadFile(pdfBuffer, fileName, { expiresIn: "1y" });

  return uploadResult.url;
};

module.exports = {
  calculatePerformanceScore,
  getMonthlyPerformance,
  getYearlyPerformance,
  getStaffVisualizationData,
  getSelfVisualizationData,
  generateMonthlyStaffReportPDF
};
