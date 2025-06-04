// server/middlewares/verifyCompanyVerified.js

const Company = require('../models/Company');


async function verifyCompanyVerified(req, res, next) {
  try {
    // Determine companyId either from authenticated user or request body
    const companyId =
      (req.user && req.user.companyId) ||
      req.body.companyId;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const company = await Company.findById(companyId).select('isVerified');
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (!company.isVerified) {
      return res
        .status(403)
        .json({ error: 'Email address not verified. Please verify to continue.' });
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = verifyCompanyVerified;
