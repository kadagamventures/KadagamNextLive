const mongoose = require("mongoose");

// ✅ Daily Update Subschema
const dailyUpdateSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  comment: {
    type: String,
    required: true,
    trim: true,
  },
  attachment: {
    fileUrl: { type: String, trim: true, default: null },
    fileType: { type: String, trim: true, default: null },
    fileName: { type: String, trim: true, default: null },
  },
  date: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

// ✅ Attachment Subschema (for creation-time file uploads)
const attachmentSchema = new mongoose.Schema({
  fileUrl: { type: String, trim: true, default: null },
  fileType: { type: String, trim: true, default: null },
}, { _id: false });

// ✅ Review Subschema
const reviewSchema = new mongoose.Schema({
  isUnderReview: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  reason: { type: String, default: "" },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewAttachments: [
    {
      fileUrl: { type: String, trim: true, default: null },
      fileType: { type: String, trim: true, default: null },
    }
  ],
  reviewHistory: [
    {
      by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      decision: { type: String, enum: ["approved", "rejected"] },
      comment: { type: String, default: "" },
      date: { type: Date, default: Date.now },
    }
  ],
}, { _id: false });

// ✅ Main Task Schema
const TaskSchema = new mongoose.Schema({
  companyId: {
    type: String,
    ref: "Company",
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 200,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000,
  },
  projects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  }],
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  assignedDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["To Do", "Ongoing", "Review", "Completed"],
    default: "To Do",
  },
  priority: {
    type: String,
    enum: ["Low", "Medium", "High", "Critical"],
    default: "Medium",
  },
  dueDate: {
    type: Date,
    required: true,
  },
  attachments: [attachmentSchema],           // Creation-time attachments
  dailyUpdates: [dailyUpdateSchema],         // Staff daily status + file
  review: reviewSchema,                      // Review state, decision, and files
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  completedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  versionKey: false,
});

// ✅ Auto-set or reset `completedAt` when task status changes
TaskSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    if (this.status === "Completed" && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== "Completed") {
      this.completedAt = null;
    }
  }
  next();
});

module.exports = mongoose.model("Task", TaskSchema);
