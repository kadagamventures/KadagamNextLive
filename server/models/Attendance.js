// server/models/Attendance.js
const mongoose = require("mongoose");

const AttendanceSchema = new mongoose.Schema(
  {
    companyId: {
      type: String,
      ref: "Company",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // The calendar date of this record (normalized to midnight UTC)
    date: {
      type: Date,
      required: true,
      index: true,
    },
    checkInTime: {
      type: Date,
    },
    checkOutTime: {
      type: Date,
      validate: {
        validator: function (value) {
          // only validate if both times exist
          return !this.checkInTime || (value && value > this.checkInTime);
        },
        message: "Check-out time must be after check-in time.",
      },
    },
    totalHours: {
      type: Number,
      default: 0,
    },
    // Reflects final attendance status, set by your service
    status: {
      type: String,
      enum: [
        "Present",
        "Absent",
        "Late Arrival",
        "On Leave",
        "Early Departure",
        "Declared Holiday",
      ],
      required: true,
    },
    // Flags set at check-in / check-out time
    lateArrival: {
      type: Boolean,
      default: false,
    },
    earlyDeparture: {
      type: Boolean,
      default: false,
    },
    // Optional staff-entered notes
    arrivalNote: {
      type: String,
      default: "",
    },
    departureNote: {
      type: String,
      default: "",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Ensure one attendance record per user per date
AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

/**
 * Normalize the `date` field to UTC midnight before saving.
 */
AttendanceSchema.pre("save", function (next) {
  if (this.date instanceof Date) {
    const d = this.date;
    this.date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }
  next();
});

module.exports = mongoose.model("Attendance", AttendanceSchema);
