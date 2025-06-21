// server/models/OfficeTiming.js
const mongoose = require("mongoose");

/**
 * Validate "HH:MM AM/PM" format: matches 1–12 for hours, 00–59 for minutes, with AM/PM.
 */
function validateTimeFormat(str) {
  if (typeof str !== 'string') return false;
  const parts = str.trim().split(" ");
  if (parts.length !== 2) return false;
  const [timePart, period] = parts;
  if (!["AM", "PM"].includes(period)) return false;
  const timePieces = timePart.split(":");
  if (timePieces.length !== 2) return false;
  const h = Number(timePieces[0]);
  const m = Number(timePieces[1]);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return false;
  if (h < 1 || h > 12) return false;
  if (m < 0 || m >= 60) return false;
  return true;
}

const officeTimingSchema = new mongoose.Schema(
  {
    companyId: {
      type: String,
      required: true,
      unique: true,
    },
    startTime: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: validateTimeFormat,
        message: props => `startTime "${props.value}" is not in "HH:MM AM/PM" format`
      }
    },
    endTime: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: validateTimeFormat,
        message: props => `endTime "${props.value}" is not in "HH:MM AM/PM" format`
      }
    },
    graceMinutes: {
      type: Number,
      default: 15,
      min: [0, 'graceMinutes must be non-negative']
    },
    fullDayHours: {
      type: Number,
      default: 8,
      min: [1, 'fullDayHours must be at least 1']
    },
  },
  { timestamps: true }
);

// Optional: before saving, ensure endTime > startTime logically (same-day comparison)
officeTimingSchema.pre("save", function(next) {
  const s = this.startTime;
  const e = this.endTime;
  // parse to 24h
  const parse = (str) => {
    const [timePart, period] = str.trim().split(" ");
    let [h, m] = timePart.split(":").map(Number);
    if (period === "PM" && h < 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return { h, m };
  };
  if (validateTimeFormat(s) && validateTimeFormat(e)) {
    const { h: sh, m: sm } = parse(s);
    const { h: eh, m: em } = parse(e);
    // If end is not strictly after start, reject
    if (eh < sh || (eh === sh && em <= sm)) {
      return next(new Error('endTime must be later than startTime on the same day'));
    }
  }
  next();
});

module.exports = mongoose.model("OfficeTiming", officeTimingSchema);
