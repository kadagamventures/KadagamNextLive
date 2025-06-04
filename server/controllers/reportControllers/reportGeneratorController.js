const {
  generateAndStoreReport,
  tryFindMonthlyReport,
  tryFindYearlyFallback,
} = require('../../services/reportServices/reportGeneratorService');
const awsService = require('../../services/awsService');

/**
 * 🔄 Generic controller factory for any report type (multi-tenant support)
 */
const handleGenerate = (type) => {
  return async (req, res) => {
    try {
      const { month, year } = req.body;
      const companyId       = req.user?.companyId?.toString();

      // 🔐 Ensure companyId is available
      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: "Missing companyId for tenant isolation."
        });
      }

      // ✅ Validate month and year input
      const m = parseInt(month, 10), y = parseInt(year, 10);
      if (
        isNaN(m) || m < 1 || m > 12 ||
        isNaN(y) || String(y).length !== 4
      ) {
        return res.status(400).json({
          success: false,
          message: '❌ Invalid or missing month/year. Expected format: { month: "04", year: "2025" }',
        });
      }

      console.log(`📄 [${type.toUpperCase()}] Report request for ${companyId}: ${m}-${y}`);

      // 1️⃣ Check if monthly report already exists
      const existing = await tryFindMonthlyReport({ type, month: m, year: y, companyId });

      if (existing?.fileUrl) {
        const s3Key   = decodeURIComponent(new URL(existing.fileUrl).pathname.slice(1));
        const freshUrl = await awsService.generatePresignedUrl(s3Key);

        console.log(`✅ Monthly report already exists for ${type}: ${m}-${y}`);
        return res.status(200).json({
          success: true,
          downloadUrl: freshUrl,
          fallback: false,
          message: 'Monthly report found.',
        });
      }

      // 2️⃣ Fallback: check if a yearly summary exists
      const fallback = await tryFindYearlyFallback({ type, year: y, companyId });

      if (fallback?.fileUrl) {
        const fallbackKey = decodeURIComponent(new URL(fallback.fileUrl).pathname.slice(1));
        const fallbackUrl = await awsService.generatePresignedUrl(fallbackKey);

        console.log(`⚠️ Monthly report missing. Returning fallback yearly summary for ${type}-${y}`);
        return res.status(200).json({
          success: true,
          downloadUrl: fallbackUrl,
          fallback: true,
          message: 'Monthly report not found. Returning yearly summary.',
        });
      }

      // 3️⃣ No file found, generate new one
      const s3Url = await generateAndStoreReport({ type, month: m, year: y, companyId });

      console.log(`📤 Report generated and stored for ${type}: ${m}-${y}`);
      return res.status(201).json({
        success: true,
        downloadUrl: s3Url,
        fallback: false,
        message: 'Report generated successfully.',
      });

    } catch (err) {
      console.error(`❌ Error generating ${type} report:`, err.stack || err);
      return res.status(500).json({
        success: false,
        message: `Failed to generate ${type} report.`,
      });
    }
  };
};

// 🎯 Exports: each function is pre-bound with its report type
exports.generateAttendanceReport = handleGenerate('attendance');
exports.generateTaskReport       = handleGenerate('task');
exports.generateProjectReport    = handleGenerate('project');
exports.generateStaffReport      = handleGenerate('staff');
exports.generateLeaveReport      = handleGenerate('leave');
