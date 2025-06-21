const OfficeTiming = require('../models/OfficeTiming');

/**
 * ✅ Validate time string is in "HH:MM AM/PM" format and represents a valid time.
 */
function isValidTimeFormat(str) {
  if (typeof str !== 'string') return false;
  const parts = str.trim().split(" ");
  if (parts.length !== 2) return false;
  const [timePart, period] = parts;
  if (!["AM", "PM"].includes(period)) return false;
  const timePieces = timePart.split(":");
  if (timePieces.length !== 2) return false;
  const h = Number(timePieces[0]);
  const m = Number(timePieces[1]);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return false;
  if (h < 1 || h > 12) return false;
  if (m < 0 || m >= 60) return false;
  return true;
}

/**
 * ✅ Parse "HH:MM AM/PM" into 24-hour {h, m} for comparison.
 */
function parseTime(str) {
  if (!isValidTimeFormat(str)) {
    throw new Error(`Invalid time format "${str}". Expected "HH:MM AM/PM".`);
  }
  const [timePart, period] = str.trim().split(" ");
  let [h, m] = timePart.split(":").map(Number);
  if (period === "PM" && h < 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return { h, m };
}

/**
 * ✅ Compare two "HH:MM AM/PM" strings to ensure end > start
 */
function isEndAfterStart(startTime, endTime) {
  const { h: sh, m: sm } = parseTime(startTime);
  const { h: eh, m: em } = parseTime(endTime);
  if (eh > sh) return true;
  if (eh === sh && em > sm) return true;
  return false;
}

/**
 * 🚀 Get Office Timing for current company
 */
exports.getOfficeTiming = async (req, res) => {
  try {
    const cid = req.user?.companyId?.toString();
    if (!cid) {
      return res.status(400).json({ success: false, message: 'Invalid company ID.' });
    }

    const timing = await OfficeTiming.findOne({ companyId: cid }).lean();
    if (!timing) {
      return res.status(404).json({ success: false, message: 'Office timing not set' });
    }

    return res.status(200).json({
      success: true,
      data: {
        startTime: timing.startTime,
        endTime: timing.endTime,
        graceMinutes: timing.graceMinutes,
        fullDayHours: timing.fullDayHours,
        companyId: timing.companyId,
      },
    });
  } catch (err) {
    console.error('❌ Could not fetch office timing:', err);
    return res.status(500).json({ success: false, message: 'Could not fetch office timing' });
  }
};

/**
 * 🚀 Create or Update Office Timing
 */
exports.upsertOfficeTiming = async (req, res) => {
  try {
    const { startTime, endTime, graceMinutes, fullDayHours } = req.body;
    const cid = req.user?.companyId?.toString();

    if (!cid) {
      return res.status(400).json({ success: false, message: 'Invalid company ID.' });
    }

    // Required fields check
    if (typeof startTime !== 'string' || typeof endTime !== 'string') {
      return res.status(400).json({ success: false, message: 'startTime and endTime are required strings.' });
    }

    const sTrim = startTime.trim();
    const eTrim = endTime.trim();

    // Format validation
    if (!isValidTimeFormat(sTrim) || !isValidTimeFormat(eTrim)) {
      return res.status(400).json({
        success: false,
        message: 'startTime/endTime must be in "HH:MM AM/PM" format',
      });
    }

    // Logical order validation
    if (!isEndAfterStart(sTrim, eTrim)) {
      return res.status(400).json({
        success: false,
        message: 'endTime must be later than startTime on the same day',
      });
    }

    // Grace minutes validation
    if (typeof graceMinutes !== 'number' || graceMinutes < 0) {
      return res.status(400).json({ success: false, message: 'graceMinutes must be a non-negative number' });
    }

    // Full-day hours validation
    if (typeof fullDayHours !== 'number' || fullDayHours <= 0) {
      return res.status(400).json({ success: false, message: 'fullDayHours must be a positive number' });
    }

    const updated = await OfficeTiming.findOneAndUpdate(
      { companyId: cid },
      {
        startTime: sTrim,
        endTime: eTrim,
        graceMinutes,
        fullDayHours,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    ).lean();

    return res.status(200).json({
      success: true,
      message: "Office timing updated successfully.",
      data: updated,
    });
  } catch (err) {
    console.error('❌ Could not save office timing:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: 'Could not save office timing' });
  }
};
