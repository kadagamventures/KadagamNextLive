// server/services/authService.js

const crypto     = require("crypto");
const bcrypt     = require("bcryptjs");
const User       = require("../models/User");
const Company    = require("../models/Company");
const tokenUtils = require("../utils/tokenUtils");
require("dotenv").config();

const ONE_HOUR = 60 * 60 * 1000;

class AuthService {
  /**
   * 1) Generate & store a password-reset token for a given userId.
   *    Returns the raw resetToken (to be emailed).
   */
  async generateResetToken(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");
    if (user.isDeleted) throw new Error("User no longer active.");
    if (!user.isActive) throw new Error("User inactive. Contact admin.");

    // super_admins skip company check
    if (user.role !== "super_admin") {
      const comp = await Company.findById(user.companyId);
      if (!comp || comp.isDeleted) {
        throw new Error("Company unavailable or banned.");
      }
    }

    // Clear any existing reset token
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

  /**
   * 2) Consume a reset-token + newPassword
   */
  async resetPassword(token, newPassword) {
    if (!token || !newPassword)
      throw new Error("Token and new password are required.");

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

  /**
   * 3) Authenticate user (email/staffId + password)
   */
  async authenticateUser(loginIdRaw, passwordRaw, companyId) {
    const loginId = loginIdRaw.trim();
    const isEmail = loginId.includes("@");
    const password = passwordRaw.trim();
    let user;

    // find user by email or staffId
    if (isEmail) {
      user = await User.findOne({
        email:     loginId.toLowerCase(),
        companyId,
        isDeleted: false,
      });
    } else {
      user = await User.findOne({
        staffId:   loginId,
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

    // check company status
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

    // verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw this._makeError(401, "INVALID_CREDENTIALS", "Incorrect password");
    }

    // generate token
    const accessToken = tokenUtils.generateAccessToken(user);

    // sanitize user object
    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.resetPasswordToken;
    delete safeUser.resetPasswordExpires;

    return {
      token:              accessToken,
      user:               safeUser,
      subscriptionStatus: comp.subscription?.status || "pending",
      nextBillingDate:    comp.subscription?.nextBillingDate || null,
    };
  }

  /**
   * 4) Refresh subscription status
   */
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

  /**
   * 5) Get User by ID (omit sensitive fields)
   */
  async getUserById(id) {
    const user = await User.findById(id)
      .select("-password -resetPasswordToken -resetPasswordExpires");
    if (!user) throw new Error("User not found");
    return user;
  }

  /**
   * 6) Manual Hash Utility
   */
  async hashPassword(plainPassword) {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(plainPassword, salt);
  }

  /**
   * Helper to throw a structured error
   */
  _makeError(statusCode, code, message, extras = {}) {
    const err = new Error(message);
    err.statusCode = statusCode;
    err.code       = code;
    Object.assign(err, extras);
    return err;
  }
}

module.exports = new AuthService();
