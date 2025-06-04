const express = require("express");
const router = express.Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");

const {
  verifyToken,
  verifyRefreshToken
} = require("../middlewares/authMiddleware");

const {
  adminLogin,
  staffLogin,
  logout,
  requestPasswordReset,
  resetPassword,
  getCurrentUser,
  refreshToken
} = require("../controllers/authController");

// ==============================
// 🚀 Public Auth Routes (No Token Required)
// ==============================

/**
 * ✅ Admin Login (Email or staffId '8000')
 */
router.post("/admin/login", adminLogin);

/**
 * ✅ Staff Login (Email or staffId)
 */
router.post("/staff/login", staffLogin);

/**
 * ✅ Forgot Password
 */
router.post("/forgot-password", requestPasswordReset);

/**
 * ✅ Reset Password
 */
router.post("/reset-password", resetPassword);

/**
 * ✅ Refresh Access Token
 */
router.post("/refresh", verifyRefreshToken, refreshToken);

// ==============================
// 🔐 Google OAuth Routes
// ==============================

/**
 * 🔑 Start Google OAuth login
 */
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

/**
 * 🎯 Handle Google OAuth callback
 */
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/admin/login" }),
  (req, res) => {
    const token = jwt.sign(
      {
        id: req.user._id,
        role: req.user.role,
        companyId: req.user.companyId
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    // Redirect back to frontend with token
    res.redirect(
      `${process.env.FRONTEND_URL}/google-auth-success?token=${token}`
    );
  }
);

// ==============================
// 🔒 Protected Routes (Requires Auth Token)
// ==============================

router.use(verifyToken);

/**
 * ✅ Get Current User Info
 */
router.get("/current-user", getCurrentUser);

/**
 * ✅ Logout
 */
router.post("/logout", logout);

module.exports = router;
