// server/controllers/invoiceController.js

const InvoiceService = require("../services/invoiceService");
const Invoice        = require("../models/Invoice");
const planService    = require("../services/planService");
const { generatePresignedUrl } = require("../services/awsService");

/**
 * POST /api/invoices/create
 * Full end‑to‑end: record invoice, generate PDF, upload to S3, email it,
 * and return a download URL.
 *
 * Expects JSON body:
 * {
 *   companyId:     String,
 *   planId:        String,
 *   transactionId: String,
 *   paymentMethod: String,
 *   periodStart:   Date|string,
 *   periodEnd:     Date|string
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
      periodEnd,
      planName: overrideName,
      baseAmount: overrideBase,
      gstPercentage: overrideGst,
    } = req.body;

    // 1. Validate required fields
    if (
      !companyId ||
      !planId ||
      !transactionId ||
      !paymentMethod ||
      !periodStart ||
      !periodEnd
    ) {
      return res.status(400).json({
        error:
          "companyId, planId, transactionId, paymentMethod, periodStart, and periodEnd are all required.",
      });
    }

    // 2. Fetch Plan so we can default values if not overridden
    const plan = await planService.findById(planId);
    if (!plan) {
      console.error("[invoiceController] Plan not found:", planId);
      return res.status(404).json({ error: "Plan not found" });
    }

    // 3. Build parameters for invoice generation
    const params = {
      companyId,
      planId,
      planName:      overrideName ?? plan.name,
      baseAmount:    overrideBase ?? plan.price,
      gstPercentage: overrideGst ?? plan.gstPercentage,
      paymentMethod,
      transactionId,
      periodStart:   new Date(periodStart),
      periodEnd:     new Date(periodEnd),
    };

    // 4. Process invoice (record, PDF, upload, email)
    const { invoiceNumber, downloadUrl } = await InvoiceService.processInvoice(params);

    return res.status(201).json({
      message:        "Invoice created, uploaded, emailed, and ready to download.",
      invoiceNumber,
      downloadUrl,
    });
  } catch (err) {
    console.error("❌ createAndSendInvoice Error:", err);
    return next(err);
  }
}

/**
 * GET /api/invoices/:invoiceNumber/download
 * Retrieve a presigned S3 URL for downloading the invoice PDF.
 */
async function getInvoiceDownloadUrl(req, res, next) {
  try {
    const { invoiceNumber } = req.params;

    // 1. Lookup the invoice record
    const invoice = await Invoice.findOne({ invoiceNumber }).lean();
    if (!invoice) {
      console.error("[invoiceController] Invoice not found:", invoiceNumber);
      return res.status(404).json({ error: "Invoice not found." });
    }

    // 2. Ensure we have a PDF key
    if (!invoice.pdfKey) {
      console.error(
        "[invoiceController] Invoice exists but pdfKey is missing:",
        invoiceNumber
      );
      return res
        .status(400)
        .json({ error: "Invoice PDF is not yet uploaded." });
    }

    // 3. Generate and return a presigned download URL
    const downloadUrl = await generatePresignedUrl(invoice.pdfKey);
    return res.json({ invoiceNumber, downloadUrl });
  } catch (err) {
    console.error("❌ getInvoiceDownloadUrl Error:", err);
    return next(err);
  }
}

module.exports = {
  createAndSendInvoice,
  getInvoiceDownloadUrl,
};
