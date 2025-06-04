const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");
const { redisClient } = require("../config/redisConfig");

/**
 * Multi-tenant aware Redis-backed rate limiter middleware.
 * Scopes rate limiting by IP + optional tenant ID if passed in headers.
 */
const limiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
    prefix: "rl:", // optional prefix in Redis
  }),
  keyGenerator: (req, res) => {
    // Use tenant ID + IP for better SaaS isolation (fallback to IP only)
    const tenantId = req.headers["x-company-id"] || "global";
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    return `${tenantId}:${ip}`;
  },
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each key to 100 requests per 15 mins
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true, // Adds RateLimit-* headers
  legacyHeaders: false, // Disables X-RateLimit-* headers
});

module.exports = limiter;
