const superAdminService = require("../services/superAdminService");

const ONE_HOUR = 60 * 60 * 1000;
const isProd = process.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "None" : "Lax",
  maxAge: ONE_HOUR,
};

// 🔐 POST /api/super-admin/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const { token, user } = await superAdminService.loginSuperAdmin({ email, password });
    res.cookie("accessToken", token, cookieOptions);

    return res.status(200).json({
      message: "Super Admin login successful",
      accessToken: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// 🏢 GET /api/super-admin/companies
const getCompanies = async (req, res, next) => {
  try {
    const companies = await superAdminService.getAllCompanies();
    return res.status(200).json(companies);
  } catch (err) {
    next(err);
  }
};

// 🏢 GET /api/super-admin/companies/:id
const getCompanyDetails = async (req, res, next) => {
  try {
    const company = await superAdminService.getCompanyById(req.params.id);
    return res.status(200).json(company);
  } catch (err) {
    next(err);
  }
};

// 🔄 PUT /api/super-admin/companies/:id/subscription
const updateSubscription = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: "Subscription status is required." });
    }

    const company = await superAdminService.updateCompanySubscriptionStatus(req.params.id, status);
    return res.status(200).json({
      message: "Subscription status updated",
      company,
    });
  } catch (err) {
    next(err);
  }
};

// ⚙️ PUT /api/super-admin/companies/:id/trust
const updateTrust = async (req, res, next) => {
  try {
    const { trustLevel, isVerified } = req.body;
    if (!trustLevel || typeof isVerified !== "boolean") {
      return res.status(400).json({
        error: "Both trustLevel (string) and isVerified (boolean) are required.",
      });
    }

    const company = await superAdminService.updateCompanyTrust(
      req.params.id,
      trustLevel,
      isVerified
    );
    return res.status(200).json({
      message: "Trust level & verification status updated",
      company,
    });
  } catch (err) {
    next(err);
  }
};

// ❌ DELETE /api/super-admin/companies/:id
const deleteCompany = async (req, res, next) => {
  try {
    const company = await superAdminService.softDeleteCompany(req.params.id);
    return res.status(200).json({
      message: "Company soft‑deleted",
      company,
    });
  } catch (err) {
    next(err);
  }
};

// 💰 GET /api/super-admin/revenue?year=YYYY
const getRevenue = async (req, res, next) => {
  try {
    const year = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();
    const summary = await superAdminService.getRevenueSummary(year);
    return res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
};

// 📄 GET /api/super-admin/companies/:id/payments?year=YYYY
const getPaymentHistory = async (req, res, next) => {
  try {
    const history = await superAdminService.getPaymentHistory(req.params.id, req.query.year);
    return res.status(200).json(history);
  } catch (err) {
    next(err);
  }
};

// 📥 GET /api/super-admin/companies/:id/payments/:invoiceId/pdf
const downloadInvoicePDF = async (req, res, next) => {
  try {
    const buffer = await superAdminService.downloadInvoicePDF(req.params.invoiceId);
    res
      .status(200)
      .set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${req.params.invoiceId}.pdf"`,
      })
      .send(buffer);
  } catch (err) {
    next(err);
  }
};

// ⚙️ GET /api/super-admin/plans
const getPlanConfig = async (req, res, next) => {
  try {
    const plans = await superAdminService.getPlanConfig();
    return res.status(200).json(plans);
  } catch (err) {
    next(err);
  }
};

// ⚙️ PUT /api/super-admin/plans
const updatePlanConfig = async (req, res, next) => {
  try {
    const configs = req.body;
    if (!Array.isArray(configs) || configs.length === 0) {
      return res.status(400).json({
        error: "Must provide an array of plan configurations.",
      });
    }

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
            "Each plan config must include _id (string), name (string), " +
            "duration.value (number), duration.unit ('days'|'months'|'years'), " +
            "price (number), and gstPercentage (number).",
        });
      }
    }

    const updated = await superAdminService.updatePlanConfig(configs);
    return res.status(200).json(updated);
  } catch (err) {
    if (err.message?.startsWith("Duplicate duration found")) {
      return res.status(409).json({ error: err.message });
    }
    next(err);
  }
};

// 🔁 PUT /api/super-admin/plans/:id
const updateSinglePlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cfg = req.body;

    const validUnits = ["days", "months", "years"];
    if (
      !cfg ||
      typeof cfg.name !== "string" ||
      typeof cfg.duration?.value !== "number" ||
      !validUnits.includes(cfg.duration?.unit) ||
      typeof cfg.price !== "number" ||
      typeof cfg.gstPercentage !== "number"
    ) {
      return res.status(400).json({
        error:
          "Missing or invalid fields. Required: name (string), duration.value (number), duration.unit ('days'|'months'|'years'), price (number), gstPercentage (number).",
      });
    }

    const updated = await superAdminService.updateSinglePlan(id, cfg);
    return res.status(200).json({
      message: "Plan updated successfully",
      plan: updated,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// EXPORT ALL CONTROLLERS
// ─────────────────────────────────────────────
module.exports = {
  login,
  getCompanies,
  getCompanyDetails,
  updateSubscription,
  updateTrust,
  deleteCompany,
  getRevenue,
  getPaymentHistory,
  downloadInvoicePDF,
  getPlanConfig,
  updatePlanConfig,
  updateSinglePlan, // ✅ Added
};
