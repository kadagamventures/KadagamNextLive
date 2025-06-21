// backend/routes/officeTimingRoutes.js
const express = require('express');
const router = express.Router();
const {
  getOfficeTiming,
  upsertOfficeTiming,
} = require('../controllers/officeTimingController');
const {
  verifyToken,
  requireAdmin,
} = require('../middlewares/authMiddleware');

// ===============================
// 📍 OFFICE TIMING ROUTES
// ===============================

// ✅ Any authenticated user: Get current office timings
// GET /api/office-timing
router.get(
  '/',
  verifyToken,
  getOfficeTiming
);

// ✅ Admin only: Upsert (set/update) office timing for the company
// POST /api/office-timing/admin
router.post(
  '/admin',
  verifyToken,
  requireAdmin,
  upsertOfficeTiming
);

module.exports = router;
