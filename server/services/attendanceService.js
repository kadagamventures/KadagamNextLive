const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const OfficeTiming = require("../models/OfficeTiming");

const DEFAULT_FULL_DAY_HOURS = 8;

function parseTime(str) {
  if (!str || typeof str !== "string") {
    throw new Error(`Invalid time string: ${str}`);
  }
  const parts = str.trim().split(" ");
  if (parts.length !== 2) {
    throw new Error(`Time must be in "HH:MM AM/PM" format, got: ${str}`);
  }
  const [timePart, period] = parts;
  const timePieces = timePart.split(":");
  if (timePieces.length !== 2) {
    throw new Error(`Time must be in "HH:MM" format, got: ${timePart}`);
  }
  let h = Number(timePieces[0]);
  let m = Number(timePieces[1]);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 12 || m < 0 || m >= 60) {
    throw new Error(`Invalid hour/minute in time string: ${str}`);
  }
  if (period === "PM" && h < 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return { h, m };
}

function toTodayLocal({ h, m }) {
  const now = new Date();
  now.setHours(h, m, 0, 0);
  return now;
}

function computeDateFieldForToday(jsDate) {
  if (typeof Attendance.computeDateFieldForToday === "function") {
    return Attendance.computeDateFieldForToday(jsDate);
  }
  const year = jsDate.getFullYear();
  const month = jsDate.getMonth();
  const day = jsDate.getDate();
  return new Date(Date.UTC(year, month, day, 0, 0, 0));
}

function getTodayBoundsLocal() {
  const now = new Date();
  const startLocal = new Date(now);
  startLocal.setHours(0, 0, 0, 0);
  const endLocal = new Date(startLocal);
  endLocal.setDate(endLocal.getDate() + 1);
  return { start: startLocal, end: endLocal };
}

////////////////////////////////////////////////////////////////////////////////
// 1. Check-In (startWork)
////////////////////////////////////////////////////////////////////////////////
async function startWork(userId, companyId) {
  companyId = String(companyId); // 🔒 fix
  const now = new Date();
  const dateField = computeDateFieldForToday(now);

  const exists = await Attendance.exists({ userId, companyId, date: dateField });
  if (exists) {
    const err = new Error("You have already checked in today.");
    err.code = 400;
    throw err;
  }

  const timing = await OfficeTiming.findOne({ companyId });
  if (!timing) {
    const err = new Error("Office hours not configured for your company.");
    err.code = 400;
    throw err;
  }

  let scheduledStart, scheduledEnd;
  try {
    const { h: sh, m: sm } = parseTime(timing.startTime);
    scheduledStart = toTodayLocal({ h: sh, m: sm });
  } catch (e) {
    const err = new Error(`Invalid startTime in OfficeTiming: ${e.message}`);
    err.code = 500;
    throw err;
  }
  try {
    const { h: eh, m: em } = parseTime(timing.endTime);
    scheduledEnd = toTodayLocal({ h: eh, m: em });
  } catch (e) {
    const err = new Error(`Invalid endTime in OfficeTiming: ${e.message}`);
    err.code = 500;
    throw err;
  }

  const grace = typeof timing.graceMinutes === "number" ? timing.graceMinutes : 0;
  const lateThreshold = new Date(scheduledStart.getTime() + grace * 60000);
  const lateArrival = now > lateThreshold;

  const rec = new Attendance({
    userId,
    companyId,
    date: dateField,
    checkInTime: now,
    lateArrival,
    status: lateArrival ? "Late Arrival" : "Present",
  });
  const saved = await rec.save();

  return {
    attendance: saved,
    scheduledEndTime: scheduledEnd,
  };
}

