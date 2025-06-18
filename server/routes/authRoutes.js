const express = require("express");
const router = express.Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");

const {
  verifyToken
} = require("../middlewares/authMiddleware");

const {
  adminLogin,
  staffLogin,
  logout,
  requestPasswordReset,
  resetPassword,
  getCurrentUser,
  refreshToken,
  refreshSubscription,
} = require("../controllers/authController");

const isProd = process.env.NODE_ENV === "production";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// ==============================
// 🚀 Public Auth Routes (No Token Required)
// ==============================

/** Admin Login */
router.post("/admin/login", adminLogin);

/** Staff Login */
router.post("/staff/login", staffLogin);

/** Forgot Password */
router.post("/forgot-password", requestPasswordReset);

/** Reset Password */
router.post("/reset-password", resetPassword);

/**
 * Refresh Access Token using HttpOnly refresh cookie
 * — no middleware here, controller reads req.cookies.refreshToken
 */
router.post("/refresh", refreshToken);

// ==============================
// 🔐 Google OAuth Routes
// ==============================

/** Redirect to Google */
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

/** Google OAuth Callback */
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${FRONTEND_URL}/login?error=google_auth_failed`,
  }),
  (req, res) => {
    // Issue tokens
    const accessToken = jwt.sign(
      { id: req.user._id, role: req.user.role, companyId: req.user.companyId },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    const refreshToken = jwt.sign(
      { id: req.user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Set HttpOnly refresh cookie on path /
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Redirect with access token in query
    res.redirect(`${FRONTEND_URL}/google-auth-success?token=${accessToken}`);
  }
);

// ==============================
// 🔒 Authenticated Routes (Require Valid Access Token)
// ==============================
router.use(verifyToken);

/** Refresh only subscription status */
router.get("/subscription", refreshSubscription);

/** Get current user info */
router.get("/current-user", getCurrentUser);

/** Logout & clear cookies */
router.post("/logout", logout);

module.exports = router;
