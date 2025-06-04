const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const invoiceController = require("../controllers/invoiceController");

// Public: called by your payment webhook handler after a successful payment
router.post(
  "/create",
  invoiceController.createAndSendInvoice
);

// Tenant download (requires auth)
router.get(
  "/:id/pdf",
  verifyToken,
  invoiceController.downloadInvoicePDF
);

module.exports = router;
