// routes/companyRoutes.js

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
const { verifyToken } = require("../middlewares/authMiddleware");

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


router.post(
  "/details",
  [
    body("companyId")
      .exists()
      .withMessage("companyId is required.")
      .bail()
      .isString()
      .withMessage("companyId must be a string.")
      .bail()
      .isMongoId()
      .withMessage("companyId must be a valid MongoDB ObjectId."),
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

// All routes below require a valid JWT
router.use(verifyToken);


module.exports = router;
