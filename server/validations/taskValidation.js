const Joi = require("joi");

/**
 * ✅ MongoDB ObjectId Validation (Ensures ID format is correct)
 */
const objectIdSchema = Joi.string().pattern(/^[a-f\d]{24}$/i).message("Invalid ObjectId format.");

/**
 * ✅ Validate task creation input
 */
const validateTaskCreation = (data) => {
    const schema = Joi.object({
        title: Joi.string().min(3).max(100).required().messages({
            "string.min": "Task title must be at least 3 characters.",
            "string.max": "Task title cannot exceed 100 characters.",
            "any.required": "Task title is required.",
        }),
        projectId: objectIdSchema.required().messages({
            "any.required": "Project ID is required.",
        }),
        assignedTo: Joi.array().items(objectIdSchema).min(1).required().messages({
            "array.min": "At least one assigned user is required.",
            "any.required": "Assigned users are required.",
        }),
        dueDate: Joi.date().greater("now").required().messages({
            "date.greater": "Due date must be in the future.",
            "any.required": "Due date is required.",
        }),
        priority: Joi.string().valid("Low", "Medium", "High", "Critical").required().messages({
            "any.only": "Priority must be 'Low', 'Medium', 'High', or 'Critical'.",
            "any.required": "Priority is required.",
        }),
        status: Joi.string().valid("To-Do", "Ongoing", "Completed", "Overdue").default("To-Do").messages({
            "any.only": "Status must be 'To-Do', 'Ongoing', 'Completed', or 'Overdue'.",
        }),
        description: Joi.string().max(500).optional().messages({
            "string.max": "Task description cannot exceed 500 characters.",
        }),
        attachment: Joi.string().uri().optional().messages({
            "string.uri": "Attachment must be a valid URL.",
        }),
    });

    return schema.validate(data, { abortEarly: false });
};

/**
 * ✅ Validate task update input
 */
const validateTaskUpdate = (data) => {
    const schema = Joi.object({
        title: Joi.string().min(3).max(100).optional().messages({
            "string.min": "Task title must be at least 3 characters.",
            "string.max": "Task title cannot exceed 100 characters.",
        }),
        projectId: objectIdSchema.optional(),
        assignedTo: Joi.array().items(objectIdSchema).min(1).optional().messages({
            "array.min": "At least one assigned user is required.",
        }),
        dueDate: Joi.date().greater("now").optional().messages({
            "date.greater": "Due date must be in the future.",
        }),
        priority: Joi.string().valid("Low", "Medium", "High", "Critical").optional().messages({
            "any.only": "Priority must be 'Low', 'Medium', 'High', or 'Critical'.",
        }),
        status: Joi.string().valid("To-Do", "Ongoing", "Completed", "Overdue").optional().messages({
            "any.only": "Status must be 'To-Do', 'Ongoing', 'Completed', or 'Overdue'.",
        }),
        description: Joi.string().max(500).optional().messages({
            "string.max": "Task description cannot exceed 500 characters.",
        }),
        attachment: Joi.string().uri().optional().messages({
            "string.uri": "Attachment must be a valid URL.",
        }),
    });

    return schema.validate(data, { abortEarly: false });
};

/**
 * ✅ Validate task status update (Only Status Change Allowed)
 */
const validateTaskStatusUpdate = (data) => {
    const schema = Joi.object({
        status: Joi.string().valid("To-Do", "Ongoing", "Completed", "Overdue").required().messages({
            "any.only": "Status must be 'To-Do', 'Ongoing', 'Completed', or 'Overdue'.",
            "any.required": "Task status is required.",
        }),
    });

    return schema.validate(data, { abortEarly: false });
};

module.exports = {
    validateTaskCreation,
    validateTaskUpdate,
    validateTaskStatusUpdate,
};
