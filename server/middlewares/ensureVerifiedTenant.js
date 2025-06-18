// server/middlewares/ensureVerifiedTenant.js

const Company = require("../models/Company");

module.exports = async function ensureVerifiedTenant(req, res, next) {
  try {
    // req.user.companyId should be the 6‑digit string ID
    const company = await Company
      .findById(req.user.companyId)
      .select("isVerified")
      .lean();

    if (!company) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    if (!company.isVerified) {
      return res.status(403).json({ error: "Tenant email not verified" });
    }

    next();
  } catch (err) {
    next(err);
  }
};
