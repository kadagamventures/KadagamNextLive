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

// ==============================
// 🚀 Public Auth Routes (No Token Required)
// ==============================

router.post("/admin/login", adminLogin);
router.post("/staff/login", staffLogin);
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.post("/refresh", refreshToken); // handled via cookies (no middleware)

// ==============================
// 🔐 Google OAuth Routes
// ==============================

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${FRONTEND_URL}/login?error=google_auth_failed`,
  }),
  (req, res) => {
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

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

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
