// server/routes/authRoutes.js

const express = require("express");
const router = express.Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");

const {
  verifyToken,
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

// Cookie settings used in login controller:
// httpOnly, secure in prod, sameSite=None in prod, scoped to /api/auth/refresh
// (handled inside authController)

// ==============================
// 🚀 Public Auth Routes (No Token Required)
// ==============================

router.post("/admin/login", adminLogin);
router.post("/staff/login", staffLogin);
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPassword);

// Refresh uses the cookie set on /api/auth/refresh, so no middleware needed here
router.post("/refresh", refreshToken);

// ==============================
// 🔐 Google OAuth Routes
// ==============================

// Initiate Google OAuth
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${FRONTEND_URL}/login?error=google_auth_failed`,
  }),
  (req, res) => {
    // Create tokens
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

    // Set refreshToken cookie cross-site
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "None" : "Lax",
      path: "/api/auth/refresh",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect back to frontend with accessToken
    res.redirect(`${FRONTEND_URL}/google-auth-success?token=${accessToken}`);
  }
);

// ==============================
// 🔒 Authenticated Routes (Require Valid Access Token)
// ==============================

router.use(verifyToken);

router.get("/subscription", refreshSubscription);
router.get("/current-user", getCurrentUser);
router.post("/logout", logout);

module.exports = router;
