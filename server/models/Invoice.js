// server/models/Invoice.js

const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
    index: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Plan",
    required: true,
    index: true
  },
  planName: {
    type: String,
    required: true
  },
  // Base subscription amount (before tax) in currency units
  baseAmount: {
    type: Number,
    required: true,
    min: [0, "Base amount cannot be negative"]
  },
  // GST percentage applied (e.g., 18 for 18%)
  gstPercentage: {
    type: Number,
    required: true,
    min: [0, "GST percentage cannot be negative"],
    max: [100, "GST percentage cannot exceed 100"],
    default: 18
  },
  // Calculated GST amount in currency units
  gstAmount: {
    type: Number,
    required: true,
    min: [0, "GST amount cannot be negative"]
  },
  // Total amount = baseAmount + gstAmount
  totalAmount: {
    type: Number,
    required: true,
    min: [0, "Total amount cannot be negative"]
  },
  // Payment details
  paymentMethod: {
    type: String,
    required: true
  },
  transactionId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["paid", "failed"],
    default: "paid"
  },
  invoiceDate: {
    type: Date,
    default: Date.now
  },
  periodStart: {
    type: Date,
    required: true
  },
  periodEnd: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Sequential invoiceNumber generation
invoiceSchema.pre("validate", async function(next) {
  if (this.isNew) {
    const year = new Date().getFullYear();
    const count = await mongoose.models.Invoice.countDocuments({
      invoiceDate: {
        $gte: new Date(`${year}-01-01T00:00:00.000Z`),
        $lt:  new Date(`${year + 1}-01-01T00:00:00.000Z`)
      }
    });
    this.invoiceNumber = `INV-${year}-${String(count + 1).padStart(6, "0")}`;
  }
  next();
});

// Virtuals for CGST and SGST breakdown
invoiceSchema.virtual("cgst").get(function() {
  return +(this.gstAmount / 2).toFixed(2);
});
invoiceSchema.virtual("sgst").get(function() {
  return +(this.gstAmount / 2).toFixed(2);
});

module.exports = mongoose.model("Invoice", invoiceSchema);
