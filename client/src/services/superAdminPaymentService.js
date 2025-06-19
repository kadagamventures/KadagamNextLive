// src/services/superAdminPaymentService.js

import { tokenRefreshInterceptor as axios } from "../utils/axiosInstance";

/**
 * Super‑Admin Payment Service
 */
const superAdminPaymentService = {
  /**
   * 🧾 GET /super-admin/companies/:companyId/payments?year=YYYY
   */
  fetchCompanyHistory: async (companyId, year) => {
    if (!companyId) throw new Error("companyId is required");
    const qs  = year ? `?year=${encodeURIComponent(year)}` : "";
    const url = `/super-admin/companies/${companyId}/payments${qs}`;
    const { data } = await axios.get(url);
    return data;
  },

  /**
   * 📄 GET /super-admin/companies/:companyId/payments/:invoiceId/pdf
   *
   * Opens a new tab at the full backend URL, so you don’t hit React’s 404.
   */
  downloadCompanyInvoice: (companyId, invoiceId) => {
    if (!companyId || !invoiceId) {
      throw new Error("Both companyId and invoiceId are required to download an invoice.");
    }
    const encoded = encodeURIComponent(invoiceId);
    const path    = `/super-admin/companies/${companyId}/payments/${encoded}/pdf`;

    // axios.defaults.baseURL is e.g. "http://localhost:5000/api"
    const fullUrl = axios.defaults.baseURL.replace(/\/$/, "") + path;

    window.open(fullUrl, "_blank", "noopener");
  },
};

export default superAdminPaymentService;
