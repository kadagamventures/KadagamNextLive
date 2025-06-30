require("dotenv").config();
const jwt = require("jsonwebtoken");
const { redisClient } = require("../config/redisConfig");

// Load from .env (access, refresh, reset token durations)
const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRES || "1h";
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRES || "7d";
const RESET_TOKEN_EXPIRY = process.env.JWT_RESET_EXPIRES || "15m";

// Safety check for secret
if (!JWT_SECRET) {
  throw new Error("❌ JWT_SECRET is not set in environment variables!");
}

const tokenUtils = {
  // Generic token generator
  generateToken: (payload, expiresIn) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
  },

  // Universal token verification
  verifyToken: (token) => {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (err) {
      console.error("❌ Invalid JWT:", err.message);
      return null;
    }
  },

  // Access/Refresh/Reset token creation
  generateAccessToken: (user) => {
    return tokenUtils.generateToken(
      { id: user._id, role: user.role, companyId: user.companyId },
      ACCESS_TOKEN_EXPIRY
    );
  },
  generateRefreshToken: (user) => {
    return tokenUtils.generateToken(
      { id: user._id, role: user.role, companyId: user.companyId },
      REFRESH_TOKEN_EXPIRY
    );
  },
  generateResetToken: (userId, companyId) => {
    return tokenUtils.generateToken({ id: userId, companyId }, RESET_TOKEN_EXPIRY);
  },

  // Verifiers
  verifyAccessToken: (token) => tokenUtils.verifyToken(token),
  verifyRefreshToken: (token) => tokenUtils.verifyToken(token),
  verifyResetToken: (token) => {
    const decoded = tokenUtils.verifyToken(token);
    return decoded?.id || null;
  },

  // Token blacklist helpers (Redis)
  isTokenBlacklisted: async (token) => {
    try {
      const exists = await redisClient.get(`blacklist:${token}`);
      return !!exists;
    } catch (err) {
      console.error("❌ Redis blacklist check failed:", err.message);
      return false;
    }
  },

  blacklistToken: async (token, expirySeconds = 3600) => {
    try {
      await redisClient.set(`blacklist:${token}`, "revoked", { EX: expirySeconds });
    } catch (err) {
      console.error("❌ Redis blacklistToken failed:", err.message);
    }
  },

  logoutUser: async (accessToken, refreshToken) => {
    try {
      if (accessToken) {
        const decoded = tokenUtils.verifyAccessToken(accessToken);
        if (decoded) await tokenUtils.blacklistToken(accessToken, 3600);
      }
      if (refreshToken) {
        const decoded = tokenUtils.verifyRefreshToken(refreshToken);
        if (decoded) await tokenUtils.blacklistToken(refreshToken, 7 * 24 * 60 * 60);
      }
      return true;
    } catch (err) {
      console.error("❌ logoutUser error:", err.message);
      return false;
    }
  },

  // Per-user token blacklist (if you track per-user tokens)
  blacklistUserTokens: async (userId) => {
    try {
      const keys = await redisClient.keys(`user:${userId}:*`);
      if (keys.length) {
        const pipeline = redisClient.multi();
        keys.forEach((key) => {
          pipeline.set(key, "revoked", { EX: 3600 });
        });
        await pipeline.exec();
        console.log(`🔒 Blacklisted ${keys.length} tokens for user ${userId}`);
      }
    } catch (err) {
      console.error("❌ blacklistUserTokens error:", err.message);
    }
  },

  // Express middleware helpers
  authenticateToken: async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided." });

    const blacklisted = await tokenUtils.isTokenBlacklisted(token);
    if (blacklisted) return res.status(403).json({ message: "Token revoked." });

    const decoded = tokenUtils.verifyAccessToken(token);
    if (!decoded) return res.status(403).json({ message: "Invalid token." });

    req.user = decoded;
    next();
  },

  authenticateRefreshToken: async (req, res, next) => {
    const token = req.body.refreshToken;
    if (!token) return res.status(401).json({ message: "No refresh token provided." });

    const blacklisted = await tokenUtils.isTokenBlacklisted(token);
    if (blacklisted) return res.status(403).json({ message: "Refresh token revoked." });

    const decoded = tokenUtils.verifyRefreshToken(token);
    if (!decoded) return res.status(403).json({ message: "Invalid refresh token." });

    req.user = decoded;
    next();
  },
};

module.exports = tokenUtils;
