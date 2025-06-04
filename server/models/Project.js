const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema(
  {
    companyId: {
      type: String,
      ref: "Company",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 150,
    },
    relatedTo: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedStaff: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    status: {
      type: String,
      enum: ["Pending", "Ongoing", "Completed", "Cancelled"],
      default: "Pending",
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    tasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    completedTasks: {
      type: Number,
      default: 0,
    },
    totalTasks: {
      type: Number,
      default: 0,
    },
    completionRate: {
      type: Number,
      default: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ✅ Automatically exclude soft-deleted projects
ProjectSchema.pre(/^find/, function (next) {
  this.setQuery({ ...this.getQuery(), isDeleted: false });
  next();
});

// ✅ Auto-calculate completionRate and set endDate if completed
ProjectSchema.pre("save", function (next) {
  if (this.totalTasks > 0) {
    this.completionRate = parseFloat(((this.completedTasks / this.totalTasks) * 100).toFixed(2));
  } else {
    this.completionRate = 0;
  }

  if (this.status === "Completed" && !this.endDate) {
    this.endDate = new Date();
  }

  next();
});

module.exports = mongoose.model("Project", ProjectSchema);
