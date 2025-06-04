const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    companyId: {
      type: String,
      ref: "Company",
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      required: true,
      enum: [
        "image/jpeg",
        "image/png",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ],
    },
    fileSize: {
      type: Number,
      required: true,
      min: 1,
    },
    fileUrl: {
      type: String,
      required: true,
      validate: {
        validator: (v) => /^https?:\/\//.test(v),
        message: (props) => `${props.value} is not a valid URL`,
      },
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { timestamps: true }
);

// ✅ Optimized Indexes
fileSchema.index({ uploadedBy: 1 });
fileSchema.index({ project: 1 });
fileSchema.index({ task: 1 });
fileSchema.index({ uploadedBy: 1, project: 1, task: 1 });
fileSchema.index({ companyId: 1, isDeleted: 1 });

module.exports = mongoose.model("File", fileSchema);
