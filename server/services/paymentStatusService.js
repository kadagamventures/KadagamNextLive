// server/services/paymentStatusService.js

const Company = require("../models/Company");
const Plan    = require("../models/Plan");
const Invoice = require("../models/Invoice");
const { generatePresignedUrl } = require("../services/awsService");

class PaymentStatusService {
  /**
   * Fetch current subscription status for dashboard
   */
  async getStatus(companyId) {
    const company = await Company.findOne({ _id: companyId, isDeleted: false }).lean();
    if (!company) throw new Error("Company not found");

    const now = new Date();
    const payments = (company.subscription.paymentHistory || [])
      .filter(p => p.status === "success" && new Date(p.date) <= now);

    if (payments.length === 0) {
      return {
        planPackage:      "-",
        lastPaymentDate:  "-",
        nextPaymentDate:  "-",
        daysRemaining:    0,
        status:           "inactive",
      };
    }

    // Build plan lookup
    const planIds = [...new Set(payments.map(p => String(p.planId)))];
    const plans   = await Plan.find({ _id: { $in: planIds } }).lean();
    const planMap = Object.fromEntries(plans.map(p => [String(p._id), p]));

    // Total days of active subscription across payment history
    let totalDays = 0;
    for (const p of payments) {
      const plan = planMap[String(p.planId)];
      if (!plan) continue;
      switch (plan.duration.unit) {
        case "days":   totalDays += plan.duration.value;        break;
        case "months": totalDays += plan.duration.value * 30;   break;
        case "years":  totalDays += plan.duration.value * 365;  break;
      }
    }

    // Most recent payment
    payments.sort((a, b) => new Date(b.date) - new Date(a.date));
    const last       = payments[0];
    const lastDate   = new Date(last.date);
    const nextDate   = new Date(lastDate.getTime() + totalDays * 86400000);
    const daysRemain = Math.max(0, Math.ceil((nextDate - now) / 86400000));
    const activePlan = planMap[String(last.planId)];

    const fmt = d => new Intl.DateTimeFormat("en-GB").format(new Date(d));

    return {
      planPackage:     activePlan
        ? `₹${activePlan.price} / ${activePlan.duration.value} ${activePlan.duration.unit}`
        : "-",
      lastPaymentDate: fmt(lastDate),
      nextPaymentDate: fmt(nextDate),
      daysRemaining:   daysRemain,
      status:          daysRemain > 0 ? "active" : "expired",
    };
  }

  /**
   * Extend subscription (e.g. offline/manual payment)
   */
  async extendSubscription(companyId, planId, paymentInfo) {
    const [company, plan] = await Promise.all([
      Company.findOne({ _id: companyId, isDeleted: false }),
      Plan.findById(planId),
    ]);
    if (!company || !plan) throw new Error("Company or plan not found");

    const now   = paymentInfo.date ? new Date(paymentInfo.date) : new Date();
    const start = company.subscription.nextBillingDate && new Date(company.subscription.nextBillingDate) > now
      ? new Date(company.subscription.nextBillingDate)
      : now;

    // Compute next billing date
    const next = new Date(start);
    switch (plan.duration.unit) {
      case "days":   next.setDate(next.getDate()    + plan.duration.value); break;
      case "months": next.setMonth(next.getMonth()  + plan.duration.value); break;
      case "years":  next.setFullYear(next.getFullYear() + plan.duration.value); break;
    }

    // Compute amounts
    const gstAmount   = +(plan.price * plan.gstPercentage / 100).toFixed(2);
    const totalAmount = +(plan.price + gstAmount).toFixed(2);

    const entry = {
      planId:        plan._id,
      planName:      plan.name,
      baseAmount:    plan.price,
      gstAmount,
      totalAmount,
      date:          now,
      method:        paymentInfo.method       || "card",
      transactionId: paymentInfo.transactionId|| null,
      status:        paymentInfo.status       || "success",
      invoiceId:     paymentInfo.invoiceId    || null,
    };

    // Update subscription object
    company.subscription.paymentHistory.push(entry);
    company.subscription.status          = plan.isFreeTrial ? "trial" : "active";
    company.subscription.planId          = plan._id;
    company.subscription.startDate       = start;
    company.subscription.nextBillingDate = next;
    company.subscription.lastPaymentAmount = totalAmount;

    await company.save();
    return { startDate: start, nextBillingDate: next, latestEntry: entry };
  }

  /**
   * Fetch all payment history (for the table), returning fresh presigned URLs
   */
  async getHistory(companyId, year) {
    const company = await Company.findOne({ _id: companyId, isDeleted: false }).lean();
    if (!company) throw new Error("Company not found");

    let history = (company.subscription.paymentHistory || [])
      .filter(h => h.status === "success");

    if (year) {
      history = history.filter(h => new Date(h.date).getFullYear() === Number(year));
    }

    // Sort descending by date
    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Load plan details
    const planIds = [...new Set(history.map(h => String(h.planId)))];
    const plans   = await Plan.find({ _id: { $in: planIds } }).lean();
    const planMap = Object.fromEntries(plans.map(p => [String(p._id), p]));

    const rows = await Promise.all(history.map(async entry => {
      const plan = planMap[String(entry.planId)] || {};
      const baseAmount = entry.baseAmount ?? plan.price ?? 0;
      const gstAmount  = entry.gstAmount   ??
                         +(baseAmount * (entry.gstPercentage || 0) / 100).toFixed(2);
      const totalAmount= entry.totalAmount ?? +(baseAmount + gstAmount).toFixed(2);

      // Determine invoice record
      let inv = null;
      if (entry.invoiceId) {
        inv = await Invoice.findOne({ invoiceNumber: entry.invoiceId }).lean();
      } else if (entry.transactionId) {
        inv = await Invoice.findOne({ transactionId: entry.transactionId }).lean();
      }

      // Always generate fresh URL if we have a pdfKey
      let downloadUrl = null;
      if (inv?.pdfKey) {
        downloadUrl = await generatePresignedUrl(inv.pdfKey);
      }

      return {
        planName:    plan.name || entry.planName || "—",
        baseAmount,
        gstAmount,
        totalAmount,
        paymentDate: entry.date,
        invoiceNumber: inv?.invoiceNumber || null,
        downloadUrl,
      };
    }));

    return rows;
  }
}

module.exports = new PaymentStatusService();
