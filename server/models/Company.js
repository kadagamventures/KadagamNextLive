const mongoose = require("mongoose");

async function generateUniqueCompanyCode() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const exists = await mongoose.models.Company.exists({ _id: code });
  return exists ? await generateUniqueCompanyCode() : code;
}

const paymentSchema = new mongoose.Schema(
  {
    planName: { type: String, required: true },
    planDuration: { type: Number, required: true },
    planPrice: { type: Number, required: true },
    gstAmount: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    invoiceKey: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    method: {
      type: String,
      enum: [
        "card",
        "upi",
        "razorpay",
        "stripe",
        "paypal",
        "bank_transfer",
        "trial",
      ],
      default: "card",
    },
    transactionId: String,
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
    _id: { type: String },

    name: { type: String, required: true, trim: true },
    email: {
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
        validator: v => {
          if (v == null || v === "") return true;
          return /^[0-9]{10,15}$/.test(v);
        },
        message: props => `${props.value} is not a valid phone number!`,
      },
    },

    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: v =>
          !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/.test(v),
        message: props => `${props.value} is not a valid GSTIN!`,
      },
    },
    cin: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: v =>
          !v || /^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/.test(v),
        message: props => `${props.value} is not a valid CIN!`,
      },
    },
    pan: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: v => !v || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v),
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
        "Google-Auth", 
      ],
      default: "Private Limited",
    },

    address: { type: String, trim: true },

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
      startDate: { type: Date, default: Date.now },
      nextBillingDate: { type: Date, default: null },
      lastPaymentAmount: { type: Number, default: 0 },
      paymentHistory: { type: [paymentSchema], default: [] },
    },

    logoUrl: { type: String, default: "" },
    website: { type: String, default: "", trim: true },
    trustLevel: {
      type: String,
      enum: ["new", "verified", "flagged", "banned"],
      default: "new",
    },
    isVerified: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

companySchema.index({ name: "text", email: "text" });
companySchema.index({ "subscription.paymentHistory.date": 1 });

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

companySchema.pre("save", function (next) {
  if (this.isModified("subscription.paymentHistory")) {
    const successes = this.subscription.paymentHistory.filter(p => p.status === "success");
    if (successes.length) {
      const totalDays = successes.reduce((sum, p) => sum + p.planDuration, 0);
      this.subscription.startDate = successes[0].date;
      const last = successes[successes.length - 1];
      this.subscription.lastPaymentAmount = last.totalAmount;
      this.subscription.nextBillingDate = new Date(
        last.date.getTime() + totalDays * 24 * 60 * 60 * 1000
      );
      this.subscription.status =
        this.subscription.nextBillingDate > Date.now() ? "active" : "expired";
    } else {
      this.subscription.nextBillingDate = null;
      this.subscription.lastPaymentAmount = 0;
      this.subscription.status = "pending";
    }
  }
  next();
});

module.exports = mongoose.model("Company", companySchema);
