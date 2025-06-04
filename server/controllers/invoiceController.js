// server/controllers/invoiceController.js

const InvoiceService = require("../services/invoiceService");
const Company        = require("../models/Company");
const Plan           = require("../models/Plan");
const Invoice        = require("../models/Invoice");

/**
 * POST /api/invoices/create
 * Call after successful Razorpay payment webhook or manual invocation
 *
 * Expects body:
 * {
 *   companyId: String,
 *   planId: String,
 *   transactionId: String,
 *   paymentMethod: String,
 *   periodStart: Date|string,
 *   periodEnd: Date|string
 * }
 */
async function createAndSendInvoice(req, res, next) {
  try {
    const {
      companyId,
      planId,
      transactionId,
      paymentMethod,
      periodStart,
      periodEnd
    } = req.body;

    if (!companyId || !planId || !transactionId || !paymentMethod || !periodStart || !periodEnd) {
      return res.status(400).json({ error: "companyId, planId, transactionId, paymentMethod, periodStart, and periodEnd are all required." });
    }

    // 1) Fetch plan to get details
    const plan = await Plan.findById(planId).lean();
    if (!plan) {
      return res.status(404).json({ error: "Plan not found." });
    }

    const baseAmount    = plan.price;          // in currency units (e.g., INR)
    const gstPercentage = plan.gstPercentage;  // e.g., 18
    const planName      = plan.name;

    // 2) Create invoice record
    const invoice = await InvoiceService.createInvoice({
      companyId,
      planId,
      planName,
      baseAmount,
      gstPercentage,
      paymentMethod,
      transactionId,
      periodStart: new Date(periodStart),
      periodEnd:   new Date(periodEnd)
    });

    // 3) Fetch company details for PDF header
    const company = await Company.findById(companyId).lean();
    if (!company) {
      return res.status(404).json({ error: "Company not found." });
    }

    // 4) Generate PDF
    const pdfBuffer = await InvoiceService.generateInvoicePDF(invoice, company);

    // 5) Email PDF to tenant
    await InvoiceService.emailInvoice(invoice, company, pdfBuffer);

    return res.status(201).json({
      message:   "Invoice created and emailed.",
      invoiceId: invoice._id
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/invoices/:id/pdf
 * Download raw PDF for a given invoice
 */
async function downloadInvoicePDF(req, res, next) {
  try {
    const invoice = await Invoice.findById(req.params.id).lean();
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found." });
    }

    const company = await Company.findById(invoice.companyId).lean();
    if (!company) {
      return res.status(404).json({ error: "Company not found." });
    }

    const pdfBuffer = await InvoiceService.generateInvoicePDF(invoice, company);

    res.set({
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`
    });
    return res.send(pdfBuffer);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createAndSendInvoice,
  downloadInvoicePDF
};
