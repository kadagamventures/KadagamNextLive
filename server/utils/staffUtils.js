const User = require("../models/User");

exports.generateUniqueStaffId = async () => {
  // Find the highest existing staffId for admins globally
  const latestUser = await User.find({ role: "admin", isDeleted: false })
    .sort({ staffId: -1 }) // descending order by staffId
    .limit(1)
    .lean();

  let lastId = latestUser?.[0]?.staffId || "79999999"; // start just below 8-digit number

  // Parse lastId as number and increment
  const numericPart = parseInt(lastId, 10);
  let nextIdNum = isNaN(numericPart) ? 80000000 : numericPart + 1;

  // Format as 8-digit string with leading zeros if needed
  const nextId = nextIdNum.toString().padStart(8, "0");

  // Check uniqueness again to be safe
  const exists = await User.findOne({ staffId: nextId });
  if (exists) {
    // Recursive retry if duplicate found
    return exports.generateUniqueStaffId();
  }

  return nextId;
};
