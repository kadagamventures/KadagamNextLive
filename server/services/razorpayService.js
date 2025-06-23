require("dotenv").config();
const Razorpay       = require("razorpay");
const crypto         = require("crypto");
const Plan           = require("../models/Plan");
const Company        = require("../models/Company");
const InvoiceService = require("./invoiceService");

class RazorpayService {
  constructor() {
    const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error("Missing Razorpay credentials");
    }
    this.client = new Razorpay({
      key_id:     RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });
  }

  async createOrder(companyId, planId, currency = "INR", notesOverride = {}) {
    if (!companyId || !planId) {
      throw new Error("createOrder: companyId and planId are required");
    }

    const plan = await Plan.findById(planId).lean();
    if (!plan) {
      console.error("[RazorpayService] Plan not found:", planId);
      throw new Error(`Plan not found for ID ${planId}`);
    }

    const baseRupees = plan.price;
    const gstPercent = plan.gstPercentage || 0;

    const basePaise  = Math.round(baseRupees * 100);
    const gstPaise   = Math.round(basePaise * (gstPercent / 100));
    const totalPaise = basePaise + gstPaise;

    const planSuffix = planId.slice(-6);
    const timeSuffix = Date.now().toString().slice(-8);
    const receipt    = `rcpt_${companyId}_${planSuffix}_${timeSuffix}`;

    // ⚠️ All values stored in notes as strings to avoid downstream type errors
    const notes = {
      companyId:      String(companyId),
      planId:         String(planId),
      baseAmount:     baseRupees.toFixed(2),
      gstPercentage:  gstPercent.toString(),
      gstAmount:      (gstPaise / 100).toFixed(2),
      totalAmount:    (totalPaise / 100).toFixed(2),
      ...notesOverride,
    };

    const order = await this.client.orders.create({
      amount:          totalPaise,
      currency,
      receipt,
      payment_capture: 1,
      notes,
    });

    return {
      orderId:       order.id,
      amount:        order.amount,
      currency:      order.currency,
      receipt:       order.receipt,
      status:        order.status,
      createdAt:     order.created_at,
      baseAmount:    parseFloat(notes.baseAmount),
      gstPercentage: parseFloat(notes.gstPercentage),
      gstAmount:     parseFloat(notes.gstAmount),
      totalAmount:   parseFloat(notes.totalAmount),
    };
  }

  verifySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error("verifySignature: Missing parameters");
    }
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(payload)
      .digest("hex");
    if (expected !== razorpay_signature) {
      throw new Error("Invalid Razorpay signature");
    }
    return true;
  }

  async handlePaymentSuccess({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  }) {
    // 1️⃣ Verify signature
    this.verifySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature });

    // 2️⃣ Fetch order & notes
    const order = await this.client.orders.fetch(razorpay_order_id);
    const {
      companyId,
      planId,
      baseAmount,
      gstPercentage,
      gstAmount,
      totalAmount,
    } = order.notes;

    // Parse numeric values
    const parsedBaseAmount    = parseFloat(baseAmount);
    const parsedGstPercentage = parseFloat(gstPercentage);
    const parsedGstAmount     = parseFloat(gstAmount);
    const parsedTotalAmount   = parseFloat(totalAmount);

    // 3️⃣ Load plan & company (skip soft-deleted)
    const [plan, company] = await Promise.all([
      Plan.findById(planId),
      Company.findOne({ _id: companyId, isDeleted: false }),
    ]);
    if (!plan)    throw new Error("Plan not found in payment notes");
    if (!company) throw new Error("Company not found in payment notes");

    // 4️⃣ Compute duration in days
    let planDurationDays = 0;
    switch (plan.duration.unit) {
      case "days":   planDurationDays = plan.duration.value; break;
      case "months": planDurationDays = plan.duration.value * 30; break;
      case "years":  planDurationDays = plan.duration.value * 365; break;
    }

    // 5️⃣ Push temporary history entry
    const tempEntry = {
      planId,
      planName:      plan.name,
      planDuration:  planDurationDays,
      planPrice:     parsedBaseAmount,
      gstAmount:     parsedGstAmount,
      totalAmount:   parsedTotalAmount,
      invoiceKey:    `temp_${Date.now()}.pdf`,
      amount:        parsedTotalAmount,
      date:          new Date(),
      method:        "razorpay",
      transactionId: razorpay_payment_id,
      status:        "success",
    };
    company.subscription.paymentHistory.push(tempEntry);
    await company.save(); // triggers pre-save

    // 6️⃣ Prepare billing-period (with fallbacks)
    let periodStart = company.subscription.startDate;
    let periodEnd   = company.subscription.nextBillingDate;

    // Debug-log billing dates
    console.log("▶️ Billing-period:", {
      startDate: periodStart,
      nextBillingDate: periodEnd,
    });

    // Fallbacks if missing
    if (!periodStart) {
      periodStart = new Date();
      periodEnd   = new Date(periodStart.getTime() + planDurationDays * 24*60*60*1000);
    } else if (!periodEnd) {
      periodEnd = new Date(periodStart.getTime() + planDurationDays * 24*60*60*1000);
    }

    // 7️⃣ Generate & email real invoice
    const { invoiceNumber, pdfKey, downloadUrl } = await InvoiceService.processInvoice({
      companyId,
      planId,
      planName:       plan.name,
      baseAmount:     parsedBaseAmount,
      gstPercentage:  parsedGstPercentage,
      paymentMethod:  "razorpay",
      transactionId:  razorpay_payment_id,
      periodStart,
      periodEnd,
    });

    // 8️⃣ Patch real invoiceKey into history
    const history   = company.subscription.paymentHistory;
    const lastEntry = history[history.length - 1];
    if (lastEntry) {
      lastEntry.invoiceKey = pdfKey;
      await company.save();
    }

    return { invoiceNumber, downloadUrl };
  }
}

module.exports = new RazorpayService();
