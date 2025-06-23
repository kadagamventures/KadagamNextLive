// server/middlewares/validationMiddleware.js

const { validationResult, check } = require("express-validator");
const Company = require("../models/Company");
const User = require("../models/User");
const Task = require("../models/Task");

/**
 * Middleware: format express-validator errors into a consistent JSON shape
 */
function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed. Please check your input.",
      errors: errors.array().map((err) => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }
  next();
}

/**
 * Common field validators
 */

// 📧 Email must be valid
const validateEmailFormat = check("email")
  .isEmail()
  .withMessage("Invalid email format.")
  .normalizeEmail();

// 📧 Email must be unique (used in /register)
const validateEmailUnique = check("email")
  .custom(async (email) => {
    const existing = await Company.findOne({ email, isDeleted: false });
    return !existing;
  })
  .withMessage("This email is already registered.");

// 📧 Email must exist (used in /login or recovery flows)
const validateEmailExists = check("email")
  .custom(async (email) => {
    const existing = await Company.findOne({ email, isDeleted: false });
    return !!existing;
  })
  .withMessage("No account found for this email.");

// 🔍 Generic MongoDB ObjectId validator
const validateObjectId = (field) =>
  check(field)
    .isMongoId()
    .withMessage(`${field} is not a valid MongoDB ID.`);

// 📅 ISO date validator
const validateDate = (field) =>
  check(field)
    .isISO8601()
    .withMessage(`${field} must be a valid date (YYYY-MM-DD).`);

// 🧑 Ensure user exists
const checkUserExists = check("userId")
  .custom(async (id) => {
    const user = await User.findOne({ _id: id, isDeleted: false });
    return !!user;
  })
  .withMessage("User not found.");

// 📋 Ensure task exists
const checkTaskExists = check("taskId")
  .custom(async (id) => {
    const task = await Task.findOne({ _id: id, isDeleted: false });
    return !!task;
  })
  .withMessage("Task not found.");

module.exports = {
  validateRequest,
  validateEmailFormat,
  validateEmailUnique,
  validateEmailExists,
  validateObjectId,
  validateDate,
  checkUserExists,
  checkTaskExists,
};
