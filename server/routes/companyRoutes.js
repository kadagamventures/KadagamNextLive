const express = require("express");
const { body } = require("express-validator");
const router = express.Router();

const companyController = require("../controllers/companyController");
const {
  validateRequest,
  validateEmailFormat,
  validateEmailUnique,
  validateObjectId,
} = require("../middlewares/validationMiddleware");

/**
 * @route   POST /api/company/register
 * @desc    Step 1: Stub-register the company (basic info) and return companyId
 */
router.post(
  "/register",
  [
    // Email validations
    validateEmailFormat,
    validateEmailUnique,

    // Company name is required
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Company name is required."),

    // Password validation
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long."),

    // Phone number validation
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
 */
router.post(
  "/details",
  [
    // Validate companyId
    body("companyId")
      .exists()
      .withMessage("companyId is required.")
      .bail()
      .isString()
      .withMessage("companyId must be a string.")
      .bail()
      .isMongoId()
      .withMessage("companyId must be a valid MongoDB ObjectId."),

    // Optional alphanumeric fields
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

    // Optional text fields
    body("companyType")
      .optional()
      .isString()
      .withMessage("Company type must be text."),

    body("address")
      .optional()
      .isString()
      .withMessage("Address must be text."),

    // Admin password
    body("adminPassword")
      .isLength({ min: 8 })
      .withMessage("Admin password must be at least 8 characters long."),
  ],
  validateRequest,
  companyController.addCompanyDetails
);

module.exports = router;
