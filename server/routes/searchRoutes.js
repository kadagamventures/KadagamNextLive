const express = require("express");
const router = express.Router();
const searchController = require("../controllers/searchController");
const { verifyToken } = require("../middlewares/authMiddleware");
const checkPermissions = require("../middlewares/permissionsMiddleware");

// 🔒 All search routes require authentication
router.use(verifyToken);

// ✅ Search for staff by name, email, or staffId
// Only Admin & Staff with "manage_staff" permission can search staff
router.get("/staff", checkPermissions("manage_staff"), searchController.searchStaff);

// ✅ Search for projects by name, relatedTo, or status
// Only Admin & Staff with "manage_project" permission can search projects
router.get("/projects", checkPermissions("manage_project"), searchController.searchProjects);

// ✅ Search for both staff & projects
router.get("/all", checkPermissions("manage_staff"), searchController.searchAll);

module.exports = router;
