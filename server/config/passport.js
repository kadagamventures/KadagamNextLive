require("dotenv").config();
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Company = require("../models/Company");
const { registerCompany } = require("../services/companyService");

if (!process.env.JWT_SECRET) {
  throw new Error("❌ JWT_SECRET is not set in environment variables");
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES || "1h";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error("Google profile has no email"), null);
        }

        // 1) If admin user exists, log them in
        let user = await User.findOne({ email, isDeleted: false, role: "admin" });
        if (user) return done(null, user);

        // 2) Otherwise, check for company using email (don't create user yet)
        let company = await Company.findOne({ email, isDeleted: false });
        if (!company) {
          const { companyId } = await registerCompany({
            name: profile.displayName || "Google Company",
            email,
            companyType: "Google-Auth",
            password: null // Google users don't need password now
          });
          company = await Company.findById(companyId);
        }

        // Instead of creating admin user now, just return a minimal object
        // Pass companyId to JWT for frontend to use
        const googleUserObj = {
          _id: company._id,
          name: profile.displayName || company.name,
          email,
          role: "admin",
          companyId: company._id,
          googleAuthOnly: true // (for clarity)
        };
        return done(null, googleUserObj);

      } catch (err) {
        console.error("🔴 Google Strategy Error:", err);
        return done(err, null);
      }
    }
  )
);

// Session handling (unchanged)
passport.serializeUser((user, done) => {
  done(null, user._id || user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    // Try both user and company, for googleAuthOnly object
    let user = await User.findById(id);
    if (!user) user = await Company.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
