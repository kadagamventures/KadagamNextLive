// server/models/Plan.js

const mongoose = require("mongoose");

/**
 * Helper to convert a duration { value, unit } into days.
 * - days → value
 * - months → value * 30
 * - years → value * 365
 */
function durationToDays({ value, unit }) {
  switch (unit) {
    case "days":
      return value;
    case "months":
      return value * 30;
    case "years":
      return value * 365;
    default:
      return value;
  }
}

const planSchema = new mongoose.Schema(
  {
    // Human-readable plan name (e.g., "7-Day Trial", "1 Month")
    name: {
      type: String,
      required: [true, "Plan name is required"],
      trim: true,
      unique: true,
    },

    // Duration: value + unit (days, months, years)
    duration: {
      value: {
        type: Number,
        required: [true, "Duration value is required"],
        min: [1, "Duration must be at least 1"],
      },
      unit: {
        type: String,
        enum: ["days", "months", "years"],
        required: [true, "Duration unit is required"],
      },
    },

    // Price in currency units (e.g., rupees). Must be zero for free trials.
    price: {
      type: Number,
      required: function () {
        return !this.isFreeTrial;
      },
      min: [0, "Price cannot be negative"],
      default: 0,
    },

    // Configurable GST percentage (e.g., 18 for 18%)
    gstPercentage: {
      type: Number,
      default: 18,
      min: [0, "GST percentage cannot be negative"],
      max: [100, "GST percentage cannot exceed 100"],
    },

    isActive:    { type: Boolean, default: true },
    isFreeTrial: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

// Text index on name for Super‑Admin search
planSchema.index({ name: "text" });

// Ensure trial plans have price = 0, paid plans > 0
planSchema.pre("validate", function (next) {
  if (this.isFreeTrial && this.price !== 0) {
    this.invalidate("price", "Free trial plans must have price 0");
  }
  if (!this.isFreeTrial && this.price <= 0) {
    this.invalidate("price", "Paid plans must have a positive price");
  }
  next();
});

// Virtual: human-readable duration text ("7 days", "1 month", etc.)
planSchema.virtual("durationText").get(function () {
  const { unit, value } = this.duration;
  return `${value} ${unit}${value > 1 ? "s" : ""}`;
});

// Virtual: duration expressed in days, for easy aggregation
planSchema.virtual("durationDays").get(function () {
  return durationToDays(this.duration);
});

// Virtuals for CGST/SGST = half of gstPercentage
planSchema.virtual("cgst").get(function () {
  return (this.gstPercentage / 2).toFixed(2);
});
planSchema.virtual("sgst").get(function () {
  return (this.gstPercentage / 2).toFixed(2);
});

// Virtual: absolute GST amount on this plan price
planSchema.virtual("gstAmount").get(function () {
  return Number((this.price * (this.gstPercentage / 100)).toFixed(2));
});

// Virtual: total amount (price + GST)
planSchema.virtual("totalAmount").get(function () {
  return Number((this.price + this.gstAmount).toFixed(2));
});

/**
 * Instance method to get all the pricing details at once.
 * Returns an object you can spread into your payment record:
 * {
 *   planName,
 *   planDuration,    // in days
 *   planPrice,       // price
 *   gstAmount,       // computed
 *   totalAmount,     // computed
 *   gstPercentage,
 *   cgst,
 *   sgst
 * }
 */
planSchema.methods.getPricingDetails = function () {
  return {
    planName:      this.name,
    planDuration:  this.durationDays,
    planPrice:     this.price,
    gstPercentage: this.gstPercentage,
    cgst:          this.cgst,
    sgst:          this.sgst,
    gstAmount:     this.gstAmount,
    totalAmount:   this.totalAmount,
  };
};

module.exports = mongoose.model("Plan", planSchema);
