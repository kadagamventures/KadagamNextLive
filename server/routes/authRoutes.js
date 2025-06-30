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

const cookieOptions = require("../config/cookieOptions");

const isProd = process.env.NODE_ENV === "production";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// ==============================
// 🚀 Public Auth Routes (No Token Required)
// ==============================

router.post("/admin/login", adminLogin);
router.post("/staff/login", staffLogin);
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPassword);

// Token refresh from cookie; no auth middleware
router.post("/refresh", refreshToken);

// ==============================
// 🔐 Google OAuth Routes
// ==============================

// Step 1: Redirect to Google
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Step 2: Google callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${FRONTEND_URL}/login?error=google_auth_failed`,
  }),
  (req, res) => {
    const accessToken = jwt.sign(
      {
        id: req.user._id,
        role: req.user.role,
        companyId: req.user.companyId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Use JWT_SECRET for refreshToken as well for consistency!
    const refreshToken = jwt.sign(
      {
        id: req.user._id,
        role: req.user.role,
        companyId: req.user.companyId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Set refresh token cookie (path option is optional)
    res.cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      path: "/",
    });

    // Redirect to frontend with accessToken in URL (or use cookie)
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
