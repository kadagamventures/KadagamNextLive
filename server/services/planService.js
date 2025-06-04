// server/services/planService.js

const Plan = require("../models/Plan");

module.exports = {
  /**
   * 📑 Get all plans (active by default)
   * @param {{ includeInactive?: boolean }} options
   * @returns {Promise<Array>}
   */
  async getPlans(options = {}) {
    const filter = options.includeInactive ? {} : { isActive: true };
    return Plan.find(filter)
      .sort({ "duration.unit": 1, "duration.value": 1 })
      .lean();
  }
};
