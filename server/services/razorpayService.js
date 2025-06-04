// server/services/razorpayService.js

const Razorpay = require('razorpay');
const crypto = require('crypto');
const Plan = require('../models/Plan');

class RazorpayService {
  constructor() {
    const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error('Missing Razorpay credentials in environment variables');
    }
    this.client = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET
    });
  }

  /**
   * Create a new Razorpay order including GST.
   *
   * @param {String} companyId
   * @param {String} planId
   * @param {String} [currency='INR']
   * @returns {Object} {
   *   orderId,
   *   baseAmount,      // plan price in paise
   *   gstPercentage,   // e.g. 18
   *   gstAmount,       // calculated GST in paise
   *   totalAmount,     // base + gst in paise
   *   currency,
   *   receipt,
   *   status,
   *   createdAt
   * }
   */
  async createOrder(companyId, planId, currency = 'INR') {
    if (!companyId || !planId) {
      throw new Error('companyId and planId are required to create an order');
    }

    // Fetch plan to get price and GST
    const plan = await Plan.findById(planId).lean();
    if (!plan) {
      throw new Error(`Plan not found for ID ${planId}`);
    }

    const baseAmount = plan.price;                 // in paise
    const gstPercentage = plan.gstPercentage || 0; // default fallback
    const gstAmount = Math.round((baseAmount * gstPercentage) / 100);
    const totalAmount = baseAmount + gstAmount;

    const receipt = `rcpt_${companyId}_${planId}_${Date.now()}`;
    const options = {
      amount: totalAmount,
      currency,
      receipt,
      payment_capture: 1,
      notes: {
        companyId,
        planId,
        baseAmount,
        gstPercentage,
        gstAmount,
        totalAmount
      }
    };

    const order = await this.client.orders.create(options);
    return {
      orderId:     order.id,
      baseAmount,
      gstPercentage,
      gstAmount,
      totalAmount,
      currency:    order.currency,
      receipt:     order.receipt,
      status:      order.status,
      createdAt:   order.created_at
    };
  }

  /**
   * Verify the signature returned by Razorpay after payment.
   *
   * @param {Object} params
   * @param {String} params.razorpay_order_id
   * @param {String} params.razorpay_payment_id
   * @param {String} params.razorpay_signature
   * @returns {Boolean} true if valid, throws otherwise
   */
  verifySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error('Missing parameters for signature verification');
    }

    const { RAZORPAY_KEY_SECRET } = process.env;
    const generated = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generated !== razorpay_signature) {
      throw new Error('Invalid Razorpay signature');
    }
    return true;
  }
}

module.exports = new RazorpayService();
