// server/config/passport.js

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User    = require('../models/User');
const Company = require('../models/Company');
const {
  registerCompany,
  completeRegistrationAndCreateAdmin
} = require('../services/companyService');

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('Google profile has no email'), null);
        }

        // 1) If user exists, log them in
        let user = await User.findOne({ email, isDeleted: false });
        if (user) {
          return done(null, user);
        }

        // 2) Otherwise, check for existing company
        let company = await Company.findOne({ email, isDeleted: false });
        if (!company) {
          // 2a) No company → create stub (omit phone)
          const { companyId } = await registerCompany({
            name:     profile.displayName,
            email,
            password: null
          });
          company = await Company.findById(companyId);
        }

        // 3) Complete registration & create admin user
        const { adminUser } = await completeRegistrationAndCreateAdmin({
          companyId:     company._id,
          gstin:         '',
          cin:           '',
          pan:           '',
          companyType:   'Google-Auth',
          address:       '',
          adminPassword: profile.id
        });

        // 4) Return admin user
        return done(null, adminUser);

      } catch (err) {
        return done(err, null);
      }
    }
  )
);

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
