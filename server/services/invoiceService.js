require("dotenv").config();
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { PassThrough } = require("stream");
const Invoice = require("../models/Invoice");
const Company = require("../models/Company");
const EmailService = require("./emailService");
const { uploadInvoicePdf } = require("../services/awsService");

class InvoiceService {
  static isValidNumber(value) {
    return typeof value === "number" && !isNaN(value);
  }

  static async generateInvoiceNumber() {
    const last = await Invoice.findOne().sort({ createdAt: -1 }).lean();
    let num = 0;
    if (last?.invoiceNumber) {
      const m = last.invoiceNumber.match(/INV-(\d+)/);
      if (m) num = parseInt(m[1], 10);
    }
    return `INV-${String(num + 1).padStart(4, "0")}`;
  }

  static async createInvoiceRecord(data) {
    const baseAmount = parseFloat(data.baseAmount);
    const gstPercentage = parseFloat(data.gstPercentage);

    if (!this.isValidNumber(baseAmount)) throw new Error("Invalid baseAmount");
    if (!this.isValidNumber(gstPercentage)) throw new Error("Invalid gstPercentage");

    const gstAmount = +(baseAmount * gstPercentage / 100).toFixed(2);
    const totalAmount = +(baseAmount + gstAmount).toFixed(2);
    const invoiceNumber = await this.generateInvoiceNumber();

    return new Invoice({
      ...data,
      baseAmount,
      gstPercentage,
      gstAmount,
      totalAmount,
      invoiceNumber,
      invoiceDate: new Date(),
      status: "paid",
    });
  }

