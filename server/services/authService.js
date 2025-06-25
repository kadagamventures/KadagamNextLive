// server/services/AuthService.js

const crypto     = require("crypto");
const bcrypt     = require("bcryptjs");
const User       = require("../models/User");
const Company    = require("../models/Company");
const tokenUtils = require("../utils/tokenUtils");
require("dotenv").config();

const ONE_HOUR = 60 * 60 * 1000;

class AuthService {
  // 1) Generate & store a password-reset token
  async generateResetToken(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");
    if (user.isDeleted) throw new Error("User no longer active.");
    if (!user.isActive) throw new Error("User inactive. Contact admin.");

    if (user.role !== "super_admin") {
      const comp = await Company.findById(user.companyId);
      if (!comp || comp.isDeleted) {
        throw new Error("Company unavailable or banned.");
      }
    }

    user.resetPasswordToken   = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    const resetToken  = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetPasswordToken   = hashedToken;
    user.resetPasswordExpires = Date.now() + ONE_HOUR;
    await user.save();

    return resetToken;
  }

  // 2) Reset password using token
  async resetPassword(token, newPassword) {
    if (!token || !newPassword) throw new Error("Token and new password are required.");

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken:   hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) throw new Error("Invalid or expired token.");

    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken   = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return user;
  }

  // 3) Authenticate user (login)
  //    Returns { token, user, subscriptionStatus, nextBillingDate }
  async authenticateUser(loginIdRaw, passwordRaw, companyId) {
    const loginId = loginIdRaw.trim();
    const password = passwordRaw.trim();
    const isEmail = loginId.includes("@");
    let user;

    if (isEmail) {
      user = await User.findOne({
        email: loginId.toLowerCase(),
        companyId,
        isDeleted: false,
      });
    } else {
      user = await User.findOne({
        staffId: loginId,
        companyId,
        isDeleted: false,
      });
    }

    if (!user) {
      throw this._makeError(401, "INVALID_CREDENTIALS", "User not found.");
    }

    if (!user.isActive) {
      throw this._makeError(403, "INACTIVE_ACCOUNT", "User account is inactive. Contact admin.");
    }

    const comp = await Company.findById(user.companyId);
    if (!comp || comp.isDeleted) {
      throw this._makeError(403, "COMPANY_INVALID", "Company unavailable or banned.", {
        companyId: user.companyId,
      });
    }

    if (!comp.isVerified) {
      throw this._makeError(403, "EMAIL_NOT_VERIFIED", "Email not verified.", {
        companyId: user.companyId,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw this._makeError(401, "INVALID_CREDENTIALS", "Incorrect password");
    }

    const accessToken  = tokenUtils.generateAccessToken(user);
    const refreshToken = tokenUtils.generateRefreshToken(user);

    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.resetPasswordToken;
    delete safeUser.resetPasswordExpires;

    return {
      accessToken,
      refreshToken,
      user:               safeUser,
      subscriptionStatus: comp.subscription?.status || "pending",
      nextBillingDate:    comp.subscription?.nextBillingDate || null,
    };
  }

  // 4) Refresh subscription
  async refreshSubscription(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found.");

    const comp = await Company.findById(user.companyId);
    if (!comp || comp.isDeleted) {
      throw new Error("Company unavailable or banned.");
    }

    return {
      subscriptionStatus: comp.subscription?.status || "pending",
      nextBillingDate:    comp.subscription?.nextBillingDate || null,
    };
  }

  // 5) Get user info by ID
  async getUserById(id) {
    const user = await User.findById(id)
      .select("-password -resetPasswordToken -resetPasswordExpires");
    if (!user) throw new Error("User not found");
    return user;
  }

  // 6) Hash password utility
  async hashPassword(plainPassword) {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(plainPassword, salt);
  }

  // 7) Logout logic: destroys session and clears both cookies
  async logout(req, res) {
    // Destroy express-session if used
    if (req.session) {
      req.session.destroy(() => {});
    }

    // Clear both tokens from cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
      path: "/api/auth/refresh",
    };

    res.clearCookie("refreshToken",  cookieOptions);
    res.clearCookie("accessToken",   cookieOptions);

    return { message: "Logged out successfully." };
  }

  // Helper to build API errors
  _makeError(statusCode, code, message, extras = {}) {
    const err = new Error(message);
    err.statusCode = statusCode;
    err.code       = code;
    Object.assign(err, extras);
    return err;
  }
}

module.exports = new AuthService();
