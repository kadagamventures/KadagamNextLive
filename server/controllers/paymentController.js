require("dotenv").config();
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const planService = require("../services/planService");
const razorpayService = require("../services/razorpayService");
const billingService = require("../services/billingService");

module.exports = {
  /**
   * POST /api/payment/create-order
   * Creates a Razorpay order or activates a free trial.
   */
  async createOrder(req, res) {
    console.log("▶️ [createOrder] user:", req.user, "body:", req.body);

    const { planId } = req.body;
    if (!planId) {
      return res.status(400).json({ error: "planId is required" });
    }

    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(401).json({ error: "Unauthorized: missing companyId in token" });
    }

    try {
      const plan = await planService.findById(planId);
      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }

      if (plan.isFreeTrial) {
        const subscription = await billingService.activateTrial(companyId, planId);

        // Optional: issue a token for free trial too
        const accessToken = jwt.sign({ companyId }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.cookie("accessToken", accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
          maxAge: 60 * 60 * 1000, // 1 hour
        });

        return res.status(200).json({
          trialActivated: true,
          subscription,
          accessToken,
        });
      }

      const order = await razorpayService.createOrder(companyId, planId, "INR", {
        companyId,
        planId,
      });

      return res.status(200).json({
        trialActivated: false,
        order,
      });
    } catch (err) {
      console.error("❌ createOrder Error:", err);
      return res.status(500).json({ error: err.message || "Something went wrong" });
    }
  },

  /**
   * POST /api/payment/capture
   * Captures a Razorpay payment, generates the invoice, emails it,
   * and updates the subscription.
   */
  async capturePayment(req, res) {
    const companyId = req.user?.companyId;
    if (!companyId) {
      console.error("❌ capturePayment: missing companyId in token");
      return res.status(401).json({ error: "Unauthorized: missing companyId in token" });
    }

    console.log("▶️ [capturePayment] req.body:", req.body);

    const razorpay_order_id = req.body.razorpay_order_id || req.body.order_id;
    const razorpay_payment_id = req.body.razorpay_payment_id || req.body.payment_id;
    const razorpay_signature = req.body.razorpay_signature;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error("❌ capturePayment missing params:", {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });
      return res.status(400).json({ error: "Missing required payment parameters" });
    }

    try {
      const { invoiceNumber, downloadUrl } = await razorpayService.handlePaymentSuccess({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });

      const subscription = await billingService.fetchStatus(companyId);

      // 🪙 Issue a fresh access token after payment
      const accessToken = jwt.sign({ companyId }, process.env.JWT_SECRET, { expiresIn: "1h" });

      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        maxAge: 60 * 60 * 1000,
      });

      return res.status(200).json({
        success: true,
        subscription,
        invoiceNumber,
        downloadUrl,
        accessToken,
      });
    } catch (err) {
      console.error("❌ capturePayment Error:", err);
      if (err.message.includes("Invalid Razorpay signature")) {
        return res.status(401).json({ error: err.message });
      }
      return res.status(500).json({ error: err.message || "Something went wrong" });
    }
  },

  /**
   * POST /api/payment/webhook
   * Handles Razorpay webhooks asynchronously.
   */
  async handleWebhook(req, res) {
    try {
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      const signature = req.headers["x-razorpay-signature"];
      const payload = JSON.stringify(req.body);

      const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");

      if (expected !== signature) {
        return res.status(400).send("Invalid signature");
      }

      const { event, payload: p } = req.body;
      if (event === "payment.captured" && p.payment?.entity) {
        const payment = p.payment.entity;
        await razorpayService.handlePaymentSuccess({
          razorpay_order_id: payment.order_id,
          razorpay_payment_id: payment.id,
          razorpay_signature: signature,
        });
      }

      return res.status(200).send("OK");
    } catch (err) {
      console.error("❌ handleWebhook Error:", err);
      return res.status(500).send("Server error");
    }
  },

  /**
   * GET /api/payment/status
   * Returns current subscription and recent payment history.
   */
  async fetchStatus(req, res) {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ error: "Missing companyId in token." });
    }

    try {
      const statusInfo = await billingService.fetchStatus(companyId);
      return res.status(200).json(statusInfo);
    } catch (err) {
      console.error("❌ fetchStatus Error:", err);
      return res.status(500).json({ error: err.message || "Something went wrong" });
    }
  },
};
  