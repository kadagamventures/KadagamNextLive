const superAdminService = require("../services/superAdminService");


const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const { token, user } = await superAdminService.loginSuperAdmin({ email, password });
    return res.status(200).json({
      message: "Super Admin login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    return next(err);
  }
};


const getCompanies = async (req, res, next) => {
  try {
    const companies = await superAdminService.getAllCompanies();
    return res.status(200).json(companies);
  } catch (err) {
    return next(err);
  }
};


const getCompanyDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const company = await superAdminService.getCompanyById(id);
    return res.status(200).json(company);
  } catch (err) {
    return next(err);
  }
};


const updateSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: "Subscription status is required." });
    }

    const company = await superAdminService.updateCompanySubscriptionStatus(id, status);
    return res.status(200).json({
      message: "Subscription status updated",
      company,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * ✅ PUT /api/super-admin/companies/:id/trust
 */
const updateTrust = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { trustLevel, isVerified } = req.body;
    if (!trustLevel || typeof isVerified !== "boolean") {
      return res
        .status(400)
        .json({ error: "Both trustLevel (string) and isVerified (boolean) are required." });
    }

    const company = await superAdminService.updateCompanyTrust(id, trustLevel, isVerified);
    return res.status(200).json({
      message: "Trust level & verification status updated",
      company,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * ❌ DELETE /api/super-admin/companies/:id
 */
const deleteCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    const company = await superAdminService.softDeleteCompany(id);
    return res.status(200).json({
      message: "Company soft-deleted",
      company,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * 💰 GET /api/super-admin/revenue?year=YYYY&month=0-11
 */
const getRevenue = async (req, res, next) => {
  try {
    const year = req.query.year
      ? parseInt(req.query.year, 10)
      : new Date().getFullYear();

    let month = null;
    if (req.query.month != null) {
      month = parseInt(req.query.month, 10);
      if (isNaN(month) || month < 0 || month > 11) {
        return res
          .status(400)
          .json({ error: "month must be an integer between 0 (Jan) and 11 (Dec)" });
      }
    }

    const summary = await superAdminService.getRevenueSummary(year);
    const payload = {
      year: summary.year,
      totalRevenue: summary.totalRevenue,
      totalCompanies: summary.totalCompanies,
      activeCompanies: summary.activeCompanies,
      inactiveCompanies: summary.inactiveCompanies,
      cancelledCompanies: summary.cancelledCompanies,
      monthlyRevenue: month !== null ? summary.monthlyRevenue[month] : summary.monthlyRevenue,
    };

    if (month !== null) payload.month = month;
    return res.status(200).json(payload);
  } catch (err) {
    return next(err);
  }
};

/**
 * 📄 GET /api/super-admin/companies/:id/payments
 */
const getPaymentHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const history = await superAdminService.getPaymentHistory(id);
    return res.status(200).json(history);
  } catch (err) {
    return next(err);
  }
};

/**
 * ⚙️ GET /api/super-admin/plans
 * Returns list of plans, including gstPercentage.
 */
const getPlanConfig = async (req, res, next) => {
  try {
    const plans = await superAdminService.getPlanConfig();
    return res.status(200).json(plans);
  } catch (err) {
    return next(err);
  }
};

/**
 * ⚙️ PUT /api/super-admin/plans
 * Expects body: [{ _id, name, duration: { value, unit }, price, gstPercentage, isActive }, ...]
 */
const updatePlanConfig = async (req, res, next) => {
  try {
    const configs = req.body;

    // Basic validation
    if (!Array.isArray(configs) || configs.length === 0) {
      return res.status(400).json({ error: "Must provide an array of plan configurations." });
    }

    // Accept plural duration units to match schema
    const validUnits = ["days", "months", "years"];
    for (const cfg of configs) {
      if (
        !cfg._id ||
        typeof cfg.name !== "string" ||
        typeof cfg.duration?.value !== "number" ||
        !validUnits.includes(cfg.duration?.unit) ||
        typeof cfg.price !== "number" ||
        typeof cfg.gstPercentage !== "number"
      ) {
        return res.status(400).json({
          error:
            "Each plan config must include _id (string), name (string), duration.value (number), duration.unit ('days'|'months'|'years'), price (number), and gstPercentage (number).",
        });
      }
    }

    const updated = await superAdminService.updatePlanConfig(configs);
    return res.status(200).json(updated);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  login,
  getCompanies,
  getCompanyDetails,
  updateSubscription,
  updateTrust,
  deleteCompany,
  getRevenue,
  getPaymentHistory,
  getPlanConfig,
  updatePlanConfig,
};
