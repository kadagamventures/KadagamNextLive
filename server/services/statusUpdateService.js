const Task = require("../models/Task");

// List of valid statuses
const VALID_STATUSES = ["To Do", "Ongoing", "Review", "Completed"];

/**
 * ✅ Update single task status (multi-tenant enforced)
 * @param {String} taskId - Task ID
 * @param {String} status - New status
 * @param {String} companyId - Tenant's company ID (required)
 * @returns {Object} Updated task
 */
const updateTaskStatus = async (taskId, status, companyId) => {
    try {
        if (!VALID_STATUSES.includes(status)) {
            throw new Error("Invalid status provided");
        }

        const updatedTask = await Task.findOneAndUpdate(
            { _id: taskId, companyId }, // tenant scoping
            { status },
            { new: true }
        );

        if (!updatedTask) {
            throw new Error("Task not found or access denied");
        }

        return updatedTask;
    } catch (error) {
        throw new Error("Error updating task status: " + error.message);
    }
};

/**
 * ✅ Bulk update task statuses (multi-tenant enforced)
 * @param {Array} taskIds - Array of task IDs
 * @param {String} status - New status
 * @param {String} companyId - Tenant's company ID (required)
 * @returns {Object} Bulk update result
 */
const bulkUpdateTaskStatus = async (taskIds, status, companyId) => {
    try {
        if (!VALID_STATUSES.includes(status)) {
            throw new Error("Invalid status provided");
        }

        const result = await Task.updateMany(
            { _id: { $in: taskIds }, companyId },
            { $set: { status } }
        );

        return result;
    } catch (error) {
        throw new Error("Error in bulk updating task statuses: " + error.message);
    }
};

module.exports = {
    updateTaskStatus,
    bulkUpdateTaskStatus,
};
