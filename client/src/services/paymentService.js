// src/services/paymentService.js

import { tokenRefreshInterceptor as axios } from "../utils/axiosInstance";

const paymentService = {
  /**
   * Fetch available plans from the Plan API
   * GET /api/plan
   */
  getPlans: async () => {
    const response = await axios.get("/plan");
    return response.data;
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
    const response = await axios.post("/payment/create-order", { planId });
    return response.data;
  },

  /**
   * Verify Razorpay payment and capture subscription
   * POST /api/payment/capture
   *
   * @param {Object} params
   * @param {string} params.razorpay_order_id
   * @param {string} params.razorpay_payment_id
   * @param {string} params.razorpay_signature
   * @param {string} params.planId
   * @param {number} [params.amount]
   */
  capturePayment: async ({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    planId,
    amount
  }) => {
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !planId
    ) {
      throw new Error("All payment parameters are required to capture payment");
    }

    const payload = {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId
    };

    if (typeof amount === "number") {
      payload.amount = amount;
    }

    const response = await axios.post("/payment/capture", payload);
    return response.data;
  }
};

export default paymentService;
