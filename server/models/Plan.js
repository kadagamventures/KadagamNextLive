// server/models/Plan.js

const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    // Human-readable plan name (e.g., "7-Day Trial", "1 Month", "6 Months")
    name: {
      type: String,
      required: [true, "Plan name is required"],
      trim: true,
      unique: true,
    },

    // Duration: a number plus unit (days, months, years)
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

    // Price in smallest currency unit (e.g., paise for INR)
    // Must be zero for free trials
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

    // Whether this plan is currently offered
    isActive: {
      type: Boolean,
      default: true,
    },

    // Flags a free trial plan (price must be zero)
    isFreeTrial: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Text index on name to support search in Super Admin UI
planSchema.index({ name: "text" });

/**
 * Validate that trial plans have price=0 and paid plans have price>0.
 */
planSchema.pre("validate", function (next) {
  if (this.isFreeTrial && this.price !== 0) {
    this.invalidate("price", "Free trial plans must have price 0");
  }
  if (!this.isFreeTrial && this.price <= 0) {
    this.invalidate("price", "Paid plans must have a positive price");
  }
  next();
});

/**
 * Virtual: human-readable duration string
 * e.g., "7 days", "1 month", "6 months"
 */
planSchema.virtual("durationText").get(function () {
  const { unit, value } = this.duration;
  return `${value} ${unit}${value > 1 ? "s" : ""}`;
});

/**
 * Virtual: CGST and SGST breakdown (half of total GST%)
 * e.g., if gstPercentage = 18, cgst = 9, sgst = 9
 */
planSchema.virtual("cgst").get(function () {
  return (this.gstPercentage / 2).toFixed(2);
});
planSchema.virtual("sgst").get(function () {
  return (this.gstPercentage / 2).toFixed(2);
});

module.exports = mongoose.model("Plan", planSchema);
