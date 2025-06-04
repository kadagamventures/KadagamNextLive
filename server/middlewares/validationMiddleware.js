const { validationResult } = require("express-validator");

/**
 *  Middleware to handle validation errors in a structured format.
 */
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: "Validation failed. Please check your input.",
            errors: errors.array().map(err => ({
                field: err.param,
                message: err.msg
            }))
        });
    }
    next();
};

/**
 *  Utility Validators for Common Fields
 */
const { check } = require("express-validator");

// 📌 Common Email Validator
const validateEmail = check("email")
    .isEmail()
    .withMessage("Invalid email format.")
    .normalizeEmail();

// 📌 Common ObjectId Validator (MongoDB ID)
const validateObjectId = (field) => 
    check(field)
    .isMongoId()
    .withMessage(`${field} is not a valid MongoDB ID.`);

// 📌 Date Validator
const validateDate = (field) => 
    check(field)
    .isISO8601()
    .withMessage(`${field} must be a valid date (YYYY-MM-DD).`);

/**
 *  Custom Validator: Ensure User Exists in DB
 */
const User = require("../models/User");
const checkUserExists = check("userId").custom(async (value) => {
    const user = await User.findById(value);
    if (!user) throw new Error("User not found.");
});

/**
 *  Custom Validator: Ensure Task Exists in DB
 */
const Task = require("../models/Task");
const checkTaskExists = check("taskId").custom(async (value) => {
    const task = await Task.findById(value);
    if (!task) throw new Error("Task not found.");
});

/**
 *  Simple Sum Function (Example Utility)
 */
const sum = (a, b) => a + b;



module.exports = {
    validateRequest,    // General validation middleware
    validateEmail,      // Email validation
    validateObjectId,   // ObjectId validation (MongoDB)
    validateDate,       // Date validation
    checkUserExists,    // Ensure user exists
    checkTaskExists,    // Ensure task exists
    sum                 // Sum function
};
