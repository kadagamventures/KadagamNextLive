require("dotenv").config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Company = require("../models/Company");
const User = require("../models/User");
const Plan = require("../models/Plan");
const Invoice = require("../models/Invoice");
const { generatePresignedUrl, getFileStream } = require("./awsService");

class SuperAdminService {
  // 🔐 Super‑Admin Login
  async loginSuperAdmin({ email, password }) {
    const user = await User.findOne({
      email,
      role: "super_admin",
      isDeleted: false
    });
    if (!user) throw new Error("Super‑Admin not found");

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new Error("Invalid password");

    const payload = { id: user._id, role: user.role, companyId: user.companyId };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "1h"
    });

    return { token, user };
  }

  // 📦 List all companies (tenants)
  async getAllCompanies() {
    const companies = await Company.find({ isDeleted: false })
      .populate({
        path: "subscription.planId",
        model: "Plan",
        select: "name"
      })
      .select([
        "_id", "name", "email", "phone", "gstin", "cin", "pan",
        "companyType", "address",
        "subscription.planId", "subscription.status",
        "subscription.nextBillingDate", "trustLevel",
        "isVerified", "createdAt"
      ])
      .sort({ createdAt: -1 })
      .lean();

    return companies.map(c => ({
      ...c,
      planName: c.subscription?.planId?.name || "—"
    }));
  }

  // 📄 Fetch single company details
  async getCompanyById(companyId) {
    const c = await Company.findById(companyId)
      .populate({
        path: "subscription.planId",
        model: "Plan",
        select: "name"
      })
      .select([
        "_id", "name", "email", "phone", "gstin", "cin", "pan",
        "companyType", "address", "subscription",
        "trustLevel", "isVerified", "createdAt"
      ])
      .lean();

    if (!c) throw new Error("Company not found");

    return {
      ...c,
      planName: c.subscription?.planId?.name || "—"
    };
  }

  // 💰 Fetch payment history + presigned URLs
  async getPaymentHistory(companyId, year) {
    const company = await Company.findOne({
      _id: companyId,
      isDeleted: false
    }).lean();
    if (!company) throw new Error("Company not found");

    let history = (company.subscription?.paymentHistory || [])
      .filter(h => h.status === "success");

    if (year) {
      history = history.filter(h =>
        new Date(h.date).getFullYear() === Number(year)
      );
    }

    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    const invoiceKeys = history
      .map(e => e.invoiceId || e.transactionId)
      .filter(Boolean);
    const planIds = [...new Set(history.map(e => String(e.planId)))];

    const [invoices, plans] = await Promise.all([
      Invoice.find({
        $or: [
          { invoiceNumber: { $in: invoiceKeys } },
          { transactionId: { $in: invoiceKeys } }
        ]
      }).lean(),
      Plan.find({ _id: { $in: planIds } }).lean()
    ]);

    const invoiceMap = new Map(
      invoices.map(inv => [
        inv.invoiceNumber || inv.transactionId,
        inv
      ])
    );
    const planMap = new Map(plans.map(p => [String(p._id), p]));

    const rows = await Promise.all(history.map(async entry => {
      const plan = planMap.get(String(entry.planId)) || {};
      const baseAmt = entry.baseAmount ?? plan.price ?? 0;
      const gstPct = plan.gstPercentage ?? 0;
      const gstAmt = entry.gstAmount ?? +(baseAmt * gstPct / 100).toFixed(2);
      const totalAmt = entry.totalAmount ?? +(baseAmt + gstAmt).toFixed(2);

      const key = entry.invoiceId || entry.transactionId;
      const inv = invoiceMap.get(key) || {};
      let downloadUrl = null;
      if (inv.pdfKey) {
        downloadUrl = await generatePresignedUrl(inv.pdfKey);
      }

      return {
        planName: plan.name || entry.planName || "—",
        baseAmount: baseAmt,
        gstAmount: gstAmt,
        totalAmount: totalAmt,
        paymentDate: entry.date,
        invoiceNumber: inv.invoiceNumber || key || null,
        downloadUrl
      };
    }));

    return rows;
  }

  // 🔄 Update subscription status
  async updateCompanySubscriptionStatus(companyId, status) {
    return Company.findByIdAndUpdate(
      companyId,
      { "subscription.status": status },
      { new: true }
    )
      .select("subscription.status subscription.nextBillingDate")
      .lean();
  }

  // ⚙️ Update trust & verification
  async updateCompanyTrust(companyId, trustLevel, isVerified) {
    return Company.findByIdAndUpdate(
      companyId,
      { trustLevel, isVerified },
      { new: true }
    )
      .select("trustLevel isVerified")
      .lean();
  }

  // ❌ Soft‑delete a company
  async softDeleteCompany(companyId) {
    return Company.findByIdAndUpdate(
      companyId,
      { isDeleted: true },
      { new: true }
    )
      .select("isDeleted")
      .lean();
  }

  // 📊 Revenue summary
  async getRevenueSummary(year) {
    const start = new Date(`${year}-01-01T00:00:00Z`);
    const end = new Date(`${+year + 1}-01-01T00:00:00Z`);

    const companies = await Company.find({
      isDeleted: false,
      "subscription.paymentHistory.date": { $gte: start, $lt: end }
    })
      .select("subscription.paymentHistory")
      .lean();

    const monthlyRevenue = Array(12).fill(0);
    companies.forEach(({ subscription }) => {
      (subscription.paymentHistory || []).forEach(p => {
        const d = new Date(p.date);
        if (d >= start && d < end) {
          monthlyRevenue[d.getMonth()] += p.amount;
        }
      });
    });

    const totalRevenue = monthlyRevenue.reduce((a, b) => a + b, 0);
    const total = await Company.countDocuments({ isDeleted: false });
    const active = await Company.countDocuments({ isDeleted: false, "subscription.status": "active" });
    const expired = await Company.countDocuments({ isDeleted: false, "subscription.status": "expired" });
    const cancelled = await Company.countDocuments({ isDeleted: true });

    const pct = n => total ? Math.round((n / total) * 100) : 0;

    return {
      year: String(year),
      totalRevenue,
      monthlyRevenue,
      totalCompanies: total,
      activeCompanies: active,
      inactiveCompanies: expired,
      cancelledCompanies: cancelled,
      statusPercentages: {
        active: pct(active),
        inactive: pct(expired),
        cancelled: pct(cancelled)
      }
    };
  }

  // ⚙️ Get plan configurations
  async getPlanConfig() {
    return Plan.find({})
      .sort({ "duration.unit": 1, "duration.value": 1 })
      .select([
        "_id", "name",
        "duration.value", "duration.unit",
        "price", "gstPercentage",
        "isActive", "isFreeTrial"
      ])
      .lean();
  }

  // 🔁 Update plan configurations
  async updatePlanConfig(configs) {
    if (!Array.isArray(configs) || configs.length === 0) {
      throw new Error("Must provide an array of plan configurations.");
    }

    const ops = configs.map(cfg => {
      const isFree = cfg.price === 0;
      return {
        updateOne: {
          filter: { _id: cfg._id },
          update: {
            $set: {
              name: cfg.name,
              duration: cfg.duration,
              price: cfg.price,
              gstPercentage: cfg.gstPercentage ?? 18,
              isActive: Boolean(cfg.isActive),
              isFreeTrial: isFree
            }
          }
        }
      };
    });

    await Plan.bulkWrite(ops);
    return this.getPlanConfig();
  }

  // 📥 Proxy‑download raw PDF bytes via server
  async downloadInvoicePDF(invoiceId) {
    if (!invoiceId) throw new Error("Invoice ID is required");

    const invoice = await Invoice.findOne({
      $or: [
        { invoiceNumber: invoiceId },
        { transactionId: invoiceId }
      ]
    }).lean();

    if (!invoice || !invoice.pdfKey) {
      throw new Error("Invoice PDF not found");
    }

    const stream = await getFileStream(invoice.pdfKey);
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }
}

module.exports = new SuperAdminService();
