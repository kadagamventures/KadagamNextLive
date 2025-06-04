const mongoose = require("mongoose");

/**
 * ✅ Global Error Handler Middleware for Multi-Tenant SaaS
 */
const errorHandler = (err, req, res, next) => {
    console.error("❌ Error:", err.message);

    // Extract tenant context (if available)
    const companyId = req.user?.companyId || req.headers['x-company-id'] || null;

    // Handle Mongoose Validation Errors
    if (err instanceof mongoose.Error.ValidationError) {
        return res.status(400).json({
            success: false,
            tenant: companyId,
            message: "Validation Error",
            errors: Object.values(err.errors).map(e => e.message),
        });
    }

    // Handle Mongoose Cast Errors (e.g., invalid ObjectId)
    if (err instanceof mongoose.Error.CastError) {
        return res.status(400).json({
            success: false,
            tenant: companyId,
            message: `Invalid ${err.path}: ${err.value}. Please provide a valid identifier.`,
        });
    }

    // JWT Errors
    if (err.name === "JsonWebTokenError") {
        return res.status(401).json({
            success: false,
            tenant: companyId,
            message: "Invalid or malformed token.",
        });
    }

    if (err.name === "TokenExpiredError") {
        return res.status(401).json({
            success: false,
            tenant: companyId,
            message: "Session expired. Please log in again.",
        });
    }

    // MongoDB Duplicate Key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0];
        return res.status(409).json({
            success: false,
            tenant: companyId,
            message: `Duplicate field: ${field} already exists.`,
        });
    }

    // Missing required field
    if (err.message?.includes("required")) {
        return res.status(400).json({
            success: false,
            tenant: companyId,
            message: err.message,
        });
    }

    // 403 Forbidden
    if (err.status === 403) {
        return res.status(403).json({
            success: false,
            tenant: companyId,
            message: err.message || "Access denied.",
        });
    }

    // 404 Not Found
    if (err.status === 404) {
        return res.status(404).json({
            success: false,
            tenant: companyId,
            message: err.message || "The requested resource was not found.",
        });
    }

    // 429 Too Many Requests
    if (err.status === 429) {
        return res.status(429).json({
            success: false,
            tenant: companyId,
            message: "Rate limit exceeded. Please try again later.",
        });
    }

    // Fallback: 500 Internal Server Error
    return res.status(err.status || 500).json({
        success: false,
        tenant: companyId,
        message: err.message || "Internal server error",
    });
};

/**
 * ✅ 404 Not Found Handler
 */
const notFoundHandler = (req, res, next) => {
    const companyId = req.user?.companyId || req.headers['x-company-id'] || null;
    res.status(404).json({
        success: false,
        tenant: companyId,
        message: `Route ${req.originalUrl} not found.`,
    });
};

module.exports = {
    errorHandler,
    notFoundHandler,
};
