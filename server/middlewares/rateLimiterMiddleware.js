const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { redisClient } = require("../config/redisConfig");

// 🟢 General API Rate Limiter (for normal users)
const generalLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args), // Use sendCommand for redis@4+
    // Optionally: client: redisClient, // If `sendCommand` not needed, just use client
    expiry: 15 * 60, // 15 minutes (in seconds)
  }),
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    status: 429,
    message: "Too many requests. Please try again later.",
  },
  headers: true,
  keyGenerator: (req) => req.ip,
  skipSuccessfulRequests: true,
});

// 🟢 Admin Rate Limiter
const adminLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
    expiry: 15 * 60,
  }),
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {
    status: 429,
    message: "Too many requests from this admin IP. Please slow down.",
  },
  headers: true,
  keyGenerator: (req) => req.ip,
  skipSuccessfulRequests: true,
});

module.exports = { generalLimiter, adminLimiter };
