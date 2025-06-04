// server/middlewares/ensureVerifiedTenant.js

const Company = require('../models/Company');

module.exports = async function ensureVerifiedTenant(req, res, next) {
  try {
    // Assumes req.user.companyId is set by your verifyToken middleware
    const company = await Company.findById(req.user.companyId).select('isEmailVerified').lean();
    if (!company) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    if (!company.isEmailVerified) {
      return res.status(403).json({ error: 'Tenant email not verified' });
    }
    next();
  } catch (err) {
    next(err);
  }
};
