const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Company = require("../models/Company");
const tokenUtils = require("../utils/tokenUtils");
const emailService = require("../services/emailService");

const ONE_HOUR = 60 * 60 * 1000;
const isProd = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "None" : "Lax",
};

// ─────────────────────────────────────────────
// 1) Admin Login
// ─────────────────────────────────────────────
exports.adminLogin = asyncHandler(async (req, res) => {
  const { loginId, password } = req.body;
  console.log("🔐 Admin Login Attempt:", loginId);

  if (!loginId || !password) {
    console.log("❌ Missing credentials");
    return res.status(400).json({ message: "Login ID and password are required." });
  }

  const admin = await User.findOne({
    $or: [{ email: loginId.toLowerCase() }, { staffId: loginId }],
    role: "admin",
    isDeleted: false,
  });

  if (!admin) {
    console.log("❌ Admin not found");
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const passwordMatch = await bcrypt.compare(password, admin.password);
  if (!passwordMatch) {
    console.log("❌ Password mismatch");
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const company = await Company.findById(String(admin.companyId));
  const companyInvalid = !company || company.isDeleted || !company.isVerified;

  if (companyInvalid) {
    console.log("⚠️ Company invalid:", {
      exists: !!company,
      isDeleted: company?.isDeleted,
      isVerified: company?.isVerified,
    });

    return res.status(200).json({
      message: !company
        ? "Company not found."
        : company.isDeleted
        ? "Company is inactive or banned."
        : "Email not verified.",
      accessToken: null,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        staffId: admin.staffId || null,
        role: admin.role,
        permissions: admin.permissions || [],
        companyId: admin.companyId,
      },
      subscriptionStatus: "invalid",
      nextBillingDate: null,
    });
  }

  const accessToken = tokenUtils.generateAccessToken(admin);
  const refreshToken = tokenUtils.generateRefreshToken(admin);

  console.log("✅ Admin login successful");

  res.cookie("accessToken", accessToken, cookieOptions);
  res.cookie("refreshToken", refreshToken, cookieOptions);

  return res.json({
    message: "Login successful.",
    accessToken,
    user: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      staffId: admin.staffId || null,
      role: admin.role,
      permissions: admin.permissions || [],
      companyId: admin.companyId,
    },
    subscriptionStatus: company.subscription?.status || "pending",
    nextBillingDate: company.subscription?.nextBillingDate || null,
  });
});

// ─────────────────────────────────────────────
// 2) Staff Login
// ─────────────────────────────────────────────
exports.staffLogin = asyncHandler(async (req, res) => {
  const { loginId, password, companyId } = req.body;
  console.log("👤 Staff Login Attempt:", loginId);

  if (!loginId || !password || !companyId) {
    console.log("❌ Missing staff login fields");
    return res.status(400).json({ message: "Email, password, and companyId are required." });
  }

  if (!loginId.includes("@")) {
    return res.status(400).json({ message: "Login must use email." });
  }

  const user = await User.findOne({
    email: loginId.toLowerCase(),
    companyId,
    isDeleted: false,
  });

  if (!user) {
    console.log("❌ Staff user not found");
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    console.log("❌ Staff password mismatch");
    return res.status(401).json({ message: "Invalid email or password." });
  }

  if (!user.isActive) {
    console.log("⚠️ Staff account is inactive");
    return res.status(403).json({ message: "Account is inactive. Contact admin." });
  }

  const company = await Company.findById(String(user.companyId));
  const companyInvalid = !company || company.isDeleted || !company.isVerified;

  if (companyInvalid) {
    console.log("⚠️ Company invalid (staff):", {
      exists: !!company,
      isDeleted: company?.isDeleted,
      isVerified: company?.isVerified,
    });

    return res.status(200).json({
      message: !company
        ? "Company not found."
        : company.isDeleted
        ? "Company is inactive or banned."
        : "Email not verified.",
      accessToken: null,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        staffId: user.staffId,
        role: user.role,
        permissions: user.permissions || [],
        companyId: user.companyId,
      },
      subscriptionStatus: "invalid",
      nextBillingDate: null,
    });
  }

  const accessToken = tokenUtils.generateAccessToken(user);
  const refreshToken = tokenUtils.generateRefreshToken(user);

  console.log("✅ Staff login successful");

  res.cookie("accessToken", accessToken, cookieOptions);
  res.cookie("refreshToken", refreshToken, cookieOptions);

  return res.json({
    message: "Login successful.",
    accessToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      staffId: user.staffId,
      role: user.role,
      permissions: user.permissions || [],
      companyId: user.companyId,
    },
    subscriptionStatus: company.subscription?.status || "pending",
    nextBillingDate: company.subscription?.nextBillingDate || null,
  });
});

// ─────────────────────────────────────────────
// 3) Refresh Token
// ─────────────────────────────────────────────
exports.refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  console.log("🔄 Refresh token attempt");

  if (!token) {
    console.log("❌ No refresh token");
    return res.status(401).json({ message: "Unauthorized." });
  }

  const isBlacklisted = await tokenUtils.isTokenBlacklisted(token);
  if (isBlacklisted) {
    console.log("❌ Refresh token blacklisted");
    return res.status(403).json({ message: "Refresh token is blacklisted. Please log in again." });
  }

  const decoded = tokenUtils.verifyRefreshToken(token);
  if (!decoded) {
    console.log("❌ Invalid refresh token");
    return res.status(403).json({ message: "Invalid refresh token." });
  }

  const user = await User.findById(decoded.id).select("role permissions isActive companyId");
  if (!user) {
    console.log("❌ User not found during refresh");
    return res.status(404).json({ message: "User not found." });
  }

  if (!user.isActive) {
    console.log("⚠️ User inactive during refresh");
    return res.status(403).json({ message: "Account is inactive. Contact admin." });
  }

  const company = await Company.findById(String(user.companyId));
  if (!company || company.isDeleted) {
    console.log("⚠️ Company invalid during refresh");
    return res.status(403).json({ message: "Company is inactive or banned." });
  }

  const newAccessToken = tokenUtils.generateAccessToken(user);
  res.cookie("accessToken", newAccessToken, cookieOptions);
  console.log("✅ Token refreshed");

  return res.json({ accessToken: newAccessToken });
});

exports.refreshSubscription = asyncHandler(async (req, res) => {
  // assumes verifyToken middleware has set req.user.id
  const { subscriptionStatus, nextBillingDate } =
    await authService.refreshSubscription(req.user.id);
  return res.json({ subscriptionStatus, nextBillingDate });
});

// ─────────────────────────────────────────────
// Remaining exports unchanged (with logs if needed)
// ─────────────────────────────────────────────

exports.getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  if (!user) return res.status(404).json({ message: "User not found." });
  res.json({ user });
});

exports.requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required." });

  const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false });
  if (!user) return res.status(404).json({ message: "User not found." });

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = Date.now() + ONE_HOUR;
  await user.save();

  await emailService.sendPasswordResetEmail(user.email, resetToken, user.companyId.toString());
  res.json({ message: "Password reset link sent to email." });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ message: "Token and new password are required." });
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) return res.status(400).json({ message: "Invalid or expired token." });

  user.password = await bcrypt.hash(newPassword, 12);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  await tokenUtils.blacklistUserTokens(user._id);
  res.json({ message: "Password reset successful. Please log in again." });
});

exports.logout = asyncHandler(async (req, res) => {
  await tokenUtils.blacklistUserTokens(req.user.id);
  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);
  res.json({ message: "Logged out successfully." });
});
