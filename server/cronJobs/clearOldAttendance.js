const cron = require("node-cron");
const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const Company = require("../models/Company"); // Add your company model path

const MONGO_URI = process.env.MONGO_URI;

/**
 * Cleanup attendance and leave records older than 1 year for a specific company.
 * @param {string} companyId
 */
const cleanupOldAttendanceAndLeavesForCompany = async (companyId) => {
  try {
    const attendanceThreshold = new Date();
    attendanceThreshold.setFullYear(attendanceThreshold.getFullYear() - 1);
    attendanceThreshold.setUTCHours(0, 0, 0, 0);

    const leaveThreshold = new Date();
    leaveThreshold.setFullYear(leaveThreshold.getFullYear() - 1);
    leaveThreshold.setUTCHours(0, 0, 0, 0);

    // Delete Attendance records older than 1 year for this company
    const attendanceResult = await Attendance.deleteMany({
      companyId,
      date: { $lt: attendanceThreshold },
    });
    console.log(
      attendanceResult.deletedCount > 0
        ? `✅ Old attendance records cleared for company ${companyId}: ${attendanceResult.deletedCount}`
        : `⚠ No old attendance records found to delete for company ${companyId}.`
    );

    // Delete Leave requests older than 1 year for this company
    const leaveResult = await Leave.deleteMany({
      companyId,
      createdAt: { $lt: leaveThreshold },
    });
    console.log(
      leaveResult.deletedCount > 0
        ? `✅ Old leave records cleared for company ${companyId}: ${leaveResult.deletedCount}`
        : `⚠ No old leave records found to delete for company ${companyId}.`
    );
  } catch (error) {
    console.error(`❌ Error cleaning old records for company ${companyId}:`, error);
  }
};

/**
 * Scheduled cleanup job - runs daily at midnight UTC
 */
cron.schedule("0 0 * * *", async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB for cleanup job");

    const companies = await Company.find({}, { _id: 1 }).lean();

    for (const company of companies) {
      await cleanupOldAttendanceAndLeavesForCompany(company._id);
    }
  } catch (error) {
    console.error("❌ Critical error during cleanup process:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 MongoDB connection closed after cleanup job");
  }
});

console.log("⏳ Attendance and Leave cleanup job scheduled...");
