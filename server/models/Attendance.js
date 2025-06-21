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
    /**
     * The calendar date of this record.
     * We store this as a Date at UTC midnight corresponding to the server-local calendar date.
     * E.g., if server-local date is 2025-06-20, we store date = 2025-06-20T00:00:00Z.
     * This allows one record per user per date via unique index below.
     */
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
          // Only validate if checkInTime also exists: checkOutTime must be after checkInTime
          if (!this.checkInTime) {
            // If there's no checkInTime, skip this validation (we may allow checkOutTime to be null or absent)
            return true;
          }
          // If checkInTime exists, ensure checkOutTime > checkInTime
          return value && value > this.checkInTime;
        },
        message: "Check-out time must be after check-in time.",
      },
    },
    totalHours: {
      type: Number,
      default: 0,
    },
    // Reflects final attendance status, set by your service logic
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
 * Normalize the `date` field to UTC midnight for the server-local calendar date.
 *
 * IMPORTANT:
 *  - If your business timezone matches the server’s local timezone,
 *    this code uses the server-local year/month/day to compute UTC midnight.
 *  - If your business uses a different timezone (e.g., Asia/Kolkata) while the server runs in UTC,
 *    replace this logic with a timezone-aware computation (e.g., using Luxon or date-fns-tz)
 *    so that `date` corresponds to the correct local date in that business timezone.
 */
AttendanceSchema.pre("save", function (next) {
  // Only normalize if `date` is set
  if (this.date instanceof Date) {
    const d = this.date;
    // Use server-local year/month/day:
    const year = d.getFullYear();
    const month = d.getMonth();   // zero-based month
    const day = d.getDate();      // day of month in server-local timezone
    // Build a Date at UTC midnight corresponding to that local date:
    this.date = new Date(Date.UTC(year, month, day, 0, 0, 0));
    // Example: if server-local date is 2025-06-20, then year=2025,month=5,day=20,
    // new Date(Date.UTC(2025,5,20,0,0,0)) yields 2025-06-20T00:00:00Z.
  }
  next();
});

/**
 * Static helper: compute the UTC-midnight Date for a given JavaScript Date,
 * based on server-local calendar date of that Date object.
 *
 * Usage example in services:
 *   const now = new Date();
 *   const dateField = Attendance.computeDateFieldForToday(now);
 *   // use dateField for queries or creation
 */
AttendanceSchema.statics.computeDateFieldForToday = function (jsDate) {
  if (!(jsDate instanceof Date)) {
    throw new Error("computeDateFieldForToday requires a Date object");
  }
  const year = jsDate.getFullYear();
  const month = jsDate.getMonth();
  const day = jsDate.getDate();
  return new Date(Date.UTC(year, month, day, 0, 0, 0));
};

/**
 * If you wish to use a specific timezone different from server-local,
 * you can add another static helper that accepts a timezone string and
 * uses a library like Luxon to compute the correct UTC midnight for that timezone.
 *
 * Example (requires installing luxon):
 *
 * const { DateTime } = require("luxon");
 * AttendanceSchema.statics.computeDateFieldInZone = function(jsDate, zone) {
 *   // jsDate is a Date representing the current moment (server time).
 *   // zone is an IANA timezone string, e.g. "Asia/Kolkata".
 *   const dt = DateTime.fromJSDate(jsDate, { zone }); // interpret jsDate in zone
 *   const startOfDay = dt.startOf("day"); // midnight in that zone
 *   return startOfDay.toUTC().toJSDate(); // convert back to JS Date in UTC
 * };
 *
 * Then service code can call:
 *   const dateField = Attendance.computeDateFieldInZone(new Date(), "Asia/Kolkata");
 *
 * But ensure you add `luxon` dependency and handle errors if timezone invalid.
 */

module.exports = mongoose.model("Attendance", AttendanceSchema);
