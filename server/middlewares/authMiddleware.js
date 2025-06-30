const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { redisClient } = require("../config/redisConfig");
const tokenUtils = require("../utils/tokenUtils");
require("dotenv").config();

/**
 * Extract token from Authorization header or cookies
 */
const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }
  return req.cookies?.accessToken;
};

/**
 * Middleware to verify access token
 */
const verifyToken = async (req, res, next) => {
  try {
    let token = extractToken(req);
    if (!token) {
      return res.status(401).json({ message: "Access Denied. No token provided." });
    }

    if (await tokenUtils.isTokenBlacklisted(token)) {
      return res.status(401).json({ message: "Token revoked. Please log in again." });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return error.name === "TokenExpiredError"
        ? attemptTokenRefresh(req, res, next)
        : res.status(401).json({ message: "Invalid or expired token." });
    }

    const user = await User.findById(decoded.id).select("role permissions isActive companyId");
    if (!user) return res.status(404).json({ message: "User not found." });
    if (!user.isActive) return res.status(403).json({ message: "Account inactive. Contact admin." });

    req.user = {
      id: user._id,
      role: user.role,
      permissions: user.permissions || [],
      companyId: user.companyId || null,
    };

    next();
  } catch (error) {
    console.error("[Auth] Authentication Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Middleware or standalone route handler to refresh token
 */
const attemptTokenRefresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: "Session expired. Please log in again." });
    }

    if (await tokenUtils.isTokenBlacklisted(refreshToken)) {
      return res.status(403).json({ message: "Refresh token blacklisted. Please log in again." });
    }

    const decoded = tokenUtils.verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(403).json({ message: "Invalid refresh token." });
    }

    const user = await User.findById(decoded.id).select("role permissions isActive");
    if (!user) return res.status(404).json({ message: "User not found." });
    if (!user.isActive) return res.status(403).json({ message: "Account inactive. Contact admin." });

    const newAccessToken = tokenUtils.generateAccessToken(user);

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    // If this is a middleware call (from verifyToken), continue the request
    if (next) {
      req.headers.authorization = `Bearer ${newAccessToken}`;
      return verifyToken(req, res, next); // Re-verify with new token
    }

    return res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    console.error("[Auth] Error Refreshing Token:", error);
    return res.status(500).json({ message: "Failed to refresh token." });
  }
};

/**
 * Middleware to verify refresh token
 */
const verifyRefreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) return res.status(401).json({ message: "No refresh token provided." });

    if (await tokenUtils.isTokenBlacklisted(refreshToken)) {
      return res.status(403).json({ message: "Refresh token blacklisted. Please log in again." });
    }

    const decoded = tokenUtils.verifyRefreshToken(refreshToken);
    if (!decoded) return res.status(403).json({ message: "Invalid refresh token." });

    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (error) {
    console.error("[Auth] Error Verifying Refresh Token:", error);
    return res.status(401).json({ message: "Session expired. Please log in again." });
  }
};

/**
 * Middleware to enforce admin access
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }
  next();
};

// ✅ Export all middleware
module.exports = {
  verifyToken,
  verifyRefreshToken,
  requireAdmin,
  attemptTokenRefresh,
};
