const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Company = require("../models/Company");
const {
  registerCompany,
  completeRegistrationAndCreateAdmin,
} = require("../services/companyService");
require("dotenv").config();

// 🔐 Ensure JWT_SECRET is available
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

        // 1) If user exists, log them in
        let user = await User.findOne({ email, isDeleted: false });
        if (user) return done(null, user);

        // 2) Otherwise, check for company using email
        let company = await Company.findOne({ email, isDeleted: false });

        if (!company) {
          // Auto-register the company (no phone, use placeholder password)
          const { companyId } = await registerCompany({
            name: profile.displayName || "Google Company",
            email,
            password: null, // Google ID used temporarily as password
          });

          company = await Company.findById(companyId);
        }

        // 3) Complete registration & create admin user
        const { adminUser } = await completeRegistrationAndCreateAdmin({
          companyId: company._id,
          gstin: "",
          cin: "",
          pan: "",
          companyType: "Google-Auth",
          address: "",
          adminPassword: profile.id, // Not usable directly, just placeholder
        });

        return done(null, adminUser);
      } catch (err) {
        console.error("🔴 Google Strategy Error:", err);
        return done(err, null);
      }
    }
  )
);

// 🔁 Session handling
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
