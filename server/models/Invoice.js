// server/models/Invoice.js

const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    // Sequential invoice number: INV-0001, INV-0002, ...
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Link to the Company
    companyId: {
      type: String,
      ref: "Company",
      required: true,
      index: true,
    },

    // Link back to the plan
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
      index: true,
    },

    // Denormalized for easy display
    planName: {
      type: String,
      required: true,
    },

    // Base subscription amount (before tax)
    baseAmount: {
      type: Number,
      required: true,
      min: [0, "Base amount cannot be negative"],
    },

    // GST percentage applied (e.g. 18)
    gstPercentage: {
      type: Number,
      required: true,
      min: [0, "GST percentage cannot be negative"],
      max: [100, "GST percentage cannot exceed 100"],
      default: 18,
    },

    // Calculated GST amount
    gstAmount: {
      type: Number,
      required: true,
      min: [0, "GST amount cannot be negative"],
    },

    // Total amount after tax
    totalAmount: {
      type: Number,
      required: true,
      min: [0, "Total amount cannot be negative"],
    },

    // How they paid
    paymentMethod: {
      type: String,
      required: true,
    },

    transactionId: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["paid", "failed"],
      default: "paid",
    },

    // When the invoice was issued
    invoiceDate: {
      type: Date,
      default: Date.now,
    },

    // Billing period covered by this invoice
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },

    // S3 object key for the PDF invoice
    pdfKey: {
      type: String,
      required: true,
      index: true,
    },

    // Presigned download URL
    downloadUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON:    { virtuals: true },
    toObject:  { virtuals: true },
  }
);

// GST breakdown virtuals (split evenly)
invoiceSchema.virtual("cgst").get(function () {
  return +(this.gstAmount / 2).toFixed(2);
});
invoiceSchema.virtual("sgst").get(function () {
  return +(this.gstAmount / 2).toFixed(2);
});

module.exports = mongoose.model("Invoice", invoiceSchema);
