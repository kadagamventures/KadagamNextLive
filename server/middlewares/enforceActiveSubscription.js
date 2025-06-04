// server/middlewares/enforceActiveSubscription.js

const Company = require('../models/Company');

// Number of days after due date that we allow read-only access before purge
const GRACE_PERIOD_DAYS = 30;

/**
 * Middleware to enforce subscription status on tenant routes.
 *
 * - Active or trial subscriptions: full access
 * - Pending: block all access (402 Payment Required)
 * - Expired within grace period: allow read-only (GET/HEAD), block writes
 * - Expired beyond grace period or cancelled: block all access
 *
 * Usage:
 *   router.use('/api/tenant', verifyToken, enforceActiveSubscription, tenantRouter);
 */
async function enforceActiveSubscription(req, res, next) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'companyId missing from authentication token' });
    }

    const company = await Company.findById(companyId)
      .select('subscription.status subscription.nextBillingDate')
      .lean();

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const { status, nextBillingDate } = company.subscription;
    const now = new Date();

    // Active or trial → allow
    if (status === 'active' || status === 'trial') {
      return next();
    }

    // Pending → must choose/pay a plan
    if (status === 'pending') {
      return res.status(402).json({
        error: 'Subscription pending. Please select a plan and complete payment to proceed.'
      });
    }

    // Expired within grace period
    if (status === 'expired' && nextBillingDate) {
      const diffMs = now - new Date(nextBillingDate);
      const daysPastDue = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (daysPastDue >= 0 && daysPastDue < GRACE_PERIOD_DAYS) {
        // Read-only for GET/HEAD
        if (['GET', 'HEAD'].includes(req.method)) {
          return next();
        } else {
          return res.status(402).json({
            error: 'Subscription expired. Read-only access only. Please renew to continue editing.'
          });
        }
      }
    }

    // Beyond grace period or explicitly cancelled
    return res.status(402).json({
      error: 'Subscription expired or cancelled. Please renew your subscription to regain access.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = enforceActiveSubscription;
