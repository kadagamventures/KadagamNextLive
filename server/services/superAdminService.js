// server/services/superAdminService.js

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Company = require("../models/Company");
const User = require("../models/User");
const Plan = require("../models/Plan");
require("dotenv").config();

/**
 * 🔐 Super Admin Login
 */
const loginSuperAdmin = async ({ email, password }) => {
  const user = await User.findOne({
    email,
    role: "super_admin",
    isDeleted: false,
  });
  if (!user) throw new Error("Super Admin not found.");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error("Invalid password.");

  const payload = { id: user._id, role: user.role };
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  });

  return { token, user };
};

/**
 * 📦 Get All Companies (with extended details)
 *     Populates subscription.planId → only returns the Plan.name
 */
const getAllCompanies = async () => {
  const companies = await Company.find({ isDeleted: false })
    .populate({
      path: "subscription.planId",
      select: "name",
    })
    .select([
      "_id",
      "name",
      "email",
      "phone",
      "gstin",
      "cin",
      "pan",
      "companyType",
      "address",
      "subscription.planId",
      "subscription.status",
      "subscription.nextBillingDate",
      "trustLevel",
      "isVerified",
      "createdAt",
    ])
    .sort({ createdAt: -1 })
    .lean();

  return companies;
};

/**
 * 📝 Get Single Company Details
 */
const getCompanyById = async (companyId) => {
  const company = await Company.findById(companyId)
    .select([
      "_id",
      "name",
      "email",
      "phone",
      "gstin",
      "cin",
      "pan",
      "companyType",
      "address",
      "subscription",
      "trustLevel",
      "isVerified",
      "createdAt",
      "paymentHistory",
    ])
    .lean();
  if (!company) throw new Error("Company not found.");
  return company;
};

/**
 * 💰 Get Payment History
 */
const getPaymentHistory = async (companyId) => {
  const company = await getCompanyById(companyId);
  const history = company.subscription.paymentHistory || [];
  // Ensure the returned history is sorted by date descending
  history.sort((a, b) => new Date(b.date) - new Date(a.date));
  return history;
};

/**
 * 🔄 Update Subscription Status
 */
const updateCompanySubscriptionStatus = async (companyId, status) => {
  return Company.findByIdAndUpdate(
    companyId,
    { "subscription.status": status },
    { new: true }
  )
    .select("subscription.status subscription.nextBillingDate")
    .lean();
};

/**
 * ⚙️ Update Trust Level & Verification
 */
const updateCompanyTrust = async (companyId, trustLevel, isVerified) => {
  return Company.findByIdAndUpdate(
    companyId,
    { trustLevel, isVerified },
    { new: true }
  )
    .select("trustLevel isVerified")
    .lean();
};

/**
 * ❌ Soft Delete Company
 */
const softDeleteCompany = async (companyId) => {
  return Company.findByIdAndUpdate(
    companyId,
    { isDeleted: true },
    { new: true }
  )
    .select("isDeleted")
    .lean();
};

async function getRevenueSummary(year) {
  const start = new Date(`${year}-01-01T00:00:00.000Z`);
  const end = new Date(`${parseInt(year, 10) + 1}-01-01T00:00:00.000Z`);

  // 1) Gather all payments in that year
  const companies = await Company.find({
    isDeleted: false,
    "subscription.paymentHistory.date": { $gte: start, $lt: end },
  })
    .select("subscription.paymentHistory")
    .lean();

  // 2) Bucket into Jan→Dec
  const monthlyRevenue = Array(12).fill(0);
  companies.forEach(({ subscription }) => {
    (subscription.paymentHistory || []).forEach((p) => {
      const d = new Date(p.date);
      if (d >= start && d < end) monthlyRevenue[d.getMonth()] += p.amount;
    });
  });

  // 3) Totals & counts
  const totalRevenue = monthlyRevenue.reduce((a, b) => a + b, 0);
  const [active, inactive, cancelled, total] = await Promise.all([
    Company.countDocuments({ isDeleted: false, "subscription.status": "active" }),
    Company.countDocuments({ isDeleted: false, "subscription.status": "expired" }),
    Company.countDocuments({ isDeleted: true }),
    Company.countDocuments({ isDeleted: false }),
  ]);

  return {
    year: String(year),
    totalRevenue,
    monthlyRevenue,
    totalCompanies: total,
    activeCompanies: active,
    inactiveCompanies: inactive,
    cancelledCompanies: cancelled,
  };
}

/**
 * 📑 Fetch current plan configurations
 *    Includes gstPercentage for each plan.
 */
const getPlanConfig = async () => {
  return Plan.find({})
    .sort({ "duration.unit": 1, "duration.value": 1 })
    .select([
      "_id",
      "name",
      "duration.value",
      "duration.unit",
      "price",
      "gstPercentage",
      "isActive",
      "isFreeTrial",
    ])
    .lean();
};

/**
 * 🔄 Update plans in bulk
 *    Now supports gstPercentage on each plan.
 */
const updatePlanConfig = async (configs) => {
  if (!Array.isArray(configs) || configs.length === 0) {
    throw new Error("Must provide an array of plan configurations.");
  }

  const operations = configs.map((cfg) => {
    const isFreeTrial = cfg.price === 0;
    return {
      updateOne: {
        filter: { _id: cfg._id },
        update: {
          $set: {
            name: cfg.name,
            duration: cfg.duration,
            price: cfg.price,
            gstPercentage: cfg.gstPercentage ?? 18, // default 18% if not provided
            isActive: Boolean(cfg.isActive),
            isFreeTrial,
          },
        },
      },
    };
  });

  await Plan.bulkWrite(operations);

  // Return the updated list
  return Plan.find({})
    .sort({ "duration.unit": 1, "duration.value": 1 })
    .select([
      "_id",
      "name",
      "duration.value",
      "duration.unit",
      "price",
      "gstPercentage",
      "isActive",
      "isFreeTrial",
    ])
    .lean();
};

module.exports = {
  loginSuperAdmin,
  getAllCompanies,
  getCompanyById,
  getPaymentHistory,
  updateCompanySubscriptionStatus,
  updateCompanyTrust,
  softDeleteCompany,
  getRevenueSummary,
  getPlanConfig,
  updatePlanConfig,
};
