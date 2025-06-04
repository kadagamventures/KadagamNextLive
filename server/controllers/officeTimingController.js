// backend/controllers/officeTimingController.js
const OfficeTiming = require('../models/OfficeTiming');

/**
 * 🔧 Ensure companyId is a string
 */
function normalizeCompanyId(companyId) {
  return companyId?.toString();
}

exports.getOfficeTiming = async (req, res) => {
  try {
    const cid = normalizeCompanyId(req.user.companyId);
    const timing = await OfficeTiming.findOne({ companyId: cid });
    if (!timing) {
      return res.status(404).json({ success: false, message: 'Office timing not set' });
    }
    return res.status(200).json({ success: true, data: timing });
  } catch (err) {
    console.error('❌ Could not fetch office timing:', err);
    return res.status(500).json({ success: false, message: 'Could not fetch office timing' });
  }
};

exports.upsertOfficeTiming = async (req, res) => {
  try {
    const { startTime, endTime, graceMinutes, fullDayHours } = req.body;
    const cid = normalizeCompanyId(req.user.companyId);

    const timing = await OfficeTiming.findOneAndUpdate(
      { companyId: cid },
      { startTime, endTime, graceMinutes, fullDayHours },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({ success: true, data: timing });
  } catch (err) {
    console.error('❌ Could not save office timing:', err);
    return res.status(500).json({ success: false, message: 'Could not save office timing' });
  }
};
