// server/controllers/paymentStatusController.js

const paymentStatusService = require("../services/paymentStatusService");
const invoiceService       = require("../services/invoiceService");
const Company              = require("../models/Company");
const Plan                 = require("../models/Plan");
const Invoice              = require("../models/Invoice");
const { generatePresignedUrl } = require("../services/awsService");

module.exports = {
  /**
   * GET /api/payment-status/status
   */
  async fetchStatus(req, res, next) {
    try {
      const companyId = req.user.companyId;
      const status    = await paymentStatusService.getStatus(companyId);
      return res.json(status);
    } catch (err) {
      console.error("[paymentStatusController] fetchStatus Error:", err);
      return next(err);
    }
  },

  /**
   * POST /api/payment-status/extend
   * Body: { planId, transactionId, method }
   */
  async extendSubscription(req, res, next) {
    try {
      const companyId = req.user.companyId;
      const { planId, transactionId, method } = req.body;

      if (!planId || !transactionId || !method) {
        return res.status(400).json({
          message: "planId, transactionId and method are required",
        });
      }

      // 1) Extend the subscription record
      const { startDate, nextBillingDate, latestEntry } =
        await paymentStatusService.extendSubscription(companyId, planId, {
          transactionId,
          method,
          date: new Date(),
        });

      // 2) Fetch plan details
      const plan = await Plan.findById(planId).lean();
      if (!plan) {
        console.error("[paymentStatusController] Plan not found:", planId);
        return res.status(404).json({ message: "Plan not found" });
      }

      // 3) Generate invoice PDF and upload
      //    processInvoice now returns { invoiceNumber, pdfKey }
      const { invoiceNumber, pdfKey } = await invoiceService.processInvoice({
        companyId,
        planId,
        planName:      plan.name,
        baseAmount:    plan.price,
        gstPercentage: plan.gstPercentage,
        paymentMethod: method,
        transactionId,
        periodStart:   startDate,
        periodEnd:     nextBillingDate,
      });

      // 4) Generate a fresh presigned URL for download
      const downloadUrl = await generatePresignedUrl(pdfKey);

      // 5) Patch invoiceNumber back into paymentHistory
      const company = await Company.findOne({ _id: companyId, isDeleted: false });
      if (company) {
        const entry = company.subscription.paymentHistory.find(e =>
          e.transactionId === transactionId &&
          new Date(e.date).getTime() === new Date(latestEntry.date).getTime()
        );
        if (entry) {
          entry.invoiceId = invoiceNumber;
          await company.save();
        }
      } else {
        console.warn("[paymentStatusController] Company not found when patching invoice:", companyId);
      }

      return res.json({
        success:       true,
        invoiceNumber,
        downloadUrl,
      });
    } catch (err) {
      console.error("[paymentStatusController] extendSubscription Error:", err);
      return next(err);
    }
  },

  /**
   * GET /api/payment-status/history?year=YYYY
   */
  async fetchHistory(req, res, next) {
    try {
      const companyId = req.user.companyId;
      const year      = req.query.year;
      const history   = await paymentStatusService.getHistory(companyId, year);
      return res.json(history);
    } catch (err) {
      console.error("[paymentStatusController] fetchHistory Error:", err);
      return next(err);
    }
  },

  /**
   * GET /api/payment-status/invoice/:invoiceId/pdf
   */
  async downloadInvoicePDF(req, res, next) {
    try {
      const invoiceId = req.params.invoiceId;

      // Lookup invoice record
      const inv = await Invoice.findOne({ invoiceNumber: invoiceId }).lean();
      if (!inv) {
        console.error("[paymentStatusController] Invoice not found:", invoiceId);
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Lookup company
      const company = await Company.findOne({ _id: inv.companyId, isDeleted: false }).lean();
      if (!company) {
        console.error("[paymentStatusController] Company not found for invoice PDF:", inv.companyId);
        return res.status(404).json({ message: "Company not found" });
      }

      // Generate PDF buffer on the fly
      const buffer = await invoiceService.generateInvoicePDF(inv, company);

      return res
        .status(200)
        .set({
          "Content-Type":        "application/pdf",
          "Content-Disposition": `attachment; filename="${inv.invoiceNumber}.pdf"`,
        })
        .send(buffer);
    } catch (err) {
      console.error("[paymentStatusController] downloadInvoicePDF Error:", err);
      return next(err);
    }
  },
};
