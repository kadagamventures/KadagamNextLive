require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("../config/dbConfig");
const User = require("../models/User");

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "owner@kadagamventures.com";
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || "Kadagam@2025";

const createSuperAdmin = async () => {
  try {
    if (process.env.NODE_ENV === "production") {
      console.error("❌ You should not run this script in production directly.");
      return process.exit(1);
    }

    console.log("🔗 Connecting to MongoDB...");
    await connectDB();

    const existing = await User.findOne({ email: SUPER_ADMIN_EMAIL, role: "super_admin" });

    const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);

    const superAdminData = {
      name: "KadagamNext Owner",
      email: SUPER_ADMIN_EMAIL,
      password: hashedPassword,
      role: "super_admin",
      staffId: "8000", 
      companyId: null,
      isActive: true,
      isDeleted: false,
      permissions: [], 
    };

    if (existing) {
      console.log("⚠️ Super admin already exists. Updating credentials...");
      await User.updateOne({ _id: existing._id }, { $set: superAdminData });
      console.log("✅ Super admin updated successfully.");
    } else {
      await User.create(superAdminData);
      console.log("✅ Super admin created successfully.");
    }
  } catch (error) {
    console.error("❌ Error creating Super Admin:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 MongoDB connection closed.");
  }
};

createSuperAdmin();