////////////////////////////////////////////////////////////////////////////////
// 2. Check-Out (endWork)
////////////////////////////////////////////////////////////////////////////////
async function endWork(userId, companyId) {
  companyId = String(companyId); // 🔒 fix
  const now = new Date();
  const dateField = computeDateFieldForToday(now);

  const rec = await Attendance.findOne({
    userId,
    companyId,
    date: dateField,
    checkOutTime: null,
  });
  if (!rec) {
    const err = new Error("No active check-in found for today.");
    err.code = 400;
    throw err;
  }

  const timing = await OfficeTiming.findOne({ companyId });
  if (!timing) {
    const err = new Error("Office hours not configured for your company.");
    err.code = 400;
    throw err;
  }

  let scheduledEnd;
  try {
    const { h: eh, m: em } = parseTime(timing.endTime);
    scheduledEnd = toTodayLocal({ h: eh, m: em });
  } catch (e) {
    const err = new Error(`Invalid endTime in OfficeTiming: ${e.message}`);
    err.code = 500;
    throw err;
  }

  const workedHrs = (now - rec.checkInTime) / (1000 * 60 * 60);
  const grace = typeof timing.graceMinutes === "number" ? timing.graceMinutes : 0;
  const earlyThreshold = new Date(scheduledEnd.getTime() - grace * 60000);
  const earlyDeparture = now < earlyThreshold;

  const fullDay = timing.fullDayHours ?? DEFAULT_FULL_DAY_HOURS;
  let status;
  if (workedHrs >= fullDay) {
    status = rec.lateArrival ? "Late Arrival" : "Present";
  } else {
    status = earlyDeparture ? "Early Departure" : "On Leave";
  }

  rec.checkOutTime = now;
  rec.totalHours = parseFloat(workedHrs.toFixed(2));
  rec.earlyDeparture = earlyDeparture;
  rec.status = status;
  const updated = await rec.save();
  return updated;
}

////////////////////////////////////////////////////////////////////////////////
// 3. Auto Check-Out (cron job)
////////////////////////////////////////////////////////////////////////////////
async function autoCheckOutAll(companyId) {
  companyId = String(companyId); // 🔒 fix
  const now = new Date();
  const dateField = computeDateFieldForToday(now);

  const timing = await OfficeTiming.findOne({ companyId });
  if (!timing) return;

  let forcedOut;
  try {
    const { h: eh, m: em } = parseTime(timing.endTime);
    forcedOut = toTodayLocal({ h: eh, m: em });
  } catch (e) {
    console.error("Invalid endTime in OfficeTiming (cron):", e.message);
    return;
  }

  await Attendance.updateMany(
    {
      companyId,
      date: dateField,
      checkOutTime: null,
    },
    [
      {
        $set: {
          checkOutTime: forcedOut,
          totalHours: {
            $round: [
              {
                $divide: [
                  { $subtract: [forcedOut, "$checkInTime"] },
                  1000 * 60 * 60,
                ],
              },
              2,
            ],
          },
          status: {
            $switch: {
              branches: [
                {
                  case: {
                    $gte: [
                      {
                        $divide: [
                          { $subtract: [forcedOut, "$checkInTime"] },
                          1000 * 60 * 60,
                        ],
                      },
                      timing.fullDayHours ?? DEFAULT_FULL_DAY_HOURS,
                    ],
                  },
                  then: "Present",
                },
                {
                  case: {
                    $lt: [
                      {
                        $divide: [
                          { $subtract: [forcedOut, "$checkInTime"] },
                          1000 * 60 * 60,
                        ],
                      },
                      (timing.graceMinutes ?? 0) / 60,
                    ],
                  },
                  then: "On Leave",
                },
              ],
              default: "Early Departure",
            },
          },
        },
      },
    ]
  );
}

////////////////////////////////////////////////////////////////////////////////
// 4. Query Helpers
////////////////////////////////////////////////////////////////////////////////
async function hasCheckedIn(userId, companyId) {
  companyId = String(companyId); // 🔒 fix
  const now = new Date();
  const dateField = computeDateFieldForToday(now);
  return Attendance.exists({ userId, companyId, date: dateField });
}

