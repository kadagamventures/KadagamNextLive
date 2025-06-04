const mongoose = require("mongoose");

const errorHandler = (err, req, res, next) => {
    const statusCode = err.status || 500;
    let errorMessage = "Internal Server Error";
    let errorType = "ServerError";

    if (err instanceof mongoose.Error.ValidationError) {
        errorMessage = Object.values(err.errors).map((val) => val.message).join(", ");
        errorType = "ValidationError";
    } else if (err instanceof mongoose.Error.CastError) {
        errorMessage = `Invalid value for field "${err.path}": ${err.value}`;
        errorType = "BadRequest";
    } else if (err.code === 11000) {
        errorMessage = `Duplicate value error: ${JSON.stringify(err.keyValue)}`;
        errorType = "DuplicateKeyError";
    } else if (err.name === "JsonWebTokenError") {
        errorMessage = "Invalid authentication token.";
        errorType = "AuthError";
    } else if (err.name === "TokenExpiredError") {
        errorMessage = "Authentication token has expired.";
        errorType = "AuthError";
    } else if (err.message) {
        errorMessage = err.message;
        errorType = err.name || "ApplicationError";
    }

    res.status(statusCode).json({
        success: false,
        error: errorMessage,
        errorType,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
};

const notFoundHandler = (req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found.`,
    });
};

module.exports = {
    errorHandler,
    notFoundHandler,
};
