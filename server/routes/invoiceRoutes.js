// server/routes/invoiceRoutes.js

const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const invoiceController = require("../controllers/invoiceController");

/**
 * @route   POST /api/invoices/create
 * @desc    Full end‑to‑end: record invoice, generate PDF, upload to S3, email it, and return a download URL.
 * @access  Public (called by your payment‑success webhook)
 */
router.post("/create", invoiceController.createAndSendInvoice);

/**
 * @route   GET /api/invoices/:invoiceNumber/download
 * @desc    Return a presigned URL for downloading the invoice PDF.
 * @access  Protected (tenant must be logged in)
 */
router.get(
  "/:invoiceNumber/download",
  verifyToken,
  invoiceController.getInvoiceDownloadUrl
);

module.exports = router;
