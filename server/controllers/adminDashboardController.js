const adminDashboardService = require("../services/adminDashboardService");

/**
 * ✅ Fetch Dashboard Overview (Total Projects, Staff, Tasks, etc.)
 * 🔒 Scoped by companyId
 */
const getDashboardOverview = async (req, res) => {
  try {
    const companyId = req.user.companyId?.toString();
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Missing companyId in user context",
      });
    }

    const overview = await adminDashboardService.getOverviewData(companyId);

    return res.status(200).json({
      success: true,
      data: {
        totalProjects: overview.totalProjects,
        totalStaff: overview.totalStaff,
        totalTasks: overview.totalTasks,
        completedTasks: overview.completedTasks,
        ongoingTasks: overview.ongoingTasks,
      },
    });
  } catch (error) {
    console.error("❌ Error in getDashboardOverview:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard overview.",
      error: error.message || "Internal Server Error",
    });
  }
};

/**
 * ✅ Fetch Dashboard Chart Data (Bar + Pie)
 * 🔒 Scoped by companyId
 */
const getDashboardCharts = async (req, res) => {
  try {
    const companyId = req.user.companyId?.toString();
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Missing companyId in user context",
      });
    }

    const chartData = await adminDashboardService.getChartData(companyId);

    return res.status(200).json({
      success: true,
      data: chartData,
    });
  } catch (error) {
    console.error("❌ Error in getDashboardCharts:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard charts.",
      error: error.message || "Internal Server Error",
    });
  }
};

module.exports = {
  getDashboardOverview,
  getDashboardCharts,
};
