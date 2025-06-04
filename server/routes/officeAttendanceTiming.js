// backend/routes/officeTimingRoutes.js
const express = require('express');
const { verifyToken, requireAdmin } = require('../middlewares/authMiddleware');
const { getOfficeTiming, upsertOfficeTiming } = require('../controllers/officeTimingController');

const router = express.Router();

// Any authenticated user: read office hours
// GET  /api/office-timing
router.get(
  '/',
  verifyToken,
  getOfficeTiming
);

// Admin-only: set or update office hours
// POST /api/office-timing/admin
router.post(
  '/admin',
  verifyToken,
  requireAdmin,
  upsertOfficeTiming
);

module.exports = router;
