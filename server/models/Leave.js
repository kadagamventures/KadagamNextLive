const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema(
  {
    companyId: {
      type: String,
      ref: "Company",
      required: true,
      index: true,
    },
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["leave", "workfromhome", "declared_leave"],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      required: true,
      maxlength: 500,
    },
    adminReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "expired"],
      default: "pending",
    },
    contactEmail: {
      type: String,
      trim: true,
      required: true,
      validate: {
        validator: function (v) {
          return /^[\w-\\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid email address!`,
      },
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ✅ Ensure startDate is not after endDate
leaveSchema.pre("validate", function (next) {
  if (this.startDate > this.endDate) {
    return next(new Error("Start date cannot be after end date."));
  }
  next();
});

// ✅ Restrict leave requests for past dates
leaveSchema.pre("validate", function (next) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (this.startDate < today) {
    return next(new Error("Cannot request leave for past dates."));
  }
  next();
});

// ✅ Prevent overlapping leaves for same staff
leaveSchema.pre("save", async function (next) {
  const existingLeave = await this.constructor.findOne({
    staff: this.staff,
    companyId: this.companyId,
    startDate: { $lte: this.endDate },
    endDate: { $gte: this.startDate },
    isDeleted: false,
    _id: { $ne: this._id },
  });

  if (existingLeave) {
    return next(new Error("You already have a leave request for this period."));
  }
  next();
});

// ✅ Auto-trim fields
leaveSchema.pre("save", function (next) {
  this.reason = this.reason.trim();
  this.contactEmail = this.contactEmail.trim();
  if (this.adminReason) {
    this.adminReason = this.adminReason.trim();
  }
  next();
});

// ✅ Auto-expire pending leaves that are outdated
leaveSchema.pre("save", function (next) {
  if (this.endDate < new Date() && this.status === "pending") {
    this.status = "expired";
  }
  next();
});

// ✅ Exclude soft-deleted leaves from all queries
leaveSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: false });
  next();
});

module.exports = mongoose.model("Leave", leaveSchema);
