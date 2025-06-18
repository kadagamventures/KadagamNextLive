// server/services/invoiceService.js

require("dotenv").config();
const Invoice = require("../models/Invoice");
const Company = require("../models/Company");
const PDFDocument = require("pdfkit");
const { PassThrough } = require("stream");
const EmailService = require("./emailService");
const { uploadInvoicePdf, generatePresignedUrl } = require("../services/awsService");

class InvoiceService {
  static async generateInvoiceNumber() {
    const lastInvoice = await Invoice.findOne().sort({ createdAt: -1 }).lean();
    let lastNumber = 0;

    if (lastInvoice?.invoiceNumber) {
      const match = lastInvoice.invoiceNumber.match(/INV-(\d+)/);
      if (match) lastNumber = parseInt(match[1], 10);
    }

    return `INV-${String(lastNumber + 1).padStart(4, "0")}`;
  }

  static async createInvoiceRecord({
    companyId,
    planId,
    planName,
    baseAmount,
    gstPercentage,
    paymentMethod,
    transactionId,
    periodStart,
    periodEnd,
  }) {
    const gstAmount = +(baseAmount * gstPercentage / 100).toFixed(2);
    const totalAmount = +(baseAmount + gstAmount).toFixed(2);
    const invoiceNumber = await this.generateInvoiceNumber();

    return new Invoice({
      companyId,
      planId,
      planName,
      baseAmount,
      gstPercentage,
      gstAmount,
      totalAmount,
      paymentMethod,
      transactionId,
      status: "paid",
      periodStart,
      periodEnd,
      invoiceNumber,
      invoiceDate: new Date(),
    });
  }

  static async generateInvoicePDF(invoice, company) {
    const BILLER_NAME    = process.env.BILLER_NAME    || "KadagamNext Pvt. Ltd.";
    const BILLER_ADDRESS = process.env.BILLER_ADDRESS || "123 Corporate Ave, City, State, PIN";
    const BILLER_GSTIN   = process.env.BILLER_GSTIN   || "22AAAAA0000A1Z5";
    const BILLER_LOGO    = process.env.BILLER_LOGO_PATH;

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = new PassThrough();
    doc.pipe(stream);

    if (BILLER_LOGO) {
      try {
        doc.image(BILLER_LOGO, 50, 45, { width: 120 });
      } catch (_) {}
    }

    doc.fontSize(24).text("INVOICE", { align: "right" });

    doc.fontSize(10)
       .text(BILLER_NAME, 50, 80)
       .text(BILLER_ADDRESS, 50, 95)
       .text(`GSTIN: ${BILLER_GSTIN}`, 50, 110)
       .moveDown();

    doc.text("Bill To:", 50, 150)
       .font("Helvetica-Bold").text(company.name, 50, 165)
       .font("Helvetica").text(company.address || "", 50, 180)
       .text(`GSTIN: ${company.gstin || "-"}`, 50, 195)
       .moveDown();

    const metaX = 350;
    let metaY = 80;
    doc.font("Helvetica-Bold").fontSize(10)
       .text("Invoice No:", metaX, metaY)
       .font("Helvetica").text(invoice.invoiceNumber, metaX + 80, metaY)
       .font("Helvetica-Bold").text("Date:", metaX, metaY += 15)
       .font("Helvetica").text(invoice.invoiceDate.toLocaleDateString(), metaX + 80, metaY)
       .font("Helvetica-Bold").text("Billing Period:", metaX, metaY += 15)
       .font("Helvetica").text(
         `${invoice.periodStart.toLocaleDateString()} – ${invoice.periodEnd.toLocaleDateString()}`,
         metaX + 80, metaY, { width: 180 }
       )
       .font("Helvetica-Bold").text("Plan:", metaX, metaY += 25)
       .font("Helvetica").text(invoice.planName, metaX + 80, metaY)
       .font("Helvetica-Bold").text("Transaction ID:", metaX, metaY += 15)
       .font("Helvetica").text(invoice.transactionId, metaX + 80, metaY)
       .moveDown();

    const tableTop = 260;
    doc.font("Helvetica-Bold")
       .text("Description", 50, tableTop)
       .text("Qty", 300, tableTop, { width: 50, align: "right" })
       .text("Unit Price (₹)", 350, tableTop, { width: 80, align: "right" })
       .text("Amount (₹)", 440, tableTop, { width: 80, align: "right" })
       .moveTo(50, tableTop + 15).lineTo(530, tableTop + 15).stroke();

    const rowY = tableTop + 30;
    doc.font("Helvetica")
       .text(invoice.planName, 50, rowY)
       .text("1", 300, rowY, { width: 50, align: "right" })
       .text(invoice.baseAmount.toFixed(2), 350, rowY, { width: 80, align: "right" })
       .text(invoice.baseAmount.toFixed(2), 440, rowY, { width: 80, align: "right" });

    const cgstY   = rowY + 20;
    const halfPct = (invoice.gstPercentage / 2).toFixed(2);
    const halfAmt = (invoice.gstAmount / 2).toFixed(2);
    doc.text(`CGST @ ${halfPct}%`, 50, cgstY)
       .text("–", 300, cgstY, { width: 50, align: "right" })
       .text(halfAmt, 440, cgstY, { width: 80, align: "right" })
       .text(`SGST @ ${halfPct}%`, 50, cgstY + 15)
       .text("–", 300, cgstY + 15, { width: 50, align: "right" })
       .text(halfAmt, 440, cgstY + 15, { width: 80, align: "right" });

    const summaryY = cgstY + 50;
    doc.moveTo(350, summaryY - 5).lineTo(530, summaryY - 5).stroke()
       .font("Helvetica-Bold")
       .text("Subtotal", 350, summaryY, { width: 80, align: "right" })
       .text(invoice.baseAmount.toFixed(2), 440, summaryY, { width: 80, align: "right" })
       .text("Total GST", 350, summaryY + 15, { width: 80, align: "right" })
       .text(invoice.gstAmount.toFixed(2), 440, summaryY + 15, { width: 80, align: "right" })
       .text("Total Amount", 350, summaryY + 35, { width: 80, align: "right" })
       .text(invoice.totalAmount.toFixed(2), 440, summaryY + 35, { width: 80, align: "right" });

    doc.fontSize(9)
       .text("Thank you for your business!", 50, summaryY + 80)
       .text("This is a computer‑generated invoice and does not require a signature.", 50, summaryY + 95);

    doc.end();

    const buffers = [];
    return new Promise((resolve, reject) => {
      stream.on("data", buffers.push.bind(buffers));
      stream.on("end", () => resolve(Buffer.concat(buffers)));
      stream.on("error", reject);
    });
  }

