// server/controllers/planController.js

const planService = require("../services/planService");

module.exports = {
  /**
   * GET /api/plan
   * Returns only active plans to tenant admins.
   */
  async getPlans(req, res, next) {
    try {
      // Correctly call getPlans, not fetchAll
      const plans = await planService.getPlans({ includeInactive: false });
      return res.status(200).json(plans);
    } catch (err) {
      return next(err);
    }
  }
};
