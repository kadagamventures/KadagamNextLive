const express = require("express");
const { body, validationResult } = require("express-validator");
const router = express.Router();

const { verifyToken }             = require("../middlewares/authMiddleware");
const ensureVerifiedTenant        = require("../middlewares/verifyCompanyVerified");
const enforceActiveSubscription   = require("../middlewares/enforceActiveSubscription");
const paymentController           = require("../controllers/paymentController");


function runValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}


router.use(
  ["/create-order", "/capture"],
  verifyToken,
  ensureVerifiedTenant
);

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
    body("planId")
      .trim()
      .notEmpty()
      .withMessage("planId is required")
      .isMongoId()
      .withMessage("planId must be a valid MongoDB ObjectId"),
  ],
  runValidation,
  paymentController.capturePayment
);


router.post("/webhook", paymentController.handleWebhook);


router.get(
  "/status",
  verifyToken,
  ensureVerifiedTenant,
  enforceActiveSubscription,
  paymentController.fetchStatus
);

module.exports = router;
