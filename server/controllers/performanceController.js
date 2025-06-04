const asyncHandler = require("express-async-handler");
const performanceService = require("../services/performanceService");

// ✅ Staff: View Own Monthly Performance
const getMyMonthlyPerformance = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) {
    return res.status(400).json({ success: false, message: "Month and year are required." });
  }
  const performance = await performanceService.getMonthlyPerformance(req.user.id, year, month, req.user.companyId);
  res.status(performance ? 200 : 404).json({ success: !!performance, data: performance || "No data found." });
});

// ✅ Staff: View Own Yearly Performance
const getMyYearlyPerformance = asyncHandler(async (req, res) => {
  const { year } = req.query;
  if (!year) return res.status(400).json({ success: false, message: "Year is required." });

  const performance = await performanceService.getYearlyPerformance(req.user.id, year, req.user.companyId);
  res.status(performance ? 200 : 404).json({ success: !!performance, data: performance || "No data found." });
});

// ✅ Admin: View Specific Staff's Monthly Performance
const getMonthlyPerformanceByStaff = asyncHandler(async (req, res) => {
  const { staffId } = req.params;
  const { month, year } = req.query;
  if (!staffId || !month || !year) {
    return res.status(400).json({ success: false, message: "Staff ID, month, and year are required." });
  }

  const performance = await performanceService.getMonthlyPerformance(staffId, year, month, req.user.companyId);
  res.status(performance ? 200 : 404).json({ success: !!performance, data: performance || "No data found." });
});

// ✅ Admin: View Specific Staff's Yearly Performance
const getYearlyPerformanceByStaff = asyncHandler(async (req, res) => {
  const { staffId } = req.params;
  const { year } = req.query;
  if (!staffId || !year) {
    return res.status(400).json({ success: false, message: "Staff ID and year are required." });
  }

  const performance = await performanceService.getYearlyPerformance(staffId, year, req.user.companyId);
  res.status(performance ? 200 : 404).json({ success: !!performance, data: performance || "No data found." });
});

// ✅ Admin Dashboard Summary
const getLivePerformanceSummary = asyncHandler(async (req, res) => {
  try {
    const summary = await performanceService.getOverallStaffPerformance(req.user.companyId);
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    console.error("❌ Error fetching live performance summary:", error);
    res.status(500).json({ success: false, message: "Failed to fetch live performance summary." });
  }
});

// ✅ Visualization Graph Data
const getPerformanceVisualization = asyncHandler(async (req, res) => {
  try {
    const data = await performanceService.getStaffVisualizationData(req.user.companyId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("❌ Error fetching visualization data:", error);
    res.status(500).json({ success: false, message: "Failed to fetch visualization data." });
  }
});

// ✅ Generate Monthly Performance Report (PDF + Archive)
const generateMonthlyPerformanceReport = asyncHandler(async (req, res) => {
  const { year, month } = req.query;
  if (!year || !month) {
    return res.status(400).json({ success: false, message: "Year and month are required." });
  }

  try {
    const fileUrl = await performanceService.generateMonthlyStaffReportPDF(year, month, req.user.companyId);
    res.status(200).json({ success: true, downloadUrl: fileUrl });
  } catch (error) {
    console.error("❌ Error generating report:", error);
    res.status(500).json({ success: false, message: "Failed to generate monthly report." });
  }
});

// ✅ Detailed Performance by Staff ID (self or admin)
const getStaffPerformanceById = asyncHandler(async (req, res) => {
  const { staffId } = req.params;

  if (req.user.role === "staff" && req.user.id !== staffId) {
    return res.status(403).json({ success: false, message: "Unauthorized access" });
  }

  try {
    const data = await performanceService.getStaffPerformanceById(staffId, req.user.companyId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("❌ Error fetching staff performance:", error);
    res.status(500).json({ success: false, message: "Failed to fetch staff performance." });
  }
});

// ✅ Staff/Admin: Monthly by ObjectId
const getMonthlyPerformanceById = asyncHandler(async (req, res) => {
  const { staffId } = req.params;
  const { month, year } = req.query;

  if (!staffId || !month || !year) {
    return res.status(400).json({ success: false, message: "Staff ID, month, and year are required." });
  }

  if (req.user.role === "staff" && req.user.id !== staffId) {
    return res.status(403).json({ success: false, message: "Unauthorized access" });
  }

  try {
    const data = await performanceService.getMonthlyPerformanceById(staffId, year, month, req.user.companyId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("❌ Error fetching monthly staff performance:", error);
    res.status(500).json({ success: false, message: "Failed to fetch monthly staff performance." });
  }
});

// ✅ Admin: Monthly by Custom staffId (string ID)
const getMonthlyPerformanceByStaffIdCustom = asyncHandler(async (req, res) => {
  const { staffId } = req.params;
  const { month, year } = req.query;

  if (!staffId || !month || !year) {
    return res.status(400).json({ success: false, message: "Staff ID, month, and year are required." });
  }

  try {
    const data = await performanceService.getMonthlyPerformanceByStaffId(staffId, year, month, req.user.companyId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("❌ Error fetching staff performance by staffId:", error);
    res.status(500).json({ success: false, message: "Failed to fetch staff performance by staffId." });
  }
});

// ✅ Admin: Performance of All Staff (for dashboard/charts)
const getAllStaffPerformance = asyncHandler(async (req, res) => {
  const { year, month } = req.query;

  if (!year || !month) {
    return res.status(400).json({ success: false, message: "Year and month are required." });
  }

  try {
    const result = await performanceService.getAllStaffPerformance(year, month, req.user.companyId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("❌ Error fetching all staff performance:", error);
    res.status(500).json({ success: false, message: "Failed to fetch all staff performance." });
  }
});

module.exports = {
  getMyMonthlyPerformance,
  getMyYearlyPerformance,
  getMonthlyPerformanceByStaff,
  getYearlyPerformanceByStaff,
  getLivePerformanceSummary,
  getPerformanceVisualization,
  generateMonthlyPerformanceReport,
  getStaffPerformanceById,
  getMonthlyPerformanceById,
  getMonthlyPerformanceByStaffIdCustom,
  getAllStaffPerformance
};
