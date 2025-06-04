// services/attendanceService.js
const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const OfficeTiming = require("../models/OfficeTiming");

// Default full-day hours if you don’t store it per-company
const DEFAULT_FULL_DAY_HOURS = 8;

////////////////////////////////////////////////////////////////////////////////
// Helpers: parse “HH:MM AM/PM” into today’s Date, plus minute math
////////////////////////////////////////////////////////////////////////////////
function parseTime(str) {
  const [time, period] = str.split(" ");
  let [h, m] = time.split(":").map(Number);
  if (period === "PM" && h < 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return { h, m };
}

function toToday({ h, m }) {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function addMinutes(date, mins) {
  return new Date(date.getTime() + mins * 60000);
}

function subtractMinutes(date, mins) {
  return new Date(date.getTime() - mins * 60000);
}

////////////////////////////////////////////////////////////////////////////////
// Compute today's midnight and tomorrow midnight bounds
////////////////////////////////////////////////////////////////////////////////
function getTodayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

////////////////////////////////////////////////////////////////////////////////
// 1. Check-In (startWork)
////////////////////////////////////////////////////////////////////////////////
async function startWork(userId, companyId) {
  const { start, end } = getTodayBounds();

  // Prevent duplicate check-in
  if (
    await Attendance.exists({
      userId,
      companyId,
      checkInTime: { $gte: start, $lt: end },
    })
  ) {
    const err = new Error("You have already checked in today.");
    err.code = 400;
    throw err;
  }

  // Load company office timing
  const timing = await OfficeTiming.findOne({ companyId });
  if (!timing) {
    const err = new Error("Office hours not configured for your company.");
    err.code = 400;
    throw err;
  }

  // Determine scheduled start & end
  const now = new Date();
  const { h: sh, m: sm } = parseTime(timing.startTime);
  const scheduledStart = toToday({ h: sh, m: sm });
  const { h: eh, m: em } = parseTime(timing.endTime);
  const scheduledEnd = toToday({ h: eh, m: em });

  // Determine if late arrival
  const lateThreshold = addMinutes(scheduledStart, timing.graceMinutes);
  const lateArrival = now > lateThreshold;

  // Create attendance record
  const rec = new Attendance({
    userId,
    companyId,
    date: now.toISOString().slice(0, 10), // e.g., "2025-06-02"
    checkInTime: now,
    lateArrival,
    status: lateArrival ? "Late Arrival" : "Present",
  });

  const saved = await rec.save();
  // Return both the attendance record and the scheduled end time for frontend use
  return {
    attendance: saved,
    scheduledEndTime: scheduledEnd,
  };
}

////////////////////////////////////////////////////////////////////////////////
// 2. Check-Out (endWork)
////////////////////////////////////////////////////////////////////////////////
async function endWork(userId, companyId) {
  const { start, end } = getTodayBounds();

  // Fetch today's open record
  const rec = await Attendance.findOne({
    userId,
    companyId,
    checkInTime: { $gte: start, $lt: end },
    checkOutTime: null,
  });
  if (!rec) {
    const err = new Error("No active check-in found for today.");
    err.code = 400;
    throw err;
  }

  // Load office timing
  const timing = await OfficeTiming.findOne({ companyId });
  if (!timing) {
    const err = new Error("Office hours not configured for your company.");
    err.code = 400;
    throw err;
  }

  const now = new Date();

  // Compute worked hours
  const workedHrs = (now - rec.checkInTime) / (1000 * 60 * 60);

  // Determine early departure
  const { h: eh, m: em } = parseTime(timing.endTime);
  const scheduledEnd = toToday({ h: eh, m: em });
  const earlyThreshold = subtractMinutes(scheduledEnd, timing.graceMinutes);
  const earlyDeparture = now < earlyThreshold;

  // Enforce full-day requirement
  const fullDay = timing.fullDayHours ?? DEFAULT_FULL_DAY_HOURS;
  let status;
  if (workedHrs >= fullDay) {
    // Full hours met: mark Present or Late Arrival if applicable
    status = rec.lateArrival ? "Late Arrival" : "Present";
  } else {
    // Not full hours: Early Departure if before grace threshold, else On Leave
    status = earlyDeparture ? "Early Departure" : "On Leave";
  }

  // Save updates
  rec.checkOutTime   = now;
  rec.totalHours     = parseFloat(workedHrs.toFixed(2));
  rec.earlyDeparture = earlyDeparture;
  rec.status         = status;
  return rec.save();
}

////////////////////////////////////////////////////////////////////////////////
// 3. Auto Check-Out (cron)
////////////////////////////////////////////////////////////////////////////////
async function autoCheckOutAll(companyId) {
  const { start, end } = getTodayBounds();
  const timing = await OfficeTiming.findOne({ companyId });
  if (!timing) return;

  const { h: eh, m: em } = parseTime(timing.endTime);
  const forcedOut = toToday({ h: eh, m: em });

  await Attendance.updateMany(
    {
      companyId,
      checkInTime: { $gte: start, $lt: end },
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
                  // full shift?
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
                  // worked less than grace window?
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
              // otherwise they left early
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
  const { start, end } = getTodayBounds();
  return Attendance.exists({
    userId,
    companyId,
    checkInTime: { $gte: start, $lt: end },
  });
}

async function hasCheckedOut(userId, companyId) {
  const { start, end } = getTodayBounds();
  const att = await Attendance.findOne({
    userId,
    companyId,
    checkOutTime: { $gte: start, $lt: end },
  });
  return !!att;
}

async function getOngoingAttendance(userId, companyId) {
  const { start, end } = getTodayBounds();
  return Attendance.findOne({
    userId,
    companyId,
    checkInTime: { $gte: start, $lt: end },
    checkOutTime: null,
  }).lean();
}

async function getAllAttendance(companyId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  return Attendance.find({ companyId })
    .populate("userId", "name email")
    .sort({ checkInTime: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
}

async function getAttendanceByDate(date, companyId) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const next = new Date(day);
  next.setDate(next.getDate() + 1);

  return Attendance.find({
    companyId,
    checkInTime: { $gte: day, $lt: next },
  })
    .populate("userId", "name email")
    .sort({ "userId.name": 1 })
    .lean();
}

async function getAttendanceByStaff(userId, companyId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  return Attendance.find({
    userId: mongoose.Types.ObjectId(userId),
    companyId,
  })
    .populate("userId", "name email")
    .sort({ checkInTime: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
}

////////////////////////////////////////////////////////////////////////////////
// 5. Declare Leave for Past Date
////////////////////////////////////////////////////////////////////////////////
async function declareLeaveForPastDate(date, reason, companyId) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const next = new Date(day);
  next.setDate(next.getDate() + 1);

  return Attendance.updateMany(
    {
      date: { $gte: day, $lt: next },
      companyId,
      status: { $ne: "On Leave" },
    },
    {
      $set: {
        status: "On Leave",
        departureNote: reason,
      },
    }
  );
}

////////////////////////////////////////////////////////////////////////////////
// 6. Exports
////////////////////////////////////////////////////////////////////////////////
module.exports = {
  hasCheckedIn,
  hasCheckedOut,
  startWork,
  endWork,
  autoCheckOutAll,
  getOngoingAttendance,
  getAllAttendance,
  getAttendanceByDate,
  getAttendanceByStaff,
  declareLeaveForPastDate,
};
