const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    companyId: {
      type: String,
      ref: "Company",
      required: true,
      index: true
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: [
        'TASK_ASSIGNED',
        'TASK_DUE_SOON',
        'TASK_OVERDUE',
        'REVIEW_APPROVED',
        'REVIEW_REJECTED',
        'LEAVE_APPROVED',
        'LEAVE_REJECTED',
        'LEAVE_PENDING',
        'REVIEW_PENDING',
        'CHAT',
        'TASK_UPDATED'
      ],
      required: true
    },
    title: {
      type: String,
      required: true,
      maxlength: 100
    },
    message: {
      type: String,
      required: true,
      maxlength: 500
    },
    isRead: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 4 * 24 * 60 * 60 * 1000) // 4 days from creation
    }
  },
  {
    timestamps: true
  }
);

// ✅ TTL index for automatic expiry after 4 days
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Notification", notificationSchema);
