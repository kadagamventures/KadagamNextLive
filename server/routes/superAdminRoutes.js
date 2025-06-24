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

// ────────────────────────────────────
// 🔐 Super‑Admin Login (no token required)
// POST /api/super-admin/login
// ────────────────────────────────────
router.post("/login", superAdminController.login);

// ────────────────────────────────────
// 🔐 Protected Super‑Admin Routes
// Mounted under "/api/super-admin"
// ────────────────────────────────────

// 🏢 Company List
// GET /api/super-admin/companies
router.get(
  "/companies",
  verifyToken,
  isSuperAdmin,
  superAdminController.getCompanies
);

// 🏢 Company Details & Soft‑Delete
// GET    /api/super-admin/companies/:id
// DELETE /api/super-admin/companies/:id
router
  .route("/companies/:id")
  .get(verifyToken, isSuperAdmin, superAdminController.getCompanyDetails)
  .delete(verifyToken, isSuperAdmin, superAdminController.deleteCompany);

// 🔄 Subscription Status Update
// PUT /api/super-admin/companies/:id/subscription
router.put(
  "/companies/:id/subscription",
  verifyToken,
  isSuperAdmin,
  superAdminController.updateSubscription
);

// ⚙️ Trust Level & Verification
// PUT /api/super-admin/companies/:id/trust
router.put(
  "/companies/:id/trust",
  verifyToken,
  isSuperAdmin,
  superAdminController.updateTrust
);

// 💳 Payment History (with optional year filter)
// GET /api/super-admin/companies/:id/payments?year=YYYY
router.get(
  "/companies/:id/payments",
  verifyToken,
  isSuperAdmin,
  superAdminController.getPaymentHistory
);

// 📥 Download Invoice PDF
// GET /api/super-admin/companies/:id/payments/:invoiceId/pdf
router.get(
  "/companies/:id/payments/:invoiceId/pdf",
  verifyToken,
  isSuperAdmin,
  superAdminController.downloadInvoicePDF
);

// 📊 Revenue Dashboard
// GET /api/super-admin/revenue?year=YYYY
router.get(
  "/revenue",
  verifyToken,
  isSuperAdmin,
  superAdminController.getRevenue
);

// ⚙️ Plan Management
// GET  /api/super-admin/plans
// PUT  /api/super-admin/plans
router
  .route("/plans")
  .get(verifyToken, isSuperAdmin, superAdminController.getPlanConfig)
  .put(verifyToken, isSuperAdmin, superAdminController.updatePlanConfig);

// 🔁 Update Single Plan
// PUT /api/super-admin/plans/:id
router.put(
  "/plans/:id",
  verifyToken,
  isSuperAdmin,
  superAdminController.updateSinglePlan
);

module.exports = router;
