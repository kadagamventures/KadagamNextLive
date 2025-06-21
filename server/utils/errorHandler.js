const mongoose = require("mongoose");

/**
 * ✅ Global Error Handler Middleware for Multi-Tenant SaaS
 */
const errorHandler = (err, req, res, next) => {
    console.error("❌ Error:", err?.message || err);

    // 🏢 Extract tenant context safely
    let companyId = null;
    try {
        companyId = req?.user?.companyId || req?.headers?.['x-company-id'] || null;
    } catch (_) {
        companyId = null;
    }

    // 🧪 Mongoose Validation Error
    if (err instanceof mongoose.Error.ValidationError) {
        return res.status(400).json({
            success: false,
            tenant: companyId,
            message: "Validation Error",
            errors: Object.values(err.errors).map(e => e.message),
        });
    }

    // 🆔 Mongoose Cast Error (invalid ObjectId etc.)
    if (err instanceof mongoose.Error.CastError) {
        return res.status(400).json({
            success: false,
            tenant: companyId,
            message: `Invalid ${err.path}: ${err.value}. Please provide a valid identifier.`,
        });
    }

    // 🔒 JWT Errors
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

    // 📛 Duplicate key error from MongoDB
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || "field";
        return res.status(409).json({
            success: false,
            tenant: companyId,
            message: `Duplicate value: '${field}' already exists.`,
        });
    }

    // ⚠️ Required Field Missing
    if (err.message?.toLowerCase().includes("required")) {
        return res.status(400).json({
            success: false,
            tenant: companyId,
            message: err.message,
        });
    }

    // 🔐 Forbidden Access
    if (err.status === 403) {
        return res.status(403).json({
            success: false,
            tenant: companyId,
            message: err.message || "Access denied.",
        });
    }

    // 🚫 Not Found
    if (err.status === 404) {
        return res.status(404).json({
            success: false,
            tenant: companyId,
            message: err.message || "The requested resource was not found.",
        });
    }

    // 🔁 Too Many Requests
    if (err.status === 429) {
        return res.status(429).json({
            success: false,
            tenant: companyId,
            message: "Rate limit exceeded. Please try again later.",
        });
    }

    // 🧯 Fallback Internal Error
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
    const companyId = req?.user?.companyId || req?.headers?.['x-company-id'] || null;
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