  static formatDate(d) {
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  static async generateInvoicePDF(invoice, company) {
    // ─── Defensive logging ────────────────────────────────────────────────────────
    console.log("▶️ Generating PDF for invoice:", {
      invoiceNumber: invoice.invoiceNumber,
      baseAmount:    invoice.baseAmount,
      gstPercentage: invoice.gstPercentage,
      gstAmount:     invoice.gstAmount,
      totalAmount:   invoice.totalAmount,
      periodStart:   invoice.periodStart,
      periodEnd:     invoice.periodEnd,
    });

    const BILLER_NAME    = process.env.BILLER_NAME    || "KadagamNext Pvt. Ltd.";
    const BILLER_ADDRESS = process.env.BILLER_ADDRESS || "123 Corporate Ave, City, State, PIN";
    const BILLER_GSTIN   = process.env.BILLER_GSTIN   || "22AAAAA0000A1Z5";
    const BILLER_LOGO    = process.env.BILLER_LOGO_PATH;

    if (
      !this.isValidNumber(invoice.baseAmount)    ||
      !this.isValidNumber(invoice.gstPercentage) ||
      !this.isValidNumber(invoice.gstAmount)     ||
      !this.isValidNumber(invoice.totalAmount)
    ) {
      throw new Error("generateInvoicePDF: invoice contains invalid number fields");
    }

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = new PassThrough();
    doc.pipe(stream);

    // ─── Fonts ───────────────────────────────────────────────────────────────────
    const regPath  = path.join(__dirname, "../assets/fonts/Roboto-Regular.ttf");
    const boldPath = path.join(__dirname, "../assets/fonts/Roboto-Bold.ttf");
    let fontReg  = "Helvetica", fontBold = "Helvetica-Bold";
    if (fs.existsSync(regPath) && fs.existsSync(boldPath)) {
      doc.registerFont("R", regPath);
      doc.registerFont("B", boldPath);
      fontReg = "R"; fontBold = "B";
    }

    // ─── Layout constants ───────────────────────────────────────────────────────
    const leftX      = 50;
    const rightX     = doc.page.width - 200;
    const logoSize   = 50;
    const titleSize  = 24;
    const topY       = 50;
    const infoGap    = 10;
    const lineHeight = 14;

    // ─── Logo & Title ───────────────────────────────────────────────────────────
    if (BILLER_LOGO) {
      try { doc.image(BILLER_LOGO, leftX, topY, { width: logoSize }); } catch {}
    }
    doc.font(fontBold)
       .fontSize(titleSize)
       .text("INVOICE", rightX, topY + (logoSize - titleSize) / 2, { align: "right" });

    // ─── Meta box (Invoice No, Date, Period, etc) ───────────────────────────────
    let metaY = topY + logoSize + infoGap;
    doc.font(fontBold).fontSize(10);
    const metaWidth = doc.page.width - rightX - 50;
    const metaGap   = 8;
    [
      ["Invoice No:", invoice.invoiceNumber],
      ["Date:", this.formatDate(invoice.invoiceDate)],
      ["Billing Period:", `${this.formatDate(invoice.periodStart)} – ${this.formatDate(invoice.periodEnd)}`],
      ["Plan:", invoice.planName],
      ["Transaction ID:", invoice.transactionId],
    ].forEach(([lbl, val]) => {
      const line = `${lbl} ${val}`;
      doc.text(line, rightX, metaY, { width: metaWidth });
      metaY += doc.heightOfString(line, { width: metaWidth }) + metaGap;
    });
    const metaBottom = metaY;

    // ─── Biller & Bill-To ────────────────────────────────────────────────────────
    let billerY = topY + logoSize + infoGap;
    doc.font(fontBold).fontSize(10).text(BILLER_NAME, leftX, billerY, { width: 200 });
    billerY += lineHeight;
    doc.font(fontReg).text(BILLER_ADDRESS, leftX, billerY, { width: 230 });
    billerY = doc.y + infoGap;

    doc.text(`GSTIN: ${BILLER_GSTIN}`, leftX, billerY, { width: 200 });
    billerY += lineHeight;

    doc.font(fontBold).text("Bill To:", leftX, billerY, { width: 200 });
    doc.text(company.name || "-", leftX + 60, billerY, { width: 200 });
    billerY = doc.y + infoGap;

    if (company.address) {
      doc.font(fontReg).text(company.address, leftX + 60, billerY, { width: 180 });
      billerY = doc.y + infoGap;
    }
    doc.text(`GSTIN: ${company.gstin || "-"}`, leftX + 60, billerY, { width: 200 });
    const billerBottom = billerY + lineHeight;

    // ─── Table header ────────────────────────────────────────────────────────────
    const tableY = Math.max(metaBottom, billerBottom) + 30;
    doc.y = tableY;
    const [descX, qtyX, unitX, amtX] = [leftX, leftX + 230, leftX + 330, leftX + 430];
    const descWidth = qtyX - descX - 10;

    doc.font(fontBold).fontSize(10)
       .text("Description", descX, doc.y, { width: descWidth })
       .text("Qty",         qtyX, doc.y, { width: 40,   align: "right" })
       .text("Unit Price",  unitX, doc.y, { width: 80,   align: "right" })
       .text("Amount",      amtX, doc.y, { width: 80,   align: "right" });
    doc.moveTo(leftX, doc.y + 12).lineTo(doc.page.width - leftX, doc.y + 12).stroke();

    // ─── Table rows ─────────────────────────────────────────────────────────────
    const rowY = doc.y + 20;
    const halfP = (invoice.gstPercentage / 2).toFixed(2);
    const halfA = (invoice.gstAmount     / 2).toFixed(2);

    doc.font(fontReg)
       .text(invoice.planName,                descX, rowY,                       { width: descWidth })
       .text("1",                              qtyX, rowY,                       { width: 40,   align: "right" })
       .text(`₹${invoice.baseAmount.toFixed(2)}`, unitX, rowY,                      { width: 80,   align: "right" })
       .text(`₹${invoice.baseAmount.toFixed(2)}`, amtX, rowY,                       { width: 80,   align: "right" });

    doc.text(`CGST @ ${halfP}%`,             descX, rowY + lineHeight,          { width: descWidth })
       .text(`₹${halfA}`,                    amtX, rowY + lineHeight,          { width: 80,   align: "right" });

    doc.text(`SGST @ ${halfP}%`,             descX, rowY + 2 * lineHeight,      { width: descWidth })
       .text(`₹${halfA}`,                    amtX, rowY + 2 * lineHeight,      { width: 80,   align: "right" });

    // ─── Totals ─────────────────────────────────────────────────────────────────
    const sumY = rowY + 2 * lineHeight + 40;
    doc.moveTo(leftX, sumY - 5).lineTo(doc.page.width - leftX, sumY - 5).stroke();

    doc.font(fontBold)
       .text("Subtotal",       unitX,    sumY,               { width: 80, align: "right" })
       .text(`₹${invoice.baseAmount.toFixed(2)}`, amtX, sumY, { width: 80, align: "right" })
       .text("Total GST",      unitX,    sumY + lineHeight,  { width: 80, align: "right" })
       .text(`₹${invoice.gstAmount.toFixed(2)}`, amtX, sumY + lineHeight, { width: 80, align: "right" })
       .text("Total Amount",   unitX,    sumY + 2 * lineHeight, { width: 80, align: "right" })
       .text(`₹${invoice.totalAmount.toFixed(2)}`, amtX, sumY + 2 * lineHeight, { width: 80, align: "right" });

    // ─── Terms & Conditions ────────────────────────────────────────────────────
    doc.moveDown(2)
       .font(fontBold).fontSize(11).text("Terms & Conditions", leftX, doc.y, { width: 500 })
       .moveDown(0.5)
       .font(fontReg).fontSize(9);

    [
      "1. Payment is due immediately upon receipt of this invoice.",
      "2. Subscriptions automatically renew at term end...",
      "3. No refunds or credits for unused service periods...",
      "4. Services may be suspended if payment fails or is overdue...",
      "5. Accounts with overdue payments >30 days may be deleted...",
      "6. Basic email support is included. Premium support extra.",
      "7. Usage must comply with Terms of Service.",
      "8. Payment declines void billing cycle; may incur reinstatement fee.",
      "9. Governed by Karnataka law; jurisdiction in Bengaluru courts."
    ].forEach(line => {
      doc.text(line, leftX, doc.y, { width: doc.page.width - 2 * leftX });
      doc.moveDown(0.5);
    });

    // ─── Footer ──────────────────────────────────────────────────────────────────
    doc.moveDown(2)
       .font(fontBold).fontSize(9).text("Thank you for your business!", leftX, doc.y, { width: 500 })
       .moveDown(0.5)
       .font(fontReg).fontSize(8)
       .text("This is a computer-generated invoice and does not require a signature.", leftX, doc.y, { width: 500 });

    doc.end();

    return new Promise((resolve, reject) => {
      const buffers = [];
      stream.on("data", buffers.push.bind(buffers));
      stream.on("end",   () => resolve(Buffer.concat(buffers)));
      stream.on("error", reject);
    });
  }

  static async processInvoice(args) {
    const invoice = await this.createInvoiceRecord(args);
    const company = await Company.findOne({ _id: args.companyId, isDeleted: false }).lean();
    if (!company) throw new Error("Company not found");

    const pdfBuf = await this.generateInvoicePDF(invoice, company);
    const { fileKey: pdfKey } = await uploadInvoicePdf(pdfBuf, invoice.invoiceNumber, args.companyId);
    invoice.pdfKey = pdfKey;
    await invoice.save();

    await this.emailInvoice(invoice, company, pdfBuf);
    return { invoiceNumber: invoice.invoiceNumber, pdfKey };
  }

  static async emailInvoice(invoice, company, pdfBuf) {
    return EmailService.sendEmailWithAttachment({
      to: company.email,
      subject: `Invoice ${invoice.invoiceNumber} from KadagamNext`,
      text: `Hello ${company.name},\n\nAttached is your invoice ${invoice.invoiceNumber}.\n\nThank you,\nKadagamNext Team`,
      attachments: [{ filename: `${invoice.invoiceNumber}.pdf`, content: pdfBuf }],
    });
  }
}

module.exports = InvoiceService;
