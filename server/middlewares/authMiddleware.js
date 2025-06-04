const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { redisClient } = require("../config/redisConfig");
const tokenUtils = require("../utils/tokenUtils");
require("dotenv").config();

const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }
  return req.cookies?.accessToken;
};

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

    // ✅ Only this line updated:
    req.user = {
      id: user._id,
      role: user.role,
      permissions: user.permissions || [],
      companyId: user.companyId || null, // ✅ Inject company context
    };

    next();
  } catch (error) {
    console.error("[Auth] Authentication Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const attemptTokenRefresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) return res.status(401).json({ message: "Session expired. Please log in again." });

    if (await tokenUtils.isTokenBlacklisted(refreshToken)) {
      return res.status(403).json({ message: "Refresh token blacklisted. Please log in again." });
    }

    const decoded = tokenUtils.verifyRefreshToken(refreshToken);
    if (!decoded) return res.status(403).json({ message: "Invalid refresh token." });

    const user = await User.findById(decoded.id).select("role permissions isActive");
    if (!user) return res.status(404).json({ message: "User not found." });
    if (!user.isActive) return res.status(403).json({ message: "Account inactive. Contact admin." });

    const newAccessToken = tokenUtils.generateAccessToken(user);

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });

    return res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    console.error("[Auth] Error Refreshing Token:", error);
    return res.status(500).json({ message: "Failed to refresh token." });
  }
};

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

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }
  next();
};

module.exports = { verifyToken, verifyRefreshToken, requireAdmin };
