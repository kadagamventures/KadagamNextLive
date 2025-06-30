const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis"); // ✅ Correct default import
const { redisClient } = require("../config/redisConfig");

// ✅ General API Rate Limiter
const generalLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    expiry: 15 * 60,
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

// ✅ Admin Rate Limiter
const adminLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
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
