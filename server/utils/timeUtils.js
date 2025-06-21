// utils/timeUtils.js

/**
 * Parses a 12-hour time string like "09:30 AM" or "4:15 PM"
 * and returns 24-hour equivalent hours and minutes.
 *
 * @param {string} str - Time in "HH:MM AM/PM" format
 * @returns {{ h: number, m: number }}
 */
function parseTime(str) {
  if (!str || typeof str !== 'string') {
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

  if (isNaN(h) || isNaN(m) || h < 1 || h > 12 || m < 0 || m >= 60) {
    throw new Error(`Invalid hour/minute in time string: ${str}`);
  }

  if (period === "PM" && h < 12) h += 12;
  if (period === "AM" && h === 12) h = 0;

  return { h, m };
}

/**
 * Converts {h, m} to a Date object for today in local time.
 * @param {{ h: number, m: number }} param0
 * @returns {Date}
 */
function toToday({ h, m }) {
  const now = new Date();
  now.setHours(h, m, 0, 0);
  return now;
}

/**
 * Adds minutes to a date.
 * @param {Date} date
 * @param {number} mins
 * @returns {Date}
 */
function addMinutes(date, mins) {
  return new Date(date.getTime() + mins * 60000);
}

/**
 * Subtracts minutes from a date.
 * @param {Date} date
 * @param {number} mins
 * @returns {Date}
 */
function subtractMinutes(date, mins) {
  return new Date(date.getTime() - mins * 60000);
}

/**
 * Gets the start (00:00:00) and end (next day 00:00:00) bounds of today.
 * @returns {{ start: Date, end: Date }}
 */
function getTodayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

module.exports = {
  parseTime,
  toToday,
  addMinutes,
  subtractMinutes,
  getTodayBounds,
};
