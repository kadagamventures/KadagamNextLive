// server/routes/superAdminRoutes.js

const express = require("express");
const router = express.Router();
const superAdminController = require("../controllers/superAdminController");
const { verifyToken } = require("../middlewares/authMiddleware");

// 🔐 Super Admin Role Guard
const isSuperAdmin = (req, res, next) => {
  if (req.user?.role !== "super_admin") {
    return res.status(403).json({ message: "Access denied. Super Admin only." });
  }
  next();
};

// ─────────────────────────────
// 🔐 Super-Admin Login (no token required)
// POST /api/super-admin/login
// ─────────────────────────────
router.post("/login", superAdminController.login);

// ─────────────────────────────
// 🔐 Protected Super-Admin Routes
// Prefix in your main app: app.use("/api/super-admin", superAdminRoutes)
// ─────────────────────────────

// Company List & Details
// GET    /api/super-admin/companies
// GET    /api/super-admin/companies/:id
router
  .route("/companies")
  .get(verifyToken, isSuperAdmin, superAdminController.getCompanies);

router
  .route("/companies/:id")
  .get(verifyToken, isSuperAdmin, superAdminController.getCompanyDetails)
  .delete(verifyToken, isSuperAdmin, superAdminController.deleteCompany);

// Subscription & Trust
// PUT    /api/super-admin/companies/:id/status
// PUT    /api/super-admin/companies/:id/trust
router
  .route("/companies/:id/status")
  .put(verifyToken, isSuperAdmin, superAdminController.updateSubscription);

router
  .route("/companies/:id/trust")
  .put(verifyToken, isSuperAdmin, superAdminController.updateTrust);

// Payment History
// GET /api/super-admin/companies/:id/payments
router
  .route("/companies/:id/payments")
  .get(verifyToken, isSuperAdmin, superAdminController.getPaymentHistory);

// Revenue Dashboard
// GET /api/super-admin/revenue?year=YYYY&month=0-11
router
  .route("/revenue")
  .get(verifyToken, isSuperAdmin, superAdminController.getRevenue);

// Plan Management
// GET  /api/super-admin/plans
// PUT  /api/super-admin/plans
router
  .route("/plans")
  .get(verifyToken, isSuperAdmin, superAdminController.getPlanConfig)
  .put(verifyToken, isSuperAdmin, superAdminController.updatePlanConfig);

module.exports = router;
