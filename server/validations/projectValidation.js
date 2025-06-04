const Joi = require("joi");

/**
 * ✅ MongoDB ObjectId Validation (Ensures projectId is valid)
 */
const objectIdSchema = Joi.string().pattern(/^[a-f\d]{24}$/i).message("Invalid projectId format.");

/**
 * ✅ Validate project creation request
 */
const validateCreateProject = (data) => {
    const schema = Joi.object({
        name: Joi.string().min(3).max(100).required().messages({
            "string.min": "Project name must be at least 3 characters long.",
            "string.max": "Project name cannot exceed 100 characters.",
            "any.required": "Project name is required.",
        }),
        relatedTo: objectIdSchema.optional(), // ✅ Ensures relatedTo is a valid ObjectId if provided
        description: Joi.string().max(500).optional().messages({
            "string.max": "Project description cannot exceed 500 characters.",
        }),
    });

    return schema.validate(data, { abortEarly: false });
};

/**
 * ✅ Validate project update request
 */
const validateUpdateProject = (data) => {
    const schema = Joi.object({
        projectId: objectIdSchema.required(),
        name: Joi.string().min(3).max(100).optional().messages({
            "string.min": "Project name must be at least 3 characters long.",
            "string.max": "Project name cannot exceed 100 characters.",
        }),
        relatedTo: objectIdSchema.optional(),
        description: Joi.string().max(500).optional().messages({
            "string.max": "Project description cannot exceed 500 characters.",
        }),
    });

    return schema.validate(data, { abortEarly: false });
};

/**
 * ✅ Validate project deletion request
 */
const validateDeleteProject = (data) => {
    const schema = Joi.object({
        projectId: objectIdSchema.required(),
    });

    return schema.validate(data, { abortEarly: false });
};

/**
 * ✅ Validate project retrieval request
 */
const validateGetProject = (data) => {
    const schema = Joi.object({
        projectId: objectIdSchema.required(),
    });

    return schema.validate(data, { abortEarly: false });
};

module.exports = {
    validateCreateProject,
    validateUpdateProject,
    validateDeleteProject,
    validateGetProject,
};
