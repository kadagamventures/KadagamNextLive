const Joi = require("joi");

/**
 * ✅ MongoDB ObjectId Validation (Ensures ID format is correct)
 */
const objectIdSchema = Joi.string().pattern(/^[a-f\d]{24}$/i).message("Invalid ObjectId format.");

/**
 * ✅ Date Range Validation Schema (For Filtering Reports)
 */
const dateRangeSchema = Joi.object({
    startDate: Joi.date().optional().messages({
        "date.base": "Start date must be a valid date.",
    }),
    endDate: Joi.date().optional().greater(Joi.ref("startDate")).messages({
        "date.base": "End date must be a valid date.",
        "date.greater": "End date must be after the start date.",
    }),
});

/**
 * ✅ Validate Attendance Report Request
 */
const validateAttendanceReport = (data) => {
    const schema = Joi.object({
        staffId: objectIdSchema.required(),
    }).concat(dateRangeSchema);

    return schema.validate(data, { abortEarly: false });
};

/**
 * ✅ Validate Project Report Request
 */
const validateProjectReport = (data) => {
    const schema = Joi.object({
        projectId: objectIdSchema.required(),
    }).concat(dateRangeSchema);

    return schema.validate(data, { abortEarly: false });
};

/**
 * ✅ Validate Task Report Request
 */
const validateTaskReport = (data) => {
    const schema = Joi.object({
        taskId: objectIdSchema.required(),
    }).concat(dateRangeSchema);

    return schema.validate(data, { abortEarly: false });
};

/**
 * ✅ Validate Summary Report Request (No Specific Input Required)
 */
const validateSummaryReport = () => {
    return { error: null, value: {} }; // No input validation needed
};

module.exports = {
    validateAttendanceReport,
    validateProjectReport,
    validateTaskReport,
    validateSummaryReport,
};
