const leaveReportService = require("../../services/reportServices/leaveReportService");

/**
 * ✅ API: Fetch Monthly Leave Report (Multi-Tenant)
 */
exports.getMonthlyLeaveReport = async (req, res) => {
  try {
    const { year, month } = req.params;
    const companyId = req.user?.companyId?.toString();

    if (!companyId || !year || !month) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters (companyId, year, or month)."
      });
    }

    const report = await leaveReportService.getMonthlyLeaveReport(
      companyId,
      parseInt(year, 10),
      parseInt(month, 10)
    );

    return res.status(200).json({ success: true, report });
  } catch (error) {
    console.error("❌ Error in getMonthlyLeaveReport:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch monthly leave report."
    });
  }
};

/**
 * ✅ API: Fetch Yearly Leave Report (Multi-Tenant)
 */
exports.getYearlyLeaveReport = async (req, res) => {
  try {
    const { year } = req.params;
    const companyId = req.user?.companyId?.toString();

    if (!companyId || !year) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters (companyId or year)."
      });
    }

    const report = await leaveReportService.getYearlyLeaveReport(
      companyId,
      parseInt(year, 10)
    );

    return res.status(200).json({ success: true, report });
  } catch (error) {
    console.error("❌ Error in getYearlyLeaveReport:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch yearly leave report."
    });
  }
};

/**
 * ✅ API: Generate Yearly Leave Report PDF & Upload (Multi-Tenant)
 */
exports.generateYearlyLeaveReport = async (req, res) => {
  try {
    const { year } = req.params;
    const companyId = req.user?.companyId?.toString();

    if (!companyId || !year) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters (companyId or year)."
      });
    }

    const fileUrl = await leaveReportService.getOrGenerateYearlyLeaveReport(
      companyId,
      parseInt(year, 10)
    );

    return res.status(201).json({
      success: true,
      message: "Yearly leave report generated successfully.",
      fileUrl
    });
  } catch (error) {
    console.error("❌ Error in generateYearlyLeaveReport:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate yearly leave report."
    });
  }
};

/**
 * ✅ API: Cleanup Old Leave Reports (Multi-Tenant)
 */
exports.cleanupOldLeaveReports = async (req, res) => {
  try {
    const companyId = req.user?.companyId?.toString();

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Missing company context."
      });
    }

    const result = await leaveReportService.cleanupOldLeaveReports(companyId);

    return res.status(200).json({
      success: true,
      message: "Old leave reports cleaned up successfully.",
      ...result
    });
  } catch (error) {
    console.error("❌ Error in cleanupOldLeaveReports:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to clean up old leave reports."
    });
  }
};