async function hasCheckedOut(userId, companyId) {
  companyId = String(companyId); // 🔒 fix
  const now = new Date();
  const dateField = computeDateFieldForToday(now);
  const att = await Attendance.findOne({
    userId,
    companyId,
    date: dateField,
    checkOutTime: { $ne: null },
  });
  return !!att;
}

async function getOngoingAttendance(userId, companyId) {
  companyId = String(companyId); // 🔒 fix
  const now = new Date();
  const dateField = computeDateFieldForToday(now);
  return Attendance.findOne({ userId, companyId, date: dateField, checkOutTime: null }).lean();
}

async function getActiveSession(userId, companyId) {
  companyId = String(companyId); // 🔒 fix
  const session = await getOngoingAttendance(userId, companyId);
  if (!session) return null;

  const elapsedSeconds = Math.floor((Date.now() - new Date(session.checkInTime)) / 1000);

  let scheduledEndTime = null;
  try {
    const timing = await OfficeTiming.findOne({ companyId });
    if (timing && timing.endTime) {
      const { h: eh, m: em } = parseTime(timing.endTime);
      scheduledEndTime = toTodayLocal({ h: eh, m: em });
    }
  } catch (e) {
    console.error("Error computing scheduledEndTime in getActiveSession:", e.message);
  }

  return {
    attendanceId: session._id,
    checkInTime: session.checkInTime,
    status: session.status,
    elapsedSeconds,
    scheduledEndTime,
  };
}

async function getAllAttendance(companyId, page = 1, limit = 10) {
  companyId = String(companyId); // 🔒 fix
  const skip = (page - 1) * limit;
  return Attendance.find({ companyId })
    .populate("userId", "name email")
    .sort({ date: -1, checkInTime: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
}

async function getAttendanceByDate(dateString, companyId) {
  companyId = String(companyId); // 🔒 fix
  const day = new Date(dateString);
  if (isNaN(day)) throw new Error(`Invalid date string: ${dateString}`);
  const year = day.getFullYear();
  const month = day.getMonth();
  const dateField = new Date(Date.UTC(year, month, day.getDate(), 0, 0, 0));
  const next = new Date(dateField);
  next.setUTCDate(next.getUTCDate() + 1);

  return Attendance.find({ companyId, date: { $gte: dateField, $lt: next } })
    .populate("userId", "name email")
    .sort({ "userId.name": 1 })
    .lean();
}

async function getAttendanceByStaff(userId, companyId, page = 1, limit = 10) {
  companyId = String(companyId); // 🔒 fix
  const skip = (page - 1) * limit;
  return Attendance.find({ userId: mongoose.Types.ObjectId(userId), companyId })
    .populate("userId", "name email")
    .sort({ date: -1, checkInTime: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
}

////////////////////////////////////////////////////////////////////////////////
// 5. Declare Leave for Past Date
////////////////////////////////////////////////////////////////////////////////
async function declareLeaveForPastDate(dateString, reason, companyId) {
  companyId = String(companyId); // 🔒 fix
  const day = new Date(dateString);
  if (isNaN(day)) throw new Error(`Invalid date string: ${dateString}`);
  const year = day.getFullYear();
  const month = day.getMonth();
  const dateField = new Date(Date.UTC(year, month, day.getDate(), 0, 0, 0));
  const next = new Date(dateField);
  next.setUTCDate(next.getUTCDate() + 1);

  return Attendance.updateMany(
    { companyId, date: { $gte: dateField, $lt: next }, status: { $ne: "On Leave" } },
    { $set: { status: "On Leave", departureNote: reason } }
  );
}

module.exports = {
  hasCheckedIn,
  hasCheckedOut,
  startWork,
  endWork,
  autoCheckOutAll,
  getOngoingAttendance,
  getActiveSession,
  getAllAttendance,
  getAttendanceByDate,
  getAttendanceByStaff,
  declareLeaveForPastDate,
};
