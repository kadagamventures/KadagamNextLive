// src/services/paymentService.js

import { tokenRefreshInterceptor as axios } from "../utils/axiosInstance";

const paymentService = {
  /**
   * Fetch available subscription plans
   * GET /api/plan
   */
  getPlans: async () => {
    const { data } = await axios.get("/plan");
    return data;
  },

  /**
   * Create a Razorpay order or activate a free trial
   * POST /api/payment/create-order
   *
   * @param {Object} params
   * @param {string} params.planId
   */
  createOrder: async ({ planId }) => {
    if (!planId) {
      throw new Error("planId is required to create an order");
    }
    const { data } = await axios.post("/payment/create-order", { planId });
    return data;
  },

  /**
   * Verify Razorpay payment and capture subscription
   * POST /api/payment/capture
   *
   * @param {Object} params
   * @param {string} params.razorpay_order_id
   * @param {string} params.razorpay_payment_id
   * @param {string} params.razorpay_signature
   */
  capturePayment: async ({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  }) => {
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      throw new Error(
        "razorpay_order_id, razorpay_payment_id and razorpay_signature are required"
      );
    }
    const { data } = await axios.post("/payment/capture", {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });
    return data;
  },

  /**
   * Fetch current subscription status
   * GET /api/payment-status/status
   */
  fetchStatus: async () => {
    const { data } = await axios.get("/payment-status/status");
    return data;
  },

  /**
   * Extend subscription after successful offline payment (manual entry)
   * POST /api/payment-status/extend
   *
   * @param {Object} params
   * @param {string} params.planId
   * @param {string} params.transactionId
   * @param {string} params.method - e.g., "UPI", "Bank Transfer"
   *
   * @returns {Object} { success, invoiceNumber, downloadUrl }
   */
  extendSubscription: async ({ planId, transactionId, method }) => {
    if (!planId || !transactionId || !method) {
      throw new Error(
        "planId, transactionId and method are required to extend subscription"
      );
    }
    const { data } = await axios.post("/payment-status/extend", {
      planId,
      transactionId,
      method,
    });
    return data;
  },

  /**
   * Fetch payment history (optionally filtered by year)
   * GET /api/payment-status/history?year=YYYY
   *
   * @param {string} [year]
   * @returns {Array<{
   *   planName: string,
   *   baseAmount: number,
   *   gstAmount: number,
   *   totalAmount: number,
   *   paymentDate: string,
   *   invoiceNumber: string,
   *   downloadUrl: string | null
   * }>}`
   */
  fetchHistory: async (year) => {
    const url = year
      ? `/payment-status/history?year=${encodeURIComponent(year)}`
      : "/payment-status/history";
    const { data } = await axios.get(url);
    return data;
  },

  /**
   * Get a fresh presigned URL for an invoice
   * GET /api/invoices/:invoiceNumber/download
   *
   * @param {string} invoiceNumber
   * @returns {Promise<string>} downloadUrl
   */
  getInvoiceDownloadUrl: async (invoiceNumber) => {
    if (!invoiceNumber) {
      throw new Error("invoiceNumber is required to get download URL");
    }
    const { data } = await axios.get(
      `/invoices/${encodeURIComponent(invoiceNumber)}/download`
    );
    return data.downloadUrl;
  },

  /**
   * Download (open) a PDF invoice directly
   * — uses getInvoiceDownloadUrl under the hood
   *
   * @param {string} invoiceNumber
   */
  downloadInvoice: async (invoiceNumber) => {
    if (!invoiceNumber) {
      throw new Error("invoiceNumber is required to download an invoice");
    }
    const url = await paymentService.getInvoiceDownloadUrl(invoiceNumber);
    // Open in a new tab so the browser handles PDF display/download
    window.open(url, "_blank", "noopener");
  },
};

export default paymentService;
