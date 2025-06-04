const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format!"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },
    role: {
      type: String,
      trim: true,
      default: "staff", // staff | admin | super_admin
    },
    permissions: {
      type: [String],
      default: [],
    },
    staffId: {
      type: String,
      required: [true, "Staff ID is required"],
      trim: true,
    },
    salary: {
      type: Number,
      default: 0,
      min: [0, "Salary must be positive"],
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[0-9]{10,15}$/.test(v);
        },
        message: (props) => `${props.value} is not a valid phone number!`,
      },
    },
    team: {
      type: String,
      default: "",
      trim: true,
    },
    assignedProjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
      },
    ],
    profilePic: {
      fileUrl: {
        type: String,
        default: "",
        trim: true,
      },
      fileKey: {
        type: String,
        default: "",
        trim: true,
      },
    },
    resume: {
      fileUrl: {
        type: String,
        default: "",
        trim: true,
      },
      fileKey: {
        type: String,
        default: "",
        trim: true,
      },
    },

    // ✅ Add these fields for password reset support
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },

    companyId: {
      type: String,
      ref: "Company",
      required: function () {
        return this.role !== "super_admin";
      },
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        delete ret.password;
        return ret;
      },
    },
  }
);

// ✅ Text search index
userSchema.index({ name: "text", email: "text" });

// ✅ Compound index: companyId + staffId must be unique
userSchema.index({ companyId: 1, staffId: 1 }, { unique: true });

// ✅ Virtual field for full name (can extend this in future)
userSchema.virtual("fullName").get(function () {
  return this.name;
});

const User = mongoose.model("User", userSchema);
module.exports = User;
