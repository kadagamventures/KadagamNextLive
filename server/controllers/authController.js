// controllers/authController.js

const bcrypt       = require("bcryptjs");
const crypto       = require("crypto");
const asyncHandler = require("express-async-handler");
const User         = require("../models/User");
const Company      = require("../models/Company");
const tokenUtils   = require("../utils/tokenUtils");
const emailService = require("../services/emailService");

const ONE_HOUR = 60 * 60 * 1000;

// ---------------------------------------------
// 1) Admin Login
// ---------------------------------------------
exports.adminLogin = asyncHandler(async (req, res) => {
  const { loginId, password } = req.body;
  if (!loginId || !password) {
    return res.status(400).json({ message: "Login ID and password are required." });
  }

  const admin = await User.findOne({
    $or: [{ email: loginId.toLowerCase() }, { staffId: loginId }],
    role: "admin",
    isDeleted: false,
  });

  if (!admin || !(await bcrypt.compare(password, admin.password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const company = await Company.findById(admin.companyId);
  if (!company || company.isDeleted) {
    return res.status(403).json({ message: "Company is inactive or banned." });
  }
  if (company.subscription?.status !== "active") {
    return res.status(403).json({ message: "Company subscription is not active." });
  }

  const accessToken  = tokenUtils.generateAccessToken(admin);
  const refreshToken = tokenUtils.generateRefreshToken(admin);

  res.cookie("accessToken", accessToken, { httpOnly: true, secure: true, sameSite: "Strict" });
  res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: true, sameSite: "Strict" });

  res.json({
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
  });
});

// ---------------------------------------------
// 2) Staff Login
// ---------------------------------------------
exports.staffLogin = asyncHandler(async (req, res) => {
  const { loginId, password, companyId } = req.body;
  if (!loginId || !password || !companyId) {
    return res.status(400).json({ message: "Email, password, and companyId are required." });
  }
  if (!loginId.includes("@")) {
    return res.status(400).json({ message: "Login must use email only." });
  }

  const user = await User.findOne({
    email: loginId.toLowerCase(),
    companyId,
    isDeleted: false,
  });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  if (!user.isActive) {
    return res.status(403).json({ message: "Account is inactive. Contact admin." });
  }

  const company = await Company.findById(user.companyId);
  if (!company || company.isDeleted || company.subscription?.status !== "active") {
    return res.status(403).json({ message: "Company is inactive or subscription expired." });
  }

  const accessToken  = tokenUtils.generateAccessToken(user);
  const refreshToken = tokenUtils.generateRefreshToken(user);

  res.cookie("accessToken", accessToken, { httpOnly: true, secure: true, sameSite: "Strict" });
  res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: true, sameSite: "Strict" });

  res.json({
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
  });
});

// ---------------------------------------------
// 3) Refresh Token
// ---------------------------------------------
exports.refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  if (await tokenUtils.isTokenBlacklisted(token)) {
    return res.status(403).json({ message: "Refresh token is blacklisted. Please log in again." });
  }

  const decoded = tokenUtils.verifyRefreshToken(token);
  if (!decoded) return res.status(403).json({ message: "Invalid refresh token" });

  const user = await User.findById(decoded.id).select("role permissions isActive companyId");
  if (!user) return res.status(404).json({ message: "User not found" });
  if (!user.isActive) return res.status(403).json({ message: "Account is inactive. Contact admin." });

  const company = await Company.findById(user.companyId);
  if (!company || company.isDeleted || company.subscription?.status !== "active") {
    return res.status(403).json({ message: "Company is inactive or subscription expired." });
  }

  const newAccessToken = tokenUtils.generateAccessToken(user);
  res.cookie("accessToken", newAccessToken, { httpOnly: true, secure: true, sameSite: "Strict" });
  res.json({ accessToken: newAccessToken });
});

// ---------------------------------------------
// 4) Get Current User
// ---------------------------------------------
exports.getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ user });
});

// ---------------------------------------------
// 5) Request Password Reset
// ---------------------------------------------
exports.requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required." });

  const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false });
  if (!user) return res.status(404).json({ message: "User not found" });

  // Generate raw token & SHA256-hash
  const resetToken  = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  user.resetPasswordToken   = hashedToken;
  user.resetPasswordExpires = Date.now() + ONE_HOUR;
  await user.save();

  // Send path-param link
  await emailService.sendPasswordResetEmail(user.email, resetToken, user.companyName);

  res.json({ message: "Password reset link sent to email." });
});

// ---------------------------------------------
// 6) Reset Password
// ---------------------------------------------
exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ message: "Token and new password are required." });
  }

  // Hash incoming token & find user
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    resetPasswordToken:   hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });
  if (!user) {
    return res.status(400).json({ message: "Invalid or expired token." });
  }

  // Update password & clear reset fields
  user.password               = await bcrypt.hash(newPassword, 12);
  user.resetPasswordToken     = undefined;
  user.resetPasswordExpires   = undefined;
  await user.save();

  // Blacklist old tokens
  await tokenUtils.blacklistUserTokens(user._id);

  res.json({ message: "Password reset successful. Please log in again." });
});

// ---------------------------------------------
// 7) Logout
// ---------------------------------------------
exports.logout = asyncHandler(async (req, res) => {
  await tokenUtils.blacklistUserTokens(req.user.id);
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  res.json({ message: "Logged out successfully" });
});
