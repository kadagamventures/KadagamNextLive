const express = require("express");
const router = express.Router();
const projectController = require("../controllers/projectController");
const { verifyToken } = require("../middlewares/authMiddleware");
const checkPermissions = require("../middlewares/permissionsMiddleware");

// ✅ All routes require authentication
router.use(verifyToken);

/**
 * ✅ CREATE / UPDATE / DELETE / RESTORE PROJECTS
 * - Only admins and users with "manage_project" permission
 */
router.post("/", checkPermissions("manage_project"), projectController.createProject);
router.put("/:id", checkPermissions("manage_project"), projectController.updateProject);
router.delete("/:id", checkPermissions("manage_project"), projectController.softDeleteProject);
router.put("/:id/restore", checkPermissions("manage_project"), projectController.restoreProject);

/**
 * ✅ GET ALL PROJECTS
 * - Admins, manage_project, and manage_task can access all
 * - Others are blocked (this is also handled in controller)
 */
router.get("/", async (req, res, next) => {
  try {
    const { role, permissions = [] } = req.user || {};

    if (
      role === "admin" ||
      permissions.includes("manage_project") ||
      permissions.includes("manage_task")
    ) {
      return projectController.getAllProjects(req, res, next);
    }

    return res.status(403).json({ message: "❌ Access denied: No permission to view projects." });
  } catch (error) {
    console.error("❌ [Project Fetch Error]:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

/**
 * ✅ GET PROJECT BY ID
 * - Admins and manage_project can access any project
 * - Other staff can access only if assigned
 */
const checkProjectAccess = async (req, res, next) => {
  try {
    const { id: userId, companyId, role, permissions = [] } = req.user;

    if (role === "admin" || permissions.includes("manage_project")) {
      return next();
    }

    const project = await projectController.getProjectByIdWithAccessCheck(
      req.params.id,
      userId,
      companyId
    );

    if (!project) {
      return res.status(403).json({ message: "Access denied: You are not assigned to this project." });
    }

    return next();
  } catch (error) {
    console.error("❌ [Project Access Check Error]:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

router.get("/:id", checkProjectAccess, projectController.getProjectById);

module.exports = router;
