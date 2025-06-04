const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middlewares/authMiddleware');
const checkPermissions = require('../../middlewares/permissionsMiddleware');
const {
  generateAttendanceReport,
  generateTaskReport,
  generateProjectReport,
  generateStaffReport,
  generateLeaveReport,
} = require('../../controllers/reportControllers/reportGeneratorController');

// ✅ All report routes require authentication and report permission
router.use(verifyToken);
router.use(checkPermissions("manage_staff"));

// ✅ POST /api/reports/attendance
router.post('/attendance', generateAttendanceReport);

// ✅ POST /api/reports/task
router.post('/task', generateTaskReport);

// ✅ POST /api/reports/project
router.post('/project', generateProjectReport);

// ✅ POST /api/reports/staff
router.post('/staff', generateStaffReport);

// ✅ POST /api/reports/leave
router.post('/leave', generateLeaveReport);

module.exports = router;
