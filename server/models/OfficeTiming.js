// server/models/OfficeTiming.js
const mongoose = require("mongoose");

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
    },
    endTime: {
      type: String,    
      required: true,
    },
    graceMinutes: {
      type: Number,    
      default: 15,
    },
    fullDayHours: {
      type: Number,    
      default: 8,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("OfficeTiming", officeTimingSchema);
