const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const checkPermissions = require("../middlewares/permissionsMiddleware");

const { getUserProfile, getMyProfile } = require("../controllers/userController");
const { getAssignedProjects } = require("../controllers/projectController");

// ✅ Protect All Routes
router.use(verifyToken);

/**
 * 👤 USER PROFILE ROUTES
 * - Staff can ONLY view their own profile.
 * - Admins/permissioned staff can view others.
 */
router.get("/profile", (req, res, next) => {
  req.params.id = req.user.id; // Staff fetches only their own ID
  next();
}, getUserProfile);

// 🧑‍💼 Logged-in staff profile (more detailed)
router.get("/my-profile", getMyProfile);

/**
 * 📁 ASSIGNED PROJECTS
 * - Only staff with `manage_project` can access all assigned project info.
 */
router.get("/projects/assigned", checkPermissions("manage_project"), getAssignedProjects);

module.exports = router;
