const { check, validationResult } = require("express-validator");

/**
 * ✅ Middleware to Validate Leave Requests
 */
const validateLeaveRequest = [
  check("type")
    .isIn(["leave_request", "workfromhome"])
    .withMessage("Type must be 'leave_request' or 'workfromhome'."),

  check("leaveCategory")
    .optional()
    .isIn(["paid_leave", "medical_leave", "unpaid_leave"])
    .withMessage("Invalid leave category."),

  check("startDate")
    .notEmpty()
    .withMessage("Start date is required.")
    .isISO8601()
    .withMessage("Start date must be a valid date."),

  check("endDate")
    .notEmpty()
    .withMessage("End date is required.")
    .isISO8601()
    .withMessage("End date must be a valid date.")
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.body.startDate)) {
        throw new Error("End date must be after the start date.");
      }
      return true;
    }),

  check("reason")
    .notEmpty()
    .withMessage("Reason is required.")
    .isLength({ max: 500 })
    .withMessage("Reason cannot exceed 500 characters."),

  check("contactEmail")
    .notEmpty()
    .withMessage("Contact email is required.")
    .isEmail()
    .withMessage("Contact email must be a valid email address."),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  }
];

module.exports = { validateLeaveRequest };
