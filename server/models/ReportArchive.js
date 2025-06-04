const mongoose = require("mongoose");

const ReportArchiveSchema = new mongoose.Schema(
  {
    companyId: {
      type: String,
      ref: "Company",
      required: true,
      index: true,
    },
    reportType: {
      type: String,
      enum: ["Attendance", "Task", "Project", "Staff", "Leave"],
      required: true,
    },
    reportMonth: {
      type: String, // "01" to "12" or "Yearly"
      required: true,
    },
    reportYear: {
      type: Number,
      required: true,
    },
    fileKey: {
      type: String, // S3 object key
      required: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Optimized index for report lookup by type, year, and month
ReportArchiveSchema.index({ companyId: 1, reportType: 1, reportYear: 1, reportMonth: 1 });

module.exports = mongoose.model("ReportArchive", ReportArchiveSchema);
