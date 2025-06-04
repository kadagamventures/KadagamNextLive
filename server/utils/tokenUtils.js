const jwt = require("jsonwebtoken");
const { redisClient } = require("../config/redisConfig");
require("dotenv").config();

if (!process.env.JWT_SECRET) {
    throw new Error("❌ JWT_SECRET is not set in the environment variables!");
}

const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRES || "1h";
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRES || "7d";
const RESET_TOKEN_EXPIRY = process.env.JWT_RESET_EXPIRES || "15m";

const tokenUtils = {
    generateToken: (payload, expiresIn) => {
        return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
    },

    verifyToken: (token) => {
        try {
            return jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            console.error("❌ Invalid token:", error.message);
            return null;
        }
    },

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
        return tokenUtils.generateToken(
            { id: userId, companyId },
            RESET_TOKEN_EXPIRY
        );
    },

    verifyAccessToken: (token) => tokenUtils.verifyToken(token),
    verifyRefreshToken: (token) => tokenUtils.verifyToken(token),

    verifyResetToken: (token) => {
        const decoded = tokenUtils.verifyToken(token);
        return decoded ? decoded.id : null;
    },

    isTokenBlacklisted: async (token) => {
        try {
            const exists = await redisClient.get(`blacklist:${token}`);
            return !!exists;
        } catch (error) {
            console.error("❌ Redis Error Checking Token Blacklist:", error);
            return false;
        }
    },

    blacklistToken: async (token, expirySeconds = 3600) => {
        try {
            await redisClient.set(`blacklist:${token}`, "revoked", { EX: expirySeconds });
        } catch (error) {
            console.error("❌ Redis Error Blacklisting Token:", error);
        }
    },

    authenticateToken: async (req, res, next) => {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "❌ Unauthorized: No token provided!" });
        }

        const isBlacklisted = await tokenUtils.isTokenBlacklisted(token);
        if (isBlacklisted) {
            return res.status(403).json({ message: "❌ Token has been revoked! Please login again." });
        }

        const decoded = tokenUtils.verifyAccessToken(token);
        if (!decoded) {
            return res.status(403).json({ message: "❌ Invalid or expired token!" });
        }

        req.user = decoded;
        next();
    },

    authenticateRefreshToken: async (req, res, next) => {
        const token = req.body.refreshToken;

        if (!token) {
            return res.status(401).json({ message: "❌ Unauthorized: No refresh token provided!" });
        }

        const isBlacklisted = await tokenUtils.isTokenBlacklisted(token);
        if (isBlacklisted) {
            return res.status(403).json({ message: "❌ Refresh token has been revoked!" });
        }

        const decoded = tokenUtils.verifyRefreshToken(token);
        if (!decoded) {
            return res.status(403).json({ message: "❌ Invalid or expired refresh token!" });
        }

        req.user = decoded;
        next();
    },

    logoutUser: async (accessToken, refreshToken) => {
        try {
            if (accessToken) {
                const accessDecoded = tokenUtils.verifyAccessToken(accessToken);
                if (accessDecoded) {
                    await tokenUtils.blacklistToken(accessToken, 3600);
                }
            }

            if (refreshToken) {
                const refreshDecoded = tokenUtils.verifyRefreshToken(refreshToken);
                if (refreshDecoded) {
                    await tokenUtils.blacklistToken(refreshToken, 604800);
                }
            }

            return true;
        } catch (error) {
            console.error("❌ Logout Error:", error);
            return false;
        }
    },

    /**
     * ✅ Blacklist all active tokens for a user
     * Assumes tokens are tracked as `user:<id>:*` Redis keys if custom token tracking is used.
     */
    blacklistUserTokens: async (userId) => {
        try {
            const pattern = `user:${userId}:*`;
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                const pipeline = redisClient.multi();
                for (const key of keys) {
                    pipeline.set(key, "revoked", { EX: 3600 });
                }
                await pipeline.exec();
                console.log(`🔒 Blacklisted ${keys.length} tokens for user ${userId}`);
            }
        } catch (error) {
            console.error("❌ Error blacklisting user tokens:", error.message);
        }
    }
};

module.exports = tokenUtils;
