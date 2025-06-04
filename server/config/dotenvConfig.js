const dotenv = require("dotenv");
const fs = require("fs");

// Ensure .env file exists before loading
if (!fs.existsSync(".env")) {
    throw new Error("Missing .env file! The application cannot start.");
}

dotenv.config();

// Required Environment Variables
const requiredEnvVars = [
    "MONGO_URI",
    "JWT_SECRET",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_REGION",
    "EMAIL_FROM",
    "REDIS_HOST",
    "REDIS_PORT",
    "REDIS_PASSWORD"
];

// Check for missing required variables
const missingVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
    throw new Error(`Missing environment variables: ${missingVars.join(", ")}`);
}

// Export Configurations
module.exports = {
    PORT: process.env.PORT || 5000,
    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
    EMAIL_FROM: process.env.EMAIL_FROM,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    WEBSOCKET_SERVER_URL: process.env.WEBSOCKET_SERVER_URL || "",
    DEBUG_MODE: process.env.DEBUG_MODE === "true"
};
