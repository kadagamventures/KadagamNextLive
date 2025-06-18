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
// (mounted under "/api/super-admin")
// ─────────────────────────────

// Company List
// GET /api/super-admin/companies
router.get(
  "/companies",
  verifyToken,
  isSuperAdmin,
  superAdminController.getCompanies
);

// Company Details & Soft‑Delete
// GET    /api/super-admin/companies/:id
// DELETE /api/super-admin/companies/:id
router
  .route("/companies/:id")
  .get(verifyToken, isSuperAdmin, superAdminController.getCompanyDetails)
  .delete(verifyToken, isSuperAdmin, superAdminController.deleteCompany);

// Subscription Status Update
// PUT /api/super-admin/companies/:id/subscription
router.put(
  "/companies/:id/subscription",
  verifyToken,
  isSuperAdmin,
  superAdminController.updateSubscription
);

// Trust Level & Verification
// PUT /api/super-admin/companies/:id/trust
router.put(
  "/companies/:id/trust",
  verifyToken,
  isSuperAdmin,
  superAdminController.updateTrust
);

// Payment History
// GET /api/super-admin/companies/:id/payments
router.get(
  "/companies/:id/payments",
  verifyToken,
  isSuperAdmin,
  superAdminController.getPaymentHistory
);

// Revenue Dashboard
// GET /api/super-admin/revenue?year=YYYY&month=0-11
router.get(
  "/revenue",
  verifyToken,
  isSuperAdmin,
  superAdminController.getRevenue
);

// Plan Management
// GET  /api/super-admin/plans
// PUT  /api/super-admin/plans
router
  .route("/plans")
  .get(verifyToken, isSuperAdmin, superAdminController.getPlanConfig)
  .put(verifyToken, isSuperAdmin, superAdminController.updatePlanConfig);

module.exports = router;
