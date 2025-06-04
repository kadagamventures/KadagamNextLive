const redisClient               = require("../../config/redisConfig");
const attendanceReportService   = require("../../services/reportServices/attendanceReportService");
const taskReportService         = require("../../services/reportServices/taskReportService");
const performanceService        = require("../../services/performanceService");
const projectService            = require("../../services/projectService");

const CACHE_EXPIRATION = 60 * 5;

/**
 * 🔧 Normalize companyId to string
 */
const normalizeCompanyId = (cid) => cid?.toString();

/**
 * ===================== 👤 STAFF SELF-PERFORMANCE REPORTS =====================
 */
exports.getSelfMonthlyPerformance = async (req, res) => {
  try {
    const year    = parseInt(req.query.year, 10);
    const month   = parseInt(req.query.month, 10);
    const staffId = req.user.id;
    const companyId = normalizeCompanyId(req.user.companyId);

    if (isNaN(year) || isNaN(month)) {
      return res.status(400).json({ message: "Year and Month are required and must be numbers." });
    }

    const cacheKey = `monthlyReport:${companyId}:${staffId}:${year}:${month}`;
    const cached   = await redisClient.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const attendanceSummary   = await attendanceReportService.getMonthlyAttendanceSummary(staffId, year, month, companyId);
    const taskSummary         = await taskReportService.getMonthlyTaskSummary(staffId, year, month, companyId);
    const projectInvolvement  = await projectService.getProjectInvolvementForStaff(staffId, year, month, companyId);

    const performanceScore = performanceService.calculatePerformanceScore({
      attendancePercentage:    attendanceSummary.attendancePercentage,
      totalTasks:              taskSummary.totalTasks,
      completedTasks:          taskSummary.completedTasks,
      taskComplexitySummary:   taskSummary.taskComplexitySummary,
    });

    const reportData = {
      year,
      month,
      attendanceSummary,
      taskSummary,
      projectInvolvement,
      totalLeaves:       attendanceSummary.totalLeaves,
      performanceScore,
    };

    await redisClient.set(cacheKey, JSON.stringify(reportData), "EX", CACHE_EXPIRATION);
    return res.status(200).json(reportData);

  } catch (error) {
    console.error("❌ Monthly report error:", error);
    return res.status(500).json({ message: "Failed to fetch monthly report.", error: error.message });
  }
};

exports.getSelfYearlyPerformance = async (req, res) => {
  try {
    const year    = parseInt(req.query.year, 10);
    const staffId = req.user.id;
    const companyId = normalizeCompanyId(req.user.companyId);

    if (isNaN(year)) {
      return res.status(400).json({ message: "Year is required and must be a number." });
    }

    const cacheKey = `yearlyReport:${companyId}:${staffId}:${year}`;
    const cached   = await redisClient.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const attendanceSummary   = await attendanceReportService.getYearlyAttendanceSummary(staffId, year, companyId);
    const taskSummary         = await taskReportService.getYearlyTaskSummary(staffId, year, companyId);
    const projectInvolvement  = await projectService.getYearlyProjectInvolvement(staffId, year, companyId);

    const performanceScore = performanceService.calculatePerformanceScore({
      attendancePercentage:    attendanceSummary.attendancePercentage,
      totalTasks:              taskSummary.totalTasks,
      completedTasks:          taskSummary.completedTasks,
      taskComplexitySummary:   taskSummary.taskComplexitySummary,
    });

    const reportData = {
      year,
      attendanceSummary,
      taskSummary,
      projectInvolvement,
      totalLeaves:       attendanceSummary.totalLeaves,
      performanceScore,
    };

    await redisClient.set(cacheKey, JSON.stringify(reportData), "EX", CACHE_EXPIRATION);
    return res.status(200).json(reportData);

  } catch (error) {
    console.error("❌ Yearly report error:", error);
    return res.status(500).json({ message: "Failed to fetch yearly report.", error: error.message });
  }
};

/**
 * ===================== 🏢 ADMIN DASHBOARD REPORTS =====================
 */
exports.getStaffPerformanceOverview = async (req, res) => {
  try {
    const companyId = normalizeCompanyId(req.user.companyId);
    const overview  = await performanceService.getOverallStaffPerformance(companyId);
    return res.status(200).json({ success: true, data: overview });
  } catch (error) {
    console.error("❌ Staff performance overview error:", error);
    return res.status(500).json({ message: "Failed to fetch staff performance overview.", error: error.message });
  }
};

exports.getSpecificStaffPerformance = async (req, res) => {
  try {
    const staffId  = req.params.staffId;
    const companyId = normalizeCompanyId(req.user.companyId);

    if (!staffId) {
      return res.status(400).json({ message: "Staff ID is required." });
    }

    const performance = await performanceService.getStaffPerformanceById(staffId, companyId);
    return res.status(200).json({ success: true, data: performance });
  } catch (error) {
    console.error("❌ Specific staff performance error:", error);
    return res.status(500).json({ message: "Failed to fetch staff performance.", error: error.message });
  }
};

exports.downloadStaffMonthlyReport = async (req, res) => {
  try {
    const year    = parseInt(req.query.year, 10);
    const month   = parseInt(req.query.month, 10);
    const companyId = normalizeCompanyId(req.user.companyId);

    if (isNaN(year) || isNaN(month)) {
      return res.status(400).json({ message: "Year and Month are required and must be numbers." });
    }

    const fileUrl = await performanceService.generateMonthlyStaffReportPDF(year, month, companyId);
    return res.status(200).json({ success: true, downloadUrl: fileUrl });
  } catch (error) {
    console.error("❌ Download monthly staff report error:", error);
    return res.status(500).json({ message: "Failed to download staff report.", error: error.message });
  }
};

/**
 * ===================== 📊 DATA VISUALIZATION =====================
 */
exports.getStaffVisualizationData = async (req, res) => {
  try {
    const companyId = normalizeCompanyId(req.user.companyId);
    const data      = await performanceService.getStaffVisualizationData(companyId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("❌ Visualization error (admin):", error);
    return res.status(500).json({ message: "Failed to fetch visualization data.", error: error.message });
  }
};

exports.getSelfVisualizationData = async (req, res) => {
  try {
    const staffId   = req.user.id;
    const companyId = normalizeCompanyId(req.user.companyId);
    const data      = await performanceService.getSelfVisualizationData(staffId, companyId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("❌ Visualization error (self):", error);
    return res.status(500).json({ message: "Failed to fetch self visualization data.", error: error.message });
  }
};
