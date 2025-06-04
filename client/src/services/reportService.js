import { tokenRefreshInterceptor as axios } from "../utils/axiosInstance";


/**
 * 📄 Generate Report from Backend
 * 
 * @param {Object} payload - Report generation input
 * @param {string} payload.type - "attendance", "task", "project", "staff", "individual"
 * @param {string} payload.month - "01" to "12" (omit or null for yearly/individual logic)
 * @param {string|number} payload.year - Four-digit year (e.g. 2024)
 * @param {string} [payload.staffId] - Required only for individual reports
 * 
 * @returns {Promise<Object>} { url, fallback, message }
 */
export const generateReport = async ({ type, month, year, staffId }) => {
  try {
    const response = await axios.post("/reports/generate", {
      type,
      month,
      year,
      staffId,
    });

    return {
      success: true,
      url: response.data.url,
      fallback: response.data.fallback,
      message: response.data.message,
    };
  } catch (error) {
    console.error("❌ Failed to generate report:", error);

    return {
      success: false,
      message:
        error?.response?.data?.message || "Failed to generate report. Please try again.",
    };
  }
};
 