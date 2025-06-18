// server/routes/paymentStatusRoutes.js

const express = require("express");
const router = express.Router();
const controller = require("../controllers/paymentStatusController");
const { verifyToken } = require("../middlewares/authMiddleware");

// 🔐 Protect all routes with authentication middleware
router.use(verifyToken);

// 📘 Get current subscription status
// GET /api/payment-status/status
router.get("/status", controller.fetchStatus);

// 🔄 Extend subscription (called after payment is confirmed client‑side)
// POST /api/payment-status/extend
router.post("/extend", controller.extendSubscription);

// 📜 Get payment history (optional ?year=YYYY filter)
// GET /api/payment-status/history
router.get("/history", controller.fetchHistory);

// 📥 Download PDF invoice for a specific payment
// GET /api/payment-status/invoice/:invoiceId/pdf
router.get("/invoice/:invoiceId/pdf", controller.downloadInvoicePDF);

module.exports = router;
