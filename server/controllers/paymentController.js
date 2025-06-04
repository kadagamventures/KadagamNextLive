// server/controllers/paymentController.js

const planService       = require('../services/planService');
const razorpayService   = require('../services/razorpayService');
const billingService    = require('../services/billingService');
const InvoiceService    = require('../services/invoiceService');
const Company           = require('../models/Company');
const crypto            = require('crypto');

/**
 * PaymentController
 *
 * Routes:
 *  - POST   /api/payment/create-order     → createOrder
 *  - POST   /api/payment/capture          → capturePayment
 *  - POST   /api/payment/webhook          → handleWebhook
 *  - GET    /api/subscription/status      → fetchStatus
 */
module.exports = {
  /**
   * Create a Razorpay order or activate a free trial immediately.
   *
   * @body { planId: String }
   */
  async createOrder(req, res, next) {
    try {
      const { planId } = req.body;
      if (!planId) {
        return res.status(400).json({ error: 'planId is required' });
      }

      // 1️⃣ Look up the plan
      const plan = await planService.findById(planId);
      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      // 2️⃣ Free trial?
      if (plan.isFreeTrial) {
        const subscription = await billingService.activateTrial(
          req.user.companyId,
          planId
        );
        return res.status(200).json({
          trialActivated: true,
          subscription
        });
      }

      // 3️⃣ Otherwise, create a Razorpay order (amount & GST handled internally)
      const currency = plan.currency || 'INR';
      const order = await razorpayService.createOrder(
        req.user.companyId,
        planId,
        currency
      );

      return res.status(200).json({
        trialActivated: false,
        order
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Verify Razorpay signature, record the payment, generate & email invoice,
   * and update subscription.
   *
   * @body {
   *   razorpay_order_id: String,
   *   razorpay_payment_id: String,
   *   razorpay_signature: String,
   *   planId: String
   * }
   */
  async capturePayment(req, res, next) {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        planId
      } = req.body;

      // 1️⃣ Parameter validation
      if (
        !razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature ||
        !planId
      ) {
        return res.status(400).json({ error: 'Missing required payment parameters' });
      }

      // 2️⃣ Signature verification
      razorpayService.verifySignature({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      });

      // 3️⃣ Lookup plan to derive amount (and GST)
      const plan = await planService.findById(planId);
      if (!plan || plan.isFreeTrial) {
        return res.status(400).json({ error: 'Invalid plan for payment capture' });
      }

      // 4️⃣ Record payment & update subscription
      const subscription = await billingService.recordPayment(
        req.user.companyId,
        planId,
        {
          method:        'razorpay',
          transactionId: razorpay_payment_id,
          date:          new Date()
        }
      );

      // 5️⃣ Generate invoice record
      const company = await Company.findById(req.user.companyId).lean();
      const invoice = await InvoiceService.createInvoice({
        companyId:     req.user.companyId,
        planName:      plan.name,
        amount:        subscription.lastPaymentAmount,
        paymentMethod: 'razorpay',
        transactionId: razorpay_payment_id,
        periodStart:   subscription.startDate,
        periodEnd:     subscription.nextBillingDate
      });

      // 6️⃣ Generate PDF and email to tenant
      const pdfBuffer = await InvoiceService.generateInvoicePDF(invoice, company);
      await InvoiceService.emailInvoice(invoice, company, pdfBuffer);

      return res.status(200).json({
        success:      true,
        subscription,
        invoiceId:    invoice._id
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Handle Razorpay webhooks for asynchronous payment events.
   */
  async handleWebhook(req, res) {
    try {
      const secret    = process.env.RAZORPAY_WEBHOOK_SECRET;
      const signature = req.headers['x-razorpay-signature'];
      const payload   = JSON.stringify(req.body);

      // 1️⃣ Verify webhook signature
      const expected = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      if (expected !== signature) {
        return res.status(400).send('Invalid signature');
      }

      // 2️⃣ Handle supported events
      const { event, payload: p } = req.body;
      if (event === 'payment.captured' && p.payment && p.payment.entity) {
        const payment   = p.payment.entity;
        const companyId = payment.notes.companyId;
        const planId    = payment.notes.planId;

        if (companyId && planId) {
          // Record payment & update subscription
          const subscription = await billingService.recordPayment(
            companyId,
            planId,
            {
              method:        'razorpay',
              transactionId: payment.id,
              date:          new Date(payment.created_at * 1000)
            }
          );

          // Generate and email invoice
          const plan    = await planService.findById(planId);
          const company = await Company.findById(companyId).lean();
          const invoice = await InvoiceService.createInvoice({
            companyId,
            planName:      plan.name,
            amount:        subscription.lastPaymentAmount,
            paymentMethod: 'razorpay',
            transactionId: payment.id,
            periodStart:   subscription.startDate,
            periodEnd:     subscription.nextBillingDate
          });
          const pdfBuffer = await InvoiceService.generateInvoicePDF(invoice, company);
          await InvoiceService.emailInvoice(invoice, company, pdfBuffer);
        }
      }

      return res.status(200).send('OK');
    } catch (err) {
      console.error('Webhook handling error:', err);
      return res.status(500).send('Server error');
    }
  },

  /**
   * GET /api/subscription/status
   */
  async fetchStatus(req, res, next) {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(400).json({ error: 'Missing companyId in token.' });
      }
      const statusInfo = await billingService.fetchStatus(companyId);
      res.status(200).json(statusInfo);
    } catch (err) {
      next(err);
    }
  }
};
