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

  // NEW INVOICE NUMBER LOGIC (202501, 202502, ...)
  static async generateInvoiceNumber() {
    const prefix = "2025";
    const lastInvoice = await Invoice
      .findOne({ invoiceNumber: { $regex: `^${prefix}\\d+$` } })
      .sort({ invoiceNumber: -1 })
      .lean();

    let nextSeq = 1;
    if (lastInvoice && lastInvoice.invoiceNumber) {
      const match = lastInvoice.invoiceNumber.match(/^2025(\d+)$/);
      if (match) {
        nextSeq = parseInt(match[1], 10) + 1;
      }
    }
    const seqStr = nextSeq < 10 ? "0" + nextSeq : String(nextSeq);
    return `${prefix}${seqStr}`;
  }

  static async createInvoiceRecord(data) {
    const baseAmount = Number(data.baseAmount);
    const gstPercentage = Number(data.gstPercentage);

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

  static formatDate(date) {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  static async generateInvoicePDF(invoice, company) {
    // Env defaults
    const BILLER_NAME = (process.env.BILLER_NAME || "KadagamNext Pvt. Ltd.").toUpperCase();
    const BILLER_ADDRESS = (process.env.BILLER_ADDRESS || "34, Venkatappa Rd, Off Queens Road, Tasker Town, Bengaluru, Karnataka 560051").toUpperCase();
    const BILLER_GSTIN = process.env.BILLER_GSTIN || "22AAAAA0000A1Z5";
    const BILLER_SAC = process.env.BILLER_SAC || "998349";
    let BILLER_LOGO = process.env.BILLER_LOGO_PATH;
    if (BILLER_LOGO && !path.isAbsolute(BILLER_LOGO)) {
      BILLER_LOGO = path.join(__dirname, "..", BILLER_LOGO.replace(/^(\.\/|\/)/, ""));
    }

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = new PassThrough();
    doc.pipe(stream);

    // Fonts
    const regPath = path.join(__dirname, "../assets/fonts/Roboto-Regular.ttf");
    const boldPath = path.join(__dirname, "../assets/fonts/Roboto-Bold.ttf");
    let fontReg = "Helvetica";
    let fontBold = "Helvetica-Bold";
    try {
      if (fs.existsSync(regPath) && fs.existsSync(boldPath)) {
        doc.registerFont("R", regPath);
        doc.registerFont("B", boldPath);
        fontReg = "R";
        fontBold = "B";
      }
    } catch (err) {}

    // Colors and styles
    const darkGray = "#333333";
    const primaryBlue = "#335cb1";

    // Layout constants
    const margin = 50;
    const contentWidth = doc.page.width - 2 * margin;

    // Header: split horizontally
    const leftPanelWidth = contentWidth * 0.55;
    const rightPanelWidth = contentWidth - leftPanelWidth - 20;
    const leftPanelX = margin;
    const rightPanelX = margin + leftPanelWidth + 20;
    const topY = 50;

    // LEFT: LOGO + BILLER INFO
    let logoHeight = 0;
    if (BILLER_LOGO && fs.existsSync(BILLER_LOGO)) {
      try {
        doc.image(BILLER_LOGO, leftPanelX, topY, { width: 70 });
        logoHeight = 70;
      } catch (err) {}
    }
    let curY = topY + (logoHeight ? logoHeight + 10 : 0);

    doc.font(fontBold).fontSize(14).fillColor(darkGray)
      .text(BILLER_NAME, leftPanelX, curY, { width: leftPanelWidth, align: "left" });
    curY = doc.y + 4;
    doc.font(fontReg).fontSize(10)
      .text(BILLER_ADDRESS, leftPanelX, curY, { width: leftPanelWidth, align: "left" });
    curY = doc.y + 2;
    curY += 2;
    doc.font(fontReg).fontSize(10)
      .text(`GSTIN: ${BILLER_GSTIN}  |  SAC: ${BILLER_SAC}`, leftPanelX, curY, { width: leftPanelWidth, align: "left" });
    curY = doc.y + 4;

    // RIGHT: INVOICE META with WIDER ROUNDED RECTANGLE BOX
    const metaFontSize = 10;
    let metaY = topY;

    doc.font(fontBold).fontSize(24).fillColor(primaryBlue)
      .text("INVOICE", rightPanelX, metaY, { width: rightPanelWidth, align: "center" });

    metaY += 54;
    const metaBoxExtraWidth = 26;
    const metaBoxX = rightPanelX - metaBoxExtraWidth / 2;
    const metaBoxY = topY + 54 - 10;
    const metaBoxW = rightPanelWidth + metaBoxExtraWidth;
    const metaBoxLineHeight = 20;
    const metaBoxLines = 5;
    const metaBoxH = metaBoxLines * metaBoxLineHeight + 20;

    doc.save();
    doc.roundedRect(metaBoxX, metaBoxY, metaBoxW, metaBoxH, 11)
      .lineWidth(1.2)
      .strokeColor("#e3e6eb")
      .stroke();
    doc.restore();

    // --- Meta fields (positions unchanged, just more space in the box) ---
    let thisMetaY = topY + 54;
    doc.font(fontBold).fontSize(metaFontSize).fillColor(darkGray)
      .text("Invoice No.:", rightPanelX + 10, thisMetaY, { continued: true })
      .fillColor(primaryBlue).text(`  ${invoice.invoiceNumber}`);
    thisMetaY += 20;

    doc.font(fontBold).fontSize(metaFontSize).fillColor(darkGray)
      .text("Transaction ID:", rightPanelX + 10, thisMetaY, { continued: true })
      .fillColor(primaryBlue).text(`  ${invoice.transactionId || "-"}`);
    thisMetaY += 20;

    doc.font(fontBold).fontSize(metaFontSize).fillColor(darkGray)
      .text("Plan:", rightPanelX + 10, thisMetaY, { continued: true })
      .fillColor(primaryBlue).text(`  ${invoice.planName}`);
    thisMetaY += 20;

    doc.font(fontBold).fontSize(metaFontSize).fillColor(darkGray)
      .text("Billing Period:", rightPanelX + 10, thisMetaY, { continued: true })
      .fillColor(primaryBlue).text(`  ${this.formatDate(invoice.periodStart)} – ${this.formatDate(invoice.periodEnd)}`);
    thisMetaY += 20;

    doc.font(fontBold).fontSize(metaFontSize).fillColor(darkGray)
      .text("Date:", rightPanelX + 10, thisMetaY, { continued: true })
      .fillColor(primaryBlue).text(`  ${this.formatDate(invoice.invoiceDate)}`);
    thisMetaY += 10;

    // --- BILL TO SECTION BELOW HEADER (FULL WIDTH) ---
    let billToY = Math.max(curY, thisMetaY) + 13;

    doc.font(fontBold).fontSize(12).fillColor(darkGray)
      .text("Bill To:", margin, billToY, { continued: true });
    doc.font(fontBold).fontSize(12)
      .text('  ' + (company.name || "-").toUpperCase());

    doc.moveDown(0.1);

    // --- Address Split: Last part (after last comma) is always on a new line ---
    const rawAddress = (company.address || "").toUpperCase().replace(/\s+/g, " ").trim();
    let addressParts = rawAddress.split(",").map(s => s.trim()).filter(Boolean);

    let city = "";
    let addressBeforeCity = "";

    if (addressParts.length >= 2) {
      city = addressParts[addressParts.length - 1];
      addressBeforeCity = addressParts.slice(0, -1).join(", ");
    } else {
      addressBeforeCity = rawAddress;
    }

    let addressLine1 = addressBeforeCity;
    if (addressBeforeCity.length > 60) {
      let idx = addressBeforeCity.lastIndexOf(" ", 60);
      if (idx === -1) idx = 60;
      addressLine1 = addressBeforeCity.slice(0, idx).trim();
      city = addressBeforeCity.slice(idx).trim() + (city ? (", " + city) : "");
    }

    doc.font(fontReg).fontSize(10);
    let y = doc.y;
    if (addressLine1) {
      doc.text(addressLine1, margin, y, { width: contentWidth - 65 });
      y = doc.y;
    }
    if (city) {
      doc.text(city, margin, y, { width: contentWidth - 65 });
      y = doc.y;
    }

    y += 4;
    doc.font(fontReg).fontSize(10)
      .text(`GSTIN: ${company.gstin || "-"}`, margin, y);

    // --- TABLE ---
    const tableTop = y + 28;
    const rowHeight = 28;
    const tableWidth = 480;
    const colQtyW = 45;
    const colDescW = 225;
    const colUnitW = 90;
    const colAmountW = 120;

    // X positions
    const colQtyX = margin;
    const colDescX = colQtyX + colQtyW;
    const colUnitX = colDescX + colDescW;
    const colAmountX = colUnitX + colUnitW;
    const amountPaddingRight = 10;

    doc
      .rect(margin, tableTop, tableWidth, rowHeight * 4)
      .lineWidth(1)
      .strokeColor("#bbb")
      .stroke();

    doc
      .rect(margin, tableTop, tableWidth, rowHeight)
      .fillAndStroke("#f3f6fa", "#bbb");

    doc.font(fontBold).fontSize(12).fillColor(darkGray);
    doc.text("Qty", colQtyX, tableTop + 7, { width: colQtyW, align: "center" });
    doc.text("Description", colDescX, tableTop + 7, { width: colDescW, align: "left" });
    doc.text("Unit Price", colUnitX, tableTop + 7, { width: colUnitW, align: "right" });
    doc.text("Amount", colAmountX, tableTop + 7, { width: colAmountW - amountPaddingRight, align: "right" });

    doc.moveTo(margin, tableTop + rowHeight)
      .lineTo(margin + tableWidth, tableTop + rowHeight)
      .strokeColor("#bbb")
      .stroke();

    let rowY = tableTop + rowHeight;
    doc.font(fontReg).fontSize(11).fillColor(darkGray);
    doc.text("1", colQtyX, rowY + 7, { width: colQtyW, align: "center" });
    doc.text(invoice.planName, colDescX, rowY + 7, { width: colDescW, align: "left" });
    doc.text(`₹${invoice.baseAmount.toFixed(2)}`, colUnitX, rowY + 7, { width: colUnitW, align: "right" });
    doc.text(`₹${invoice.baseAmount.toFixed(2)}`, colAmountX, rowY + 7, { width: colAmountW - amountPaddingRight, align: "right" });

    doc.moveTo(margin, rowY + rowHeight)
      .lineTo(margin + tableWidth, rowY + rowHeight)
      .strokeColor("#eee")
      .stroke();

    const halfGSTPercent = (invoice.gstPercentage / 2).toFixed(2);
    const halfGSTAmount = (invoice.gstAmount / 2).toFixed(2);

    rowY += rowHeight;
    doc.text("", colQtyX, rowY + 7, { width: colQtyW });
    doc.text(`CGST @ ${halfGSTPercent}%`, colDescX, rowY + 7, { width: colDescW });
    doc.text("", colUnitX, rowY + 7, { width: colUnitW });
    doc.text(`₹${halfGSTAmount}`, colAmountX, rowY + 7, { width: colAmountW - amountPaddingRight, align: "right" });

    doc.moveTo(margin, rowY + rowHeight)
      .lineTo(margin + tableWidth, rowY + rowHeight)
      .strokeColor("#eee")
      .stroke();

    rowY += rowHeight;
    doc.text("", colQtyX, rowY + 7, { width: colQtyW });
    doc.text(`SGST @ ${halfGSTPercent}%`, colDescX, rowY + 7, { width: colDescW });
    doc.text("", colUnitX, rowY + 7, { width: colUnitW });
    doc.text(`₹${halfGSTAmount}`, colAmountX, rowY + 7, { width: colAmountW - amountPaddingRight, align: "right" });

    doc.moveTo(margin + tableWidth, tableTop)
      .lineTo(margin + tableWidth, tableTop + rowHeight * 4)
      .strokeColor("#bbb")
      .stroke();
    doc.moveTo(margin, tableTop)
      .lineTo(margin, tableTop + rowHeight * 4)
      .strokeColor("#bbb")
      .stroke();
    doc.moveTo(margin, tableTop + rowHeight * 4)
      .lineTo(margin + tableWidth, tableTop + rowHeight * 4)
      .strokeColor("#bbb")
      .stroke();

    const totalsTop = rowY + rowHeight + 10;
    doc.moveTo(margin, totalsTop - 7)
      .lineTo(margin + tableWidth, totalsTop - 7)
      .strokeColor("#222").lineWidth(1.2).stroke();

    doc.font(fontBold).fontSize(12).fillColor(darkGray);
    doc.text("Subtotal", colUnitX, totalsTop, { width: colUnitW, align: "right" });
    doc.text(`₹${invoice.baseAmount.toFixed(2)}`, colAmountX, totalsTop, { width: colAmountW - amountPaddingRight, align: "right" });

    doc.text("Total GST", colUnitX, totalsTop + rowHeight, { width: colUnitW, align: "right" });
    doc.text(`₹${invoice.gstAmount.toFixed(2)}`, colAmountX, totalsTop + rowHeight, { width: colAmountW - amountPaddingRight, align: "right" });

    doc.font(fontBold).fontSize(14).fillColor(primaryBlue);
    doc.text("Total Amount", colUnitX, totalsTop + 2 * rowHeight, { width: colUnitW, align: "right" });
    doc.text(`₹${invoice.totalAmount.toFixed(2)}`, colAmountX, totalsTop + 2 * rowHeight, { width: colAmountW - amountPaddingRight, align: "right" });
    doc.fillColor(darkGray);

    // --- TERMS & CONDITIONS: BIGGER, FULL WIDTH ---
    doc.moveDown(1.5);

    doc.font(fontBold)
      .fontSize(15)
      .fillColor(darkGray)
      .text("Terms & Conditions", margin, doc.y, { width: contentWidth, align: "left" });

    doc.moveDown(0.4);
    doc.font(fontReg)
      .fontSize(12)
      .fillColor(darkGray);

    const terms = [
      "1. Payment is due immediately upon receipt of this invoice.",
      "2. Subscriptions automatically renew at term end.",
      "3. No refunds or credits for unused service periods.",
      "4. Services may be suspended if payment fails or is overdue.",
      "5. Accounts with overdue payments >30 days may be deleted.",
      "6. Basic email support is included. Premium support extra.",
      "7. Usage must comply with Terms of Service.",
      "8. Payment declines void billing cycle; may incur reinstatement fee.",
      "9. Governed by Karnataka law; jurisdiction in Bengaluru courts."
    ];

    terms.forEach(line => {
      doc.text(line, margin, doc.y, { width: contentWidth, align: "left" });
      doc.moveDown(0.35);
    });

    doc.moveDown(2);
    doc.font(fontBold).fontSize(12)
      .fillColor(darkGray)
      .text("Thank you for your business!", margin, doc.y, { width: contentWidth, align: "center" });

    doc.moveDown(0.2);
    doc.font(fontReg).fontSize(10)
      .fillColor(darkGray)
      .text("This is a computer-generated invoice and does not require a signature.", margin, doc.y, { width: contentWidth, align: "center" });

    doc.end();

    return new Promise((resolve, reject) => {
      const buffers = [];
      stream.on("data", data => buffers.push(data));
      stream.on("end", () => resolve(Buffer.concat(buffers)));
      stream.on("error", reject);
    });
  }

  static async processInvoice(args) {
    const invoice = await this.createInvoiceRecord(args);
    const company = await Company.findOne({ _id: args.companyId, isDeleted: false }).lean();
    if (!company) throw new Error("Company not found");

    const pdfBuffer = await this.generateInvoicePDF(invoice, company);
    const { fileKey } = await uploadInvoicePdf(pdfBuffer, invoice.invoiceNumber, args.companyId);
    invoice.pdfKey = fileKey;
    await invoice.save();

    await this.emailInvoice(invoice, company, pdfBuffer);
    return { invoiceNumber: invoice.invoiceNumber, pdfKey: fileKey };
  }

  static async emailInvoice(invoice, company, pdfBuffer) {
    return EmailService.sendEmailWithAttachment({
      to: company.email,
      subject: `Invoice ${invoice.invoiceNumber} from KadagamNext`,
      text: `Hello ${company.name},\n\nAttached is your invoice ${invoice.invoiceNumber}.\n\nThank you,\nKadagamNext Team`,
      attachments: [{ filename: `${invoice.invoiceNumber}.pdf`, content: pdfBuffer }],
    });
  }
}

module.exports = InvoiceService;
