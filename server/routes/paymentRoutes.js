// server/routes/paymentRoutes.js

const express = require("express");
const { body, validationResult } = require("express-validator");
const router = express.Router();

const { verifyToken }             = require("../middlewares/authMiddleware");
const ensureVerifiedTenant        = require("../middlewares/ensureVerifiedTenant");
const enforceActiveSubscription   = require("../middlewares/enforceActiveSubscription");
const paymentController           = require("../controllers/paymentController");

// Helper to send back validation errors
function runValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

// ───────────────────────────────────────────────────────────────────────────────
// All create-order and capture endpoints require a valid JWT and a verified tenant
// ───────────────────────────────────────────────────────────────────────────────
router.use(
  ["/create-order", "/capture"],
  verifyToken,
  ensureVerifiedTenant
);

// ───────────────────────────────────────────────────────────────────────────────
// POST /api/payment/create-order
// Body: { planId }
// ───────────────────────────────────────────────────────────────────────────────
router.post(
  "/create-order",
  [
    body("planId")
      .trim()
      .notEmpty()
      .withMessage("planId is required")
      .isMongoId()
      .withMessage("planId must be a valid MongoDB ObjectId"),
  ],
  runValidation,
  paymentController.createOrder
);

// ───────────────────────────────────────────────────────────────────────────────
// POST /api/payment/capture
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// ───────────────────────────────────────────────────────────────────────────────
router.post(
  "/capture",
  [
    body("razorpay_order_id")
      .trim()
      .notEmpty()
      .withMessage("razorpay_order_id is required"),
    body("razorpay_payment_id")
      .trim()
      .notEmpty()
      .withMessage("razorpay_payment_id is required"),
    body("razorpay_signature")
      .trim()
      .notEmpty()
      .withMessage("razorpay_signature is required"),
  ],
  runValidation,
  paymentController.capturePayment
);

// ───────────────────────────────────────────────────────────────────────────────
// POST /api/payment/webhook
// (no auth; called by Razorpay)
// ───────────────────────────────────────────────────────────────────────────────
router.post(
  "/webhook",
  express.json({ type: "application/json" }),  // ensure raw body for signature
  paymentController.handleWebhook
);

// ───────────────────────────────────────────────────────────────────────────────
// GET /api/payment/status
// Requires JWT, verified tenant, and active subscription
// ───────────────────────────────────────────────────────────────────────────────
router.get(
  "/status",
  verifyToken,
  ensureVerifiedTenant,
  enforceActiveSubscription,
  paymentController.fetchStatus
);

module.exports = router;
