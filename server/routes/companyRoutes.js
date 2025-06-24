// server/routes/companyRoutes.js

const express               = require("express");
const { body }              = require("express-validator");
const router                = express.Router();

const companyController     = require("../controllers/companyController");
const {
  validateRequest,
  validateEmailFormat,
  validateEmailUnique,
} = require("../middlewares/validationMiddleware");
const { verifyToken }       = require("../middlewares/authMiddleware");

/**
 * @route   POST /api/company/register
 * @desc    Step 1: Stub-register the company (basic info) and return companyId
 * @access  Public
 */
router.post(
  "/register",
  [
    validateEmailFormat,
    validateEmailUnique,
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Company name is required."),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long."),
    body("phone")
      .trim()
      .notEmpty()
      .withMessage("Phone number is required.")
      .bail()
      .isMobilePhone()
      .withMessage("Phone number must be valid."),
  ],
  validateRequest,
  companyController.registerCompany
);

/**
 * @route   POST /api/company/details
 * @desc    Step 2: Complete registration, add company details & create tenant-admin
 * @access  Public
 */
router.post(
  "/details",
  [
    body("companyId")
      .trim()
      .notEmpty()
      .withMessage("companyId is required.")
      .bail()
      .isLength({ min: 6, max: 6 })
      .withMessage("companyId must be a 6-digit code.")
      .bail()
      .matches(/^[0-9]{6}$/)
      .withMessage("companyId must contain only digits."),
    body("gstin")
      .optional()
      .isAlphanumeric()
      .withMessage("GSTIN must be alphanumeric."),
    body("cin")
      .optional()
      .isAlphanumeric()
      .withMessage("CIN must be alphanumeric."),
    body("pan")
      .optional()
      .isAlphanumeric()
      .withMessage("PAN must be alphanumeric."),
    body("companyType")
      .optional()
      .isString()
      .withMessage("Company type must be text."),
    body("address")
      .optional()
      .isString()
      .withMessage("Address must be text."),
    body("adminPassword")
      .isLength({ min: 8 })
      .withMessage("Admin password must be at least 8 characters long."),
  ],
  validateRequest,
  companyController.addCompanyDetails
);

/**
 * @route   POST /api/company/verify
 * @desc    Step 3: Verify company via OTP/code
 * @access  Public
 */
router.post(
  "/verify",
  [
    body("companyId")
      .trim()
      .notEmpty()
      .withMessage("companyId is required."),
    body("code")
      .trim()
      .notEmpty()
      .withMessage("Verification code is required."),
  ],
  validateRequest,
  companyController.verifyCompany
);

router.post(
  "/resend-otp",
  companyController.resendOtp
);

/**
 * Protect the following routes—these require a valid token
 */
router.use(verifyToken);

/**
 * @route   GET /api/company/status
 * @desc    Step 4: Get the company’s current verification status
 * @access  Protected
 */
router.get(
  "/status",
  companyController.getCompanyStatus
);

/**
 * @route   POST /api/company/resend-otp
 * @desc    Step 5: Resend the OTP without re-submitting details
 * @access  Protected
 */


module.exports = router;
