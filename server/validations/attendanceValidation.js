const { check, validationResult } = require("express-validator");

/**
 * ✅ Middleware to Validate Attendance Check-In
 */
const validateCheckIn = [
  check("staffId")
    .notEmpty()
    .withMessage("Staff ID is required.")
    .isMongoId()
    .withMessage("Invalid staff ID format."),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  }
];

/**
 * ✅ Middleware to Validate Attendance Check-Out
 */
const validateCheckOut = [
  check("staffId")
    .notEmpty()
    .withMessage("Staff ID is required.")
    .isMongoId()
    .withMessage("Invalid staff ID format."),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  }
];

/**
 * ✅ Middleware to Validate Attendance Report Request
 */
const validateAttendanceReport = [
  check("staffId")
    .optional()
    .isMongoId()
    .withMessage("Invalid staff ID format."),
  check("date")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format. Use YYYY-MM-DD."),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  }
];

module.exports = {
  validateCheckIn,
  validateCheckOut,
  validateAttendanceReport
};
