const overviewReportService = require("../../services/reportServices/overviewReportService");

/**
 * 📊 Get Overall Report (Supports Date Filtering)
 * - Scoped by companyId (multi-tenant)
 */
const getOverviewReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const companyId = req.user.companyId?.toString();

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Missing companyId in user context",
      });
    }

    // 🔍 Validate date inputs
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date range. Start date cannot be after end date.",
      });
    }

    const overviewData = await overviewReportService.getOverviewData(
      companyId,
      startDate,
      endDate
    );

    return res.status(200).json({ success: true, data: overviewData });
  } catch (error) {
    console.error("❌ Error in getOverviewReport:", error);
    next(error);
  }
};

/**
 * 📈 Get Dashboard Charts (Supports Date Filtering)
 * - Scoped by companyId (multi-tenant)
 */
const getOverviewCharts = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const companyId = req.user.companyId?.toString();

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Missing companyId in user context",
      });
    }

    const chartData = await overviewReportService.getChartData(
      companyId,
      startDate,
      endDate
    );

    return res.status(200).json({ success: true, data: chartData });
  } catch (error) {
    console.error("❌ Error in getOverviewCharts:", error);
    next(error);
  }
};

module.exports = {
  getOverviewReport,
  getOverviewCharts,
};
