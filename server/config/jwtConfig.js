const jwt = require("jsonwebtoken");

// Ensure JWT_SECRET exists before using
if (!process.env.JWT_SECRET) {
    throw new Error("Missing JWT_SECRET in environment variables.");
}

const generateToken = (user, rememberMe = false) => {
    if (!user || !user._id || !user.role) {
        throw new Error("Invalid user data for token generation.");
    }

    return jwt.sign(
        {
            id: user._id,
            role: user.role,
            permissions: user.permissions || [],
        },
        process.env.JWT_SECRET,
        {
            expiresIn: rememberMe
                ? process.env.JWT_REMEMBER_ME_EXPIRES_IN || "30d"
                : process.env.JWT_EXPIRES_IN || "7d",
        }
    );
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            throw new Error("Token has expired. Please log in again.");
        } else if (error.name === "JsonWebTokenError") {
            throw new Error("Invalid token. Authentication failed.");
        }
        throw new Error("Token verification failed.");
    }
};

// Middleware to extract token from headers
const extractToken = (req) => {
    if (!req?.headers?.authorization?.startsWith("Bearer ")) {
        throw new Error("Authorization token missing or malformed.");
    }
    return req.headers.authorization.split(" ")[1];
};

module.exports = { generateToken, verifyToken, extractToken };
