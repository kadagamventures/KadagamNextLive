const Joi = require("joi");

/**
 *  User Registration Validation
 */
const validateUserRegistration = (data) => {
    const schema = Joi.object({
        name: Joi.string().min(2).max(100).required().messages({
            "string.min": "Name must be at least 2 characters long.",
            "string.max": "Name cannot exceed 100 characters.",
            "any.required": "Name is required.",
        }),
        email: Joi.string().email().required().messages({
            "string.email": "Invalid email format.",
            "any.required": "Email is required.",
        }),
        password: Joi.string()
            .min(8)
            .pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
            .required()
            .messages({
                "string.min": "Password must be at least 8 characters long.",
                "string.pattern.base": "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
                "any.required": "Password is required.",
            }),
        role: Joi.string().valid("admin", "staff").required().messages({
            "any.only": "Role must be either 'admin' or 'staff'.",
            "any.required": "Role is required.",
        }),
        phone: Joi.string()
            .pattern(/^\+?[0-9]{7,15}$/)
            .required()
            .messages({
                "string.pattern.base": "Phone number must be between 7 and 15 digits and may start with '+'.",
                "any.required": "Phone number is required.",
            }),
    });

    return schema.validate(data, { abortEarly: false });
};

/**
 *  User Login Validation
 */
const validateUserLogin = (data) => {
    const schema = Joi.object({
        email: Joi.string().email().required().messages({
            "string.email": "Invalid email format.",
            "any.required": "Email is required.",
        }),
        password: Joi.string().required().messages({
            "any.required": "Password is required.",
        }),
    });

    return schema.validate(data, { abortEarly: false });
};

/**
 *  User Update Validation (Admin Only)
 */
const validateUserUpdate = (data) => {
    const schema = Joi.object({
        name: Joi.string().min(2).max(100).messages({
            "string.min": "Name must be at least 2 characters long.",
            "string.max": "Name cannot exceed 100 characters.",
        }),
        email: Joi.string().email().messages({
            "string.email": "Invalid email format.",
        }),
        phone: Joi.string()
            .pattern(/^\+?[0-9]{7,15}$/)
            .messages({
                "string.pattern.base": "Phone number must be between 7 and 15 digits and may start with '+'.",
            }),
        role: Joi.string().valid("admin", "staff").messages({
            "any.only": "Role must be either 'admin' or 'staff'.",
        }),
        permissions: Joi.array().items(Joi.string().valid("task", "project", "staff")).messages({
            "any.only": "Permissions can only include 'task', 'project', or 'staff'.",
        }),
    });

    return schema.validate(data, { abortEarly: false });
};

/**
 *  Password Reset Request Validation
 */
const validatePasswordReset = (data) => {
    const schema = Joi.object({
        email: Joi.string().email().required().messages({
            "string.email": "Invalid email format.",
            "any.required": "Email is required.",
        }),
    });

    return schema.validate(data, { abortEarly: false });
};

/**
 *  New Password Validation
 */
const validateNewPassword = (data) => {
    const schema = Joi.object({
        password: Joi.string()
            .min(8)
            .pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
            .required()
            .messages({
                "string.min": "Password must be at least 8 characters long.",
                "string.pattern.base": "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
                "any.required": "Password is required.",
            }),
        confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
            "any.only": "Passwords must match.",
            "any.required": "Confirm password is required.",
        }),
    });

    return schema.validate(data, { abortEarly: false });
};

module.exports = {
    validateUserRegistration,
    validateUserLogin,
    validateUserUpdate,
    validatePasswordReset,
    validateNewPassword,
};
