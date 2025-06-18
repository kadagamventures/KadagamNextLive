// server/models/Company.js

const mongoose = require("mongoose");

// Utility for generating a unique 6‑digit company code
async function generateUniqueCompanyCode() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const exists = await mongoose.models.Company.exists({ _id: code });
  return exists ? await generateUniqueCompanyCode() : code;
}

// Subdocument for each payment entry
const paymentSchema = new mongoose.Schema(
  {
    planName: {
      type: String,
      required: true,                // e.g. "1 Month", "3 Months"
    },
    planDuration: {
      type: Number,
      required: true,                // number of days (30, 90, etc)
    },
    planPrice: {
      type: Number,
      required: true,                // base price before GST
    },
    gstAmount: {
      type: Number,
      required: true,                // tax component
    },
    totalAmount: {
      type: Number,
      required: true,                // planPrice + gstAmount
    },
    invoiceKey: {
      type: String,
      required: true,                // S3 object key or URL for the PDF
    },

    amount: {
      type: Number,
      required: true,                // duplicate of totalAmount for backwards compatibility
    },
    date: {
      type: Date,
      default: Date.now,
    },
    method: {
      type: String,
      enum: ["card", "upi", "razorpay", "stripe", "paypal", "bank_transfer", "trial"],
      default: "card",
    },
    transactionId: {
      type: String,
    },
    status: {
      type: String,
      enum: ["success", "failed", "pending"],
      default: "success",
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      required: true,
    },
  },
  { _id: false }
);

const companySchema = new mongoose.Schema(
  {
    // Override default ObjectId; assign 6‑digit string in pre‑validate
    _id: { type: String },

    name:        { type: String, required: true, trim: true },
    email:       {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format!"],
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: v => /^[0-9]{10,15}$/.test(v),
        message: props => `${props.value} is not a valid phone number!`,
      },
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: v =>
          /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/.test(v),
        message: props => `${props.value} is not a valid GSTIN!`,
      },
    },
    cin: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: v =>
          /^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/.test(v),
        message: props => `${props.value} is not a valid CIN!`,
      },
    },
    pan: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: v => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v),
        message: props => `${props.value} is not a valid PAN!`,
      },
    },
    companyType: {
      type: String,
      enum: [
        "Private Limited",
        "Proprietorship",
        "Limited Liability Partnership",
        "Sole Proprietorship",
        "Partnership",
        "Limited Liability Company (LLC)",
        "Corporation (C-Corp)",
        "Nonprofit Corporation",
        "Others",
      ],
      default: "Private Limited",
    },
    address: { type: String, trim: true },

    // Subscription & billing
    subscription: {
      planId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Plan",
        default: null,
      },
      status: {
        type: String,
        enum: ["pending", "active", "expired", "cancelled", "trial"],
        default: "pending",
      },
      startDate:         { type: Date, default: Date.now },
      nextBillingDate:   { type: Date, default: null },
      lastPaymentAmount: { type: Number, default: 0 },
      paymentHistory:    { type: [paymentSchema], default: [] },
    },

    logoUrl:    { type: String, default: "" },
    website:    { type: String, default: "", trim: true },
    trustLevel: {
      type: String,
      enum: ["new", "verified", "flagged", "banned"],
      default: "new",
    },
    isVerified: { type: Boolean, default: false },
    isDeleted:  { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
  }
);

// Text search for Super Admin dashboard
companySchema.index({ name: "text", email: "text" });

// Index payments by date for revenue queries
companySchema.index({ "subscription.paymentHistory.date": 1 });

// Auto‐generate 6‑digit string _id on new Company
companySchema.pre("validate", async function (next) {
  if (this.isNew && !this._id) {
    try {
      this._id = await generateUniqueCompanyCode();
      next();
    } catch (err) {
      next(err);
    }
  } else next();
});

// Recalculate subscription summary on every save when paymentHistory changes
companySchema.pre("save", function (next) {
  if (this.isModified("subscription.paymentHistory")) {
    const successes = this.subscription.paymentHistory.filter(
      (p) => p.status === "success"
    );
    if (successes.length > 0) {
      // Total days across all successful payments
      const totalDays = successes.reduce((sum, p) => sum + p.planDuration, 0);

      // First-ever successful payment date
      this.subscription.startDate = successes[0].date;

      // Last payment’s amount
      const last = successes[successes.length - 1];
      this.subscription.lastPaymentAmount = last.totalAmount;

      // Next billing date = last payment date + totalDays
      this.subscription.nextBillingDate = new Date(
        last.date.getTime() + totalDays * 24 * 60 * 60 * 1000
      );

      // Active vs expired
      this.subscription.status =
        this.subscription.nextBillingDate > Date.now() ? "active" : "expired";
    } else {
      // No successful payments
      this.subscription.nextBillingDate = null;
      this.subscription.lastPaymentAmount = 0;
      this.subscription.status = "pending";
    }
  }
  next();
});

module.exports = mongoose.model("Company", companySchema);
