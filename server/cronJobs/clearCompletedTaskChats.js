// scripts/clearCompletedTaskChats.js

const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Task = require("../models/Task");
const Chat = require("../models/Chat");
const Company = require("../models/Company"); // Add your company model path here

const MONGO_URI = process.env.MONGO_URI;

/**
 * Clear chats associated with completed or deleted tasks, company by company.
 * @param {string} companyId
 */
const clearCompletedTaskChatsForCompany = async (companyId) => {
  try {
    console.log(`🧹 Starting chat cleanup for completed tasks for company ${companyId}...`);

    // Find completed or deleted tasks for this company
    const completedTasks = await Task.find({
      companyId,
      $or: [{ status: "Completed" }, { isDeleted: true }],
    }).select("_id");

    const completedTaskIds = completedTasks.map((task) => task._id);

    if (completedTaskIds.length === 0) {
      console.log(`✅ No completed or deleted tasks found for company ${companyId}. Nothing to delete.`);
      return;
    }

    // Delete chat messages associated with those tasks and company
    const result = await Chat.deleteMany({
      companyId,
      taskId: { $in: completedTaskIds },
    });

    console.log(`✅ Deleted ${result.deletedCount} chat messages for company ${companyId} from ${completedTaskIds.length} completed/deleted tasks.`);
  } catch (error) {
    console.error(`❌ Error clearing completed task chats for company ${companyId}:`, error.message);
  }
};

const clearCompletedTaskChats = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    // Get all companies
    const companies = await Company.find({}, { _id: 1 }).lean();

    for (const company of companies) {
      await clearCompletedTaskChatsForCompany(company._id);
    }
  } catch (error) {
    console.error("❌ MongoDB connection error or cleanup failed:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 MongoDB connection closed.");
  }
};

clearCompletedTaskChats();
