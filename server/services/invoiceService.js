// server/services/invoiceService.js

const Invoice = require("../models/Invoice");
const PDFDocument = require("pdfkit");             // npm install pdfkit
const { PassThrough } = require("stream");
const EmailService = require("./emailService");
const Plan = require("../models/Plan");

class InvoiceService {
  /**
   * Create & save invoice based on a successful payment
   *
   * @param {Object} params
   * @param {String} params.companyId
   * @param {String} params.planId
   * @param {String} params.planName
   * @param {Number} params.baseAmount       // base price in currency units
   * @param {Number} params.gstPercentage    // e.g. 18 for 18%
   * @param {String} params.paymentMethod
   * @param {String} params.transactionId
   * @param {Date}   params.periodStart
   * @param {Date}   params.periodEnd
   */
  static async createInvoice({
    companyId,
    planId,
    planName,
    baseAmount,
    gstPercentage,
    paymentMethod,
    transactionId,
    periodStart,
    periodEnd
  }) {
    // Calculate tax & totals
    const taxRate   = gstPercentage;
    const taxAmount = +(baseAmount * taxRate / 100).toFixed(2);
    const total     = +(baseAmount + taxAmount).toFixed(2);

    const invoice = await Invoice.create({
      companyId,
      planId,
      planName,
      baseAmount,
      gstPercentage: taxRate,
      taxAmount,
      totalAmount: total,
      paymentMethod,
      transactionId,
      periodStart,
      periodEnd,
      status: "paid"
    });

    return invoice;
  }

  /**
   * Generate PDF Buffer for an invoice
   *
   * @param {Object} invoice
   * @param {Object} companyDetails
   */
  static async generateInvoicePDF(invoice, companyDetails) {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = new PassThrough();
    doc.pipe(stream);

    // Header
    doc.image("path/to/your/logo.png", 50, 45, { width: 150 })
       .fontSize(20).text("INVOICE", 400, 50);

    // Biller details
    doc.fontSize(10)
       .text("KadagamNext Pvt. Ltd.", 50, 120)
       .text("123 Corporate Ave, City, State", 50, 135)
       .text("GSTIN: 22AAAAA0000A1Z5", 50, 150);

    // Recipient details
    doc.text(`Bill To:`, 50, 190)
       .text(`${companyDetails.name}`, 50, 205)
       .text(companyDetails.address, 50, 220)
       .text(`GSTIN: ${companyDetails.gstin || "-"}`, 50, 235);

    // Invoice metadata
    doc.text(`Invoice No: ${invoice.invoiceNumber}`, 400, 120)
       .text(`Date: ${invoice.invoiceDate.toLocaleDateString()}`, 400, 135)
       .text(
         `Billing Period: ${invoice.periodStart.toLocaleDateString()} - ${invoice.periodEnd.toLocaleDateString()}`,
         400,
         150
       );

    // Table header
    const tableTop = 270;
    doc.font("Helvetica-Bold")
       .text("Description", 50, tableTop)
       .text("Amount (₹)", 400, tableTop, { width: 90, align: "right" });
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // Table rows: base amount
    doc.font("Helvetica")
       .text(invoice.planName, 50, tableTop + 30)
       .text(invoice.baseAmount.toFixed(2), 400, tableTop + 30, { width: 90, align: "right" });

    // CGST and SGST rows
    const halfTax = (invoice.taxAmount / 2).toFixed(2);
    doc.text(`CGST @ ${invoice.gstPercentage / 2}%`, 50, tableTop + 50)
       .text(halfTax, 400, tableTop + 50, { width: 90, align: "right" })
       .text(`SGST @ ${invoice.gstPercentage / 2}%`, 50, tableTop + 70)
       .text(halfTax, 400, tableTop + 70, { width: 90, align: "right" });

    // Total row
    doc.moveTo(50, tableTop + 100).lineTo(550, tableTop + 100).stroke()
       .font("Helvetica-Bold")
       .text("Total", 50, tableTop + 115)
       .text(invoice.totalAmount.toFixed(2), 400, tableTop + 115, { width: 90, align: "right" });

    // Footer
    doc.fontSize(10)
       .text("Thank you for your payment!", 50, tableTop + 160)
       .text("This is a system-generated invoice.", 50, tableTop + 175);

    doc.end();

    // Return a Promise that resolves to a Buffer
    const buffers = [];
    return new Promise((resolve, reject) => {
      stream.on("data", buffers.push.bind(buffers));
      stream.on("end", () => resolve(Buffer.concat(buffers)));
      stream.on("error", reject);
    });
  }

  /**
   * Email invoice PDF to the tenant
   *
   * @param {Object} invoice
   * @param {Object} companyDetails
   * @param {Buffer} pdfBuffer
   */
  static async emailInvoice(invoice, companyDetails, pdfBuffer) {
    const subject = `Your Invoice ${invoice.invoiceNumber} from KadagamNext`;
    const text = `Hello ${companyDetails.name},\n\nPlease find attached your invoice ${invoice.invoiceNumber}.\n\nThank you,\nKadagamNext Team`;
    return EmailService.sendEmailWithAttachment({
      to: companyDetails.email,
      subject,
      text,
      attachments: [
        {
          filename: `${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer
        }
      ]
    });
  }
}

module.exports = InvoiceService;
