const User = require("../models/User");
const Project = require("../models/Project");
const Task = require("../models/Task");

const searchService = {
    /**
     * 🔍 Search users by name, email, or staffId (scoped to company).
     */
    async searchUsers(query, companyId) {
        return await User.find({
            companyId,
            $or: [
                { name: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } },
                { staffId: { $regex: query, $options: "i" } }
            ]
        }).select("name email role staffId");
    },

    /**
     * 🔍 Search projects by name or description (scoped to company).
     */
    async searchProjects(query, companyId) {
        return await Project.find({
            companyId,
            $or: [
                { name: { $regex: query, $options: "i" } },
                { description: { $regex: query, $options: "i" } }
            ]
        }).select("name description createdAt");
    },

    /**
     * 🔍 Search tasks by title, taskId (or _id), optionally filter by assigned staff (scoped to company).
     */
    async searchTasks({ query, assignedStaffId = null, companyId }) {
        const searchQuery = {
            companyId,
            isDeleted: false,
        };

        if (query) {
            searchQuery.$or = [
                { title: { $regex: query, $options: "i" } },
                { _id: query } // attempt direct match on MongoDB ID
            ];
        }

        if (assignedStaffId) {
            searchQuery.assignedTo = assignedStaffId;
        }

        return await Task.find(searchQuery)
            .populate("projects", "name")
            .populate("assignedTo", "name email")
            .select("title status assignedTo dueDate projects");
    },

    /**
     * 🔍 Global search across users, projects, and tasks (scoped to company).
     */
    async globalSearch(query, companyId) {
        const [users, projects, tasks] = await Promise.all([
            searchService.searchUsers(query, companyId),
            searchService.searchProjects(query, companyId),
            searchService.searchTasks({ query, companyId })
        ]);

        return { users, projects, tasks };
    },
};

module.exports = searchService;
