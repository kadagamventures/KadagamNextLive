const cron = require("node-cron");
const mongoose = require("mongoose");
const Leave = require("../models/Leave");
const Company = require("../models/Company"); // Assuming you have this model
const { connectDB, closeDB } = require("../config/dbConfig");

/**
 * ✅ Soft delete leave records older than one year for a specific company (excluding declared leave).
 * @param {string|ObjectId} companyId
 */
const cleanupOldLeavesForCompany = async (companyId) => {
    try {
        console.log(`🔄 Starting cleanup of old leave records for company ${companyId}...`);

        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        // Count leaves eligible for cleanup in this company only
        const totalLeaves = await Leave.countDocuments({
            companyId,
            createdAt: { $lt: oneYearAgo },
            isDeleted: false,
            type: { $ne: "declared_leave" },
        });

        if (totalLeaves === 0) {
            console.log(`✅ No old leave records to clean up for company ${companyId}.`);
            return;
        }

        // Soft delete leave records for this company
        const result = await Leave.updateMany(
            {
                companyId,
                createdAt: { $lt: oneYearAgo },
                isDeleted: false,
                type: { $ne: "declared_leave" },
            },
            { $set: { isDeleted: true, deletedAt: new Date() } }
        );

        console.log(`🗑️ Total old leave records identified: ${totalLeaves}`);
        console.log(`✅ Successfully soft-deleted ${result.modifiedCount} leave records for company ${companyId}.`);

    } catch (error) {
        console.error(`❌ Error during old leave records cleanup for company ${companyId}:`, error);
    }
};

/**
 * ✅ Scheduled Cron Job: Every Sunday at 3 AM
 */
cron.schedule("0 3 * * 0", async () => {
    console.log("⏳ Running scheduled weekly leave cleanup for all companies...");

    try {
        await connectDB();

        // Fetch all active companies
        const companies = await Company.find({}, { _id: 1 }).lean();

        for (const company of companies) {
            await cleanupOldLeavesForCompany(company._id);
        }
    } catch (err) {
        console.error("❌ Error running scheduled leave cleanup for companies:", err);
    } finally {
        await closeDB();
    }
});

module.exports = cleanupOldLeavesForCompany;
