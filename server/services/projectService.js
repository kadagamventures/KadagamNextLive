const Project = require("../models/Project");

const projectService = {
  async createProject(projectData, companyId) {
    return await Project.create({ ...projectData, companyId });
  },

  async getAllProjects(companyId, search = "") {
    const query = { isDeleted: false, companyId };
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    return await Project.find(query).lean();
  },

  async getProjectById(projectId, companyId) {
    return await Project.findOne({ _id: projectId, companyId, isDeleted: false }).lean();
  },

  async updateProject(projectId, updateData, companyId) {
    return await Project.findOneAndUpdate(
      { _id: projectId, companyId, isDeleted: false },
      { $set: updateData },
      { new: true }
    ).lean();
  },

  async softDeleteProject(projectId, companyId) {
    return await Project.findOneAndUpdate(
      { _id: projectId, companyId, isDeleted: false },
      { isDeleted: true },
      { new: true }
    ).lean();
  },

  async restoreProject(projectId, companyId) {
    return await Project.findOneAndUpdate(
      { _id: projectId, companyId, isDeleted: true },
      { isDeleted: false },
      { new: true }
    ).lean();
  },
};

module.exports = projectService;
