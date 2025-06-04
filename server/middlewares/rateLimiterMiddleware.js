const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis").RedisStore; // ✅ Correct import
const { redisClient } = require("../config/redisConfig");

// ✅ General API Rate Limiter (For Normal Users)
const generalLimiter = rateLimit({
    store: new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args), // ✅ Fixed syntax
    }),
    windowMs: 15 * 60 * 1000, // 15-minute window
    max: 100, // Limit each IP to 100 requests
    message: {
        status: 429,
        message: "Too many requests. Please try again later.",
    },
    headers: true,
    keyGenerator: (req) => req.ip,
    skipSuccessfulRequests: true, // ✅ Prevents blocking valid requests
});

// ✅ Higher Rate Limit for Admin Routes
const adminLimiter = rateLimit({
    store: new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args), // ✅ Fixed syntax
    }),
    windowMs: 15 * 60 * 1000,
    max: 500, // Higher limit for admins
    message: {
        status: 429,
        message: "Too many requests from this admin IP. Please slow down.",
    },
    headers: true,
    keyGenerator: (req) => req.ip,
    skipSuccessfulRequests: true,
});

module.exports = { generalLimiter, adminLimiter };
