const mongoose = require("mongoose");

const performanceSchema = new mongoose.Schema({
  companyId: {
    type: String,
    ref: "Company",
    required: true,
    index: true,
  },
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  attendancePercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0,
  },
  taskCompletionRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0,
  },
  onTimeCompletionRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0,
  },
  projectsParticipated: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  successRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0,
  },
  performanceScore: {
    type: Number,
    min: 0,
    max: 100,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  }
});

// ✅ Auto-calculate performanceScore before saving
performanceSchema.pre("save", function (next) {
  const rawScore = 
    (this.attendancePercentage * 0.2) +
    (this.taskCompletionRate * 0.3) +
    (this.onTimeCompletionRate * 0.2) +
    (this.successRate * 0.3);

  this.performanceScore = parseFloat(rawScore.toFixed(2));
  this.performanceScore = Math.min(Math.max(this.performanceScore, 0), 100);

  this.lastUpdated = Date.now();
  next();
});

module.exports = mongoose.model("Performance", performanceSchema);