  static async processInvoice({
    companyId,
    planId,
    planName,
    baseAmount,
    gstPercentage,
    paymentMethod,
    transactionId,
    periodStart,
    periodEnd,
  }) {
    const invoice = await this.createInvoiceRecord({
      companyId,
      planId,
      planName,
      baseAmount,
      gstPercentage,
      paymentMethod,
      transactionId,
      periodStart,
      periodEnd,
    });

    const company = await Company.findOne({ _id: companyId, isDeleted: false }).lean();
    if (!company) {
      console.error("[InvoiceService] Company not found for invoice generation. companyId:", companyId);
      throw new Error("Company not found for invoice generation");
    }

    const pdfBuffer = await this.generateInvoicePDF(invoice, company);

    const { fileKey: pdfKey } = await uploadInvoicePdf(pdfBuffer, invoice.invoiceNumber, companyId);
    invoice.pdfKey = pdfKey;

    const downloadUrl = await generatePresignedUrl(pdfKey);
    invoice.downloadUrl = downloadUrl; // ✅ FIXED: persist in DB

    await invoice.save();

    await this.emailInvoice(invoice, company, pdfBuffer);

    return {
      invoiceNumber: invoice.invoiceNumber,
      downloadUrl,
      pdfKey,
    };
  }

  static async emailInvoice(invoice, company, pdfBuffer) {
    const subject = `Invoice ${invoice.invoiceNumber} from KadagamNext`;
    const text = `Hello ${company.name},\n\nPlease find attached your invoice ${invoice.invoiceNumber}.\n\nThank you,\nKadagamNext Team`;

    return EmailService.sendEmailWithAttachment({
      to: company.email,
      subject,
      text,
      attachments: [
        {
          filename: `${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    });
  }
}

module.exports = InvoiceService;
