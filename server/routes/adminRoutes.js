const express = require("express");
const multer = require("multer");
const router = express.Router();

const {
  verifyToken,
  requireAdmin
} = require("../middlewares/authMiddleware");
const ensureVerifiedTenant = require("../middlewares/verifyCompanyVerified");
const enforceActiveSubscription = require("../middlewares/enforceActiveSubscription");
const checkPermissions = require("../middlewares/permissionsMiddleware");

const {
  addStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
  uploadStaffProfilePic,
  uploadStaffResume,
  getStaffFormData,
  checkStaffId,
  getUserProfile,
  getMyProfile,
  getStaffByEmail,
  deleteStaffFile
} = require("../controllers/userController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(
  verifyToken,
  ensureVerifiedTenant, 
  enforceActiveSubscription
);

router.post(
  "/staff",
  checkPermissions("manage_staff"),
  upload.fields([
    { name: "profilePic", maxCount: 1 },
    { name: "resume",    maxCount: 1 }
  ]),
  addStaff
);

router.get("/staff", checkPermissions("manage_staff"), getAllStaff);
router.get("/staff/form-data", checkPermissions("manage_staff"), getStaffFormData);
router.get("/staff/check-id", checkPermissions("manage_staff"), checkStaffId);

router.get("/staff/:id", checkPermissions("manage_staff"), getStaffById);
router.put(
  "/staff/:id",
  checkPermissions("manage_staff"),
  upload.fields([
    { name: "profilePic", maxCount: 1 },
    { name: "resume",    maxCount: 1 }
  ]),
  updateStaff
);

router.delete("/staff/:id", requireAdmin, deleteStaff); 

router.put(
  "/staff/:id/profile-pic",
  checkPermissions("manage_staff"),
  upload.single("profilePic"),
  uploadStaffProfilePic
);

router.put(
  "/staff/:id/resume",
  checkPermissions("manage_staff"),
  upload.single("resume"),
  uploadStaffResume
);

router.post(
  "/staff/file/delete",
  checkPermissions("manage_staff"),
  deleteStaffFile
);

router.get("/staff/my-profile", getMyProfile);
router.get("/staff/profile/:id", checkPermissions("manage_staff"), getUserProfile);

router.get("/staff/by-email", checkPermissions("manage_staff"), getStaffByEmail);

module.exports = router;
