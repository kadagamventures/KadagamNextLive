// ./routes/invoiceRoutes.js

const express = require("express");
const { body, validationResult } = require("express-validator");
const InvoiceService = require("../services/invoiceService");

const router = express.Router();

/**
 * @route   POST /api/invoices/generate
 * @desc    Generate a new invoice (manual)
 * @access  Protected (add your auth middleware as needed)
 */
router.post(
  "/generate",
  [
    body("companyId", "companyId is required").isString().notEmpty(),
    body("planId", "planId must be a valid ObjectId").isMongoId(),
    body("planName", "planName is required").isString().notEmpty(),
    body("baseAmount", "baseAmount must be a non-negative number")
      .isFloat({ min: 0 }),
    body("gstPercentage", "gstPercentage must be between 0 and 100")
      .isFloat({ min: 0, max: 100 }),
    body("periodStart", "periodStart must be a valid date").isISO8601(),
    body("periodEnd", "periodEnd must be a valid date").isISO8601(),
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const {
        companyId,
        planId,
        planName,
        baseAmount,
        gstPercentage,
        periodStart,
        periodEnd,
      } = req.body;

      const invoiceResult = await InvoiceService.processInvoice({
        companyId,
        planId,
        planName,
        baseAmount: Number(baseAmount),
        gstPercentage: Number(gstPercentage),
        paymentMethod: "manual",                    // more descriptive
        transactionId: `MANUAL-${Date.now()}`,      // unique manual txn id
        periodStart:   new Date(periodStart),
        periodEnd:     new Date(periodEnd),
      });

      return res
        .status(201)
        .json({ success: true, invoice: invoiceResult });
    } catch (err) {
      console.error("Generate invoice error:", err);
      return res
        .status(500)
        .json({ success: false, message: err.message });
    }
  }
);

module.exports = router;
