const express = require("express");
const { getDashboardOverview, getDashboardCharts } = require("../controllers/adminDashboardController");
const { verifyToken } = require("../middlewares/authMiddleware"); // ✅ Ensure JWT-protected access
const router = express.Router();

// ✅ Apply token-based authentication middleware
router.use(verifyToken);

// ✅ [GET] /dashboard/overview
// 🔐 Returns total counts (projects, staff, tasks) scoped to company
router.get("/overview", getDashboardOverview);

// ✅ [GET] /dashboard/charts
// 🔐 Returns pie + bar chart stats scoped to company
router.get("/charts", getDashboardCharts);

module.exports = router;
