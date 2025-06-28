const bcrypt        = require("bcryptjs");
const crypto        = require("crypto");
const asyncHandler  = require("express-async-handler");
const User          = require("../models/User");
const Company       = require("../models/Company");
const tokenUtils    = require("../utils/tokenUtils");
const emailService  = require("../services/emailService");
const cookieOptions = require("../config/cookieOptions");

const ONE_HOUR = 60 * 60 * 1000;

// ─────────────────────────────────────────────
// 1) Admin Login
// ─────────────────────────────────────────────
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
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const company = await Company.findById(admin.companyId);
  if (!company || company.isDeleted) {
    return res.status(403).json({
      code: "COMPANY_INVALID",
      message: !company ? "Company not found." : "Company is inactive or banned.",
    });
  }
  if (!company.isVerified) {
    return res.status(403).json({
      code: "EMAIL_NOT_VERIFIED",
      message: "Email not verified.",
      companyId: company._id,
    });
  }

  const accessToken = tokenUtils.generateAccessToken(admin);
  const refreshToken = tokenUtils.generateRefreshToken(admin);

  res.cookie("accessToken", accessToken, cookieOptions);
  res.cookie("refreshToken", refreshToken, cookieOptions);

  res.json({
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
  if (!loginId || !password || !companyId) {
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
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Invalid email or password." });
  }
  if (!user.isActive) {
    return res.status(403).json({ message: "Account is inactive. Contact admin." });
  }

  const company = await Company.findById(user.companyId);
  if (!company || company.isDeleted) {
    return res.status(403).json({
      code: "COMPANY_INVALID",
      message: !company ? "Company not found." : "Company is inactive or banned.",
    });
  }
  if (!company.isVerified) {
    return res.status(403).json({
      code: "EMAIL_NOT_VERIFIED",
      message: "Email not verified.",
      companyId: company._id,
    });
  }

  const accessToken = tokenUtils.generateAccessToken(user);
  const refreshToken = tokenUtils.generateRefreshToken(user);

  res.cookie("accessToken", accessToken, cookieOptions);
  res.cookie("refreshToken", refreshToken, cookieOptions);

  res.json({
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
  if (!token) {
    return res.status(401).json({ message: "Unauthorized." });
  }

  if (await tokenUtils.isTokenBlacklisted(token)) {
    return res.status(403).json({ message: "Refresh token is blacklisted. Please log in again." });
  }

  const decoded = tokenUtils.verifyRefreshToken(token);
  if (!decoded) {
    return res.status(403).json({ message: "Invalid refresh token." });
  }

  const user = await User.findById(decoded.id).select("role permissions isActive companyId");
  if (!user || !user.isActive) {
    return res.status(403).json({ message: "Account is inactive or user not found." });
  }

  const comp = await Company.findById(user.companyId);
  if (!comp || comp.isDeleted) {
    return res.status(403).json({ message: "Company is inactive or banned." });
  }

  const newAccessToken = tokenUtils.generateAccessToken(user);
  res.cookie("accessToken", newAccessToken, cookieOptions);

  res.json({ accessToken: newAccessToken });
});

// ─────────────────────────────────────────────
// 4) Refresh Subscription
// ─────────────────────────────────────────────
exports.refreshSubscription = asyncHandler(async (req, res) => {
  const comp = await Company.findById(req.user.companyId);
  if (!comp || comp.isDeleted) {
    return res.status(403).json({ message: "Company unavailable or banned." });
  }
  res.json({
    subscriptionStatus: comp.subscription?.status || "pending",
    nextBillingDate: comp.subscription?.nextBillingDate || null,
  });
});

// ─────────────────────────────────────────────
// 5) Get Current User
// ─────────────────────────────────────────────
exports.getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }
  res.json({ user });
});

// ─────────────────────────────────────────────
// 6) Request Password Reset
// ─────────────────────────────────────────────
exports.requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false });
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = Date.now() + ONE_HOUR;
  await user.save();

  await emailService.sendPasswordResetEmail(user.email, resetToken, user.companyId.toString());
  res.json({ message: "Password reset link sent to email." });
});

// ─────────────────────────────────────────────
// 7) Reset Password
// ─────────────────────────────────────────────
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
  if (!user) {
    return res.status(400).json({ message: "Invalid or expired token." });
  }

  user.password = await bcrypt.hash(newPassword, 12);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  await tokenUtils.blacklistUserTokens(user._id);
  res.json({ message: "Password reset successful. Please log in again." });
});

// ─────────────────────────────────────────────
// 8) Logout
// ─────────────────────────────────────────────
exports.logout = asyncHandler(async (req, res) => {
  if (req.user?.id) {
    await tokenUtils.blacklistUserTokens(req.user.id);
  }

  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);
  res.json({ message: "Logged out successfully." });
});
