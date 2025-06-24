const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const verificationController = require('../controllers/verificationController');
const Company = require('../models/Company');
const verificationService = require('../services/verificationService');

/**
 * Helper middleware to run express-validator checks
 */
function runValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

/**
 * @route   POST /api/verify/send
 * @desc    Generate and email a 4-digit verification code to the company
 * @body    { companyId: string }
 */
router.post(
  '/send',
  [
    body('companyId')
      .trim()
      .notEmpty().withMessage('companyId is required')
      .isLength({ min: 6, max: 6 }).withMessage('companyId must be 6 characters'),
  ],
  runValidation,
  verificationController.sendCode
);

/**
 * @route   POST /api/verify/confirm
 * @desc    Confirm the 4-digit verification code and mark the company verified
 * @body    { companyId: string, code: string }
 */
router.post(
  '/confirm',
  [
    body('companyId')
      .trim()
      .notEmpty().withMessage('companyId is required')
      .isLength({ min: 6, max: 6 }).withMessage('companyId must be 6 characters'),
    body('code')
      .trim()
      .notEmpty().withMessage('Verification code is required')
      .isNumeric().withMessage('Verification code must be numeric')
      .isLength({ min: 4, max: 4 }).withMessage('Verification code must be 4 digits'),
  ],
  runValidation,
  verificationController.confirmCode
);

/**
 * @route   POST /api/verify/resend
 * @desc    Resend verification code if company email is not verified
 * @body    { companyId: string }
 */
router.post(
  '/resend',
  [
    body('companyId')
      .trim()
      .notEmpty().withMessage('companyId is required')
      .isLength({ min: 6, max: 6 }).withMessage('companyId must be 6 digits'),
  ],
  runValidation,
  async (req, res) => {
    try {
      const { companyId } = req.body;

      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      await verificationService.sendVerificationEmail(companyId, company.email);

      return res.json({ message: 'Verification code resent to your email.' });
    } catch (err) {
      console.error("🔴 /verify/resend error:", err);
      return res.status(500).json({ error: 'Failed to resend verification code.' });
    }
  }
);

module.exports = router;
