const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const Company = require('../models/Company');
const { generateUniqueStaffId } = require('../utils/staffUtils');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(new Error("Google account has no email."), null);

    let user = await User.findOne({ email, isDeleted: false });

    // If user already exists
    if (user) return done(null, user);

    // Check if a company with this email already exists
    let company = await Company.findOne({ email, isDeleted: false });
    if (!company) {
      // Create new company for this Google account
      company = await Company.create({
        name: profile.displayName,
        email,
        phone: '',
        subscription: {
          planId: null,
          planType: null,
          status: "pending",
          nextBillingDate: null,
          lastPaymentAmount: 0,
          paymentHistory: []
        },
        trustLevel: "new",
        isVerified: false,
        isDeleted: false
      });
    }

    // Create the associated admin user
    const adminStaffId = await generateUniqueStaffId();

    user = await User.create({
      name: `${profile.displayName} Admin`,
      email,
      password: null, // Google login, no password
      role: "admin",
      companyId: company._id,
      staffId: adminStaffId,
      permissions: ["manage_project", "manage_task", "manage_staff"],
      isActive: true,
      isDeleted: false,
      googleId: profile.id
    });

    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

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
