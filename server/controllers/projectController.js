const asyncHandler = require("express-async-handler");
const projectService = require("../services/projectService");
const { validationResult } = require("express-validator");
const Project = require("../models/Project");

// ✅ Create a new project (Scoped by company)
const createProject = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const projectData = {
      ...req.body,
      createdBy: req.user.id
    };
    const project = await projectService.createProject(projectData, req.user.companyId);
    res.status(201).json({ success: true, project });
  } catch (error) {
    console.error("❌ Error creating project:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ✅ Get all projects (Admins or permissioned staff can access all, others only assigned)
const getAllProjects = asyncHandler(async (req, res) => {
  try {
    const { role, permissions, id, companyId } = req.user;

    if (role === "admin" || permissions.includes("manage_project") || permissions.includes("manage_task")) {
      const projects = await projectService.getAllProjects(companyId, req.query.search || "");
      return res.status(200).json({ success: true, projects });
    }

    const assignedProjects = await projectService.getAssignedProjects(id, companyId);
    return res.status(200).json({ success: true, projects: assignedProjects });
  } catch (error) {
    console.error("❌ [Project Fetch Error]:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// ✅ Get single project (Scoped by company)
const getProjectById = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectById(req.params.id, req.user.companyId);
  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }

  res.status(200).json({ success: true, project });
});

// ✅ Update a project (Scoped by company)
const updateProject = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const updatedProject = await projectService.updateProject(req.params.id, req.body, req.user.companyId);
  if (!updatedProject) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }

  res.status(200).json({ success: true, updatedProject });
});

// ✅ Soft delete project (Scoped by company)
const softDeleteProject = asyncHandler(async (req, res) => {
  const deletedProject = await projectService.softDeleteProject(req.params.id, req.user.companyId);
  if (!deletedProject) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }

  res.status(200).json({ success: true, message: "Project deleted successfully" });
});

// ✅ Restore project (Scoped by company)
const restoreProject = asyncHandler(async (req, res) => {
  const restoredProject = await projectService.restoreProject(req.params.id, req.user.companyId);
  if (!restoredProject) {
    return res.status(404).json({ success: false, message: "Project not found or already active" });
  }

  res.status(200).json({ success: true, message: "Project restored successfully", project: restoredProject });
});

// ✅ Get assigned projects for staff (Scoped by company)
const getAssignedProjects = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  try {
    const assignedProjects = await projectService.getAssignedProjects(userId, req.user.companyId);

    if (!assignedProjects || assignedProjects.length === 0) {
      return res.status(404).json({ success: false, message: "No assigned projects found" });
    }

    res.status(200).json({ success: true, projects: assignedProjects });
  } catch (error) {
    console.error("❌ Error fetching assigned projects:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ✅ Utility to fetch project by ID and verify if user has access (Optional helper)
const getProjectByIdWithAccessCheck = async (projectId, userId, companyId) => {
  const project = await Project.findOne({ _id: projectId, companyId });
  if (!project) return null;
  if (project.assignedStaff.includes(userId)) return project;
  return null;
};

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  softDeleteProject,
  restoreProject,
  getAssignedProjects,
  getProjectByIdWithAccessCheck,
};
