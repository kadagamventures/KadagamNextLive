// server/services/billingService.js

const mongoose       = require('mongoose');
const Company        = require('../models/Company');
const Plan           = require('../models/Plan');
const Task           = require('../models/Task');
const Project        = require('../models/Project');
const Attendance     = require('../models/Attendance');
const Leave          = require('../models/Leave');
const Notification   = require('../models/Notification');
const ReportArchive  = require('../models/ReportArchive');
const ArchivedTask   = require('../models/ArchivedTask');
const File           = require('../models/File');
const Chat           = require('../models/Chat');
const RoomChat       = require('../models/RoomChat');
const Performance    = require('../models/Performance');
const awsService     = require('./awsService');
const cacheService   = require('./cacheService');

class BillingService {
  /**
   * Activate a free trial for a company
   */
  async activateTrial(companyId, planId) {
    const [company, plan] = await Promise.all([
      Company.findById(companyId),
      Plan.findById(planId)
    ]);
    if (!plan || !plan.isFreeTrial) {
      throw new Error('Plan is not a free trial');
    }

    const now = new Date();
    const next = new Date(now);
    if (plan.duration.unit === 'days') {
      next.setDate(next.getDate() + plan.duration.value);
    } else if (plan.duration.unit === 'months') {
      next.setMonth(next.getMonth() + plan.duration.value);
    } else if (plan.duration.unit === 'years') {
      next.setFullYear(next.getFullYear() + plan.duration.value);
    } else {
      throw new Error('Invalid plan unit');
    }

    // Push a trial payment entry using the updated schema
    company.subscription.paymentHistory.push({
      planId:       plan._id,
      planName:     plan.name,
      planDuration: plan.durationDays,  // uses Plan.virtual('durationDays')
      planPrice:    0,
      gstAmount:    0,
      totalAmount:  0,
      invoiceKey:   '',                 // no invoice for trial
      amount:       0,
      date:         now,
      method:       'trial',
      transactionId:null,
      status:       'success',
    });

    // Let the pre-save hook recalculate startDate, nextBillingDate, status, lastPaymentAmount
    await company.save();
    return company.subscription;
  }

  /**
   * Record a paid subscription payment and update subscription dates
   */
  async recordPayment(companyId, planId, paymentInfo) {
    const [company, plan] = await Promise.all([
      Company.findById(companyId),
      Plan.findById(planId)
    ]);
    if (!plan || plan.isFreeTrial) {
      throw new Error('Plan is not a paid subscription');
    }

    const now = paymentInfo.date ? new Date(paymentInfo.date) : new Date();

    // Build the new payment entry
    const gstAmount   = Number(((plan.price * plan.gstPercentage) / 100).toFixed(2));
    const totalAmount = Number((plan.price + gstAmount).toFixed(2));

    company.subscription.paymentHistory.push({
      planId:        plan._id,
      planName:      plan.name,
      planDuration:  plan.durationDays,
      planPrice:     plan.price,
      gstAmount:     gstAmount,
      totalAmount:   totalAmount,
      invoiceKey:    '',                        // to be filled after invoice upload
      amount:        totalAmount,
      date:          now,
      method:        paymentInfo.method,
      transactionId: paymentInfo.transactionId,
      status:        'success',
    });

    // Pre-save hook will recalculate subscription summary
    await company.save();
    return company.subscription;
  }

  /**
   * Fetch current billing status & a short history
   */
  async fetchStatus(companyId) {
    const company = await Company.findById(companyId)
      .select('subscription')
      .lean();
    if (!company) {
      throw new Error('Company not found');
    }

    const { subscription } = company;
    const now = new Date();
    const daysRemaining = subscription.nextBillingDate
      ? Math.ceil((new Date(subscription.nextBillingDate) - now) / (1000 * 60 * 60 * 24))
      : 0;

    // Return the most recent 5 entries
    const history = (subscription.paymentHistory || [])
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
      .map(entry => ({
        planName:      entry.planName,
        planDuration:  entry.planDuration,
        planPrice:     entry.planPrice,
        gstAmount:     entry.gstAmount,
        totalAmount:   entry.totalAmount,
        date:          entry.date,
        method:        entry.method,
        transactionId: entry.transactionId,
        invoiceKey:    entry.invoiceKey,
      }));

    return {
      planId:            subscription.planId,
      status:            subscription.status,
      lastPaymentAmount: subscription.lastPaymentAmount,
      nextBillingDate:   subscription.nextBillingDate,
      daysRemaining,
      paymentHistory:    history
    };
  }

  /**
   * Purge all tenant data after grace period
   */
  async purgeTenantData(companyId) {
    if (!mongoose.isValidObjectId(companyId)) {
      throw new Error('Invalid companyId');
    }

    await Promise.all([
      Task.deleteMany({ companyId }),
      Project.deleteMany({ companyId }),
      Attendance.deleteMany({ companyId }),
      Leave.deleteMany({ companyId }),
      Notification.deleteMany({ companyId }),
      ReportArchive.deleteMany({ companyId }),
      ArchivedTask.deleteMany({ companyId }),
      File.deleteMany({ companyId }),
      Chat.deleteMany({ companyId }),
      RoomChat.deleteMany({ companyId }),
      Performance.deleteMany({ companyId }),
      Company.updateOne(
        { _id: companyId },
        { $set: { isDeleted: true, 'subscription.status': 'cancelled' } }
      )
    ]);

    // Remove all S3 objects under this tenant's folder
    await awsService.deleteFolder(`company_${companyId}`);

    // Clear all related Redis/Cache keys
    await cacheService.deleteByPrefix(`company_${companyId}:`);

    return true;
  }
}

module.exports = new BillingService();
